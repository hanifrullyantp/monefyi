import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { NextRequest, NextResponse } from "next/server";
import { hasSucceededToday, logEngineAction, wibDate, acquireRunLock, releaseRunLock, checkManualLiveChange, loadServerGuardrails } from "@/lib/engine/engineDb";
import { createClient } from "@supabase/supabase-js";
import { readLiveBudget, setDailyBudget, MIN_ADSET_BUDGET } from "@/lib/engine/metaBudget";
import { findTemplateCreative, createPausedAdVariant, countCreatedAdsToday } from "@/lib/engine/adCreation";
import { extractCandidateTokens, buildGraphUrl } from "@/lib/meta/graph";
import {
  WinningActionPlan,
  WinningEngineConfig,
  DEFAULT_WINNING_ENGINE_CONFIG,
  evaluateGuardrailGate,
  MONEFYI_PRICING,
} from "@/lib/engine/winningEngine";
import { dispatchEngineNotification } from "@/lib/services/telegramBotService";

async function updateSupabaseLandingContent(updates: Record<string, any>): Promise<boolean> {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zzwqfmdyncxbolestkqp.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d3FmbWR5bmN4Ym9sZXN0a3FwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM0Mjc5NCwiZXhwIjoyMDgxOTE4Nzk0fQ.nQWJJiUTu5YjDcOFI3I1-I1Yf3FFW7_-uNiQXL7RkM8";
  if (!supabaseUrl || !supabaseKey) return false;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase
      .from("landing_page_content")
      .update(updates)
      .eq("id", 1);
    return !error;
  } catch {
    return false;
  }
}

const LIVE_ACTIONS = new Set([
  "pause_bleeding_campaign",
  "scale_campaign_budget",
  "adjust_budget_to_range",
  "create_rapid_test_campaign",
  "create_ad_variant",
  "update_lp_copy",
]);

