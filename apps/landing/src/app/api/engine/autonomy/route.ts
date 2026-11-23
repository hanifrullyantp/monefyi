import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { getServiceClient } from "@/lib/engine/engineDb";
import { loadDbEngineSettings } from "@/lib/engine/engineConfigDb";
import { resolvePolicy } from "@/lib/engine/autonomyPolicy";

/** POST: simpan pengaturan otonomi (kebijakan per aksi, mode otonom, interval). */
export async function POST(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const payload: Record<string, unknown> = { id: "default", updated_at: new Date().toISOString() };
  if (body.policy !== undefined) payload.autonomy_policy = resolvePolicy(body.policy);
  if (body.autonomous !== undefined) payload.autonomous = Boolean(body.autonomous);
  if (body.tickIntervalMinutes !== undefined) {
    const n = Math.round(Number(body.tickIntervalMinutes));
    if (!Number.isFinite(n) || n < 15 || n > 1440) {
      return NextResponse.json({ ok: false, error: "Interval harus 15 sampai 1440 menit." }, { status: 400 });
    }
    payload.tick_interval_minutes = n;
  }
  const { error } = await getServiceClient().from("winning_engine_config").upsert(payload, { onConflict: "id" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const s = await loadDbEngineSettings();
  return NextResponse.json({ ok: true, policy: s.policy, intervalMin: s.intervalMin });
}

