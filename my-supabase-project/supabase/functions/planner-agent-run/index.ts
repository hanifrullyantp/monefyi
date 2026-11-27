import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { admitRun, decideActionStatus, explainAction, routeRequest, type Autonomy } from "../_shared/agent/runtime.ts";
import { screenFlowBody } from "../_shared/agent/flow.ts";
import { writeAudit } from "../_shared/audit.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

function logAgentEvent(
  orgId: string,
  userId: string,
  action: string,
  metadata: Record<string, unknown>,
) {
  console.log(
    JSON.stringify({
      event: "agent_run",
      org_id: orgId,
      user_id: userId,
      action,
      timestamp: new Date().toISOString(),
      ...metadata,
    }),
  );
}

// Rate limiter sederhana per user (sliding window 1 menit, max 60 request)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: RATE_LIMIT_WINDOW_MS - (now - entry.windowStart) };
  }
  entry.count += 1;
  return { ok: true };
}

// Bersihkan entri lama setiap 5 menit
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS * 5);

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

  if (req.method !== "POST") {
    return json({ code: "metode_salah", message_id: "metode_salah", fix_hint: "Pakai POST.", valid_options: [] }, 405);
  }

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

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return json({ code: "sesi_tidak_sah", message_id: "sesi_tidak_sah", fix_hint: "Masuk ulang.", valid_options: [] }, 401);
    }
    const userId = String(authData.user.id);

    // Rate limit per user: maksimal 60 request per menit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.ok) {
      return json({
        code: "rate_limit_terlampaui",
        message_id: "rate_limit_terlampaui",
        fix_hint: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(rateLimit.retryAfter / 1000)} detik.`,
        valid_options: [],
      }, 429);
    }

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
    const orgId = String(members[0].org_id);
    const userId = String(authData.user.id);
    const { data: org } = await userClient.from("planner_organizations").select("plan_type").eq("id", orgId).maybeSingle();
    const { data: settings } = await userClient.from("planner_agent_settings").select("kill_switch, autonomy").eq("org_id", orgId).maybeSingle();
    const autonomy = (settings?.autonomy || "L1") as Autonomy;
    const failures = Number(body.failures || 0);

    // Ambil penggunaan kuota hari ini dari database untuk admitRun yang akurat
    const v_tz = String(org?.timezone || "Asia/Jakarta");
    const v_date = new Date().toLocaleDateString("en-CA", { timeZone: v_tz }); // YYYY-MM-DD
    const { data: usage } = await userClient
      .from("planner_agent_usage")
      .select("runs, tokens")
      .eq("org_id", orgId)
      .eq("usage_date", v_date)
      .maybeSingle();

    const route = routeRequest(text, failures, "prepare");
    logAgentEvent(orgId, userId, "route_request", {
      input: text,
      sop_id: route.sopId,
      confidence: route.confidence,
      tier: route.tier,
      escalate: route.escalate,
      failures,
    });
    const gate = admitRun({
      killSwitch: Boolean(settings?.kill_switch),
      planType: String(org?.plan_type || "free"),
      usedRuns: usage?.runs ?? 0,
      usedTokens: usage?.tokens ?? 0,
      iteration: 1,
      tokens: 32,
      costIdr: 0,
    });
    if (!gate.ok) {
      logAgentEvent(orgId, userId, "quota_rejected", { error: gate.error.code });
      return json(gate.error, 429);
    }
    if (!route.sopId) {
      logAgentEvent(orgId, userId, "sop_not_matched", { input: text });
      return json({
        code: "sop_belum_yakin",
        message_id: "sop_belum_yakin",
        fix_hint: "Perjelas permintaan. Model yang lebih besar dipakai bila aturan tidak yakin.",
        valid_options: [],
        tier: route.tier,
        escalate: route.escalate,
      }, 422);
    }
    const quota = await userClient.rpc("planner_agent_consume_quota", { p_org_id: orgId, p_tokens: 32 });
    if (quota.error || quota.data?.ok === false) {
      const code = quota.data?.code || "kuota_gagal";
      return json({ code, message_id: code, fix_hint: "Coba lagi besok atau minta pemilik menaikkan paket.", valid_options: [] }, 429);
    }
    if (quota.error || quota.data?.ok === false) {
      const code = quota.data?.code || "kuota_gagal";
      logAgentEvent(orgId, userId, "quota_consume_rejected", { code });
      return json({ code, message_id: code, fix_hint: "Coba lagi besok atau minta pemilik menaikkan paket.", valid_options: [] }, 429);
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
    console.error("planner-agent-run gagal:", error);
    return json({ code: "agen_gagal", message_id: "agen_gagal", fix_hint: "Coba lagi.", valid_options: [] }, 500);
  }
});
