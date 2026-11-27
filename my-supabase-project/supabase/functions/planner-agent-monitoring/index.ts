import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { monitorEvent, monitorError } from "../_shared/monitoring.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const CORS = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  if (req.method !== "GET") {
    return json({ code: "metode_salah", message_id: "metode_salah", fix_hint: "Pakai GET.", valid_options: [] }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ code: "tanpa_sesi", message_id: "tanpa_sesi", fix_hint: "Masuk dulu.", valid_options: [] }, 401);
    }

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return json({ code: "sesi_tidak_sah", message_id: "sesi_tidak_sah", fix_hint: "Masuk ulang.", valid_options: [] }, 401);
    }

    const userId = String(authData.user.id);

    // Hanya owner/manager yang bisa melihat monitoring
    const { data: members, error: memberErr } = await userClient
      .from("planner_org_members")
      .select("org_id, role")
      .eq("user_id", userId)
      .eq("status", "active");
    if (memberErr) {
      return json({ code: "keanggotaan_gagal", message_id: "keanggotaan_gagal", fix_hint: "Coba lagi.", valid_options: [] }, 500);
    }
    if (!members || members.length === 0) {
      return json({
        code: "pilih_organisasi_di_aplikasi",
        message_id: "pilih_organisasi_di_aplikasi",
        fix_hint: "Pilih organisasi di aplikasi terlebih dahulu.",
        valid_options: [],
      }, 409);
    }

    const orgId = String(members[0].org_id);
    const userRole = members[0].role;

    if (userRole !== "owner" && userRole !== "manager") {
      return json({
        code: "tidak_memiliki_wewenang",
        message_id: "tidak_memiliki_wewenang",
        fix_hint: "Hanya owner atau manager yang dapat melihat monitoring agent.",
        valid_options: [],
      }, 403);
    }

    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days")) || 1;

    // Ambil rentang tanggal
    const tz = "Asia/Jakarta";
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1. Statistik runs
    const { data: runs, error: runsErr } = await userClient
      .from("planner_agent_runs")
      .select("id, status, tier, autonomy, sop_id, created_at, updated_at")
      .eq("org_id", orgId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (runsErr) throw runsErr;

    // 2. Statistik actions
    const { data: actions, error: actionsErr } = await userClient
      .from("planner_agent_actions")
      .select("id, status, tool_name, sop_step, created_at")
      .eq("org_id", orgId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (actionsErr) throw actionsErr;

    // 3. Statistik kuota harian
    const { data: usage, error: usageErr } = await userClient
      .from("planner_agent_usage")
      .select("org_id, usage_date, runs, tokens")
      .eq("org_id", orgId)
      .gte("usage_date", startDate.toISOString().slice(0, 10))
      .lte("usage_date", endDate.toISOString().slice(0, 10));

    if (usageErr) throw usageErr;

    // 4. Hitung metrik
    const totalRuns = runs?.length || 0;
    const completedRuns = runs?.filter((r: any) => r.status === "completed" || r.status === "executed" || r.status === "approved").length || 0;
    const failedRuns = runs?.filter((r: any) => r.status === "failed" || r.status === "rejected").length || 0;
    const draftRuns = runs?.filter((r: any) => r.status === "draft" || r.status === "pending").length || 0;
    const successRate = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;
    const errorRate = totalRuns > 0 ? (failedRuns / totalRuns) * 100 : 0;

    const totalActions = actions?.length || 0;
    const completedActions = actions?.filter((a: any) => a.status === "completed" || a.status === "executed" || a.status === "approved").length || 0;
    const failedActions = actions?.filter((a: any) => a.status === "failed" || a.status === "rejected").length || 0;
    const actionSuccessRate = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;

    const totalRunsTokens = usage?.reduce((sum: number, u: any) => sum + (u.tokens || 0), 0) || 0;
    const totalRunsQuota = usage?.reduce((sum: number, u: any) => sum + (u.runs || 0), 0) || 0;

    // 5. Distribusi SOP
    const sopDistribution: Record<string, number> = {};
    runs?.forEach((r: any) => {
      const sop = r.sop_id || "unknown";
      sopDistribution[sop] = (sopDistribution[sop] || 0) + 1;
    });

    // 6. Distribusi autonomy
    const autonomyDistribution: Record<string, number> = {};
    runs?.forEach((r: any) => {
      const aut = r.autonomy || "L1";
      autonomyDistribution[aut] = (autonomyDistribution[aut] || 0) + 1;
    });

    // 7. Runs terbaru
    const recentRuns = (runs || [])
      .slice(0, 10)
      .map((r: any) => ({
        id: r.id,
        sop_id: r.sop_id,
        tier: r.tier,
        autonomy: r.autonomy,
        status: r.status,
        created_at: r.created_at,
      }));

    monitorEvent({
      level: "info",
      message: "agent_monitoring_viewed",
      org_id: orgId,
      user_id: userId,
      metadata: { days, total_runs: totalRuns, success_rate: successRate },
    });

    return json({
      period: { days, start_date: startDate.toISOString(), end_date: endDate.toISOString() },
      organization: { org_id: orgId, user_role: userRole },
      metrics: {
        total_runs: totalRuns,
        completed_runs: completedRuns,
        failed_runs: failedRuns,
        draft_runs: draftRuns,
        success_rate_percent: Math.round(successRate * 100) / 100,
        error_rate_percent: Math.round(errorRate * 100) / 100,
        total_actions: totalActions,
        completed_actions: completedActions,
        failed_actions: failedActions,
        action_success_rate_percent: Math.round(actionSuccessRate * 100) / 100,
        total_tokens: totalRunsTokens,
        total_runs_quota: totalRunsQuota,
      },
      distributions: {
        by_sop: sopDistribution,
        by_autonomy: autonomyDistribution,
      },
      recent_runs: recentRuns,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    monitorError(error, { message: "planner-agent-monitoring gagal" });
    return json({ code: "agen_gagal", message_id: "agen_gagal", fix_hint: "Coba lagi.", valid_options: [] }, 500);
  }
});