async function handleApply(req: NextRequest, preBody?: any) {
  try {
    const body = preBody ?? (await req.json().catch(() => ({})));
    const plan: WinningActionPlan | undefined = body.plan;
    const config: WinningEngineConfig = {
      ...DEFAULT_WINNING_ENGINE_CONFIG,
      ...(body.config || {}),
    };
    const userApproved: boolean = Boolean(body.userApproved);
    const rawAccessToken = body.accessToken || process.env.META_ACCESS_TOKEN || "";
    const rawCapiToken = body.capiAccessToken || process.env.META_CAPI_TOKEN || "";
    const adAccountIdRaw = (body.adAccountId || process.env.META_AD_ACCOUNT_ID || "").trim();
    const appSecret = (body.appSecret || process.env.META_APP_SECRET || "").trim() || undefined;

    if (!plan) {
      return NextResponse.json(
        { ok: false, error: "Rencana aksi (plan) tidak ditemukan dalam permintaan." },
        { status: 400 }
      );
    }

    // Tandai approved bila user menekan tombol Setujui & Jalankan
    const effectivePlan: WinningActionPlan = {
      ...plan,
      status: userApproved ? "approved" : plan.status,
      requiresCeilingReapproval: userApproved ? false : plan.requiresCeilingReapproval,
    };

    // 1. Cek Guardrail Server
    const gate = evaluateGuardrailGate(effectivePlan, config);
    if (!gate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          blockedByGuardrail: true,
          requiresUserReapproval: gate.requiresUserReapproval,
          error: gate.reason,
        },
        { status: 403 }
      );
    }

    const payload = effectivePlan.actionPayload || {};
    const nowIso = new Date().toISOString();

    // 2. Eksekusi berdasarkan jenis aksi 5 Pilar
    if (effectivePlan.actionType === "update_offer_pricing") {
      // Harga cadangan memakai konstanta resmi yang sama dengan engine. Tidak ada angka terpisah di route ini.
      const rpText = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
      const proPrice = payload.recommendedProPrice || rpText(MONEFYI_PRICING.proPrice);
      const proOriginalPrice = payload.anchorOriginalPrice || rpText(MONEFYI_PRICING.proRegularPrice);
      const standardPrice = payload.recommendedEntryPrice || rpText(MONEFYI_PRICING.standardPrice);

      const updatedDb = await updateSupabaseLandingContent({
        pro_price: proPrice,
        pro_original_price: proOriginalPrice,
        standard_price: standardPrice,
      });

      const summary = `Pilar 1 (Offer & Harga): harga landing page diselaraskan (Paket Standard ${standardPrice}, Paket Pro ${proPrice} dengan harga coret ${proOriginalPrice}).`;

      if (body.sendNotification) {
        await dispatchEngineNotification(
          `[MONEFYI WINNING ENGINE - EKSEKUSI OFFER]\n${summary}`,
          config.notifications
        );
      }

      return NextResponse.json({
        ok: true,
        executedAt: nowIso,
        persistedToDb: updatedDb,
        summary,
        appliedChanges: payload,
      });
    }

    if (effectivePlan.actionType === "update_lp_copy") {
      const updatedDb = await updateSupabaseLandingContent({
        hero_title: payload.afterHeroTitle,
        hero_subtitle: payload.afterHeroSubtitle,
        cta_button_text: payload.afterCtaText,
      });

      const summary = updatedDb
        ? `Pilar 2 (Copywriting LP): Headline Landing Page diperbarui menjadi "${payload.afterHeroTitle}" dengan tombol CTA "${payload.afterCtaText}".`
        : "Pilar 2 (Copywriting LP): Gagal menyimpan pembaruan copywriting ke database landing page.";

      if (updatedDb && body.sendNotification) {
        await dispatchEngineNotification(
          `[MONEFYI WINNING ENGINE - COPYWRITING LP]\n${summary}`,
          config.notifications
        );
      }

      return NextResponse.json({
        ok: updatedDb,
        liveExecuted: updatedDb,
        executedAt: nowIso,
        persistedToDb: updatedDb,
        summary,
        appliedChanges: payload,
      }, { status: updatedDb ? 200 : 500 });
    }

    // Aksi Pilar 2 (kecepatan LP), Pilar 3 (order bump), dan Pilar 5 (CAPI) belum punya eksekutor otomatis.
    // Respons jujur: liveExecuted=false dan manualActionRequired=true, sehingga UI dan notifikasi tidak menganggap sudah berubah.
    if (effectivePlan.actionType === "optimize_lp_speed") {
      return NextResponse.json({
        ok: true,
        liveExecuted: false,
        manualActionRequired: true,
        executedAt: nowIso,
        summary: `Pilar 2 (Kecepatan LP): Belum ada eksekutor otomatis. Dicatat sebagai rekomendasi manual untuk estimator.monefyi.com (target OCLP ${payload.targetOclp || 88}%).`,
        appliedChanges: payload,
      });
    }

    if (effectivePlan.actionType === "optimize_checkout_funnel") {
      return NextResponse.json({
        ok: true,
        liveExecuted: false,
        persisted: false,
        manualActionRequired: true,
        executedAt: nowIso,
        summary: `Pilar 3 (Checkout & AOV): Usulan Order Bump "${payload.headline}" dicatat dan belum diterapkan ke checkout. Perlu diterapkan manual.`,
        proposedOrderBump: {
          headline: payload.headline,
          description: payload.description,
          price: Number(payload.price || MONEFYI_PRICING.orderBumpUpgradePrice),
          originalPrice: Number(payload.originalPrice || MONEFYI_PRICING.orderBumpOriginalPrice),
          badgeText: payload.badgeText || "PENAWARAN KHUSUS SAAT CHECKOUT",
        },
      });
    }

    if (effectivePlan.actionType === "repair_tracking_capi") {
      return NextResponse.json({
        ok: true,
        liveExecuted: false,
        manualActionRequired: true,
        executedAt: nowIso,
        summary: `Pilar 5 (Tracking Pixel + CAPI): Belum ada eksekutor otomatis. Perbaikan event_id dan parameter hash perlu dikerjakan manual (target EMQ ${payload.targetEmq || 9.3}/10).`,
        appliedChanges: payload,
      });
    }

    // 3. Aksi Pilar 4: Meta Ads Graph API (Scale Budget, Pause Bleeding, Create Rapid Test)
    const tokens = extractCandidateTokens(rawAccessToken, rawCapiToken);
    if (tokens.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          liveExecuted: false,
          error: "Token Meta belum diisi. Tidak ada perubahan yang dikirim ke Meta Ads.",
        },
        { status: 400 }
      );
    }

    const token = tokens[0];

    if (effectivePlan.actionType === "pause_bleeding_campaign") {
      const campaignId = String(payload.campaignId || "").trim();
      const url = buildGraphUrl(
        `https://graph.facebook.com/v20.0/${campaignId}`,
        token,
        appSecret
      );
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAUSED" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        return NextResponse.json(
          {
            ok: false,
            error: json.error?.message || "Gagal mem-pause kampanye di Meta Graph API.",
          },
          { status: 400 }
        );
      }

      const summary = `Pilar 4 (Meta Ads): Kampanye boncos "${payload.campaignName}" berhasil di-PAUSE langsung di Meta Ads Manager.`;
      if (body.sendNotification) {
        await dispatchEngineNotification(
          `[MONEFYI WINNING ENGINE - CUT LOSER]\n${summary}`,
          config.notifications
        );
      }

      return NextResponse.json({
        ok: true,
        liveExecuted: true,
        executedAt: nowIso,
        summary,
        appliedChanges: { campaignId, newStatus: "PAUSED" },
      });
    }

    if (
      effectivePlan.actionType === "scale_campaign_budget" ||
      effectivePlan.actionType === "adjust_budget_to_range"
    ) {
      const campaignId = String(payload.campaignId || "").trim();

      // 1. Baca budget riil dari Meta (tidak menebak)
      const current = await readLiveBudget(campaignId, token, appSecret);
      if (!current.ok) {
        return NextResponse.json({ ok: false, liveExecuted: false, error: current.error }, { status: 400 });
      }

      // 2. Periksa ulang guardrail dengan budget riil
      const liveGate = evaluateGuardrailGate(
        { ...effectivePlan, actionPayload: { ...payload, currentBudget: current.total } },
        config
      );
      if (!liveGate.allowed) {
        return NextResponse.json(
          {
            ok: false,
            blockedByGuardrail: true,
            liveExecuted: false,
            requiresUserReapproval: liveGate.requiresUserReapproval,
            error: liveGate.reason,
          },
          { status: 403 }
        );
      }

      const finalBudget = Math.round(Number(liveGate.clampedBudget || payload.newBudget || current.total));
      const factor = finalBudget / current.total;
      const changed: { id: string; from: number; to: number }[] = [];
      const failures: string[] = [];

      if (current.mode === "CBO") {
        const r = await setDailyBudget(campaignId, finalBudget, token, appSecret);
        if (r.ok) changed.push({ id: campaignId, from: current.total, to: finalBudget });
        else failures.push(r.error);
      } else {
        // ABO: pertahankan proporsi antar ad set, jangan samakan rata
        for (const adset of current.adsets) {
          const to = Math.max(MIN_ADSET_BUDGET, Math.round(adset.daily_budget * factor));
          const r = await setDailyBudget(adset.id, to, token, appSecret);
          if (r.ok) changed.push({ id: adset.id, from: adset.daily_budget, to });
          else failures.push(`${adset.name}: ${r.error}`);
        }
      }

      if (failures.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            liveExecuted: changed.length > 0,
            partialFailure: changed.length > 0,
            changed,
            error: `Sebagian perubahan gagal di Meta: ${failures.join(" | ")}`,
          },
          { status: 400 }
        );
      }

      const summary = `Pilar 4 (Scaling Meta Ads): Budget harian "${payload.campaignName}" dinaikkan dari Rp ${current.total.toLocaleString(
        "id-ID"
      )} menjadi Rp ${finalBudget.toLocaleString("id-ID")} (${liveGate.reason})`;

      if (body.sendNotification) {
        await dispatchEngineNotification(`[MONEFYI WINNING ENGINE - SCALE BUDGET]\n${summary}`, config.notifications);
      }

      return NextResponse.json({
        ok: true,
        liveExecuted: true,
        executedAt: nowIso,
        summary,
        appliedChanges: {
          campaignId,
          previousBudget: current.total,
          newBudget: finalBudget,
          changed,
        },
      });
    }

    if (effectivePlan.actionType === "create_rapid_test_campaign") {
      if (!adAccountIdRaw) {
        return NextResponse.json(
          { ok: false, error: "Ad Account ID belum diatur untuk membuat kampanye testing." },
          { status: 400 }
        );
      }
      const actId = adAccountIdRaw.startsWith("act_")
        ? adAccountIdRaw
        : `act_${adAccountIdRaw}`;
      const createUrl = buildGraphUrl(
        `https://graph.facebook.com/v20.0/${actId}/campaigns`,
        token,
        appSecret
      );
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name || "[WINNING ENGINE TEST] Rapid Testing Campaign",
          objective: payload.objective || "OUTCOME_SALES",
          status: "PAUSED",
          special_ad_categories: [],
          daily_budget: String(
            Math.round(gate.clampedBudget || payload.dailyBudget || config.minDailyBudget)
          ),
        }),
      });
      const createJson = await createRes.json().catch(() => ({}));
      if (!createRes.ok || createJson.error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              createJson.error?.message ||
              "Gagal membuat draf kampanye Rapid Testing di Meta Ads Manager.",
          },
          { status: 400 }
        );
      }

      const summary = `Pilar 4 (Rapid Testing): Kampanye "${payload.name}" (ID: ${createJson.id}) berhasil dibuat di Meta Ads Manager dalam status PAUSED (Aman).`;
      if (body.sendNotification) {
        await dispatchEngineNotification(
          `[MONEFYI WINNING ENGINE - RAPID TESTING]\n${summary}`,
          config.notifications
        );
      }

      return NextResponse.json({
        ok: true,
        liveExecuted: true,
        executedAt: nowIso,
        createdCampaignId: createJson.id,
        summary,
      });
    }

    if (effectivePlan.actionType === "create_ad_variant") {
      const actRaw = adAccountIdRaw || process.env.META_AD_ACCOUNT_ID || "";
      if (!actRaw) {
        return NextResponse.json(
          { ok: false, error: "Ad Account ID belum diatur untuk membuat varian iklan." },
          { status: 400 }
        );
      }
      const adsetId = String(payload.adsetId || "").trim();
      const headline = String(payload.headline || "").trim();
      const primaryText = String(payload.primaryText || "").trim();
      if (!adsetId || !headline || !primaryText) {
        return NextResponse.json(
          { ok: false, error: "adsetId, headline, dan primaryText wajib diisi untuk membuat iklan baru." },
          { status: 400 }
        );
      }
      const createdToday = await countCreatedAdsToday();
      if (createdToday >= 2) {
        return NextResponse.json(
          { ok: false, error: "Batas harian pembuatan iklan baru (maks 2/hari) sudah tercapai." },
          { status: 429 }
        );
      }
      const creds = { token, capiToken: rawCapiToken || undefined, appSecret };
      const tmpl = await findTemplateCreative({ actId: actRaw, adsetId, creds });
      if (!tmpl.ok) {
        return NextResponse.json({ ok: false, error: tmpl.error }, { status: 400 });
      }
      const created = await createPausedAdVariant({
        actId: actRaw,
        adsetId,
        name: String(payload.adName || `[EXPERT] ${headline.slice(0, 40)}`),
        headline,
        primaryText,
        template: tmpl.template,
        creds,
      });
      if (!created.ok) {
        return NextResponse.json({ ok: false, error: created.error }, { status: 400 });
      }
      const summary = `Pilar 4 (Varian Iklan Baru): Iklan "${headline}" berhasil dibuat di Ad Set ${adsetId} dalam status PAUSED (ID: ${created.adId}).`;
      if (body.sendNotification) {
        await dispatchEngineNotification(`[MONEFYI WINNING ENGINE - IKLAN BARU PAUSED]\n${summary}`, config.notifications);
      }
      return NextResponse.json({
        ok: true,
        liveExecuted: true,
        executedAt: nowIso,
        createdAdId: created.adId,
        creativeId: created.creativeId,
        summary,
        appliedChanges: { campaignId: adsetId, campaignName: headline },
      });
    }

    return NextResponse.json({
      ok: true,
      executedAt: nowIso,
      summary: `Rencana "${effectivePlan.title}" berhasil disetujui dan dicatat.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Terjadi kesalahan saat mengeksekusi rencana Winning Engine.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireEngineAuth(req, { allowCron: true });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const plan = body?.plan as WinningActionPlan | undefined;

  // Guardrail diambil dari server. Nilai di body klien diabaikan untuk kill switch dan batas budget.
  const serverGuard = await loadServerGuardrails();
  if (!serverGuard) {
    return NextResponse.json(
      { ok: false, liveExecuted: false, blockedByGuardrail: true, error: "Guardrail tidak terbaca dari database. Eksekusi dibatalkan." },
      { status: 503 }
    );
  }
  body.config = {
    ...(body.config || {}),
    killSwitch: serverGuard.killSwitch,
    approvedDailyCeiling: serverGuard.approvedDailyCeiling,
    minDailyBudget: serverGuard.minDailyBudget,
    maxDailyBudget: serverGuard.maxDailyBudget || (body.config?.maxDailyBudget ?? serverGuard.minDailyBudget),
  };
  const idempotencyKey = plan ? `${plan.id}:${wibDate()}` : null;

  // Satu aksi live per rencana per hari. Mencegah eksekusi dobel saat run bertumpuk.
  if (plan && idempotencyKey && LIVE_ACTIONS.has(plan.actionType) && (await hasSucceededToday(idempotencyKey))) {
    return NextResponse.json({
      ok: true,
      liveExecuted: false,
      duplicate: true,
      summary: "Aksi ini sudah dijalankan hari ini, dilewati agar tidak dobel.",
    });
  }

  const res = await handleApply(req, body);

  if (plan) {
    try {
      const json = await res.clone().json();
      const applied = json.appliedChanges || {};
      await logEngineAction({
        source: auth.via === "cron" ? "cron" : "manual",
        actor: auth.via === "cron" ? "engine" : auth.email || "admin",
        actionType: plan.actionType,
        planId: plan.id,
        idempotencyKey: json.liveExecuted ? idempotencyKey : null,
        campaignId: String(applied.campaignId || plan.actionPayload?.campaignId || ""),
        campaignName: String(plan.actionPayload?.campaignName || ""),
        ok: Boolean(json.ok),
        liveExecuted: Boolean(json.liveExecuted),
        beforeValue: applied.previousBudget ?? null,
        afterValue: applied.newBudget ?? null,
        summary: json.summary || json.error || "",
        response: { ...json, evidence: plan.actionPayload?.evidence ?? null },
      });
    } catch {
      /* respons tidak bisa dibaca untuk log; aksi tetap sudah diproses */
    }
  }
  return res;
}
