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
    const { data: prof } = await sb.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (String(prof?.role) !== "admin") return json({ error: "Forbidden" }, 403);

    const { count: userCount } = await sb.from("profiles").select("id", { count: "exact", head: true });
    const { count: orgCount } = await sb.from("planner_organizations").select("id", { count: "exact", head: true });
    const { count: pendingJoin } = await sb
      .from("planner_join_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const { data: plans } = await sb.from("user_plans").select("plan_type");
    const planBreakdown: Record<string, number> = {};
    for (const p of plans || []) {
      const t = String(p.plan_type || "none");
      planBreakdown[t] = (planBreakdown[t] || 0) + 1;
    }

    const { data: appCfg } = await sb.from("app_config").select("*").eq("id", "global").maybeSingle();

    return json({
      ok: true,
      stats: {
        total_users: userCount || 0,
        total_orgs: orgCount || 0,
        pending_join_requests: pendingJoin || 0,
        plan_breakdown: planBreakdown,
      },
      app_config: appCfg,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
