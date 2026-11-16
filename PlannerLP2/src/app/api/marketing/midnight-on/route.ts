import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { formatMidnightWib } from "@/lib/marketing/midnightOn";
import { cancelMidnightOn, loadMidnightOn, saveMidnightOn } from "@/lib/marketing/midnightOnStore";

export async function GET(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  try {
    const schedule = await loadMidnightOn();
    return NextResponse.json({
      ok: true,
      schedule,
      label: schedule ? formatMidnightWib(schedule.runAt) : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Jadwal tidak terbaca.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const campaigns = Array.isArray(body.campaigns) ? body.campaigns : [];
  try {
    const schedule = await saveMidnightOn(
      campaigns.map((item: { id?: string; name?: string }) => ({
        id: String(item?.id || ""),
        name: String(item?.name || ""),
      })),
    );
    return NextResponse.json({
      ok: true,
      schedule,
      label: formatMidnightWib(schedule.runAt),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Jadwal gagal disimpan.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  try {
    await cancelMidnightOn();
    return NextResponse.json({ ok: true, schedule: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Jadwal gagal dibatalkan.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
