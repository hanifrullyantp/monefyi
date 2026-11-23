import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { getServiceClient } from "@/lib/engine/engineDb";
import { sendAdminPush, pushConfigured } from "@/lib/engine/pushNotify";

/** POST: daftarkan perangkat. DELETE: lepas. PUT: kirim notifikasi uji. Hanya admin. */
export async function POST(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ ok: false, error: "Data langganan push tidak lengkap." }, { status: 400 });
  }
  const { error } = await getServiceClient().from("admin_push_subscriptions").upsert(
    {
      email: auth.email || null,
      endpoint: String(sub.endpoint),
      p256dh: String(sub.keys.p256dh),
      auth_key: String(sub.keys.auth),
      user_agent: req.headers.get("user-agent")?.slice(0, 250) || null,
    },
    { onConflict: "endpoint" }
  );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  if (!body?.endpoint) return NextResponse.json({ ok: false, error: "endpoint wajib." }, { status: 400 });
  await getServiceClient().from("admin_push_subscriptions").delete().eq("endpoint", String(body.endpoint));
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  if (!pushConfigured()) return NextResponse.json({ ok: false, error: "VAPID belum dikonfigurasi di server." }, { status: 400 });
  const result = await sendAdminPush({ title: "Tes notifikasi Expert", body: "Notifikasi ke HP Anda berfungsi.", tag: "expert-test" });
  return NextResponse.json({ ok: result.sent > 0, ...result });
}

