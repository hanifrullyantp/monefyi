import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { admitRun, decideActionStatus, explainAction, routeRequest, type Autonomy } from "../_shared/agent/runtime.ts";
import { screenFlowBody } from "../_shared/agent/flow.ts";
import { detectPromptInjection } from "../_shared/agent/receiptExtraction.ts";
import { writeAudit } from "../_shared/audit.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { monitorEvent, monitorError, monitorAsync } from "../_shared/monitoring.ts";

function logAgentEvent(
  orgId: string,
  userId: string,
  action: string,
  metadata: Record<string, unknown>,
) {
  monitorEvent({
    level: "info",
    message: action,
    org_id: orgId,
    user_id: userId,
    metadata,
  });
}

function estimateActualTokens(text: string): number {
  return Math.min(4000, Math.max(16, Math.ceil(text.length / 4) + 24));
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const CORS = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ code: "metode_salah", message_id: "metode_salah", fix_hint: "Pakai POST.", valid_options: [] }, 405);
  }

  let orgId: string | undefined;
  let userId: string | undefined;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ code: "tanpa_sesi", message_id: "tanpa_sesi", fix_hint: "Masuk dulu.", valid_options: [] }, 401);
    }
    const body = await req.json();
    const screened = screenFlowBody(body);
    if (!screened.ok) return json(screened.error, 400);
    const text = String(body.text || "").trim();
    if (!text) {
      return json({ code: "input_kosong", message_id: "input_kosong", fix_hint: "Isi permintaan.", valid_options: [] }, 400);
    }

    // H-AUD-10: Tolak prompt injection sebelum pemrosesan lebih lanjut
    const injectionHits = detectPromptInjection(text);
    if (injectionHits.length > 0) {
      return json({
        code: "prompt_injection_detected",
        message_id: "prompt_injection_detected",
        fix_hint: "Permintaan ditolak karena mengandung instruksi berisiko.",
        valid_options: [],
      }, 400);
    }

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return json({ code: "sesi_tidak_sah", message_id: "sesi_tidak_sah", fix_hint: "Masuk ulang.", valid_options: [] }, 401);
    }
    userId = String(authData.user.id);

    const { data: members, error: memberErr } = await userClient
      .from("planner_org_members")
      .select("org_id, role")
      .eq("user_id", authData.user.id)
      .eq("status", "active");
    if (memberErr) {
      return json({ code: "keanggotaan_gagal", message_id: "keanggotaan_gagal", fix_hint: "Coba lagi.", valid_options: [] }, 500);
    }
    if (!members || members.length !== 1) {
      return json({
        code: "pilih_organisasi_di_aplikasi",
        message_id: "pilih_organisasi_di_aplikasi",
        fix_hint: "Ikatan organisasi di server belum ada.",
        valid_options: [],
      }, 409);
    }
    orgId = String(members[0].org_id);

    // H-AUD-07: Rate limit di database bersama (per org_id + user_id, 60 request/menit)
    const rateLimitRes = await userClient.rpc("planner_agent_check_rate_limit", {
      p_org_id: orgId,
      p_user_id: userId,
      p_max_per_minute: 60,
    });
    if (rateLimitRes.error || rateLimitRes.data?.ok === false) {
      const retryAfterMs = Number(rateLimitRes.data?.retry_after_ms ?? 60_000);
      return json({
        code: "rate_limit_terlampaui",
        message_id: "rate_limit_terlampaui",
        fix_hint: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.`,
        valid_options: [],
      }, 429);
    }

    const { data: org } = await userClient
      .from("planner_organizations")
      .select("plan_type, timezone")
      .eq("id", orgId)
      .maybeSingle();
    const { data: settings } = await userClient
      .from("planner_agent_settings")
      .select("kill_switch, autonomy")
      .eq("org_id", orgId)
      .maybeSingle();
    const autonomy = (settings?.autonomy || "L1") as Autonomy;
    const failures = Number(body.failures || 0);
    const actualTokens = estimateActualTokens(text);

    // H-AUD-07: Konsumsi kuota atomik (per org + per user dengan FOR UPDATE) di awal request menggunakan token aktual
    const quotaResult = await userClient.rpc("planner_agent_consume_quota", {
      p_org_id: orgId,
      p_tokens: actualTokens,
      p_user_id: userId,
    });
    if (quotaResult.error || quotaResult.data?.ok === false) {
      const code = quotaResult.data?.code || "kuota_gagal";
      monitorEvent({
        level: "warn",
        message: "quota_consume_rejected",
        org_id: orgId,
        user_id: userId,
        error_code: code,
        metadata: { quota_code: code },
      });
      return json({ code, message_id: code, fix_hint: "Coba lagi besok atau minta pemilik menaikkan paket.", valid_options: [] }, 429);
    }

    const v_tz = String(org?.timezone || "Asia/Jakarta");
    const v_date = new Date().toLocaleDateString("en-CA", { timeZone: v_tz });
    const { data: usage } = await userClient
      .from("planner_agent_usage")
      .select("runs, tokens")
      .eq("org_id", orgId)
      .eq("usage_date", v_date)
      .maybeSingle();

    const gate = await monitorAsync(
      () => Promise.resolve(admitRun({
        killSwitch: Boolean(settings?.kill_switch),
        planType: String(org?.plan_type || "free"),
        usedRuns: Math.max(0, (usage?.runs ?? 1) - 1),
        usedTokens: Math.max(0, (usage?.tokens ?? actualTokens) - actualTokens),
        iteration: 1,
        tokens: actualTokens,
        costIdr: 0,
      })),
      {
        operation: "admit_run",
        org_id: orgId,
        user_id: userId,
        tokens_used: actualTokens,
        metadata: { plan_type: org?.plan_type, kill_switch: settings?.kill_switch },
      },
    );
    if (!gate.ok) {
      monitorEvent({
        level: "warn",
        message: "quota_rejected",
        org_id: orgId,
        user_id: userId,
        error_code: gate.error.code,
        metadata: { gate_error: gate.error.code },
      });
      return json(gate.error, 429);
    }

    const route = await monitorAsync(
      () => Promise.resolve(routeRequest(text, failures, "prepare")),
      {
        operation: "route_request",
        org_id: orgId,
        user_id: userId,
        tokens_used: actualTokens,
        metadata: { failures },
      },
    );
    logAgentEvent(orgId, userId, "route_request", {
      sop_id: route.sopId,
      confidence: route.confidence,
      tier: route.tier,
      escalate: route.escalate,
      tokens_used: actualTokens,
      failures,
    });

    if (!route.sopId) {
      monitorEvent({
        level: "warn",
        message: "sop_not_matched",
        org_id: orgId,
        user_id: userId,
        tokens_used: actualTokens,
        metadata: { sop_matched: false },
      });
      return json({
        code: "sop_belum_yakin",
        message_id: "sop_belum_yakin",
        fix_hint: "Perjelas permintaan. Model yang lebih besar dipakai bila aturan tidak yakin.",
        valid_options: [],
        tier: route.tier,
        escalate: route.escalate,
      }, 422);
    }

    const status = decideActionStatus(autonomy, "prepare", null, 0);
    const startedAt = Date.now();
    const { data: run, error: runErr } = await userClient.from("planner_agent_runs").insert({
      org_id: orgId,
      user_id: authData.user.id,
      sop_id: route.sopId,
      tier: route.tier,
      autonomy,
      status: "active",
    }).select("id").single();
    if (runErr || !run) {
      monitorError(runErr ?? new Error("run_insert_null"), {
        org_id: orgId,
        user_id: userId,
        message: "run_gagal_simpan",
      });
      return json({ code: "run_gagal_simpan", message_id: "run_gagal_simpan", fix_hint: "Coba lagi.", valid_options: [] }, 500);
    }
    const step = "cari_proyek";
    const explanation = explainAction({ sopId: route.sopId, sopStep: step, policyKey: null });
    await userClient.from("planner_agent_actions").insert({
      run_id: run.id,
      org_id: orgId,
      tool_name: "find_project",
      status,
      impact: { text, confidence: route.confidence, sop_id: route.sopId },
      sop_step: step,
      policy_key: null,
    });
    logAgentEvent(orgId, userId, "run_started", {
      run_id: run.id,
      sop_id: route.sopId,
      tier: route.tier,
      autonomy,
      status,
      tokens_used: actualTokens,
      latency_ms: Date.now() - startedAt,
    });
    await writeAudit(userClient, {
      orgId,
      userId,
      action: "agent_run_started",
      metadata: { run_id: run.id, sop_id: route.sopId, tier: route.tier, autonomy },
    });
    return json({
      run_id: run.id,
      sop_id: route.sopId,
      tier: route.tier,
      escalate: route.escalate,
      status,
      penjelasan: explanation,
    });
  } catch (error) {
    monitorError(error, { org_id: orgId, user_id: userId, message: "planner-agent-run gagal" });
    return json({ code: "agen_gagal", message_id: "agen_gagal", fix_hint: "Coba lagi.", valid_options: [] }, 500);
  }
});
