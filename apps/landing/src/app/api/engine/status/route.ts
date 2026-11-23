import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { getServiceClient } from "@/lib/engine/engineDb";
import { loadDbEngineSettings } from "@/lib/engine/engineConfigDb";
import { runPreflight } from "@/lib/engine/preflight";
import { computeExpertStatus, type Blocker } from "@/lib/engine/expertStatus";
import { POLICY_LABEL } from "@/lib/engine/autonomyPolicy";
import { pushConfigured } from "@/lib/engine/pushNotify";

/**
 * GET /api/engine/status
 * Status hidup Expert + rencana kerja (kebijakan otonomi) + riwayat run. Hanya baca.
 */
export async function GET(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const sb = getServiceClient();
  const settings = await loadDbEngineSettings();
  const [{ data: heartbeat }, { data: runs }, { data: cfg }, { data: sup }] = await Promise.all([
    sb.from("engine_heartbeat").select("*").eq("id", "expert").maybeSingle(),
    sb.from("engine_runs").select("*").order("started_at", { ascending: false }).limit(15),
    sb.from("winning_engine_config").select("last_plans").eq("id", "default").maybeSingle(),
    sb.from("engine_supervisor_reports").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  const plans: any[] = Array.isArray(cfg?.last_plans) ? cfg!.last_plans : [];
  const pendingApprovals = plans.filter((p) => p?.status === "pending").length;
  const preflight = await runPreflight(settings);
  const preflightBlockers: Blocker[] = preflight.checks
    .filter((c) => c.status === "fail")
    .map((c) => ({ code: c.id, message: c.message, fix: c.fix || "" }));

  const status = computeExpertStatus({
    heartbeat: heartbeat as any,
    lastRun: (runs && runs[0]) as any,
    intervalMin: settings.intervalMin,
    pendingApprovals,
    preflightBlockers,
  });

  return NextResponse.json({
    ok: true,
    status,
    intervalMin: settings.intervalMin,
    policy: settings.policy,
    policyLabels: POLICY_LABEL,
    autonomous: settings.overrides.autonomous !== false,
    killSwitch: Boolean(settings.overrides.killSwitch),
    pushConfigured: pushConfigured(),
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
    preflight,
    runs: runs || [],
    supervisor: { latest: (sup && sup[0]) || null, history: (sup || []).map((r) => ({ at: r.created_at, score: r.score, grade: r.grade })) },
  });
}

