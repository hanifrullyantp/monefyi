// Admin revenue + funnel metrics
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
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

    const { data: plans } = await sb.from("user_plans").select("user_id, plan_type, expires_at");
    const counts = { trial: 0, monthly: 0, lifetime: 0, expired: 0, none: 0 };
    let monthlyActive = 0;
    for (const p of plans || []) {
      const t = String(p.plan_type || "none");
      if (t === "lifetime") counts.lifetime++;
      else if (t === "monthly") {
        if (p.expires_at && new Date(p.expires_at).getTime() < now.getTime()) counts.expired++;
        else {
          counts.monthly++;
          monthlyActive++;
        }
      } else if (t === "trial") {
        if (p.expires_at && new Date(p.expires_at).getTime() < now.getTime()) counts.expired++;
        else counts.trial++;
      } else counts.none++;
    }

    // Orders revenue (best-effort)
    let revenueThisMonth = 0;
    let lifetimeRevenue = 0;
    let payments30 = 0;
    try {
      const { data: orders } = await sb.from("lynk_orders").select("amount, created_at, plan_type").limit(2000);
      for (const o of orders || []) {
        const amt = Number(o.amount || 0);
        lifetimeRevenue += amt;
        if (o.created_at && o.created_at >= monthStart) revenueThisMonth += amt;
        if (o.created_at && o.created_at >= d30) payments30++;
      }
    } catch (_) {
      try {
        const { data: orders } = await sb.from("orders").select("amount, created_at").limit(2000);
        for (const o of orders || []) {
          const amt = Number((o as any).amount || 0);
          lifetimeRevenue += amt;
          if ((o as any).created_at >= monthStart) revenueThisMonth += amt;
          if ((o as any).created_at >= d30) payments30++;
        }
      } catch (_) { /* ignore */ }
    }

    // Assume monthly price ~49_000 for MRR estimate
    const assumedMonthlyPrice = 49000;
    const mrr = monthlyActive * assumedMonthlyPrice;

    // Funnel events 30d
    const funnel = { landing_views: 0, cta_clicks: 0, trial_starts: 0, payments: 0 };
    const { data: events } = await sb
      .from("acquisition_events")
      .select("event")
      .gte("created_at", d30)
      .limit(5000);
    for (const e of events || []) {
      const ev = String(e.event);
      if (ev === "landing_view") funnel.landing_views++;
      else if (ev === "cta_click") funnel.cta_clicks++;
      else if (ev === "trial_start") funnel.trial_starts++;
      else if (ev === "payment") funnel.payments++;
    }
    funnel.payments = Math.max(funnel.payments, payments30);

    const trialStartsAll = funnel.trial_starts || counts.trial;
    const paidFromTrialApprox = counts.monthly + counts.lifetime;
    const trialToPaid = trialStartsAll > 0
      ? Math.round((Math.min(paidFromTrialApprox, trialStartsAll) / trialStartsAll) * 1000) / 10
      : 0;

    const conversionRate = funnel.landing_views > 0
      ? Math.round((funnel.payments / funnel.landing_views) * 1000) / 10
      : 0;

    const { count: totalUsers } = await sb.from("profiles").select("id", { count: "exact", head: true });

    return jsonResponse(req, {
      ok: true,
      metrics: {
        mrr,
        arr: mrr * 12,
        total_lifetime_revenue: lifetimeRevenue,
        revenue_this_month: revenueThisMonth,
        total_users: totalUsers || 0,
        trial_users: counts.trial,
        monthly_users: counts.monthly,
        lifetime_users: counts.lifetime,
        expired_users: counts.expired,
        trial_to_paid_rate: trialToPaid,
        churn_rate_monthly: 0,
        funnel,
        conversion_rate: conversionRate,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "FORBIDDEN") return jsonResponse(req, { error: "Forbidden" }, 403);
    return jsonResponse(req, { error: msg }, 500);
  }
});
