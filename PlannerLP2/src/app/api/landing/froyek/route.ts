import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseEnv } from "@/lib/supabase/env";
import { FROYEK_SLUG } from "@/lib/froyek/loadContent";
import { froyekContentSchema } from "@/lib/froyek/schema";

export async function GET() {
  const { url, anonKey } = resolveSupabaseEnv();
  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }
  const res = await fetch(
    `${url.replace(/\/$/, "")}/functions/v1/monefyi-landing-config?slug=${FROYEK_SLUG}`,
    { headers: { apikey: anonKey } },
  );
  const json = await res.json().catch(() => ({}));
  return NextResponse.json({ ok: res.ok, content: json.content ?? null }, { status: res.ok ? 200 : res.status });
}

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ ok: false, error: "Masuk sebagai admin untuk menyimpan." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = froyekContentSchema.safeParse(body?.content);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Konten tidak lolos skema", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }
  const { url, anonKey } = resolveSupabaseEnv();
  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }
  const res = await fetch(
    `${url.replace(/\/$/, "")}/functions/v1/monefyi-landing-config?slug=${FROYEK_SLUG}`,
    {
      method: "POST",
      headers: {
        Authorization: authorization,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug: FROYEK_SLUG, content: parsed.data }),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: json.error || "Gagal menyimpan" }, { status: res.status });
  }
  return NextResponse.json({ ok: true, updated_at: json.updated_at || null });
}
