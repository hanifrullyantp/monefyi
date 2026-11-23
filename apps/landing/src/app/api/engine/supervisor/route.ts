import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { getServiceClient, acquireRunLock, releaseRunLock, logEngineAction } from "@/lib/engine/engineDb";
import { evaluateSupervisor, type SupervisorAction, type Finding } from "@/lib/engine/supervisor";
import { critiqueSupervisorEffectiveness, type SupervisorLlmCritique, type ReviewedActionSummary } from "@/lib/engine/supervisorCritic";
import { loadDbEngineSettings } from "@/lib/engine/engineConfigDb";
import { sendAdminPush } from "@/lib/engine/pushNotify";

/**
 * Supervisor Expert. Dipanggil cron (GET/POST) atau admin.
 * - POST/GET: jalankan penilaian, simpan laporan, aktifkan kill switch bila disiplin dilanggar.
 * Hanya mengurangi risiko: tidak pernah menaikkan budget atau mengubah ambang.
 */
async function run(req: NextRequest) {
  const auth = await requireEngineAuth(req, { allowCron: true });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  if (!(await acquireRunLock("supervisor", 5 * 60 * 1000))) {
    return NextResponse.json({ ok: false, error: "Supervisor sedang berjalan." }, { status: 423 });
  }
  try {
    const sb = getServiceClient();
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [{ data: hb }, { data: cfg }, { data: logs }, { data: prev }] = await Promise.all([
      sb.from("engine_heartbeat").select("*").eq("id", "expert").maybeSingle(),
      sb.from("winning_engine_config").select("kill_switch, tick_interval_minutes, openrouter_api_key, target_cpa, max_scale_pct, scale_cooldown_hours").eq("id", "default").maybeSingle(),
      sb.from("engine_action_log").select("id, created_at, action_type, campaign_name, before_value, after_value, ok, live_executed, response").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
      sb.from("engine_supervisor_reports").select("findings, llm_critique").order("created_at", { ascending: false }).limit(1),
    ]);

    const all = logs || [];
    const undone = new Set<number>();
    for (const l of all) {
      if (String(l.action_type).startsWith("undo_")) {
        const of = Number((l.response as any)?.undoOfLogId);
        if (Number.isFinite(of)) undone.add(of);
      }
    }
    const primary = all.filter((l) => !String(l.action_type).startsWith("undo_") && l.action_type !== "supervisor_kill_switch");
    const ids = primary.map((l) => Number(l.id));
    const { data: reviews } = await sb
      .from("engine_action_review")
      .select("log_id, verdict, rolled_back, details")
      .in("log_id", ids.length ? ids : [0]);
    const revBy = new Map((reviews || []).map((r: any) => [Number(r.log_id), r]));

    const actions: SupervisorAction[] = primary.map((l) => {
      const rev = revBy.get(Number(l.id));
      return {
        at: l.created_at,
        actionType: l.action_type,
        ok: Boolean(l.ok),
        liveExecuted: Boolean(l.live_executed),
        undone: undone.has(Number(l.id)),
        review: rev?.verdict ?? null,
        rolledBack: Boolean(rev?.rolled_back),
      };
    });

    const killSwitch = Boolean(cfg?.kill_switch);
    const report = evaluateSupervisor({
      now: Date.now(),
      heartbeat: (hb as any) ?? null,
      intervalMin: Number(cfg?.tick_interval_minutes) > 0 ? Number(cfg!.tick_interval_minutes) : 30,
      killSwitch,
      actions,
    });

    let engaged = false;
    if (report.engageKillSwitch) {
      const { error } = await sb.from("winning_engine_config").update({ kill_switch: true, updated_at: new Date().toISOString() }).eq("id", "default");
      engaged = !error;
      await logEngineAction({
        source: "cron",
        actor: "supervisor",
        actionType: "supervisor_kill_switch",
        ok: engaged,
        liveExecuted: false,
        summary: report.findings.filter((f) => f.severity === "critical").map((f) => f.message).join(" "),
      });
    }

    // Fase 2B: Pengawas efektivitas harian (LLM Critic). Jalan max sekali / 20 jam atau jika ?critic=1 oleh admin.
    const forceCritic = auth.via === "admin" && req.nextUrl.searchParams.get("critic") === "1";
    const prevCritique = (prev?.[0] as any)?.llm_critique as SupervisorLlmCritique | null | undefined;
    const prevCritiqueAgeH = prevCritique?.generatedAt ? (Date.now() - Date.parse(prevCritique.generatedAt)) / 3600000 : Infinity;
    let llmCritique: SupervisorLlmCritique | null = prevCritique ?? null;

    if (forceCritic || (prevCritiqueAgeH >= 20 && report.metrics.reviewed > 0)) {
      const dbSettings = await loadDbEngineSettings();
      const apiKey = dbSettings.openRouterApiKey || String(cfg?.openrouter_api_key || "") || process.env.OPENROUTER_API_KEY || "";
      const reviewedSummaries: ReviewedActionSummary[] = primary
        .filter((l) => revBy.has(Number(l.id)))
        .map((l) => {
          const rev: any = revBy.get(Number(l.id));
          return {
            logId: Number(l.id),
            campaignName: String(l.campaign_name || ""),
            actionType: String(l.action_type || ""),
            verdict: String(rev?.verdict || ""),
            rolledBack: Boolean(rev?.rolled_back),
            beforeBudget: l.before_value ? Number(l.before_value) : null,
            afterBudget: l.after_value ? Number(l.after_value) : null,
            afterSpend: Number(rev?.details?.after?.spend || 0),
            afterPurchases: Number(rev?.details?.after?.purchases || 0),
            reason: String(rev?.details?.reason || ""),
          };
        });
      llmCritique = await critiqueSupervisorEffectiveness({
        report,
        reviewedActions: reviewedSummaries,
        currentThresholds: {
          targetCpa: Number(cfg?.target_cpa || 45000),
          maxScalePct: Number(cfg?.max_scale_pct || 20),
          scaleCooldownHours: Number(cfg?.scale_cooldown_hours || 48),
        },
        apiKey,
      });
    }

    await sb.from("engine_supervisor_reports").insert({
      score: report.score,
      grade: report.grade,
      findings: report.findings,
      metrics: report.metrics,
      suggestions: report.suggestions,
      kill_switch_engaged: engaged,
      llm_critique: llmCritique,
    });

    // Push hanya untuk temuan kritis yang baru (hindari spam tiap 15 menit)
    const prevCodes = new Set<string>(((prev?.[0]?.findings as Finding[]) || []).filter((f) => f.severity === "critical").map((f) => f.code));
    const fresh = report.findings.filter((f) => f.severity === "critical" && !prevCodes.has(f.code));
    if (fresh.length > 0) {
      await sendAdminPush({
        title: engaged ? "Pengawas mengaktifkan kill switch" : "Pengawas: Expert bermasalah",
        body: fresh.map((f) => f.message).join(" ").slice(0, 180),
        tag: "supervisor-critical",
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true, report, llmCritique, killSwitchEngaged: engaged });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Supervisor gagal." }, { status: 500 });
  } finally {
    await releaseRunLock("supervisor");
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}
export async function POST(req: NextRequest) {
  return run(req);
}

