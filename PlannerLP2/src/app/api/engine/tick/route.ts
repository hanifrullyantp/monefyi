import { DEFAULT_LANDING_URL, fetchPageSignals, comparePagePrices } from "@/lib/engine/pageAudit";
import { MONEFYI_PRICING } from "@/lib/engine/winningEngine";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { NextRequest, NextResponse } from "next/server";
import { hasSucceededToday, logEngineAction, wibDate, acquireRunLock, releaseRunLock, checkManualLiveChange, loadPaidOrderCount, loadUserHolds } from "@/lib/engine/engineDb";
import { createClient } from "@supabase/supabase-js";
import {
  runFivePillarDiagnostics,
  WinningEngineConfig,
  WinningActionPlan,
  DEFAULT_WINNING_ENGINE_CONFIG,
  evaluateGuardrailGate,
  isAutoEligible,
} from "@/lib/engine/winningEngine";
import { runRoutedLlm, submitOpenRouterBatch } from "@/lib/engine/llmRouter";
import { dispatchEngineNotification } from "@/lib/services/telegramBotService";

function getSupabaseServerClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zzwqfmdyncxbolestkqp.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Endpoint utama Monefyi Holistic Winning Engine (/api/engine/tick).
 * Dapat dipanggil oleh:
 * 1. Supabase pg_cron setiap 30 menit (otomatis di belakang layar).
 * 2. Tombol "Analisa 5 Pilar & Susun Rencana Winning" di Dashboard Admin.
 */
