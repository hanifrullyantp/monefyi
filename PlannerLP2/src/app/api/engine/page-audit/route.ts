import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { DEFAULT_LANDING_URL, fetchPageSignals, comparePagePrices } from "@/lib/engine/pageAudit";
import { MONEFYI_PRICING } from "@/lib/engine/winningEngine";

/** GET /api/engine/page-audit?url=... Membaca harga di landing page dan membandingkannya dengan konfigurasi. Hanya baca. */
export async function GET(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const url = req.nextUrl.searchParams.get("url") || process.env.LANDING_PAGE_URL || DEFAULT_LANDING_URL;
  const signals = await fetchPageSignals(url);
  if (!signals.ok) return NextResponse.json({ ok: false, error: signals.error }, { status: 502 });

  return NextResponse.json({
    ok: true,
    url: signals.url,
    title: signals.title,
    hasOrderCta: signals.hasOrderCta,
    prices: signals.prices,
    findings: comparePagePrices(signals.prices, MONEFYI_PRICING),
  });
}
