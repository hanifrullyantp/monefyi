import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { getServiceClient } from "@/lib/engine/engineDb";
import { resolveServerMetaCreds } from "@/lib/engine/metaBudget";
import { resolveActId } from "@/lib/engine/adCreativeData";
import { graphFetchJson } from "@/lib/meta/graph";

/**
 * GET: daftar kampanye di akun iklan (status + belanja 14 hari) beserta pilihan yang tersimpan.
 * POST {ids: string[] | null}: simpan daftar kampanye relevan. null atau kosong = semua kampanye.
 */
export async function GET(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const sb = getServiceClient();
  const { data: cfg } = await sb.from("winning_engine_config").select("tracked_campaign_ids").eq("id", "default").maybeSingle();
  const selected: string[] | null = Array.isArray(cfg?.tracked_campaign_ids) ? cfg!.tracked_campaign_ids.map(String) : null;

  const creds = await resolveServerMetaCreds();
  if (!creds) return NextResponse.json({ ok: false, error: "Token Meta belum tersedia di server." }, { status: 400 });
  const actId = await resolveActId(creds);
  if (!actId) return NextResponse.json({ ok: false, error: "Ad account tidak ditemukan." }, { status: 400 });

  const base = `https://graph.facebook.com/v20.0/${actId}`;
  const [camps, ins] = await Promise.all([
    graphFetchJson(`${base}/campaigns?fields=id,name,effective_status,daily_budget,updated_time&limit=300`, creds.token, undefined, creds.appSecret),
    graphFetchJson(`${base}/insights?level=campaign&date_preset=last_14d&fields=campaign_id,spend&limit=300`, creds.token, undefined, creds.appSecret),
  ]);
  if (!camps.ok) return NextResponse.json({ ok: false, error: camps.data?.error?.message || "Gagal membaca kampanye." }, { status: 502 });

  const spendBy = new Map<string, number>((ins.data?.data || []).map((r: any) => [String(r.campaign_id), Number(r.spend || 0)]));
  const campaigns = (camps.data?.data || [])
    .map((c: any) => ({
      id: String(c.id),
      name: String(c.name || ""),
      status: String(c.effective_status || ""),
      dailyBudget: Number(c.daily_budget || 0),
      spend14d: spendBy.get(String(c.id)) || 0,
    }))
    // Yang sedang aktif atau berbelanja dulu
    .sort((a: any, b: any) => Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE") || b.spend14d - a.spend14d);

  return NextResponse.json({ ok: true, campaigns, selected });
}

export async function POST(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const parsed = Array.isArray(body.ids)
    ? body.ids.map((x: unknown) => String(x)).filter((x: string) => /^\d+$/.test(x))
    : [];
  const ids: string[] | null = parsed.length > 0 ? parsed : null;
  const { error } = await getServiceClient()
    .from("winning_engine_config")
    .upsert({ id: "default", tracked_campaign_ids: ids, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, selected: ids });
}

