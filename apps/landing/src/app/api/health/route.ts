import { getSupabaseClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return Response.json({ ok: true, db: "skipped" });
  }

  try {
    const { error } = await supabase.from("orders").select("id").limit(1);
    if (error) {
      return Response.json({ ok: false, db: "error" }, { status: 500 });
    }
    return Response.json({ ok: true, db: "connected" });
  } catch {
    return Response.json({ ok: false, db: "error" }, { status: 500 });
  }
}
