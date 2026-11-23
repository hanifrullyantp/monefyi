import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import {
  DEFAULT_LANDING_URL,
  fetchPageSignals,
  comparePagePrices,
  evaluatePageExperience,
  evaluateMessageMatch,
} from "@/lib/engine/pageAudit";
import { MONEFYI_PRICING } from "@/lib/engine/winningEngine";
import { getServiceClient } from "@/lib/engine/engineDb";
import { resolveServerMetaCreds } from "@/lib/engine/metaBudget";
import { fetchAdsDataset } from "@/lib/engine/adCreativeData";

/** GET /api/engine/page-audit?url=... Membaca harga, kecepatan, CTA mobile, dan message match landing page. Hanya baca. */
export async function GET(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const url = req.nextUrl.searchParams.get("url") || process.env.LANDING_PAGE_URL || DEFAULT_LANDING_URL;
  const signals = await fetchPageSignals(url);
  if (!signals.ok) return NextResponse.json({ ok: false, error: signals.error }, { status: 502 });

  const priceFindings = comparePagePrices(signals.prices, MONEFYI_PRICING);
  const experienceFindings = evaluatePageExperience(signals);

  // Evaluasi message match terhadap iklan aktif (jika tersedia dari laporan kreatif terakhir atau Meta)
  let messageMatch = null;
  try {
    const creds = await resolveServerMetaCreds();
    let adCopies: { id: string; name: string; title: string; body: string }[] = [];
    if (creds) {
      const ds = await fetchAdsDataset(creds, 7);
      if (ds.ok) {
        adCopies = ds.ads
          .filter((a) => a.effectiveStatus === "ACTIVE" || a.spend > 0)
          .slice(0, 15)
          .map((a) => ({ id: a.id, name: a.name, title: a.title, body: a.body }));
      }
    }
    if (adCopies.length === 0) {
      const { data: rep } = await getServiceClient()
        .from("engine_creative_reports")
        .select("ads")
        .order("created_at", { ascending: false })
        .limit(1);
      const storedAds: any[] = Array.isArray(rep?.[0]?.ads) ? rep![0].ads : [];
      adCopies = storedAds.slice(0, 15).map((a) => ({
        id: String(a.id || ""),
        name: String(a.name || ""),
        title: String(a.title || a.name || ""),
        body: String(a.body || ""),
      }));
    }
    if (signals.mobileAudit && adCopies.length > 0) {
      messageMatch = evaluateMessageMatch(adCopies, {
        title: signals.title,
        heroHeadline: signals.mobileAudit.heroHeadline,
        heroSubheadline: signals.mobileAudit.heroSubheadline,
        bodyTextSample: signals.mobileAudit.bodyTextSample,
      });
    }
  } catch {
    // Non-fatal: audit harga dan pengalaman tetap dikembalikan
  }

  return NextResponse.json({
    ok: true,
    url: signals.url,
    title: signals.title,
    hasOrderCta: signals.hasOrderCta,
    responseTimeMs: signals.responseTimeMs,
    speedGrade: signals.speedGrade,
    mobileAudit: signals.mobileAudit,
    prices: signals.prices,
    findings: [...priceFindings, ...experienceFindings, ...(messageMatch?.findings || [])],
    priceFindings,
    experienceFindings,
    messageMatch,
  });
}
