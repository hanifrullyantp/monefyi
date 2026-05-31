import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_CORS_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(supa: ReturnType<typeof createClient>, callerId: string) {
  const { data: prof } = await supa.from("profiles").select("role").eq("id", callerId).maybeSingle();
  if (String(prof?.role || "").toLowerCase() !== "admin") {
    throw new Error("FORBIDDEN");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(url, service, { auth: { persistSession: false } });
    await requireAdmin(sb, authData.user.id);

    const body = await req.json();
    const userId = String(body.user_id || "");
    if (!userId) return json({ error: "user_id required" }, 400);

    const profilePatch: Record<string, unknown> = {};
    if (body.name !== undefined) profilePatch.name = String(body.name).slice(0, 200);
    if (body.phone !== undefined) profilePatch.phone = String(body.phone).slice(0, 50);
    if (body.role !== undefined) {
      const r = String(body.role).toLowerCase();
      if (!["user", "admin"].includes(r)) return json({ error: "Invalid role" }, 400);
      profilePatch.role = r;
    }
    if (body.status !== undefined) {
      const s = String(body.status).toLowerCase();
      if (!["active", "suspended", "pending"].includes(s)) return json({ error: "Invalid status" }, 400);
      profilePatch.status = s;
    }
    if (body.gemini_key !== undefined) {
      profilePatch.gemini_key = body.gemini_key ? String(body.gemini_key).trim() : null;
    }
    if (body.email_notifications !== undefined) profilePatch.email_notifications = !!body.email_notifications;
    if (body.push_notifications !== undefined) profilePatch.push_notifications = !!body.push_notifications;
    if (body.admin_notes !== undefined) profilePatch.admin_notes = String(body.admin_notes).slice(0, 2000);
    if (body.plan_type !== undefined) profilePatch.plan_type = String(body.plan_type);
    if (body.plan_expires_at !== undefined) profilePatch.plan_expires_at = body.plan_expires_at;

    profilePatch.updated_at = new Date().toISOString();

    if (Object.keys(profilePatch).length > 1) {
      const { error: profErr } = await sb.from("profiles").update(profilePatch).eq("id", userId);
      if (profErr) return json({ error: profErr.message }, 500);
    }

    if (body.plan_type !== undefined || body.ai_daily_limit !== undefined || body.plan_expires_at !== undefined) {
      const planRow: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };
      if (body.plan_type !== undefined) planRow.plan_type = String(body.plan_type);
      if (body.plan_expires_at !== undefined) planRow.expires_at = body.plan_expires_at;
      if (body.ai_daily_limit !== undefined) planRow.ai_daily_limit = Number(body.ai_daily_limit);

      const { error: planErr } = await sb.from("user_plans").upsert(planRow, { onConflict: "user_id" });
      if (planErr) return json({ error: planErr.message }, 500);
    }

    if (body.new_password && String(body.new_password).length >= 8) {
      const { error: pwErr } = await sb.auth.admin.updateUserById(userId, {
        password: String(body.new_password),
      });
      if (pwErr) return json({ error: pwErr.message }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "FORBIDDEN") return json({ error: "Forbidden" }, 403);
    return json({ error: msg }, 500);
  }
});
