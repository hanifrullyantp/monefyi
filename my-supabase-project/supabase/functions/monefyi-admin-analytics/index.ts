/**
 * Unified admin analytics — dashboard + marketing + rule-based insights.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { buildAdminInsights } from "../_shared/adminInsights.ts";

async function requireAdmin(supa: ReturnType<typeof createClient>, callerId: string) {
  const { data: prof } = await supa.from("profiles").select("role").eq("id", callerId).maybeSingle();
  if (String(prof?.role || "").toLowerCase() !== "admin") throw new Error("FORBIDDEN");
}

function pctChange(current: number, previous: number): number | null {
  if (!previous) return current ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function trendDir(delta: number | null): "up" | "down" | "flat" {
  if (delta == null || Math.abs(delta) < 0.5) return "flat";
  return delta > 0 ? "up" : "down";
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

    let days = 30;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        days = Math.min(365, Math.max(7, Number(body.days) || 30));
      } catch { /* default */ }
    }

    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 86400000);
    const prevStart = new Date(periodStart.getTime() - days * 86400000);
    const periodIso = periodStart.toISOString();
    const prevIso = prevStart.toISOString();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const { data: profiles } = await sb
      .from("profiles")
      .select("id, plan_type, plan_expires_at, status, created_at, is_test_user")
      .eq("is_test_user", false)
      .limit(10000);

    const rows = profiles || [];
    const totalUsers = rows.length;
    let newInPeriod = 0;
    let newPrevPeriod = 0;
    const byPlan: Record<string, number> = { none: 0, trial: 0, monthly: 0, lifetime: 0, couple: 0, pro_plus: 0 };

    for (const p of rows) {
      const pt = String(p.plan_type || "none").toLowerCase();
      if (pt in byPlan) byPlan[pt]++;
      else byPlan.none++;
      if (p.created_at >= periodIso) newInPeriod++;
      if (p.created_at >= prevIso && p.created_at < periodIso) newPrevPeriod++;
    }

    let activeUsers = 0;
    let activePrev = 0;
    try {
      const { data: txs } = await sb.from("transactions").select("user_id, created_at").gte("created_at", prevIso).limit(20000);
      const testIds = new Set(rows.map((r: { id: string }) => r.id));
      const activeSet = new Set<string>();
      const activePrevSet = new Set<string>();
      for (const t of txs || []) {
        if (!testIds.has(t.user_id)) continue;
        const ts = t.created_at;
        if (ts >= periodIso) activeSet.add(t.user_id);
        if (ts >= prevIso && ts < periodIso) activePrevSet.add(t.user_id);
      }
      activeUsers = activeSet.size;
      activePrev = activePrevSet.size;
    } catch { /* ignore */ }

    let revenuePeriod = 0;
    let revenuePrev = 0;
    let revenueMonth = 0;
    let lifetimeRevenue = 0;
    const revenueByProduct: Record<string, number> = {};
    const productCounts: Record<string, number> = {};
    let orderCountPeriod = 0;

    try {
      const { data: orders } = await sb.from("lynk_orders").select("amount, created_at, plan_type, product_label").limit(5000);
      for (const o of orders || []) {
        const amt = Number(o.amount || 0);
        const label = String(o.product_label || o.plan_type || "other").toLowerCase();
        lifetimeRevenue += amt;
        productCounts[label] = (productCounts[label] || 0) + 1;
        revenueByProduct[label] = (revenueByProduct[label] || 0) + amt;
        if (o.created_at >= periodIso) {
          revenuePeriod += amt;
          orderCountPeriod++;
        } else if (o.created_at >= prevIso && o.created_at < periodIso) {
          revenuePrev += amt;
        }
        if (o.created_at >= monthStart) revenueMonth += amt;
      }
    } catch {
      try {
        const { data: orders } = await sb.from("orders").select("amount, created_at").limit(5000);
        for (const o of orders || []) {
          const amt = Number((o as { amount?: number }).amount || 0);
          lifetimeRevenue += amt;
          if ((o as { created_at: string }).created_at >= periodIso) revenuePeriod += amt;
        }
      } catch { /* ignore */ }
    }

    const funnel: Record<string, number> = {
      landing_views: 0,
      cta_clicks: 0,
      form_open: 0,
      checkout_initiate: 0,
      trial_starts: 0,
      payments: 0,
    };
    const funnelPrev: Record<string, number> = { ...funnel };

    const { data: events } = await sb
      .from("acquisition_events")
      .select("event, created_at")
      .gte("created_at", prevIso)
      .limit(10000);

    for (const e of events || []) {
      const ev = String(e.event);
      const inPeriod = e.created_at >= periodIso;
      const inPrev = e.created_at >= prevIso && e.created_at < periodIso;
      const map: Record<string, keyof typeof funnel> = {
        landing_view: "landing_views",
        cta_click: "cta_clicks",
        form_open: "form_open",
        checkout_initiate: "checkout_initiate",
        trial_start: "trial_starts",
        payment: "payments",
      };
      const key = map[ev];
      if (!key) continue;
      if (inPeriod) funnel[key]++;
      if (inPrev) funnelPrev[key]++;
    }
    funnel.payments = Math.max(funnel.payments, orderCountPeriod);

    const convRate = funnel.landing_views > 0
      ? Math.round((funnel.payments / funnel.landing_views) * 1000) / 10
      : 0;
    const convRatePrev = funnelPrev.landing_views > 0
      ? Math.round((funnelPrev.payments / funnelPrev.landing_views) * 1000) / 10
      : 0;

    const activationRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 1000) / 10 : 0;

    let pendingRefunds = 0;
    try {
      const { count } = await sb.from("refund_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
      pendingRefunds = count || 0;
    } catch { /* ignore */ }

    const { data: plans } = await sb.from("user_plans").select("plan_type, expires_at");
    let paidActive = 0;
    for (const p of plans || []) {
      const t = String(p.plan_type || "none");
      const expired = p.expires_at && new Date(String(p.expires_at)).getTime() < now.getTime();
      if ((t === "monthly" || t === "lifetime") && !expired) paidActive++;
    }
    const trialToPaid = funnel.trial_starts > 0
      ? Math.round((Math.min(paidActive, funnel.trial_starts) / funnel.trial_starts) * 1000) / 10
      : 0;

    const coupleOrders = productCounts.couple || productCounts["couple pack"] || 0;
    const soloOrders = productCounts.lifetime || productCounts.monthly || orderCountPeriod;
    const coupleTakeRate = soloOrders > 0 ? coupleOrders / (soloOrders + coupleOrders) : null;

    const insights = buildAdminInsights({
      funnel,
      revenueThisPeriod: revenuePeriod,
      revenuePrevPeriod: revenuePrev,
      convRate,
      convRatePrev,
      coupleTakeRate: coupleTakeRate ?? undefined,
      pendingRefunds,
      trialToPaidRate: trialToPaid,
    });

    const dailyTrend: { date: string; users: number; revenue: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dailyTrend.push({ date: key, users: 0, revenue: 0 });
    }
    const trendMap = Object.fromEntries(dailyTrend.map((d) => [d.date, d]));
    for (const p of rows) {
      if (!p.created_at || p.created_at < periodIso) continue;
      const key = String(p.created_at).slice(0, 10);
      if (trendMap[key]) trendMap[key].users++;
    }
    try {
      const { data: ord } = await sb.from("lynk_orders").select("amount, created_at").gte("created_at", periodIso).limit(5000);
      for (const o of ord || []) {
        const key = String(o.created_at).slice(0, 10);
        if (trendMap[key]) trendMap[key].revenue += Number(o.amount || 0);
      }
    } catch { /* ignore */ }

    const funnelSteps = [
      { step: "Page View", count: funnel.landing_views, pct: 100 },
      { step: "CTA Click", count: funnel.cta_clicks, pct: funnel.landing_views ? Math.round((funnel.cta_clicks / funnel.landing_views) * 1000) / 10 : 0 },
      { step: "Form Open", count: funnel.form_open, pct: funnel.landing_views ? Math.round((funnel.form_open / funnel.landing_views) * 1000) / 10 : 0 },
      { step: "Checkout Init", count: funnel.checkout_initiate, pct: funnel.landing_views ? Math.round((funnel.checkout_initiate / funnel.landing_views) * 1000) / 10 : 0 },
      { step: "Trial Start", count: funnel.trial_starts, pct: funnel.landing_views ? Math.round((funnel.trial_starts / funnel.landing_views) * 1000) / 10 : 0 },
      { step: "Purchase", count: funnel.payments, pct: funnel.landing_views ? Math.round((funnel.payments / funnel.landing_views) * 1000) / 10 : 0 },
    ];

    const dropoffs = [];
    for (let i = 0; i < funnelSteps.length - 1; i++) {
      const from = funnelSteps[i].count;
      const to = funnelSteps[i + 1].count;
      if (from <= 0) continue;
      const drop = Math.round((1 - to / from) * 1000) / 10;
      dropoffs.push({
        from: funnelSteps[i].step,
        to: funnelSteps[i + 1].step,
        drop_pct: drop,
        severity: drop >= 50 ? "high" : drop >= 30 ? "medium" : "normal",
      });
    }

    return jsonResponse(req, {
      ok: true,
      period_days: days,
      updated_at: now.toISOString(),
      metrics: {
        total_users: totalUsers,
        new_users: newInPeriod,
        new_users_delta: pctChange(newInPeriod, newPrevPeriod),
        new_users_trend: trendDir(pctChange(newInPeriod, newPrevPeriod)),
        active_users: activeUsers,
        active_users_delta: pctChange(activeUsers, activePrev),
        activation_rate: activationRate,
        revenue_period: revenuePeriod,
        revenue_prev: revenuePrev,
        revenue_delta: pctChange(revenuePeriod, revenuePrev),
        revenue_trend: trendDir(pctChange(revenuePeriod, revenuePrev)),
        revenue_month: revenueMonth,
        revenue_lifetime: lifetimeRevenue,
        conversion_rate: convRate,
        conversion_delta: convRate - convRatePrev,
        mrr_estimate: paidActive * 49000,
        pending_refunds: pendingRefunds,
        trial_to_paid_rate: trialToPaid,
        avg_order_value: orderCountPeriod > 0 ? Math.round(revenuePeriod / orderCountPeriod) : 0,
      },
      by_plan: byPlan,
      revenue_by_product: revenueByProduct,
      product_counts: productCounts,
      funnel: funnelSteps,
      dropoffs,
      daily_trend: dailyTrend,
      insights,
      alerts: [
        ...(pendingRefunds > 0 ? [{ type: "warning", message: `${pendingRefunds} refund request pending` }] : []),
        ...(pctChange(revenuePeriod, revenuePrev) != null && (pctChange(revenuePeriod, revenuePrev) || 0) >= 10
          ? [{ type: "success", message: `Revenue naik ${pctChange(revenuePeriod, revenuePrev)}% vs periode lalu` }]
          : []),
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "FORBIDDEN") return jsonResponse(req, { error: "Forbidden" }, 403);
    return jsonResponse(req, { error: msg }, 500);
  }
});
