import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractCandidateTokens, buildGraphUrl } from "@/lib/meta/graph";

function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zzwqfmdyncxbolestkqp.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(supabaseUrl, supabaseKey);
}

export interface DemographicBreakdownRow {
  key: string;
  age?: string;
  gender?: string;
  genderLabel?: string;
  region?: string;
  platform?: string;
  position?: string;
  placementLabel?: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  results: number;
  purchases: number;
  leads: number;
  conversionValue: number;
  cpa: number;
  roas: number;
  shareOfSpendPct: number;
  isWinningSegment: boolean;
}

function parseInsightRowMetrics(row: any, totalSpend: number) {
  const actions: any[] = Array.isArray(row.actions) ? row.actions : [];
  const actionValues: any[] = Array.isArray(row.action_values) ? row.action_values : [];

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

  const spend = Math.round(Number(row.spend || 0));
  const impressions = Number(row.impressions || 0);
  const reach = Number(row.reach || 0);
  const clicks = Number(row.clicks || 0);
  const linkClicks = getAction("link_click", "outbound_click", "inline_link_clicks") || clicks;
  const lpv = getAction("landing_page_view", "omni_landing_page_view");
  const purchases = getAction(
    "omni_purchase",
    "purchase",
    "offsite_conversion.fb_pixel_purchase"
  );
  const leads = getAction(
    "lead",
    "offsite_conversion.fb_pixel_lead",
    "onsite_conversion.messaging_conversation_started_7d",
    "contact"
  );
  const thruplay = getAction("video_view");

  const conversionValue = Math.round(
    getActionValue("omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase")
  );

  const results =
    purchases > 0
      ? purchases
      : leads > 0
      ? leads
      : lpv > 0
      ? lpv
      : linkClicks > 0
      ? linkClicks
      : thruplay;

  const cpa = results > 0 ? Math.round(spend / results) : 0;
  const roas =
    spend > 0 && conversionValue > 0 ? Number((conversionValue / spend).toFixed(2)) : 0;
  const ctr = Number(
    row.ctr || (impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0)
  );
  const cpc = Number(row.cpc || (clicks > 0 ? Math.round(spend / clicks) : 0));
  const cpm = Number(
    row.cpm || (impressions > 0 ? Math.round((spend / impressions) * 1000) : 0)
  );
  const shareOfSpendPct =
    totalSpend > 0 ? Number(((spend / totalSpend) * 100).toFixed(1)) : 0;

  return {
    spend,
    impressions,
    reach,
    clicks,
    linkClicks,
    ctr,
    cpc,
    cpm,
    results,
    purchases,
    leads,
    conversionValue,
    cpa,
    roas,
    shareOfSpendPct,
  };
}

