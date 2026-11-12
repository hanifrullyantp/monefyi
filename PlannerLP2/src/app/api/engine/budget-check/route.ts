import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { resolveServerMetaCreds, readLiveBudget } from "@/lib/engine/metaBudget";

/**
 * GET /api/engine/budget-check?campaignId=123
 * Membaca budget mentah dari Meta untuk dibandingkan dengan angka di Ads Manager.
 * Hanya baca. Otonomi tetap tertahan sampai admin mengonfirmasi satuan (budgetUnitVerified).
 */
export async function GET(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const campaignId = req.nextUrl.searchParams.get("campaignId") || "";
  if (!/^\d+$/.test(campaignId)) {
    return NextResponse.json({ ok: false, error: "campaignId wajib berisi angka ID kampanye Meta." }, { status: 400 });
  }
  const creds = await resolveServerMetaCreds();
  if (!creds) return NextResponse.json({ ok: false, error: "Token Meta belum tersedia di server." }, { status: 400 });

  const live = await readLiveBudget(campaignId, creds.token, creds.appSecret);
  if (!live.ok) return NextResponse.json({ ok: false, error: live.error }, { status: 400 });

  return NextResponse.json({
    ok: true,
    mode: live.mode,
    rawTotal: live.total,
    adsets: live.adsets.map((a) => ({ id: a.id, name: a.name, rawDailyBudget: a.daily_budget })),
    howToVerify:
      "Buka kampanye yang sama di Ads Manager dan bandingkan budget harian yang tampil dengan rawTotal. Jika rawTotal sama dengan angka yang tampil (Rp 100.000 tampil = 100000), satuan 1:1. Jika rawTotal 100 kali lipat (Rp 100.000 tampil = 10000000), satuan API berbeda dan kode scale harus dikoreksi sebelum otonomi dinyalakan. Setelah yakin, set budgetUnitVerified = true.",
  });
}
