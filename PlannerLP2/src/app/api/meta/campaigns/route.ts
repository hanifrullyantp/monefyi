import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractCandidateTokens, buildGraphUrl } from "@/lib/meta/graph";
import { DEFAULT_WINNING_ENGINE_CONFIG, resolveLearningState } from "@/lib/engine/winningEngine";

// Sumber kebenaran ambang yang sama dengan engine (sebelumnya angka 85.000 di sini tidak sinkron)
const TARGET_CPA = DEFAULT_WINNING_ENGINE_CONFIG.targetCpa;


interface MetaActionItem {
  action_type: string;
  value: string | number;
}

function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zzwqfmdyncxbolestkqp.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Menarik data kampanye, adset (untuk membaca budget ABO & targeting), serta insights riil dari Meta Graph API v20.0.
 */
async function fetchRealCampaignsForAccount(
  actId: string,
  token: string,
  datePreset: string = "last_14d",
  currency: string = "IDR",
  appSecret?: string
) {
  // Jendela tanggal harus eksplisit. Tidak ada fallback ke data lifetime agar iklan lama tidak ikut terbaca.
  const validPresets = [datePreset];
  const uniquePresets = Array.from(new Set(validPresets.filter(Boolean)));

  // 1. Ambil daftar Campaigns riil dari Meta
  const campaignsUrl = buildGraphUrl(
    `https://graph.facebook.com/v20.0/${actId}/campaigns?fields=id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time,updated_time&limit=100`,
    token,
    appSecret
  );

  // 2. Ambil daftar AdSets riil (karena mayoritas iklan mengatur budget harian di level AdSet / ABO)
  const adsetsUrl = buildGraphUrl(
    `https://graph.facebook.com/v20.0/${actId}/adsets?fields=id,name,campaign_id,daily_budget,lifetime_budget,status,effective_status,optimization_goal,learning_stage_info&limit=150`,
    token,
    appSecret
  );

  // 3. Ambil daftar Ads riil (iklan & materi kreatif)
  const adsUrl = buildGraphUrl(
    `https://graph.facebook.com/v20.0/${actId}/ads?fields=id,name,campaign_id,adset_id,status,effective_status,creative{id,name,title,body,image_url,thumbnail_url}&limit=200`,
    token,
    appSecret
  );

  const [campRes, adsetRes, adsRes] = await Promise.all([
    fetch(campaignsUrl, { cache: "no-store" }),
    fetch(adsetsUrl, { cache: "no-store" }).catch(() => null),
    fetch(adsUrl, { cache: "no-store" }).catch(() => null),
  ]);

  const campJson = await campRes.json().catch(() => ({}));
  let adsetJson: any = adsetRes ? await adsetRes.json().catch(() => ({})) : {};
  // Jika Meta menolak field learning_stage_info, ulangi tanpa field itu agar budget dan ad set tetap terbaca.
  // Status learning lalu memakai perkiraan (umur dan jumlah konversi).
  if (adsetJson?.error) {
    const retryUrl = buildGraphUrl(
      `https://graph.facebook.com/v20.0/${actId}/adsets?fields=id,name,campaign_id,daily_budget,lifetime_budget,status,effective_status,optimization_goal&limit=150`,
      token,
      appSecret
    );
    const retryRes = await fetch(retryUrl, { cache: "no-store" }).catch(() => null);
    adsetJson = retryRes ? await retryRes.json().catch(() => ({})) : {};
  }
  const adsJson = adsRes ? await adsRes.json().catch(() => ({})) : {};

  if (!campRes.ok || campJson.error) {
    return {
      ok: false,
      error: campJson.error?.message || "Gagal mengambil daftar kampanye dari Meta Graph API.",
      campaigns: [],
    };
  }

  // Buang kampanye yang sudah diarsipkan/dihapus di Meta
  const rawCampaigns: any[] = (Array.isArray(campJson.data) ? campJson.data : []).filter(
    (c: any) => !["ARCHIVED", "DELETED"].includes(String(c.effective_status || "").toUpperCase())
  );
  const rawAdsets: any[] = Array.isArray(adsetJson.data) ? adsetJson.data : [];
  const rawAds: any[] = Array.isArray(adsJson.data) ? adsJson.data : [];

  // Helper untuk mengekstrak metrik dari objek insights Meta
  const extractMetricsFromInsight = (ins: any) => {
    if (!ins) return null;
    const actions: MetaActionItem[] = Array.isArray(ins.actions) ? ins.actions : [];
    const actionValues: MetaActionItem[] = Array.isArray(ins.action_values) ? ins.action_values : [];

    const getAction = (...types: string[]): number => {
      for (const t of types) {
        const found = actions.find((a) => a.action_type === t);
        if (found && Number(found.value) > 0) return Number(found.value);
      }
      return 0;
    };

    const getActionValue = (...types: string[]): number => {
      for (const t of types) {
        const found = actionValues.find((a) => a.action_type === t);
        if (found && Number(found.value) > 0) return Number(found.value);
      }
      return 0;
    };

    const spend = Math.round(Number(ins.spend || 0));
    const impressions = Number(ins.impressions || 0);
    const clicks = Number(ins.clicks || 0);
    const reach = Number(ins.reach || 0);
    const purchases = getAction(
      "omni_purchase",
      "purchase",
      "offsite_conversion.fb_pixel_purchase",
      "onsite_conversion.purchase"
    );
    const results = purchases;
    const purchasesConversionValue = Math.round(
      getActionValue("omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase")
    );
    const cpa = results > 0 ? Math.round(spend / results) : 0;
    const roas =
      spend > 0 && purchasesConversionValue > 0
        ? Number((purchasesConversionValue / spend).toFixed(2))
        : 0;
    const ctr = Number(
      ins.ctr || (impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0)
    );
    const cpc = Number(ins.cpc || (clicks > 0 ? Math.round(spend / clicks) : 0));

    const linkClicks = getAction("link_click", "outbound_click", "inline_link_clicks");
    const landingPageViews = getAction("landing_page_view", "omni_landing_page_view");
    const addsToCart = getAction("omni_add_to_cart", "add_to_cart", "offsite_conversion.fb_pixel_add_to_cart");
    const checkoutsInitiated = getAction("omni_initiated_checkout", "initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout");
    const registrationsCompleted = getAction("complete_registration", "omni_complete_registration", "offsite_conversion.fb_pixel_complete_registration");
    const costPerResult = results > 0 ? Math.round(spend / results) : 0;
    const costPerPurchase = purchases > 0 ? Math.round(spend / purchases) : 0;
    const costPerLpView = landingPageViews > 0 ? Math.round(spend / landingPageViews) : 0;
    const costPerAddToCart = addsToCart > 0 ? Math.round(spend / addsToCart) : 0;
    const costPerCheckoutInitiated = checkoutsInitiated > 0 ? Math.round(spend / checkoutsInitiated) : 0;
    const costPerRegistration = registrationsCompleted > 0 ? Math.round(spend / registrationsCompleted) : 0;
    const oclpRate = linkClicks > 0 ? Number(((landingPageViews / linkClicks) * 100).toFixed(1)) : 0;
    const lpToAtcRate = landingPageViews > 0 ? Number(((addsToCart / landingPageViews) * 100).toFixed(1)) : 0;
    const atcToIcRate = addsToCart > 0 ? Number(((checkoutsInitiated / addsToCart) * 100).toFixed(1)) : 0;
    const icToPurchaseRate = checkoutsInitiated > 0 ? Number(((purchases / checkoutsInitiated) * 100).toFixed(1)) : 0;
    const cpm = Number(ins.cpm || (impressions > 0 ? Math.round((spend / impressions) * 1000) : 0));
    const ctrLink = impressions > 0 ? Number(((linkClicks / impressions) * 100).toFixed(2)) : 0;
    const ctrAll = Number(ins.ctr || (impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0));
    const cpcLink = linkClicks > 0 ? Math.round(spend / linkClicks) : 0;
    const cpcAll = Number(ins.cpc || (clicks > 0 ? Math.round(spend / clicks) : 0));
    const videoThruPlays15s = getAction("video_view");

    return {
      spend,
      impressions,
      clicks,
      linkClicks,
      reach,
      purchases,
      results,
      purchasesConversionValue,
      cpa,
      roas,
      ctr,
      cpc,
      landingPageViews,
      addsToCart,
      checkoutsInitiated,
      registrationsCompleted,
      costPerResult,
      costPerPurchase,
      costPerLpView,
      costPerAddToCart,
      costPerCheckoutInitiated,
      costPerRegistration,
      oclpRate,
      lpToAtcRate,
      atcToIcRate,
      icToPurchaseRate,
      cpm,
      ctrLink,
      ctrAll,
      cpcLink,
      cpcAll,
      videoThruPlays15s,
    };
  };

  // 3. Ambil Insights di level campaign, adset, dan ad dengan fallback preset tanggal
  let rawInsights: any[] = [];
  let rawAdsetInsights: any[] = [];
  let rawAdInsights: any[] = [];

  for (const preset of uniquePresets) {
    try {
      const insightsUrl = buildGraphUrl(
        `https://graph.facebook.com/v20.0/${actId}/insights?level=campaign&date_preset=${encodeURIComponent(
          preset
        )}&fields=campaign_id,campaign_name,spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,action_values,cost_per_action_type,video_thruplay_watched_actions,outbound_clicks&limit=150`,
        token,
        appSecret
      );
      const insRes = await fetch(insightsUrl, { cache: "no-store" });
      const insJson = await insRes.json().catch(() => ({}));
      if (insRes.ok && Array.isArray(insJson.data)) {
        rawInsights = insJson.data;

        // Ambil juga insights level adset dan ad secara paralel untuk mengisi angka riil pada child ads
        const [adsetInsRes, adInsRes] = await Promise.all([
          fetch(
            buildGraphUrl(
              `https://graph.facebook.com/v20.0/${actId}/insights?level=adset&date_preset=${encodeURIComponent(
                preset
              )}&fields=adset_id,adset_name,spend,impressions,reach,clicks,cpc,cpm,ctr,actions,action_values&limit=150`,
              token,
              appSecret
            ),
            { cache: "no-store" }
          ).catch(() => null),
          fetch(
            buildGraphUrl(
              `https://graph.facebook.com/v20.0/${actId}/insights?level=ad&date_preset=${encodeURIComponent(
                preset
              )}&fields=ad_id,ad_name,spend,impressions,reach,clicks,cpc,cpm,ctr,actions,action_values&limit=200`,
              token,
              appSecret
            ),
            { cache: "no-store" }
          ).catch(() => null),
        ]);

        if (adsetInsRes) {
          const adsetJson = await adsetInsRes.json().catch(() => ({}));
          if (Array.isArray(adsetJson?.data)) rawAdsetInsights = adsetJson.data;
        }
        if (adInsRes) {
          const adJson = await adInsRes.json().catch(() => ({}));
          if (Array.isArray(adJson?.data)) rawAdInsights = adJson.data;
        }

        break;
      }
    } catch {
      // Coba preset berikutnya
    }
  }

  // Petakan insights berdasarkan campaign_id, adset_id, dan ad_id
  const insightsByCampaignId = new Map<string, any>();
  for (const ins of rawInsights) {
    if (ins.campaign_id) {
      insightsByCampaignId.set(String(ins.campaign_id), ins);
    }
  }

  const insightsByAdsetId = new Map<string, any>();
  for (const ins of rawAdsetInsights) {
    if (ins.adset_id) {
      insightsByAdsetId.set(String(ins.adset_id), ins);
    }
  }

  const insightsByAdId = new Map<string, any>();
  for (const ins of rawAdInsights) {
    if (ins.ad_id) {
      insightsByAdId.set(String(ins.ad_id), ins);
    }
  }

  // Jika akun memiliki data di /insights tetapi /campaigns kosong (misal boosted post tertentu), tambahkan entri dari insights
  const campaignIdsInList = new Set(rawCampaigns.map((c) => String(c.id)));
  for (const ins of rawInsights) {
    if (ins.campaign_id && !campaignIdsInList.has(String(ins.campaign_id))) {
      rawCampaigns.push({
        id: String(ins.campaign_id),
        name: ins.campaign_name || `Kampanye Meta #${ins.campaign_id}`,
        objective: "OUTCOME_SALES",
        status: "ACTIVE",
        effective_status: "ACTIVE",
      });
    }
  }

  // Kelompokkan ads per adset_id
  const adsByAdsetId = new Map<string, any[]>();
  for (const ad of rawAds) {
    const asid = String(ad.adset_id || "");
    if (!asid) continue;
    const list = adsByAdsetId.get(asid) || [];
    list.push(ad);
    adsByAdsetId.set(asid, list);
  }

  // Kelompokkan adsets per campaign_id untuk menjumlahkan budget ABO & menyimpan adsetId
  const adsetsByCampaignId = new Map<string, any[]>();
  for (const adset of rawAdsets) {
    const cid = String(adset.campaign_id || "");
    if (!cid) continue;
    const list = adsetsByCampaignId.get(cid) || [];
    list.push(adset);
    adsetsByCampaignId.set(cid, list);
  }

  const mappedCampaigns = rawCampaigns.map((item: any) => {
    const cid = String(item.id);
    const insights = insightsByCampaignId.get(cid) || item.insights?.data?.[0] || {};
    const campaignAdsets = adsetsByCampaignId.get(cid) || [];

    // Map nested ad sets and their ads dengan metrik riil
    const mappedAdsets = campaignAdsets.map((adset: any) => {
      const asId = String(adset.id);
      const adsetInsight = insightsByAdsetId.get(asId);
      const parsedAdset = extractMetricsFromInsight(adsetInsight);

      const childAds = (adsByAdsetId.get(asId) || []).map((ad: any) => {
        const adId = String(ad.id);
        const adInsight = insightsByAdId.get(adId);
        const parsedAd = extractMetricsFromInsight(adInsight);

        return {
          id: adId,
          name: ad.name || `Ad #${adId}`,
          adsetId: asId,
          campaignId: cid,
          status: ad.status || "ACTIVE",
          effectiveStatus: ad.effective_status || ad.status,
          spend: parsedAd?.spend || 0,
          impressions: parsedAd?.impressions || 0,
          clicks: parsedAd?.clicks || 0,
          linkClicks: parsedAd?.linkClicks || 0,
          reach: parsedAd?.reach || 0,
          purchases: parsedAd?.purchases || 0,
          results: parsedAd?.results || 0,
          purchasesConversionValue: parsedAd?.purchasesConversionValue || 0,
          cpa: parsedAd?.cpa || 0,
          roas: parsedAd?.roas || 0,
          ctr: parsedAd?.ctr || 0,
          cpc: parsedAd?.cpc || 0,
          landingPageViews: parsedAd?.landingPageViews || 0,
          addsToCart: parsedAd?.addsToCart || 0,
          checkoutsInitiated: parsedAd?.checkoutsInitiated || 0,
          registrationsCompleted: parsedAd?.registrationsCompleted || 0,
          costPerResult: parsedAd?.costPerResult || 0,
          costPerPurchase: parsedAd?.costPerPurchase || 0,
          costPerLpView: parsedAd?.costPerLpView || 0,
          costPerAddToCart: parsedAd?.costPerAddToCart || 0,
          costPerCheckoutInitiated: parsedAd?.costPerCheckoutInitiated || 0,
          costPerRegistration: parsedAd?.costPerRegistration || 0,
          oclpRate: parsedAd?.oclpRate || 0,
          lpToAtcRate: parsedAd?.lpToAtcRate || 0,
          atcToIcRate: parsedAd?.atcToIcRate || 0,
          icToPurchaseRate: parsedAd?.icToPurchaseRate || 0,
          cpm: parsedAd?.cpm || 0,
          ctrLink: parsedAd?.ctrLink || 0,
          ctrAll: parsedAd?.ctrAll || 0,
          cpcLink: parsedAd?.cpcLink || 0,
          cpcAll: parsedAd?.cpcAll || 0,
          videoThruPlays15s: parsedAd?.videoThruPlays15s || 0,
          creativeThumbnail: ad.creative?.thumbnail_url || ad.creative?.image_url,
          creativeTitle: ad.creative?.title || ad.creative?.name,
          creativeBody: ad.creative?.body,
        };
      });

      // Hitung agregasi dari childAds jika parsedAdset belum ada di preset
      const childSpend = childAds.reduce((acc: number, a: any) => acc + (a.spend || 0), 0);
      const childPurchases = childAds.reduce((acc: number, a: any) => acc + (a.purchases || 0), 0);
      const childClicks = childAds.reduce((acc: number, a: any) => acc + (a.clicks || 0), 0);
      const childImpressions = childAds.reduce((acc: number, a: any) => acc + (a.impressions || 0), 0);

      const adsetSpend = parsedAdset?.spend ?? childSpend;
      const adsetPurchases = parsedAdset?.purchases ?? childPurchases;
      const adsetCpa =
        parsedAdset?.cpa ?? (adsetPurchases > 0 ? Math.round(adsetSpend / adsetPurchases) : 0);

      return {
        id: asId,
        name: adset.name || `AdSet #${asId}`,
        campaignId: cid,
        status: adset.status || "ACTIVE",
        effectiveStatus: adset.effective_status || adset.status,
        dailyBudget: Number(adset.daily_budget || 0),
        lifetimeBudget: Number(adset.lifetime_budget || 0),
        spend: adsetSpend,
        impressions: parsedAdset?.impressions ?? childImpressions,
        clicks: parsedAdset?.clicks ?? childClicks,
        purchases: adsetPurchases,
        results: parsedAdset?.results ?? adsetPurchases,
        cpa: adsetCpa,
        roas: parsedAdset?.roas || 0,
        ctr: parsedAdset?.ctr || 0,
        cpc: parsedAdset?.cpc || 0,
        ads: childAds,
      };
    });

    const actions: MetaActionItem[] = Array.isArray(insights.actions) ? insights.actions : [];
    const actionValues: MetaActionItem[] = Array.isArray(insights.action_values)
      ? insights.action_values
      : [];

    const getAction = (...types: string[]): number => {
      for (const t of types) {
        const found = actions.find((a) => a.action_type === t);
        if (found && Number(found.value) > 0) return Number(found.value);
      }
      return 0;
    };

    const getActionValue = (...types: string[]): number => {
      for (const t of types) {
        const found = actionValues.find((a) => a.action_type === t);
        if (found && Number(found.value) > 0) return Number(found.value);
      }
      return 0;
    };

    const spend = Math.round(Number(insights.spend || 0));
    const impressions = Number(insights.impressions || 0);
    const reach = Number(insights.reach || 0);
    const clicks = Number(insights.clicks || 0);
    const frequency = Number(
      insights.frequency || (reach > 0 ? (impressions / reach).toFixed(2) : 0)
    );

    const outboundClicksRaw = Array.isArray(insights.outbound_clicks)
      ? Number(insights.outbound_clicks[0]?.value || 0)
      : getAction("outbound_click");

    const linkClicks =
      outboundClicksRaw > 0
        ? outboundClicksRaw
        : getAction("link_click", "outbound_click", "inline_link_clicks");

    const landingPageViews = getAction(
      "landing_page_view",
      "omni_landing_page_view"
    );
    const addsToCart = getAction(
      "omni_add_to_cart",
      "add_to_cart",
      "offsite_conversion.fb_pixel_add_to_cart"
    );
    const checkoutsInitiated = getAction(
      "omni_initiated_checkout",
      "initiate_checkout",
      "offsite_conversion.fb_pixel_initiate_checkout"
    );
    const purchases = getAction(
      "omni_purchase",
      "purchase",
      "offsite_conversion.fb_pixel_purchase",
      "onsite_conversion.purchase"
    );
    const leads = getAction(
      "lead",
      "offsite_conversion.fb_pixel_lead",
      "onsite_conversion.lead_grouped",
      "onsite_conversion.messaging_conversation_started_7d",
      "contact"
    );

    const registrationsCompleted = getAction(
      "complete_registration",
      "omni_complete_registration",
      "offsite_conversion.fb_pixel_complete_registration"
    );

    const purchasesConversionValue = Math.round(
      getActionValue(
        "omni_purchase",
        "purchase",
        "offsite_conversion.fb_pixel_purchase"
      )
    );

    const thruplay = Array.isArray(insights.video_thruplay_watched_actions)
      ? Number(insights.video_thruplay_watched_actions[0]?.value || 0)
      : getAction("video_view");

    // Di Meta, Hasil (Results) adalah PURCHASES (Pembelian) riil, bukan Landing Page Views
    const results = purchases;

    const costPerResult = results > 0 ? Math.round(spend / results) : 0;
    const costPerPurchase = purchases > 0 ? Math.round(spend / purchases) : 0;
    const costPerLpView = landingPageViews > 0 ? Math.round(spend / landingPageViews) : 0;
    const costPerAddToCart = addsToCart > 0 ? Math.round(spend / addsToCart) : 0;
    const costPerCheckoutInitiated =
      checkoutsInitiated > 0 ? Math.round(spend / checkoutsInitiated) : 0;
    const costPerRegistration =
      registrationsCompleted > 0 ? Math.round(spend / registrationsCompleted) : 0;

    // Rasio Funnel Scale Model (Murni dari angka riil Meta)
    const oclpRate =
      outboundClicksRaw > 0
        ? Number(((landingPageViews / outboundClicksRaw) * 100).toFixed(1))
        : linkClicks > 0
        ? Number(((landingPageViews / linkClicks) * 100).toFixed(1))
        : 0;
    const lpToAtcRate =
      landingPageViews > 0 ? Number(((addsToCart / landingPageViews) * 100).toFixed(1)) : 0;
    const atcToIcRate =
      addsToCart > 0 ? Number(((checkoutsInitiated / addsToCart) * 100).toFixed(1)) : 0;
    const icToPurchaseRate =
      checkoutsInitiated > 0
        ? Number(((purchases / checkoutsInitiated) * 100).toFixed(1))
        : 0;

    const cpm = Number(
      insights.cpm || (impressions > 0 ? Math.round((spend / impressions) * 1000) : 0)
    );
    const ctrAll = Number(
      insights.ctr || (impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0)
    );
    const ctrLink =
      impressions > 0 ? Number(((linkClicks / impressions) * 100).toFixed(2)) : 0;
    const cpcLink = linkClicks > 0 ? Math.round(spend / linkClicks) : 0;
    const cpcAll = Number(insights.cpc || (clicks > 0 ? Math.round(spend / clicks) : 0));

    // Hitung budget riil dari Campaign (CBO) atau jumlahkan dari AdSet aktif (ABO)
    const cboDaily = Number(item.daily_budget || 0);
    const cboLifetime = Number(item.lifetime_budget || 0);
    const aboDailySum = campaignAdsets.reduce(
      (acc, a) => acc + Number(a.daily_budget || 0),
      0
    );
    const aboLifetimeSum = campaignAdsets.reduce(
      (acc, a) => acc + Number(a.lifetime_budget || 0),
      0
    );

    const dailyBudget = cboDaily || aboDailySum || cboLifetime || aboLifetimeSum || 0;
    const roas =
      spend > 0 && purchasesConversionValue > 0
        ? Number((purchasesConversionValue / spend).toFixed(2))
        : 0;

    // Evaluasi Kesehatan Kampanye Berbasis Data Riil
    let healthStatus:
      | "winning"
      | "scale_ready"
      | "learning"
      | "review"
      | "bleeding"
      | "fatigued" = "review";

    // Umur kampanye dan jumlah konversi menentukan apakah masih learning phase Meta.
    // Status learning resmi dari Meta (per ad set). Satu ad set LEARNING berarti kampanye masih belajar.
    const stages = campaignAdsets
      .map((a: any) => String(a?.learning_stage_info?.status || "").toUpperCase())
      .filter(Boolean);
    const learningStage: string | null = stages.includes("LEARNING")
      ? "LEARNING"
      : stages.includes("FAIL")
      ? "FAIL"
      : stages.length > 0 && stages.every((s: string) => s === "SUCCESS")
      ? "SUCCESS"
      : null;
    // Waktu perubahan signifikan terakhir (Meta bisa mengirim detik unix atau ISO)
    const sigEditMs = campaignAdsets.reduce((max: number, a: any) => {
      const raw = a?.learning_stage_info?.last_sig_edit_ts;
      if (raw === undefined || raw === null) return max;
      const ms = typeof raw === "number" ? (raw < 1e12 ? raw * 1000 : raw) : Date.parse(String(raw));
      return Number.isFinite(ms) && ms > max ? ms : max;
    }, 0);
    const lastSigEditAt = sigEditMs > 0 ? new Date(sigEditMs).toISOString() : null;

    const createdMs = item.created_time ? Date.parse(item.created_time) : NaN;
    const ageDays = Number.isFinite(createdMs) ? (Date.now() - createdMs) / 86400000 : null;
    const optimizationEvents = purchases + leads;
    const learn = resolveLearningState(
      { learningStage, ageDays, events: optimizationEvents },
      DEFAULT_WINNING_ENGINE_CONFIG
    );
    const inLearning = spend > 0 && learn.inLearning;

    if (inLearning) {
      // Kampanye baru jangan dilabeli boncos atau lelah sebelum belajar selesai
      healthStatus = "learning";
    } else if (frequency >= 3.5 && ctrAll < 1.0) {
      healthStatus = "fatigued";
    } else if (spend >= TARGET_CPA * 1.8 && purchases === 0 && leads === 0) {
      healthStatus = "bleeding";
    } else if (purchases > 0 && costPerPurchase > TARGET_CPA * 1.4) {
      healthStatus = "bleeding";
    } else if (roas >= 3.0 && purchases >= 3) {
      healthStatus = "scale_ready";
    } else if (roas >= 2.0 || (results >= 3 && costPerResult > 0 && costPerResult <= TARGET_CPA)) {
      healthStatus = "winning";
    }

    const thumbstopRate =
      impressions > 0 && thruplay > 0
        ? Number(Math.min(100, (thruplay / impressions) * 100).toFixed(1))
        : 0;

    return {
      id: cid,
      name: item.name,
      objective: item.objective || "OUTCOME_SALES",
      status: item.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
      deliveryStatus: item.effective_status || item.status,
      effectiveStatus: item.effective_status || item.status,
      createdTime: item.created_time || null,
      ageDays: ageDays === null ? null : Math.round(ageDays * 10) / 10,
      inLearning,
      learningStage,
      learningSource: learn.source,
      lastSigEditAt,
      dailyBudget,
      spend,
      impressions,
      clicks,
      linkClicks,
      reach,
      results,
      purchasesConversionValue,
      costPerResult,
      cpa: costPerPurchase || costPerResult,
      ctr: ctrLink || ctrAll,
      roas,
      frequency,
      thumbstopRate,
      healthStatus,
      targetAudience:
        campaignAdsets.length > 0
          ? `${campaignAdsets.length} AdSet (${campaignAdsets[0].name})`
          : `Meta Ads (${currency})`,
      creativeHook: `Objective: ${item.objective || "Meta Campaign"}`,
      lastUpdated: item.updated_time || new Date().toISOString(),
      landingPageViews,
      addsToCart,
      checkoutsInitiated,
      registrationsCompleted,
      purchases,
      leads,
      costPerLpView,
      costPerAddToCart,
      costPerCheckoutInitiated,
      costPerPurchase,
      costPerRegistration,
      oclpRate,
      lpToAtcRate,
      atcToIcRate,
      icToPurchaseRate,
      cpm,
      ctrLink,
      ctrAll,
      cpcLink,
      cpcAll,
      videoThruPlays15s: thruplay,
      isLiveMeta: true,
      adsets: mappedAdsets,
    };
  });

  return {
    ok: true,
    campaigns: mappedCampaigns,
    rawCount: rawCampaigns.length,
    analysisWindow: datePreset,
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireEngineAuth(req, { allowCron: true });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  try {
    const body = await req.json().catch(() => ({}));
    let rawAccessToken = body.accessToken || process.env.META_ACCESS_TOKEN || "";
    let rawCapiToken = body.capiAccessToken || process.env.META_CAPI_TOKEN || "";
    let adAccountIdRaw = (body.adAccountId || process.env.META_AD_ACCOUNT_ID || "").trim();
    const datePreset = (body.datePreset || "last_14d").trim();
    const appSecret = (body.appSecret || process.env.META_APP_SECRET || "").trim() || undefined;

    // Fallback otomatis dari Supabase Cloud Database jika di request body kosong (Multi-Device Persistence)
    if (!rawAccessToken && !rawCapiToken) {
      try {
        const supabase = getSupabaseServerClient();
        const { data: dbConfig } = await supabase
          .from("winning_engine_config")
          .select("meta_access_token, meta_capi_token, ad_account_id")
          .eq("id", "default")
          .maybeSingle();

        if (dbConfig) {
          if (dbConfig.meta_access_token) rawAccessToken = dbConfig.meta_access_token;
          if (dbConfig.meta_capi_token) rawCapiToken = dbConfig.meta_capi_token;
          if (!adAccountIdRaw && dbConfig.ad_account_id) adAccountIdRaw = dbConfig.ad_account_id;
        }
      } catch {
        // Abaikan jika database belum siap
      }
    }

    const candidateTokens = extractCandidateTokens(rawAccessToken, rawCapiToken);

    if (candidateTokens.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Access Token wajib diisi untuk menghubungkan Meta Ads.",
        },
        { status: 400 }
      );
    }

    const cleanNumericAccountId = adAccountIdRaw.replace(/^act_/i, "").replace(/[^0-9]/g, "");
    const primaryActId = cleanNumericAccountId ? `act_${cleanNumericAccountId}` : "";

    let verifiedAccount: any = null;
    let workingToken: string = candidateTokens[0];
    const discoveredMap = new Map<string, any>();
    let lastMetaError: any = null;

    // 1. Autentikasi & Discovery seluruh Ad Account riil dari Meta Graph API
    for (const token of candidateTokens) {
      const discoveryEndpoints = [
        "https://graph.facebook.com/v20.0/me/adaccounts?fields=id,account_id,name,account_status,currency,timezone_name,amount_spent&limit=50",
        "https://graph.facebook.com/v20.0/me/assigned_ad_accounts?business=126146550386147&fields=id,account_id,name,account_status,currency,timezone_name,amount_spent&limit=50",
        "https://graph.facebook.com/v20.0/126146550386147/owned_ad_accounts?fields=id,account_id,name,account_status,currency,timezone_name,amount_spent&limit=50",
        "https://graph.facebook.com/v20.0/126146550386147/client_ad_accounts?fields=id,account_id,name,account_status,currency,timezone_name,amount_spent&limit=50",
      ];

      for (const endpoint of discoveryEndpoints) {
        try {
          const url = buildGraphUrl(endpoint, token, appSecret);
          const res = await fetch(url, { cache: "no-store" });
          const data = await res.json().catch(() => ({}));

          if (res.ok && Array.isArray(data.data) && data.data.length > 0) {
            for (const acc of data.data) {
              const normId = String(acc.id || "").startsWith("act_")
                ? String(acc.id)
                : `act_${acc.account_id || acc.id}`;
              discoveredMap.set(normId, { ...acc, id: normId });
            }
            workingToken = token;
          } else if (data.error) {
            lastMetaError = data.error;
          }
        } catch {
          // Lanjut ke endpoint berikutnya
        }
      }

      // Cek juga Ad Account ID spesifik yang diketik user
      if (primaryActId && !discoveredMap.has(primaryActId)) {
        try {
          const accountUrl = buildGraphUrl(
            `https://graph.facebook.com/v20.0/${primaryActId}?fields=id,account_id,name,account_status,currency,timezone_name,amount_spent`,
            token,
            appSecret
          );
          const accountRes = await fetch(accountUrl, { cache: "no-store" });
          const accountData = await accountRes.json().catch(() => ({}));

          if (accountRes.ok && accountData && accountData.id && !accountData.error) {
            const normId = String(accountData.id).startsWith("act_")
              ? String(accountData.id)
              : `act_${accountData.id}`;
            discoveredMap.set(normId, { ...accountData, id: normId });
            workingToken = token;
          } else if (accountData.error) {
            lastMetaError = accountData.error;
          }
        } catch {
          // Abaikan
        }
      }

      if (discoveredMap.size > 0) break;
    }

    const discoveredAccounts = Array.from(discoveredMap.values());

    // Jika tidak ada satu pun akun yang berhasil diautentikasi dari Meta Graph API,
    // kembalikan error jujur dari Meta (TANPA DATA MOCKUP).
    if (discoveredAccounts.length === 0) {
      const metaMsg =
        lastMetaError?.message ||
        "Token tidak memiliki akses ke Ad Account atau ditolak oleh Meta Graph API.";
      const metaCode = lastMetaError?.code;
      const metaSubcode = lastMetaError?.error_subcode;

      return NextResponse.json(
        {
          ok: false,
          isLive: false,
          code: metaCode,
          subcode: metaSubcode,
          error: `Meta Graph API Error (${metaCode || "Auth"}): ${metaMsg}`,
          rawMetaError: lastMetaError,
        },
        { status: 400 }
      );
    }

    // Pilih akun yang diminta user jika ada, atau akun aktif pertama
    const exactRequested = primaryActId ? discoveredMap.get(primaryActId) : null;
    const firstActive = discoveredAccounts.find((a) => a.account_status === 1);
    verifiedAccount = exactRequested || firstActive || discoveredAccounts[0];

    // Jika mode test koneksi saja
    if (body.testOnly) {
      // Jika akun yang diketik user (misal monefyi) disabled, tetapi ada akun aktif lain (misal spaceco ad account),
      // prioritaskan akun yang aktif agar kampanye riil langsung tampil
      const preferredAccount =
        verifiedAccount.account_status === 1
          ? verifiedAccount
          : firstActive || verifiedAccount;

      const clientProvidedToken = Boolean(body.accessToken || body.capiAccessToken);
      return NextResponse.json({
        ok: true,
        isLive: true,
        syncMode: "live_graph",
        ...(clientProvidedToken ? { resolvedToken: workingToken } : {}),
        account: {
          id: preferredAccount.id,
          name: preferredAccount.name,
          currency: preferredAccount.currency || "IDR",
          timezone: preferredAccount.timezone_name || "Asia/Jakarta",
          status:
            preferredAccount.account_status === 1
              ? "Active"
              : `Disabled (Status ${preferredAccount.account_status})`,
          totalSpent: preferredAccount.amount_spent || "0",
        },
        discoveredAccounts,
        message: `Terhubung langsung ke Meta Graph API! Akun "${preferredAccount.name}" (${preferredAccount.id}) aktif. Ditemukan ${discoveredAccounts.length} akun iklan di Business Portfolio Anda.`,
      });
    }

    // 2. Tarik kampanye riil dari akun yang dipilih.
    // Jika akun yang dipilih kosong (0 kampanye) dan ada akun lain di Business Portfolio (misal spaceco ad account),
    // otomatis periksa akun lain di portofolio agar kampanye riil pengguna tidak terlewat!
    let selectedAcc = verifiedAccount;
    let fetchResult = await fetchRealCampaignsForAccount(
      selectedAcc.id,
      workingToken,
      datePreset,
      selectedAcc.currency || "IDR",
      appSecret
    );

    if (fetchResult.campaigns.length === 0 && discoveredAccounts.length > 1) {
      for (const altAcc of discoveredAccounts) {
        if (altAcc.id === selectedAcc.id) continue;
        const altResult = await fetchRealCampaignsForAccount(
          altAcc.id,
          workingToken,
          datePreset,
          altAcc.currency || "IDR",
          appSecret
        );
        if (altResult.campaigns.length > 0) {
          selectedAcc = altAcc;
          fetchResult = altResult;
          break;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      isLive: true,
      syncMode: "live_graph",
      account: {
        id: selectedAcc.id,
        name: selectedAcc.name,
        currency: selectedAcc.currency || "IDR",
        status: selectedAcc.account_status === 1 ? "Active" : "Disabled",
      },
      discoveredAccounts,
      count: fetchResult.campaigns.length,
      campaigns: fetchResult.campaigns,
    });
  } catch (err: any) {
    console.error("Meta API Proxy Route Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Internal Server Error saat menghubungi Meta API.",
      },
      { status: 500 }
    );
  }
}
