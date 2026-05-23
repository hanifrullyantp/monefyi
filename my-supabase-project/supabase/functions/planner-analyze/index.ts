import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: CORS });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    const { project_id, analysis_type } = await req.json();
    if (!project_id) return new Response(JSON.stringify({ error: "No project_id" }), { status: 400, headers: CORS });

    const { data: project } = await sb.from("planner_projects").select("*").eq("id", project_id).single();
    if (!project) return new Response(JSON.stringify({ error: "Project not found" }), { status: 404, headers: CORS });

    const { data: rapItems } = await sb.from("planner_rap_items").select("*").eq("project_id", project_id);
    const { data: workItems } = await sb.from("planner_work_items").select("*").eq("project_id", project_id);
    const { data: costs } = await sb.from("planner_cost_realizations").select("*").eq("project_id", project_id);

    const totalBudget = (rapItems || []).reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);
    const totalSpent = (costs || []).reduce((s: number, c: any) => s + (c.total_amount || 0), 0);
    const totalWeight = (workItems || []).reduce((s: number, w: any) => s + (w.weight || 0), 0) || 1;

    const today = new Date();
    const startDate = new Date(project.planned_start);
    const endDate = new Date(project.planned_end);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    const elapsedDays = Math.max(0, Math.min(
      Math.ceil((today.getTime() - startDate.getTime()) / 86400000) + 1,
      totalDays
    ));

    let plannedProgress = 0;
    (workItems || []).forEach((wi: any) => {
      const wiStart = new Date(wi.planned_start);
      const wiEnd = new Date(wi.planned_end);
      const wiDur = Math.ceil((wiEnd.getTime() - wiStart.getTime()) / 86400000) + 1 || 1;
      if (today >= wiStart) {
        const elapsed = Math.min(Math.ceil((today.getTime() - wiStart.getTime()) / 86400000) + 1, wiDur);
        plannedProgress += ((wi.weight || 0) / totalWeight) * (elapsed / wiDur) * 100;
      }
    });

    const actualProgress = (workItems || []).reduce(
      (s: number, w: any) => s + (w.weight || 0) * (w.progress_pct || 0), 0
    ) / totalWeight;

    const pv = totalBudget * plannedProgress / 100;
    const ev = totalBudget * actualProgress / 100;
    const ac = totalSpent;

    const spi = pv > 0 ? ev / pv : 0;
    const cpi = ac > 0 ? ev / ac : 0;
    const eac = cpi > 0 ? totalBudget / cpi : totalBudget;
    const etc_ = eac - ac;

    const recommendations: any[] = [];

    if (spi < 0.95 && spi > 0) {
      const behindPct = plannedProgress - actualProgress;
      const behindDays = Math.ceil(behindPct / 100 * totalDays);
      recommendations.push({
        category: "schedule",
        priority: spi < 0.85 ? "critical" : "warning",
        title: `Progress terlambat ~${behindDays} hari`,
        description: `SPI ${spi.toFixed(2)}, aktual ${actualProgress.toFixed(1)}% vs target ${plannedProgress.toFixed(1)}%`,
      });
    }

    if (cpi > 0 && cpi < 0.95) {
      const overrun = eac - totalBudget;
      recommendations.push({
        category: "cost",
        priority: cpi < 0.85 ? "critical" : "warning",
        title: `Budget berisiko over Rp ${Math.round(overrun).toLocaleString("id-ID")}`,
        description: `CPI ${cpi.toFixed(2)}, estimasi total Rp ${Math.round(eac).toLocaleString("id-ID")}`,
      });
    }

    const materialCost = (rapItems || []).filter((i: any) => i.type === "material").reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);
    if (totalBudget > 0 && materialCost / totalBudget > 0.75) {
      recommendations.push({
        category: "budget",
        priority: "warning",
        title: "Rasio bahan terlalu tinggi",
        description: `Bahan ${(materialCost / totalBudget * 100).toFixed(0)}% dari total. Normal 50-65%.`,
      });
    }

    const result = {
      evm: {
        planned_value: pv, earned_value: ev, actual_cost: ac,
        schedule_variance: ev - pv, cost_variance: ev - ac,
        spi, cpi, eac, etc: etc_,
        planned_progress: plannedProgress, actual_progress: actualProgress,
        total_budget: totalBudget, elapsed_days: elapsedDays, total_duration: totalDays,
      },
      recommendations,
    };

    await sb.from("planner_analysis_snapshots").insert({
      project_id, snapshot_date: today.toISOString().split("T")[0],
      pv, ev, ac, sv: ev - pv, cv: ev - ac, spi, cpi, eac, etc: etc_,
      planned_progress: plannedProgress, actual_progress: actualProgress,
      recommendations,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
