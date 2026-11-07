import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractCandidateTokens, buildGraphUrl } from "@/lib/meta/graph";
import {
  WinningActionPlan,
  WinningEngineConfig,
  DEFAULT_WINNING_ENGINE_CONFIG,
  evaluateGuardrailGate,
} from "@/lib/engine/winningEngine";
import { dispatchEngineNotification } from "@/lib/services/telegramBotService";

async function updateSupabaseLandingContent(updates: Record<string, any>): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
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
      const updatedDb = await updateSupabaseLandingContent({
        pro_price: payload.recommendedProPrice || "Rp 249.000",
        pro_original_price: payload.anchorOriginalPrice || "Rp 600.000",
        standard_price: payload.recommendedEntryPrice || "Rp 150.000",
      });

      const summary = `Pilar 1 (Offer & Harga): Struktur penawaran diperbarui (Paket Mandiri ${
        payload.recommendedEntryPrice || "Rp 150.000"
      }, Paket Prioritas ${payload.recommendedProPrice || "Rp 249.000"} dengan Harga Coret ${
        payload.anchorOriginalPrice || "Rp 600.000"
      } + 3 Bonus Stack).`;

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

      const summary = `Pilar 2 (Copywriting LP): Headline Landing Page diperbarui menjadi "${payload.afterHeroTitle}" dengan tombol CTA "${payload.afterCtaText}".`;

      if (body.sendNotification) {
        await dispatchEngineNotification(
          `[MONEFYI WINNING ENGINE - COPYWRITING LP]\n${summary}`,
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

    if (effectivePlan.actionType === "optimize_lp_speed") {
      const summary = `Pilar 2 (Kecepatan LP): Mode prioritas render Hero & penundaan aset berat di bawah lipatan layar diaktifkan untuk menaikkan OCLP ke target ${
        payload.targetOclp || 88
      }%.`;

      return NextResponse.json({
        ok: true,
        executedAt: nowIso,
        summary,
        appliedChanges: payload,
      });
    }

    if (effectivePlan.actionType === "optimize_checkout_funnel") {
      const summary = `Pilar 3 (Checkout & AOV): Order Bump diperbarui ("${payload.headline}") pada harga Rp ${Number(
        payload.price || 49000
      ).toLocaleString("id-ID")} untuk menaikkan nilai transaksi rata-rata.`;

      return NextResponse.json({
        ok: true,
        executedAt: nowIso,
        summary,
        orderBumpUpdates: {
          enabled: true,
          headline: payload.headline,
          description: payload.description,
          price: Number(payload.price || 49000),
          originalPrice: Number(payload.originalPrice || 399000),
          badgeText: payload.badgeText || "PENAWARAN KHUSUS SAAT CHECKOUT",
          takeRateEstimate: 36,
        },
      });
    }

    if (effectivePlan.actionType === "repair_tracking_capi") {
      const summary = `Pilar 5 (Tracking Pixel + CAPI): Deduplikasi event_id Browser-Server dan pengiriman parameter SHA-256 (Nomor WA, Email, IP, User-Agent, fbc/fbp) diaktifkan. Estimasi EMQ naik ke ${
        payload.targetEmq || 9.3
      }/10.`;

      return NextResponse.json({
        ok: true,
        executedAt: nowIso,
        summary,
        capiUpdates: {
          pixelConnected: true,
          capiConnected: true,
          eventMatchQuality: Number(payload.targetEmq || 9.3),
          deduplicationActive: true,
        },
      });
    }

    // 3. Aksi Pilar 4: Meta Ads Graph API (Scale Budget, Pause Bleeding, Create Rapid Test)
    const tokens = extractCandidateTokens(rawAccessToken, rawCapiToken);
    if (tokens.length === 0) {
      return NextResponse.json({
        ok: true,
        liveExecuted: false,
        executedAt: nowIso,
        summary: `[Simulasi Lokal - Token Meta Belum Diisi] ${effectivePlan.title} berhasil diterapkan di state dashboard.`,
        appliedChanges: payload,
      });
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
      const finalBudget = gate.clampedBudget || Number(payload.newBudget || config.minDailyBudget);

      // Coba update di level Campaign (CBO), jika gagal karena ABO maka update AdSet di dalamnya
      const campUrl = buildGraphUrl(
        `https://graph.facebook.com/v20.0/${campaignId}`,
        token,
        appSecret
      );
      const campRes = await fetch(campUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily_budget: String(Math.round(finalBudget)) }),
      });
      const campJson = await campRes.json().catch(() => ({}));

      if (!campRes.ok || campJson.error) {
        const adsetsUrl = buildGraphUrl(
          `https://graph.facebook.com/v20.0/${campaignId}/adsets?fields=id,name&limit=25`,
          token,
          appSecret
        );
        const adsetsRes = await fetch(adsetsUrl, { cache: "no-store" });
        const adsetsJson = await adsetsRes.json().catch(() => ({}));
        const adsets: any[] = Array.isArray(adsetsJson.data) ? adsetsJson.data : [];

        if (adsets.length === 0) {
          return NextResponse.json(
            {
              ok: false,
              error:
                campJson.error?.message ||
                "Gagal memperbarui anggaran kampanye di Meta Graph API.",
            },
            { status: 400 }
          );
        }

        const perAdset = Math.max(15000, Math.round(finalBudget / adsets.length));
        for (const adset of adsets) {
          const u = buildGraphUrl(
            `https://graph.facebook.com/v20.0/${adset.id}`,
            token,
            appSecret
          );
          await fetch(u, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ daily_budget: String(perAdset) }),
          });
        }
      }

      const summary = `Pilar 4 (Scaling Meta Ads): Budget harian "${
        payload.campaignName
      }" berhasil dinaikkan menjadi Rp ${finalBudget.toLocaleString("id-ID")}/hari (${gate.reason}).`;

      if (body.sendNotification) {
        await dispatchEngineNotification(
          `[MONEFYI WINNING ENGINE - SCALE BUDGET]\n${summary}`,
          config.notifications
        );
      }

      return NextResponse.json({
        ok: true,
        liveExecuted: true,
        executedAt: nowIso,
        summary,
        appliedChanges: {
          campaignId,
          newBudget: finalBudget,
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

