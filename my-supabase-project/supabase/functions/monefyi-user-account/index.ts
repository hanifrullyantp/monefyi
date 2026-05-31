import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveGeminiForUser } from "../_shared/gemini.ts";

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

    const user = authData.user;
    const sb = createClient(url, service, { auth: { persistSession: false } });
    const body = await req.json();
    const action = String(body.action || "get");

    if (action === "get") {
      const { data: prof } = await sb
        .from("profiles")
        .select("name, phone, gemini_key, email_notifications, push_notifications, status, plan_type, plan_expires_at, role, settings, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      const { data: plan } = await sb
        .from("user_plans")
        .select("plan_type, expires_at, ai_daily_limit")
        .eq("user_id", user.id)
        .maybeSingle();

      const gemini = await resolveGeminiForUser(sb, user.id);

      const { count: orgCount } = await sb
        .from("planner_org_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");

      const hasUserKey = !!(prof?.gemini_key && String(prof.gemini_key).length > 8);

      return json({
        ok: true,
        account: {
          id: user.id,
          email: user.email,
          email_verified: !!user.email_confirmed_at,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          name: prof?.name,
          phone: prof?.phone,
          status: prof?.status || "active",
          platform_role: prof?.role || "user",
          has_gemini_key: hasUserKey,
          gemini_key_hint: hasUserKey ? "••••" + String(prof?.gemini_key).slice(-4) : null,
          email_notifications: prof?.email_notifications ?? true,
          push_notifications: prof?.push_notifications ?? true,
          plan_type: plan?.plan_type || prof?.plan_type || "none",
          plan_expires_at: plan?.expires_at || prof?.plan_expires_at,
          ai_daily_limit: gemini.userDailyLimit,
          ai_used_today: gemini.userDailyUsed,
          ai_remaining: Math.max(0, gemini.userDailyLimit - gemini.userDailyUsed),
          platform_fallback_used: gemini.platformFallbackUsed,
          platform_fallback_limit: gemini.platformFallbackLimit,
          gemini_source: gemini.source,
          active_orgs: orgCount || 0,
        },
      });
    }

    if (action === "update") {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) patch.name = String(body.name).slice(0, 200);
      if (body.phone !== undefined) patch.phone = String(body.phone).slice(0, 50);
      if (body.email_notifications !== undefined) patch.email_notifications = !!body.email_notifications;
      if (body.push_notifications !== undefined) patch.push_notifications = !!body.push_notifications;
      if (body.gemini_key !== undefined) {
        const key = body.gemini_key ? String(body.gemini_key).trim() : null;
        if (key && key.length < 20) {
          return json({ error: "Gemini API key tidak valid" }, 400);
        }
        patch.gemini_key = key;
      }

      if (Object.keys(patch).length > 1) {
        const { error } = await sb.from("profiles").update(patch).eq("id", user.id);
        if (error) return json({ error: error.message }, 500);
      }

      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
