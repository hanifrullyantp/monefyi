import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";

async function requireAdmin(supa: ReturnType<typeof createClient>, callerId: string) {
  const { data: prof } = await supa.from("profiles").select("role").eq("id", callerId).maybeSingle();
  if (String(prof?.role || "").toLowerCase() !== "admin") throw new Error("FORBIDDEN");
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST" && req.method !== "GET") return errorResponse(req, "Method not allowed", 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) return jsonResponse(req, { error: "Unauthorized" }, 401);

    const sb = createClient(url, service, { auth: { persistSession: false } });
    await requireAdmin(sb, authData.user.id);

    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

    const { data: profiles, error: pErr } = await sb
      .from("profiles")
      .select("id, name, role, status, plan_type, plan_expires_at, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (pErr) return jsonResponse(req, { error: pErr.message }, 500);

    const rows = profiles || [];
    const byPlan = { none: 0, trial: 0, monthly: 0, lifetime: 0 };
    const byStatus = { active: 0, suspended: 0, pending: 0 };
    let new7 = 0;
    let new30 = 0;
    let trialActive = 0;
    let paidActive = 0;

    for (const p of rows) {
      const pt = String(p.plan_type || "none").toLowerCase();
      if (pt in byPlan) (byPlan as any)[pt]++;
      else byPlan.none++;

      const st = String(p.status || "active").toLowerCase();
      if (st in byStatus) (byStatus as any)[st]++;
      else byStatus.active++;

      if (p.created_at && p.created_at >= d7) new7++;
      if (p.created_at && p.created_at >= d30) new30++;

      const expired = p.plan_expires_at && new Date(p.plan_expires_at).getTime() < now.getTime();
      if (pt === "trial" && !expired) trialActive++;
      if ((pt === "monthly" || pt === "lifetime") && !expired) paidActive++;
    }

    // Active usage: distinct users with transactions in 7d
    let activeUsers7d = 0;
    try {
      const { data: txs } = await sb
        .from("transactions")
        .select("user_id")
        .gte("created_at", d7)
        .limit(5000);
      activeUsers7d = new Set((txs || []).map((t: any) => t.user_id).filter(Boolean)).size;
    } catch {
      try {
        const { data: txs } = await sb
          .from("transactions")
          .select("user_id")
          .gte("date", d7.slice(0, 10))
          .limit(5000);
        activeUsers7d = new Set((txs || []).map((t: any) => t.user_id).filter(Boolean)).size;
      } catch { /* ignore */ }
    }

    // Feedback counts
    const feedbackByType: Record<string, number> = { bug: 0, feature: 0, complaint: 0, general: 0 };
    let feedbackOpen = 0;
    let recentFeedback: unknown[] = [];
    try {
      const { data: fb } = await sb
        .from("user_feedback")
        .select("id, type, title, status, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(200);
      for (const f of fb || []) {
        const t = String(f.type || "general");
        if (t in feedbackByType) feedbackByType[t]++;
        if (f.status === "open" || f.status === "in_progress") feedbackOpen++;
      }
      recentFeedback = (fb || []).slice(0, 8);
    } catch { /* table may not exist yet */ }

    const recentSignups = rows.slice(0, 8).map((p) => ({
      id: p.id,
      name: p.name,
      plan_type: p.plan_type,
      status: p.status,
      created_at: p.created_at,
    }));

    const assumedMonthlyPrice = 49000;
    const mrr = paidActive * assumedMonthlyPrice; // rough (lifetime counted as paid active)

    return jsonResponse(req, {
      ok: true,
      totals: {
        users: rows.length,
        new7,
        new30,
        trialActive,
        paidActive,
        activeUsers7d,
        feedbackOpen,
        mrr,
      },
      byPlan,
      byStatus,
      feedbackByType,
      recentSignups,
      recentFeedback,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "FORBIDDEN") return jsonResponse(req, { error: "Forbidden" }, 403);
    return jsonResponse(req, { error: msg }, 500);
  }
});
