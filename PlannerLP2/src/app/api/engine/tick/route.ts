import { NextRequest, NextResponse } from "next/server";
import {
  runFivePillarDiagnostics,
  WinningEngineConfig,
  DEFAULT_WINNING_ENGINE_CONFIG,
  evaluateGuardrailGate,
} from "@/lib/engine/winningEngine";
import { runRoutedLlm } from "@/lib/engine/llmRouter";
import { dispatchEngineNotification } from "@/lib/services/telegramBotService";

/**
 * Endpoint utama Monefyi Holistic Winning Engine (/api/engine/tick).
 * Dapat dipanggil oleh:
 * 1. Supabase pg_cron setiap 30 menit (otomatis di belakang layar).
 * 2. Tombol "Analisa 5 Pilar & Susun Rencana Winning" di Dashboard Admin.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const campaigns = Array.isArray(body.campaigns) ? body.campaigns : [];
    const insightsData = body.insightsData || null;
    const orderBumpConfig = body.orderBumpConfig || undefined;
    const upsellConfig = body.upsellConfig || undefined;
    const capiStatus = body.capiStatus || undefined;
    const currentLpCopy = body.currentLpCopy || undefined;

    const config: WinningEngineConfig = {
      ...DEFAULT_WINNING_ENGINE_CONFIG,
      ...(body.config || {}),
      llmRouting: {
        strategist: {
          ...DEFAULT_WINNING_ENGINE_CONFIG.llmRouting.strategist,
          ...(body.config?.llmRouting?.strategist || {}),
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

    // 1. Jalankan Diagnosa Deterministik 5 Pilar Winning
    const diagnostics = runFivePillarDiagnostics({
      campaigns,
      insightsData,
      orderBumpConfig,
      upsellConfig,
      capiStatus,
      config,
      currentLpCopy,
    });

    // 2. Panggil AI Strategist (Gemini 2.5 Pro / Claude) untuk menyusun Ringkasan Eksekutif 10-Tahun Expert
    //    serta validasi mendalam terhadap 5 pilar
    const systemPrompt = `Anda adalah Monefyi Winning Engine (Facebook/Meta Ads & Growth Expert pengalaman 10 tahun mengelola budget hingga miliaran Rupiah).
KONTEKS PRODUK YANG DIJUAL:
- Produk Inti: Monefyi Estimator (website: estimator.monefyi.com)
- Target Audiens Iklan: Kontraktor Umum, Interior Designer, Kitchen Set Vendor, dan Subkontraktor Sipil.
- Nilai & Masalah Utama: Kontraktor sering kalah tender atau telat closing karena butuh 2-3 hari hitung RAB manual di rumah. Monefyi Estimator memampukan mereka hitung harga akurat dalam 1 menit langsung di HP saat survei lokasi, lalu kirim PDF penawaran berlogo ke WhatsApp klien sebelum mereka sempat membandingkan dengan vendor lain.
- Struktur Harga: Sekali Bayar (Lifetime) — Paket Standard Rp 93.000 / Rp 150.000, Paket Pro Rp 199.000 / Rp 250.000. Add-on Order Bump: Template Database Material & SOP Rp 49.000.
PERINGATAN PENTING: JANGAN menyamakan produk ini dengan aplikasi pengatur keuangan pribadi atau chat bot personal finance monefyi.com. Segala evaluasi Offer, Copywriting Landing Page, Funnel, dan Iklan WAJIB 100% berfokus pada Monefyi Estimator (estimator.monefyi.com) untuk kontraktor/interior.

ATURAN KOMUNIKASI WAJIB:
1. DILARANG menggunakan emoticon/emoji sama sekali.
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

    const userPrompt = `Skor Keseluruhan 5 Pilar: ${diagnostics.overallScore}/100
Detail 5 Pilar:
${diagnostics.pillars
  .map((p) => `- ${p.label}: Skor ${p.score}/100 (${p.headlineMetric}) -> ${p.honestDiagnosis}`)
  .join("\n")}

Jumlah Rencana Tindakan yang Disiapkan: ${diagnostics.plans.length}
 Susun ringkasan strategis singkat (tanpa emoticon) agar user langsung mengerti apa yang terjadi dan mengapa rencana di bawah perlu disetujui.`;

    const llmStrategistResult = await runRoutedLlm({
      role: "strategist",
      systemPrompt,
      userPrompt,
      routing: config.llmRouting,
      temperature: 0.3,
      maxTokens: 900,
    });

    const executiveBrief = llmStrategistResult.ok
      ? llmStrategistResult.text
      : [
          `1. Diagnosa 5 Pilar: Skor kesiapan sistem berada di ${diagnostics.overallScore}/100. Fokus utama adalah menyelaraskan kekuatan Offer, kecepatan/copywriting Landing Page, dan disiplin alokasi anggaran iklan.`,
          `2. Evaluasi Produk & Offer: ${diagnostics.pillars[0]?.honestDiagnosis || ""}`,
          `3. Evaluasi Landing Page & Checkout: ${diagnostics.pillars[1]?.honestDiagnosis || ""}`,
          `4. Rencana Meta Ads (${
            config.mode === "cuan" ? "Mode Cuan - Menunggu Persetujuan Anda" : "Mode Advance - Otonom Terkendali"
          }): Terdapat ${diagnostics.plans.length} langkah terstruktur yang siap dieksekusi di dalam batas anggaran Rp ${config.minDailyBudget.toLocaleString(
            "id-ID"
          )} s/d Rp ${config.maxDailyBudget.toLocaleString("id-ID")}/hari.`,
        ].join("\n\n");

    // 3. Jika Mode Advance aktif + Master Plan sudah disetujui + Kill-Switch mati,
    //    evaluasi rencana yang bisa dieksekusi otomatis di dalam Guardrail
    const autoExecutedIds: string[] = [];
    const finalPlans = diagnostics.plans.map((plan) => {
      if (
        config.mode === "advance" &&
        config.advanceMasterPlanApproved &&
        !config.killSwitch &&
        !plan.requiresCeilingReapproval
      ) {
        const gate = evaluateGuardrailGate({ ...plan, status: "approved" }, config);
        if (
          gate.allowed &&
          (plan.actionType === "optimize_lp_speed" ||
            plan.actionType === "repair_tracking_capi" ||
            plan.actionType === "pause_bleeding_campaign" ||
            plan.actionType === "scale_campaign_budget")
        ) {
          autoExecutedIds.push(plan.id);
          return {
            ...plan,
            status: "executed" as const,
            executedAt: new Date().toISOString(),
            executionNote: `Dieksekusi otomatis oleh Mode Advance (${gate.reason})`,
          };
        }
      }
      return plan;
    });

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

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      mode: config.mode,
      overallScore: diagnostics.overallScore,
      pillars: diagnostics.pillars,
      plans: finalPlans,
      learnings: diagnostics.learnings,
      executiveBrief,
      llmInfo: {
        strategistProvider: llmStrategistResult.providerUsed,
        strategistModel: llmStrategistResult.modelUsed,
        technicalProvider: config.llmRouting.technical.provider.toUpperCase(),
        technicalModel: config.llmRouting.technical.model || "gemini-2.5-flash",
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