async function fetchBreakdownWithFallback(
  actId: string,
  breakdownParam: string,
  presets: string[],
  token: string,
  appSecret?: string
): Promise<any[]> {
  for (const preset of presets) {
    try {
      const url = buildGraphUrl(
        `https://graph.facebook.com/v20.0/${actId}/insights?date_preset=${encodeURIComponent(
          preset
        )}&breakdowns=${encodeURIComponent(
          breakdownParam
        )}&fields=spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values&limit=100`,
        token,
        appSecret
      );
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.data) && data.data.length > 0) {
        return data.data;
      }
    } catch {
      // Lanjut ke preset berikutnya
    }
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let rawAccessToken = body.accessToken || process.env.META_ACCESS_TOKEN || "";
    let rawCapiToken = body.capiAccessToken || process.env.META_CAPI_TOKEN || "";
    let adAccountIdRaw = (body.adAccountId || process.env.META_AD_ACCOUNT_ID || "").trim();
    const datePreset = (body.datePreset || "data_maximum").trim();
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
          error: "Access Token Meta belum terpasang.",
        },
        { status: 400 }
      );
    }

    const token = candidateTokens[0];
    const cleanNumericId = adAccountIdRaw.replace(/^act_/i, "").replace(/[^0-9]/g, "");
    let targetActId = cleanNumericId ? `act_${cleanNumericId}` : "";

    // Jika belum ada targetActId atau akun tersebut kosong, cek /me/adaccounts
    if (!targetActId) {
      try {
        const meUrl = buildGraphUrl(
          "https://graph.facebook.com/v20.0/me/adaccounts?fields=id,account_id,name,account_status&limit=25",
          token,
          appSecret
        );
        const meRes = await fetch(meUrl, { cache: "no-store" });
        const meJson = await meRes.json().catch(() => ({}));
        if (meRes.ok && Array.isArray(meJson.data) && meJson.data.length > 0) {
          const active = meJson.data.find((a: any) => a.account_status === 1) || meJson.data[0];
          targetActId = String(active.id).startsWith("act_")
            ? String(active.id)
            : `act_${active.id}`;
        }
      } catch {
        // Abaikan
      }
    }

    if (!targetActId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ad Account ID belum terkonfigurasi.",
        },
        { status: 400 }
      );
    }

    const presets = Array.from(
      new Set([datePreset, "data_maximum", "last_90d", "last_30d", "maximum"])
    );

    // Tarik 3 Breakdown utama dari Meta Graph API secara paralel:
    // 1. Umur & Jenis Kelamin (age,gender)
    // 2. Lokasi / Provinsi (region)
    // 3. Placement & Platform (publisher_platform,platform_position)
    let [rawAgeGender, rawRegion, rawPlacement] = await Promise.all([
      fetchBreakdownWithFallback(targetActId, "age,gender", presets, token, appSecret),
      fetchBreakdownWithFallback(targetActId, "region", presets, token, appSecret),
      fetchBreakdownWithFallback(
        targetActId,
        "publisher_platform,platform_position",
        presets,
        token,
        appSecret
      ),
    ]);

    // Jika akun yang dipilih tidak memiliki data breakdown (0), cek apakah ada akun lain di portofolio yang memiliki data
    if (rawAgeGender.length === 0 && rawRegion.length === 0) {
      try {
        const meUrl = buildGraphUrl(
          "https://graph.facebook.com/v20.0/me/adaccounts?fields=id,account_id,name,account_status&limit=25",
          token,
          appSecret
        );
        const meRes = await fetch(meUrl, { cache: "no-store" });
        const meJson = await meRes.json().catch(() => ({}));
        if (meRes.ok && Array.isArray(meJson.data)) {
          for (const acc of meJson.data) {
            const altId = String(acc.id).startsWith("act_")
              ? String(acc.id)
              : `act_${acc.id}`;
            if (altId === targetActId) continue;
            const [altAG, altReg, altPl] = await Promise.all([
              fetchBreakdownWithFallback(altId, "age,gender", presets, token, appSecret),
              fetchBreakdownWithFallback(altId, "region", presets, token, appSecret),
              fetchBreakdownWithFallback(
                altId,
                "publisher_platform,platform_position",
                presets,
                token,
                appSecret
              ),
            ]);
            if (altAG.length > 0 || altReg.length > 0) {
              targetActId = altId;
              rawAgeGender = altAG;
              rawRegion = altReg;
              rawPlacement = altPl;
              break;
            }
          }
        }
      } catch {
        // Abaikan
      }
    }

    const totalSpendAG = rawAgeGender.reduce((s, r) => s + Number(r.spend || 0), 0);
    const totalSpendReg = rawRegion.reduce((s, r) => s + Number(r.spend || 0), 0);
    const totalSpendPl = rawPlacement.reduce((s, r) => s + Number(r.spend || 0), 0);

    // Olah Breakdown Umur & Gender
    const ageGenderRows: DemographicBreakdownRow[] = rawAgeGender
      .map((r: any) => {
        const m = parseInsightRowMetrics(r, totalSpendAG);
        const gRaw = String(r.gender || "unknown").toLowerCase();
        const genderLabel =
          gRaw === "male"
            ? "Laki-laki"
            : gRaw === "female"
            ? "Perempuan"
            : "Tidak Diketahui";
        return {
          key: `${r.age || "All"}_${gRaw}`,
          age: r.age || "All",
          gender: gRaw,
          genderLabel,
          ...m,
          isWinningSegment: false,
        };
      })
      .sort((a, b) => b.results - a.results || b.ctr - a.ctr || b.spend - a.spend);

    // Tandai top 2 segmen Age+Gender sebagai Winning
    const avgCpaAG =
      ageGenderRows.filter((r) => r.cpa > 0).reduce((s, r) => s + r.cpa, 0) /
      Math.max(1, ageGenderRows.filter((r) => r.cpa > 0).length);
    ageGenderRows.forEach((r, idx) => {
      if (
        idx < 2 ||
        (r.results > 0 && r.cpa > 0 && r.cpa <= avgCpaAG * 0.85) ||
        r.ctr >= 2.0
      ) {
        r.isWinningSegment = true;
      }
    });

    // Olah Breakdown Lokasi / Provinsi (Region)
    const regionRows: DemographicBreakdownRow[] = rawRegion
      .map((r: any) => {
        const m = parseInsightRowMetrics(r, totalSpendReg);
        return {
          key: String(r.region || "Indonesia"),
          region: String(r.region || "Indonesia"),
          ...m,
          isWinningSegment: false,
        };
      })
      .sort((a, b) => b.results - a.results || b.ctr - a.ctr || b.spend - a.spend);

    const avgCpaReg =
      regionRows.filter((r) => r.cpa > 0).reduce((s, r) => s + r.cpa, 0) /
      Math.max(1, regionRows.filter((r) => r.cpa > 0).length);
    regionRows.forEach((r, idx) => {
      if (
        idx < 3 ||
        (r.results > 0 && r.cpa > 0 && r.cpa <= avgCpaReg * 0.85) ||
        r.ctr >= 2.0
      ) {
        r.isWinningSegment = true;
      }
    });

    // Olah Breakdown Placement (Platform & Posisi)
    const placementRows: DemographicBreakdownRow[] = rawPlacement
      .map((r: any) => {
        const m = parseInsightRowMetrics(r, totalSpendPl);
        const plat = String(r.publisher_platform || "meta").toUpperCase();
        const pos = String(r.platform_position || "feed").replace(/_/g, " ");
        const placementLabel = `${plat} - ${pos}`;
        return {
          key: `${r.publisher_platform}_${r.platform_position}`,
          platform: String(r.publisher_platform || "meta"),
          position: String(r.platform_position || "feed"),
          placementLabel,
          ...m,
          isWinningSegment: false,
        };
      })
      .sort((a, b) => b.results - a.results || b.ctr - a.ctr || b.spend - a.spend);

    placementRows.forEach((r, idx) => {
      if (idx < 2 || r.ctr >= 2.0) {
        r.isWinningSegment = true;
      }
    });

    // Rumuskan Rekomendasi Winning Ads Berbasis Data Riil
    const topAgeGender = ageGenderRows.slice(0, 2);
    const topRegions = regionRows.slice(0, 3);
    const topPlacements = placementRows.slice(0, 2);

    const bestAgeStr =
      topAgeGender.length > 0
        ? Array.from(new Set(topAgeGender.map((x) => x.age))).join(" & ")
        : "25-44";
    const bestGenderStr =
      topAgeGender.length > 0
        ? Array.from(new Set(topAgeGender.map((x) => x.genderLabel))).join(" & ")
        : "Laki-laki & Perempuan";
    const bestRegionStr =
      topRegions.length > 0
        ? topRegions.map((x) => x.region).join(", ")
        : "DKI Jakarta, Jawa Barat, Jawa Timur";
    const bestPlacementStr =
      topPlacements.length > 0
        ? topPlacements.map((x) => x.placementLabel).join(", ")
        : "INSTAGRAM - reels, FACEBOOK - feed";

    const bestCpa =
      topAgeGender[0]?.cpa || topRegions[0]?.cpa || topPlacements[0]?.cpa || 0;

    return NextResponse.json({
      ok: true,
      isLive: true,
      adAccountId: targetActId,
      datePreset,
      ageGender: ageGenderRows,
      regions: regionRows,
      placements: placementRows,
      recommendation: {
        bestAge: bestAgeStr,
        bestGender: bestGenderStr,
        bestRegions: bestRegionStr,
        bestPlacements: bestPlacementStr,
        bestCpa,
        hasRealBreakdownData:
          ageGenderRows.length > 0 || regionRows.length > 0 || placementRows.length > 0,
        expertHeadline:
          ageGenderRows.length > 0 || regionRows.length > 0
            ? `Fokuskan Scaling pada Usia ${bestAgeStr} (${bestGenderStr}) di wilayah ${bestRegionStr}`
            : "Menunggu impresi demografi yang cukup dari Meta Graph API pada rentang waktu ini.",
        expertActionPlan: [
          `Targetkan segmen Usia ${bestAgeStr} (${bestGenderStr}) yang mencatat interaksi & hasil tertinggi (${
            topAgeGender[0]?.results || 0
          } results, CTR ${topAgeGender[0]?.ctr || 0}%).`,
          `Alokasikan minimal 70% budget harian ke lokasi terkuat: ${bestRegionStr}.`,
          `Prioritaskan materi kreatif vertikal/feed pada placement: ${bestPlacementStr}.`,
          bestCpa > 0
            ? `Patok batas Cost Per Result / CPA di sekitar Rp ${bestCpa.toLocaleString(
                "id-ID"
              )} sebagai benchmark adset baru.`
            : "Gunakan struktur 1 Campaign CBO dengan 2-3 AdSet untuk menguji hook kreatif.",
        ],
      },
    });
  } catch (err: any) {
    console.error("Meta Breakdown Insights Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Gagal mengambil breakdown demografi dari Meta Graph API.",
      },
      { status: 500 }
    );
  }
}

