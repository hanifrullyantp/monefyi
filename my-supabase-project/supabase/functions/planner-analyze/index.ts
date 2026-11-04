import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { orgToday } from "../_shared/orgDate.ts";
import { computeProjectEvm } from "../_shared/evm.ts";
import { assertProjectId, MAX_ANALYZE_PER_DAY, quotaDecision } from "../_shared/plannerGate.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const CORS = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ code: "tanpa_sesi", message_id: "tanpa_sesi", fix_hint: "Masuk dulu.", valid_options: [] }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return json({ code: "sesi_tidak_sah", message_id: "sesi_tidak_sah", fix_hint: "Masuk ulang.", valid_options: [] }, 401);
    }

    const body = await req.json();
    const projectId = assertProjectId(body?.project_id);
    if (!projectId.ok) return json(projectId.error, projectId.status);

    const { data: project, error: projectErr } = await userClient
      .from("planner_projects")
      .select("id, org_id, planned_start, planned_end")
      .eq("id", projectId.value)
      .maybeSingle();
    if (projectErr || !project) {
      return json({
        code: "proyek_tidak_ditemukan",
        message_id: "proyek_tidak_ditemukan",
        fix_hint: "Pilih proyek yang ada di organisasi Anda.",
        valid_options: [],
      }, 404);
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const windowStart = `${orgToday("Asia/Jakarta")}T00:00:00+07:00`;
    const { data: quotaRow } = await admin
      .from("planner_rate_limits")
      .select("count")
      .eq("user_id", authData.user.id)
      .eq("action", "planner_analyze")
      .eq("window_start", windowStart)
      .maybeSingle();
    const decision = quotaDecision(Number(quotaRow?.count || 0), MAX_ANALYZE_PER_DAY);
    if (!decision.ok) {
      return json({
        code: "kuota_analisis_habis",
        message_id: "kuota_analisis_habis",
        fix_hint: "Batas analisis harian tercapai. Coba lagi besok.",
        valid_options: [],
      }, 429);
    }
    await admin.from("planner_rate_limits").upsert({
      user_id: authData.user.id,
      action: "planner_analyze",
      count: decision.next,
      window_start: windowStart,
    }, { onConflict: "user_id,action,window_start" });

    const { data: org } = await userClient
      .from("planner_organizations")
      .select("timezone")
      .eq("id", project.org_id)
      .maybeSingle();
    const timeZone = org?.timezone || "Asia/Jakarta";

    const { data: rapItems } = await userClient
      .from("planner_rap_items")
      .select("type, quantity, unit_price")
      .eq("project_id", project.id);
    const { data: workItems } = await userClient
      .from("planner_work_items")
      .select("weight, progress_pct, planned_start, planned_end")
      .eq("project_id", project.id);
    const { data: costs } = await userClient
      .from("planner_cost_realizations")
      .select("total_amount")
      .eq("project_id", project.id);

    const {
      totalBudget, plannedProgress, actualProgress, pv, ev, ac, spi, cpi, eac,
      etc: etc_, elapsedDays, totalDays,
    } = computeProjectEvm({
      budgetLines: rapItems || [],
      spentAmounts: (costs || []).map((row: { total_amount: number }) => Number(row.total_amount) || 0),
      workItems: workItems || [],
      plannedStart: project.planned_start,
      plannedEnd: project.planned_end,
      now: new Date(),
    });

    const recommendations: Array<Record<string, string>> = [];
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

    const materialCost = (rapItems || [])
      .filter((i: { type: string }) => i.type === "material")
      .reduce((s: number, i: { quantity: number; unit_price: number }) => s + Number(i.quantity) * Number(i.unit_price), 0);
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

    const { error: snapErr } = await userClient.from("planner_analysis_snapshots").insert({
      project_id: project.id,
      snapshot_date: orgToday(timeZone),
      pv, ev, ac, sv: ev - pv, cv: ev - ac, spi, cpi, eac, etc: etc_,
      planned_progress: plannedProgress, actual_progress: actualProgress,
      recommendations,
    });

    return json({ ...result, snapshot_saved: !snapErr });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ code: "analisis_gagal", message_id: "analisis_gagal", fix_hint: message, valid_options: [] }, 500);
  }
});
