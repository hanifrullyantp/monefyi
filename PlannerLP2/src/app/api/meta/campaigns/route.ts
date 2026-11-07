import { NextRequest, NextResponse } from "next/server";
import { extractCandidateTokens, buildGraphUrl } from "@/lib/meta/graph";

interface MetaActionItem {
  action_type: string;
  value: string | number;
}

/**
 * Menarik data kampanye, adset (untuk membaca budget ABO & targeting), serta insights riil dari Meta Graph API v20.0.
 */
async function fetchRealCampaignsForAccount(
  actId: string,
  token: string,
  datePreset: string = "data_maximum",
  currency: string = "IDR",
  appSecret?: string
) {
  const validPresets = [
    datePreset,
    "data_maximum",
    "last_90d",
    "last_30d",
    "maximum",
  ];
  const uniquePresets = Array.from(new Set(validPresets.filter(Boolean)));

  // 1. Ambil daftar Campaigns riil dari Meta
  const campaignsUrl = buildGraphUrl(
    `https://graph.facebook.com/v20.0/${actId}/campaigns?fields=id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time,updated_time&limit=100`,
    token,
    appSecret
  );

  // 2. Ambil daftar AdSets riil (karena mayoritas iklan mengatur budget harian di level AdSet / ABO)
  const adsetsUrl = buildGraphUrl(
    `https://graph.facebook.com/v20.0/${actId}/adsets?fields=id,name,campaign_id,daily_budget,lifetime_budget,status,effective_status,optimization_goal&limit=150`,
    token,
    appSecret
  );

  const [campRes, adsetRes] = await Promise.all([
    fetch(campaignsUrl, { cache: "no-store" }),
    fetch(adsetsUrl, { cache: "no-store" }).catch(() => null),
  ]);

  const campJson = await campRes.json().catch(() => ({}));
  const adsetJson = adsetRes ? await adsetRes.json().catch(() => ({})) : {};

  if (!campRes.ok || campJson.error) {
    return {
      ok: false,
      error: campJson.error?.message || "Gagal mengambil daftar kampanye dari Meta Graph API.",
      campaigns: [],
    };
  }

  const rawCampaigns: any[] = Array.isArray(campJson.data) ? campJson.data : [];
  const rawAdsets: any[] = Array.isArray(adsetJson.data) ? adsetJson.data : [];

  // 3. Ambil Insights di level campaign dengan fallback preset tanggal jika preset tertentu ditolak versi Graph API
  let rawInsights: any[] = [];
  for (const preset of uniquePresets) {
    try {
      const insightsUrl = buildGraphUrl(
        `https://graph.facebook.com/v20.0/${actId}/insights?level=campaign&date_preset=${encodeURIComponent(
          preset
        )}&fields=campaign_id,campaign_name,spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,action_values,cost_per_action_type,video_thruplay_watched_actions&limit=150`,
        token,
        appSecret
      );
      const insRes = await fetch(insightsUrl, { cache: "no-store" });
      const insJson = await insRes.json().catch(() => ({}));
      if (insRes.ok && Array.isArray(insJson.data)) {
        rawInsights = insJson.data;
        break;
      }
    } catch {
      // Coba preset berikutnya
    }
  }

  // Petakan insights berdasarkan campaign_id
  const insightsByCampaignId = new Map<string, any>();
  for (const ins of rawInsights) {
    if (ins.campaign_id) {
      insightsByCampaignId.set(String(ins.campaign_id), ins);
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

    const linkClicks = getAction(
      "link_click",
      "outbound_click",
      "inline_link_clicks"
    );
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

    const purchasesConversionValue = Math.round(
      getActionValue(
        "omni_purchase",
        "purchase",
        "offsite_conversion.fb_pixel_purchase"
      )
    );

    // Total results mengikuti tujuan kampanye (Purchases, Leads, atau ThruPlay/Link Clicks jika kampanye engagement/video)
    const thruplay = Array.isArray(insights.video_thruplay_watched_actions)
      ? Number(insights.video_thruplay_watched_actions[0]?.value || 0)
      : getAction("video_view");

    const results =
      purchases > 0
        ? purchases
        : leads > 0
        ? leads
        : landingPageViews > 0
        ? landingPageViews
        : linkClicks > 0
        ? linkClicks
        : thruplay;

    const costPerResult = results > 0 ? Math.round(spend / results) : 0;
    const costPerPurchase = purchases > 0 ? Math.round(spend / purchases) : 0;
    const costPerLpView = landingPageViews > 0 ? Math.round(spend / landingPageViews) : 0;
    const costPerAddToCart = addsToCart > 0 ? Math.round(spend / addsToCart) : 0;
    const costPerCheckoutInitiated =
      checkoutsInitiated > 0 ? Math.round(spend / checkoutsInitiated) : 0;

    // Rasio Funnel Scale Model (Murni dari angka riil Meta)
    const oclpRate =
      linkClicks > 0 ? Number(((landingPageViews / linkClicks) * 100).toFixed(1)) : 0;
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

    if (frequency >= 3.5 && ctrAll < 1.0) {
      healthStatus = "fatigued";
    } else if (spend > 100000 && purchases === 0 && leads === 0 && ctrAll < 0.8) {
      healthStatus = "bleeding";
    } else if (spend > 0 && costPerPurchase > 85000) {
      healthStatus = "bleeding";
    } else if (roas >= 3.0 && purchases >= 3) {
      healthStatus = "scale_ready";
    } else if (roas >= 2.0 || (results >= 3 && costPerResult > 0 && costPerResult <= 45000)) {
      healthStatus = "winning";
    } else if (spend > 0 && impressions < 2500) {
      healthStatus = "learning";
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
      purchases,
      leads,
      costPerLpView,
      costPerAddToCart,
      costPerCheckoutInitiated,
      costPerPurchase,
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
    };
  });

  return {
    ok: true,
    campaigns: mappedCampaigns,
    rawCount: rawCampaigns.length,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawAccessToken = body.accessToken || process.env.META_ACCESS_TOKEN || "";
    const rawCapiToken = body.capiAccessToken || process.env.META_CAPI_TOKEN || "";
    const adAccountIdRaw = (body.adAccountId || process.env.META_AD_ACCOUNT_ID || "").trim();
    const datePreset = (body.datePreset || "data_maximum").trim();
    const appSecret = (body.appSecret || process.env.META_APP_SECRET || "").trim() || undefined;

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

      return NextResponse.json({
        ok: true,
        isLive: true,
        syncMode: "live_graph",
        resolvedToken: workingToken,
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