async function handleTick(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let campaigns = Array.isArray(body.campaigns) && body.campaigns.length > 0 ? body.campaigns : [];
    let insightsData = body.insightsData || null;
    const orderBumpConfig = body.orderBumpConfig || undefined;
    const upsellConfig = body.upsellConfig || undefined;
    const capiStatus = body.capiStatus || undefined;
    const currentLpCopy = body.currentLpCopy || undefined;

    // Jika data kampanye belum dikirim di body (misal dipanggil pg_cron atau initial load),
    // tarik data riil kampanye & breakdown insights langsung dari Meta Graph API menggunakan token Supabase Cloud
    if (campaigns.length === 0) {
      try {
        const origin = req.nextUrl.origin || "http://localhost:3000";
        const [campRes, insRes] = await Promise.all([
          fetch(`${origin}/api/meta/campaigns`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-engine-secret": process.env.ENGINE_CRON_SECRET || "" },
            body: JSON.stringify({}),
          }).catch(() => null),
          fetch(`${origin}/api/meta/insights`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-engine-secret": process.env.ENGINE_CRON_SECRET || "" },
            body: JSON.stringify({}),
          }).catch(() => null),
        ]);

        if (campRes && campRes.ok) {
          const campJson = await campRes.json().catch(() => ({}));
          if (Array.isArray(campJson.campaigns) && campJson.campaigns.length > 0) {
            campaigns = campJson.campaigns;
          }
        }

        if (insRes && insRes.ok && !insightsData) {
          const insJson = await insRes.json().catch(() => ({}));
          if (insJson.ok) {
            insightsData = insJson;
          }
        }
      } catch {
        // Fallback jika pemanggilan internal gagal
      }
    }

    const config: WinningEngineConfig = {
      ...DEFAULT_WINNING_ENGINE_CONFIG,
      ...(body.config || {}),
      llmRouting: {
        openRouterApiKey:
          body.config?.llmRouting?.openRouterApiKey ??
          DEFAULT_WINNING_ENGINE_CONFIG.llmRouting.openRouterApiKey,
        strategist: {
          ...DEFAULT_WINNING_ENGINE_CONFIG.llmRouting.strategist,
          ...(body.config?.llmRouting?.strategist || {}),
        },
        processor: {
          ...(DEFAULT_WINNING_ENGINE_CONFIG.llmRouting.processor || {
            provider: "openrouter",
            model: "openai/gpt-6-luna-pro",
          }),
          ...(body.config?.llmRouting?.processor || {}),
        },
        technical: {
          ...DEFAULT_WINNING_ENGINE_CONFIG.llmRouting.technical,
          ...(body.config?.llmRouting?.technical || {}),
        },
      },
      notifications: {
        ...DEFAULT_WINNING_ENGINE_CONFIG.notifications,
        ...(body.config?.notifications || {}),
      },
    };

    const supabase = getSupabaseServerClient();

    // Riwayat perubahan budget dari eksekusi sebelumnya (untuk jeda cooldown scale)
    const budgetChangedAt: Record<string, string> = {};
    const carriedExecuted: any[] = [];
    try {
      const { data: prev } = await supabase
        .from("winning_engine_config")
        .select("last_plans")
        .eq("id", "default")
        .maybeSingle();
      const prevPlans: any[] = Array.isArray(prev?.last_plans) ? prev!.last_plans : [];
      for (const p of prevPlans) {
        const cid = String(p?.actionPayload?.campaignId || "");
        if (cid && p?.status === "executed" && p?.executedAt && p?.actionType === "scale_campaign_budget") {
          if (!budgetChangedAt[cid] || p.executedAt > budgetChangedAt[cid]) budgetChangedAt[cid] = p.executedAt;
          const ageH = (Date.now() - Date.parse(p.executedAt)) / 3600000;
          if (ageH < config.scaleCooldownHours) carriedExecuted.push(p);
        }
      }
    } catch {
      // Jika riwayat tidak terbaca, scale tetap dibatasi oleh kenaikan maksimal per langkah
    }

    // Rekonsiliasi penjualan dan keputusan admin (undo) yang harus dihormati mesin
    const windowSinceIso = new Date(Date.now() - config.analysisWindowDays * 86400000).toISOString();
    const paidOrders = await loadPaidOrderCount(windowSinceIso);
    const holdCampaignIds = await loadUserHolds(72);

    // Baca harga di landing page. Gagal membaca tidak menghentikan analisa.
    const pageSignals = await fetchPageSignals(process.env.LANDING_PAGE_URL || DEFAULT_LANDING_URL).catch(() => null);
    const pagePriceFindings = pageSignals?.ok ? comparePagePrices(pageSignals.prices, MONEFYI_PRICING) : [];

    // 1. Jalankan Diagnosa Deterministik 5 Pilar Winning (hanya data dalam jendela analisa)
    const diagnostics = runFivePillarDiagnostics({
      campaigns,
      pagePriceFindings,
      insightsData,
      orderBumpConfig,
      upsellConfig,
      capiStatus,
      config,
      currentLpCopy,
      budgetChangedAt,
      holdCampaignIds,
      paidOrders,
    });

    // 2. Panggil AI Strategist (Gemini 2.5 Pro / Claude) untuk menyusun Ringkasan Eksekutif 10-Tahun Expert
    //    serta validasi mendalam terhadap 5 pilar
    const systemPrompt = `Anda adalah Monefyi Winning Engine (Facebook/Meta Ads & Growth Expert pengalaman 10 tahun mengelola budget hingga miliaran Rupiah).
KONTEKS PRODUK YANG DIJUAL:
- Produk Inti: Monefyi Estimator (website: estimator.monefyi.com)
- Target Audiens Iklan: Kontraktor Umum, Interior Designer, Kitchen Set Vendor, dan Subkontraktor Sipil.
- Nilai & Masalah Utama: Kontraktor sering kalah tender atau telat closing karena butuh 2-3 hari hitung RAB manual di rumah. Monefyi Estimator memampukan mereka hitung harga akurat dalam 1 menit langsung di HP saat survei lokasi, lalu kirim PDF penawaran berlogo ke WhatsApp klien sebelum mereka sempat membandingkan dengan vendor lain.
- Struktur Harga: Sekali Bayar (Lifetime) — Paket Standard Rp 93.000 / Rp 150.000, Paket Pro Rp 199.000 / Rp 250.000. Add-on Order Bump: Upgrade ke Estimator PRO +Rp 50.000 (Hemat Rp 50.000).
PERINGATAN PENTING: JANGAN menyamakan produk ini dengan aplikasi pengatur keuangan pribadi atau chat bot personal finance monefyi.com. Segala evaluasi Offer, Copywriting Landing Page, Funnel, dan Iklan WAJIB 100% berfokus pada Monefyi Estimator (estimator.monefyi.com) untuk kontraktor/interior.

ATURAN KOMUNIKASI WAJIB:
1. DILARANG menggunakan emoticon/emoji sama sekali.
1a. Hanya gunakan angka yang ada di data. Jika data suatu pilar belum ada, tulis "data belum cukup" dan jangan mengarang angka.
1b. Setiap rekomendasi wajib menyebut bukti (angka), jendela data, dan status learning phase. Sebutkan juga apa yang TIDAK dilakukan dan alasannya.
2. Gunakan bahasa Indonesia bisnis yang jernih, tegas, mudah dipahami oleh pemilik bisnis (tidak membuat pusing), namun berbasis angka riil.
3. Anda menilai 5 Pilar secara utuh: (1) Produk, Harga & Offer Estimator, (2) Kecepatan & Copywriting Landing Page estimator.monefyi.com, (3) Checkout & AOV Funnel (Order Bump Mayar), (4) Meta Ads & Rapid Testing, (5) Tracking Pixel + CAPI.
4. Berikan ringkasan eksekutif maksimal 4 poin singkat:
   - Diagnosa Jujur Saat Ini (Apa penghambat terbesar menuju winning kampanye Monefyi Estimator)
   - Strategi Produk & Offer (Paket Standard vs Pro & Bonus Stacking Kontraktor)
   - Strategi Copywriting Landing Page estimator.monefyi.com & Checkout
   - Langkah Meta Ads sesuai ${
     config.mode === "cuan"
       ? `Mode Cuan (Aman di rentang Rp ${config.minDailyBudget.toLocaleString(
           "id-ID"
         )} - Rp ${config.maxDailyBudget.toLocaleString("id-ID")}/hari, menunggu persetujuan user)`
       : `Mode Advance (Skala besar dengan plafon Rp ${config.approvedDailyCeiling.toLocaleString(
           "id-ID"
         )}/hari)`
   }.`;

     const now = new Date();
     const dateStr = now.toLocaleDateString("id-ID", {
       weekday: "long",
       year: "numeric",
       month: "long",
       day: "numeric",
     });
     const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
     const totalCampSpend = campaigns.reduce((s: number, c: any) => s + Number(c.spend || 0), 0);

     const userPrompt = `Waktu Analisa Real-Time: ${dateStr}, ${timeStr} WIB.
Jumlah Kampanye Terdeteksi: ${campaigns.length}
Total Spend Terpantau: Rp ${totalCampSpend.toLocaleString("id-ID")}
Skor Keseluruhan 5 Pilar: ${diagnostics.overallScore}/100

Detail 5 Pilar:
${diagnostics.pillars
  .map((p) => `- ${p.label}: Skor ${p.score}/100 (${p.headlineMetric}) -> ${p.honestDiagnosis}`)
  .join("\n")}

Daftar Kampanye Utama:
Jendela data keputusan: ${config.analysisWindowDays} hari terakhir. Data di luar jendela ini tidak dipakai.
Kampanye yang dianalisa (${diagnostics.includedCampaigns.length}):
${diagnostics.includedCampaigns.length === 0 ? "- Tidak ada kampanye dengan belanja dalam jendela data." : diagnostics.includedCampaigns.map((c: any) => `- "${c.name}" | Spend: Rp ${Number(c.spend || 0).toLocaleString("id-ID")} | Konversi: ${c.purchases || c.results || 0} | CPA: Rp ${Math.round(Number(c.cpa || 0)).toLocaleString("id-ID")} | ${c.inLearning ? "LEARNING (jangan dihentikan kecuali melewati batas darurat)" : "stabil"}`).join("\n")}
Keputusan yang ditahan atau dikecualikan (beserta alasan):
${diagnostics.dataAudit.length === 0 ? "- Tidak ada." : diagnostics.dataAudit.map((a) => `- [${a.decision}] "${a.name}": ${a.reason}`).join("\n")}

Garis rugi per pesanan: Rp ${Math.round(diagnostics.breakEven.cpa).toLocaleString("id-ID")} (break-even), target CPA Rp ${config.targetCpa.toLocaleString("id-ID")}. ${diagnostics.breakEven.note}
Budget aktif harian di kampanye yang terbukti merugi: Rp ${diagnostics.portfolio.losingDailyBudget.toLocaleString("id-ID")} (${diagnostics.portfolio.losingBudgetSharePct}% dari budget aktif).
Vonis statistik per kampanye (peluang = probabilitas dari data, bukan kepastian):
${diagnostics.verdicts.length === 0 ? "- Tidak ada." : diagnostics.verdicts.map((v) => `- "${v.name}": ${v.verdict.kind}. ${v.verdict.reason}`).join("\n")}
${diagnostics.configWarnings.length > 0 ? `Peringatan konfigurasi:\n${diagnostics.configWarnings.map((w) => `- ${w}`).join("\n")}\n` : ""}Jumlah Rencana Tindakan yang Disiapkan: ${diagnostics.plans.length}
Susun ringkasan strategis segar, tajam, dan berbasis data riil per ${dateStr} (tanpa emoticon) agar pemilik bisnis langsung paham evaluasi performa dan mengapa rencana perbaikan perlu disetujui.`;

    const strategistModel = config.llmRouting?.strategist?.model || "";
    const isBatchMode = (strategistModel.includes(":batch") || strategistModel.includes("batch")) && !body.forceRealtime;
    // Jika model dikonfigurasi menggunakan antrean Batch (misal: anthropic/claude-sonnet-5.5:batch)
    if (isBatchMode) {
      let openRouterKey =
        config.llmRouting?.openRouterApiKey ||
        config.llmRouting?.strategist?.apiKey ||
        "";

      if (!openRouterKey) {
        const { data: dbConf } = await supabase
          .from("winning_engine_config")
          .select("openrouter_api_key")
          .eq("id", "default")
          .maybeSingle();
        if (dbConf?.openrouter_api_key) {
          openRouterKey = dbConf.openrouter_api_key;
        }
      }

      if (openRouterKey) {
        const batchSubmitRes = await submitOpenRouterBatch({
          model: strategistModel,
          systemPrompt,
          userPrompt,
          apiKey: openRouterKey,
          temperature: 0.3,
          maxTokens: 1000,
        });

        if (batchSubmitRes.ok && batchSubmitRes.batchId) {
          const startedAt = new Date().toISOString();
          await supabase
            .from("winning_engine_config")
            .update({
              batch_job_id: batchSubmitRes.batchId,
              batch_status: "in_progress",
              batch_model: strategistModel,
              batch_started_at: startedAt,
              batch_completed_at: null,
              batch_diagnostics_snapshot: diagnostics,
              updated_at: startedAt,
            })
            .eq("id", "default");

          return NextResponse.json({
            ok: true,
            isBatch: true,
            status: "processing",
            batchId: batchSubmitRes.batchId,
            model: strategistModel,
            startedAt,
            message:
              "Permintaan analisa telah dikirim ke antrean Sonnet 5.5 Batch. Sistem sedang memproses di belakang layar. Tampilan akan otomatis terisi begitu data siap.",
            diagnostics,
          });
        }
      }
    }

    // Pemrosesan Real-time: Bersihkan akhiran :batch agar dapat dieksekusi secara instan
    const realTimeRouting = {
      ...config.llmRouting,
      strategist: {
        ...config.llmRouting.strategist,
        model: (config.llmRouting.strategist.model || "anthropic/claude-3.5-sonnet").replace(/:batch$/i, ""),
      },
    };

    const llmStrategistResult = await runRoutedLlm({
      role: "strategist",
      systemPrompt,
      userPrompt,
      routing: realTimeRouting,
      temperature: 0.35,
      maxTokens: 1100,
    });

    const executiveBrief = llmStrategistResult.ok && llmStrategistResult.text
      ? llmStrategistResult.text
      : [
          `Ringkasan Eksekutif Real-Time (${dateStr} - ${timeStr} WIB):`,
          `1. Diagnosa 5 Pilar: Skor kesiapan sistem berada di ${diagnostics.overallScore}/100 dari ${campaigns.length} kampanye terpantau (Total Spend: Rp ${totalCampSpend.toLocaleString("id-ID")}). Fokus utama adalah menyelaraskan kekuatan Offer, kecepatan/copywriting Landing Page, dan efisiensi belanja iklan.`,
          `2. Evaluasi Produk & Offer: ${diagnostics.pillars[0]?.honestDiagnosis || ""}`,
          `3. Evaluasi Landing Page & Checkout: ${diagnostics.pillars[1]?.honestDiagnosis || ""}`,
          `4. Rencana Meta Ads (${
            config.mode === "cuan" ? "Mode Cuan - Menunggu Persetujuan Anda" : "Mode Advance - Otonom Terkendali"
          }): Terdapat ${diagnostics.plans.length} langkah terstruktur yang siap dieksekusi di dalam batas anggaran Rp ${config.minDailyBudget.toLocaleString(
            "id-ID"
          )} s/d Rp ${config.maxDailyBudget.toLocaleString("id-ID")}/hari.`,
        ].join("\n\n");

    // 3. Mode Otonom: AI mengeksekusi sendiri aksi Meta yang lolos Guardrail (pause boncos & scale bertahap).
    //    Setiap aksi dikirim ke /api/engine/apply, yang memeriksa Guardrail lagi, membaca budget riil,
    //    lalu memanggil Meta Graph API. Status "executed" hanya diberikan jika Meta benar-benar berubah.
    const autoExecutedIds: string[] = [];
    const cronAuthorized =
      Boolean(process.env.ENGINE_CRON_SECRET) &&
      req.headers.get("x-engine-secret") === process.env.ENGINE_CRON_SECRET;
    const selfOrigin = req.nextUrl.origin || "http://localhost:3000";
    const finalPlans: WinningActionPlan[] = [];

    for (const plan of diagnostics.plans) {
      if (!cronAuthorized || !config.autonomous || config.killSwitch || !config.budgetUnitVerified || !isAutoEligible(plan) || plan.requiresCeilingReapproval) {
        finalPlans.push(plan);
        continue;
      }

      const gate = evaluateGuardrailGate({ ...plan, status: "approved", approvedBy: "engine" }, config);
      if (!gate.allowed) {
        finalPlans.push({ ...plan, status: "blocked_guardrail", executionNote: gate.reason });
        continue;
      }

      try {
        const res = await fetch(`${selfOrigin}/api/engine/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-engine-secret": process.env.ENGINE_CRON_SECRET || "" },
          body: JSON.stringify({ plan: { ...plan, approvedBy: "engine" }, config, userApproved: true, sendNotification: false }),
        });
        const json = await res.json().catch(() => ({} as any));
        if (res.ok && json.ok && json.liveExecuted) {
          autoExecutedIds.push(plan.id);
          finalPlans.push({
            ...plan,
            status: "executed",
            executedAt: new Date().toISOString(),
            executionNote: `Dieksekusi otomatis. ${json.summary || gate.reason}`,
          });
        } else {
          finalPlans.push({
            ...plan,
            status: json.blockedByGuardrail ? "blocked_guardrail" : "pending",
            executionNote: `Belum dijalankan: ${json.error || "respons Meta tidak valid"}`,
          });
        }
      } catch (err: any) {
        finalPlans.push({
          ...plan,
          status: "pending",
          executionNote: `Ditunda, koneksi ke layanan eksekusi gagal: ${err?.message || "tidak diketahui"}`,
        });
      }
    }

    // 4. Kirim Notifikasi ke WhatsApp & Telegram bila diminta
    let notificationResult = null;
    if (body.sendNotification) {
      const notifMessage = [
        `[LAPORAN MONEFYI WINNING ENGINE - ${
          config.mode === "cuan" ? "MODE CUAN" : "MODE ADVANCE"
        }]`,
        `Skor Kesehatan 5 Pilar: ${diagnostics.overallScore}/100`,
        ...diagnostics.pillars.map((p) => `- ${p.label}: ${p.score}/100 (${p.headlineMetric})`),
        ``,
        `Rencana Tindakan Siap: ${finalPlans.filter((p) => p.status === "pending").length} menunggu persetujuan${
          autoExecutedIds.length > 0 ? `, ${autoExecutedIds.length} dieksekusi otomatis` : ""
        }.`,
        `Buka dashboard Monefyi > tab Winning Engine untuk meninjau & menyetujui rencana.`,
      ].join("\n");

      notificationResult = await dispatchEngineNotification(
        notifMessage,
        config.notifications
      );
    }

    // 5. Simpan snapshot hasil analisa selesai ke Supabase Cloud
    await supabase
      .from("winning_engine_config")
      .update({
        batch_status: "completed",
        batch_completed_at: new Date().toISOString(),
        last_executive_brief: executiveBrief,
        last_pillars: diagnostics.pillars,
        last_plans: [...finalPlans, ...carriedExecuted.filter((p) => !finalPlans.some((f) => f.id === p.id))],
        updated_at: new Date().toISOString(),
      })
      .eq("id", "default");

    return NextResponse.json({
      ok: true,
      status: "ready",
      isBatch: false,
      timestamp: new Date().toISOString(),
      mode: config.mode,
      overallScore: diagnostics.overallScore,
      pillars: diagnostics.pillars,
      plans: finalPlans,
      learnings: diagnostics.learnings,
      dataAudit: diagnostics.dataAudit,
      reconciliation: diagnostics.reconciliation,
      verdicts: diagnostics.verdicts,
      breakEven: diagnostics.breakEven,
      portfolio: diagnostics.portfolio,
      configWarnings: diagnostics.configWarnings,
      analysisWindowDays: config.analysisWindowDays,
      executiveBrief,
      llmInfo: {
        strategistProvider: llmStrategistResult.providerUsed,
        strategistModel: llmStrategistResult.modelUsed,
        processorModel: config.llmRouting.processor?.model || "openai/gpt-6-luna-pro",
        technicalProvider: "OpenRouter",
        technicalModel: config.llmRouting.technical?.model || "openai/gpt-6-luna-pro",
      },
      autoExecutedCount: autoExecutedIds.length,
      notificationResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Gagal menjalankan siklus analisa Winning Engine.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  const auth = await requireEngineAuth(req, { allowCron: true });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  // Lock: dua analisa tidak boleh berjalan bersamaan (pg_cron dan klik manual bisa bertabrakan)
  const locked = await acquireRunLock("tick");
  if (!locked) {
    return NextResponse.json(
      { ok: false, error: "Analisa lain sedang berjalan. Coba lagi dalam beberapa menit." },
      { status: 423 }
    );
  }
  try {
    return await handleTick(req);
  } finally {
    await releaseRunLock("tick");
  }
}
