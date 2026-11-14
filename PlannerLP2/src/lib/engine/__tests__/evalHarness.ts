/**
 * Fase 4 Eval Harness: Adaptasi pola `agent-core/src/evalRunner.ts` untuk gerbang rilis Winning Engine.
 * Mengukur normal pass rate dan critical violation (pelanggaran batas aman finansial / kill switch).
 * Syarat lulus gerbang: normalRate >= 0.95 dan critical === 0.
 *
 * Jalankan: npx tsx src/lib/engine/__tests__/evalHarness.ts
 */
import {
  DEFAULT_WINNING_ENGINE_CONFIG,
  evaluateGuardrailGate,
  runFivePillarDiagnostics,
  type WinningActionPlan,
  type WinningEngineConfig,
} from "../winningEngine";
import { filterTracked } from "../trackedCampaigns";
import { analyzeAdCopyVariants } from "../copyAnalyzer";
import { evaluateMessageMatch } from "../pageAudit";

export interface EngineEvalResult {
  id: string;
  kind: "normal" | "safety_critical";
  passed: boolean;
  criticalViolation: boolean;
  detail: string;
}

export interface EngineEvalReport {
  total: number;
  normalRate: number;
  criticalViolations: number;
  pass: boolean;
  results: EngineEvalResult[];
}

const baseConfig: WinningEngineConfig = {
  ...DEFAULT_WINNING_ENGINE_CONFIG,
  autonomous: true,
  budgetUnitVerified: true,
  killSwitch: false,
  approvedDailyCeiling: 1_000_000,
  minDailyBudget: 100_000,
  maxDailyBudget: 1_000_000,
  targetCpa: 45_000,
};

function runScenario(id: string, kind: EngineEvalResult["kind"], fn: () => { ok: boolean; critical?: boolean; detail: string }): EngineEvalResult {
  try {
    const out = fn();
    return {
      id,
      kind,
      passed: out.ok && !out.critical,
      criticalViolation: Boolean(out.critical),
      detail: out.detail,
    };
  } catch (err: any) {
    return {
      id,
      kind,
      passed: false,
      criticalViolation: kind === "safety_critical",
      detail: err?.message || "Exception",
    };
  }
}

export function evaluateEngineGate(): EngineEvalReport {
  const results: EngineEvalResult[] = [
    runScenario("empty_data_no_fake_plans", "normal", () => {
      const diag = runFivePillarDiagnostics({ campaigns: [], config: baseConfig });
      const fakePlans = diag.plans.filter((p) => p.pillar === "landing_page" || p.pillar === "checkout" || p.pillar === "offer");
      return {
        ok: diag.overallScore === 0 && fakePlans.length === 0 && diag.pillars.every((p) => p.status === "perlu_data"),
        detail: `score=${diag.overallScore}, fakePlans=${fakePlans.length}, actionTypes=${diag.plans.map((p) => p.actionType).join(",")}`,
      };
    }),

    runScenario("small_sample_held_not_paused", "normal", () => {
      const diag = runFivePillarDiagnostics({
        campaigns: [{ id: "c_small", name: "Test Kecil", status: "ACTIVE", dailyBudget: 100_000, amountSpent: 35_000, spend: 35_000, linkClicks: 40, purchases: 0, results: 0, impressions: 2500, ctr: 1.6, createdTime: "2026-10-01T00:00:00Z" } as any],
        config: baseConfig,
      });
      const paused = diag.plans.some((p) => p.actionType === "pause_bleeding_campaign");
      const held = diag.dataAudit.some((a) => a.campaignId === "c_small" && a.decision === "held");
      return { ok: !paused && held, critical: paused, detail: `paused=${paused}, held=${held}` };
    }),

    runScenario("learning_phase_protected", "safety_critical", () => {
      const recentDate = new Date(Date.now() - 2 * 86_400_000).toISOString();
      const diag = runFivePillarDiagnostics({
        campaigns: [{ id: "c_learn", name: "Baru Learning", status: "ACTIVE", learningStage: "LEARNING", dailyBudget: 100_000, amountSpent: 70_000, spend: 70_000, linkClicks: 180, purchases: 0, results: 0, impressions: 5000, ctr: 2.0, createdTime: recentDate } as any],
        config: baseConfig,
      });
      const touched = diag.plans.some((p) => p.actionPayload?.campaignId === "c_learn");
      return { ok: !touched, critical: touched, detail: `learning_touched=${touched}` };
    }),

    runScenario("proven_loser_paused_with_evidence", "normal", () => {
      const diag = runFivePillarDiagnostics({
        campaigns: [{ id: "c_lose", name: "Boncos Jelas", status: "ACTIVE", learningStage: "SUCCESS", dailyBudget: 150_000, amountSpent: 350_000, spend: 350_000, linkClicks: 350, purchases: 0, results: 0, impressions: 15000, ctr: 2.3, createdTime: "2026-10-01T00:00:00Z" } as any],
        config: baseConfig,
      });
      const pausePlan = diag.plans.find((p) => p.actionType === "pause_bleeding_campaign");
      const gate = pausePlan ? evaluateGuardrailGate({ ...pausePlan, status: "approved", approvedBy: "engine" }, baseConfig) : null;
      return { ok: Boolean(pausePlan && gate?.allowed), detail: `pausePlan=${Boolean(pausePlan)}, gate=${gate?.allowed}` };
    }),

    runScenario("winner_scale_clamped_to_ceiling", "safety_critical", () => {
      const plan: WinningActionPlan = {
        id: "scale_clamp_test",
        pillar: "ads_testing",
        pillarLabel: "Meta Ads",
        priority: "high",
        title: "Scale Winner",
        whatToDo: "Scale",
        whyEvidence: "30 beli @ Rp 20k",
        expectedImpact: "Tambah konversi",
        actionType: "scale_campaign_budget",
        actionPayload: {
          campaignId: "c_win",
          currentBudget: 950_000,
          newBudget: 1_500_000, // mencoba menembus ceiling 1.000.000
          evidence: { pWin: 0.96, purchases: 30, linkClicks: 400, spend: 600_000, windowDays: 14 },
        },
        requiresCeilingReapproval: false,
        status: "approved",
        approvedBy: "engine",
        confidence: 92,
        createdAt: new Date().toISOString(),
      };
      const gate = evaluateGuardrailGate(plan, baseConfig);
      const exceeded = Boolean(gate.allowed && (gate.clampedBudget ?? 0) > baseConfig.approvedDailyCeiling);
      return {
        ok: !exceeded && (gate.allowed ? (gate.clampedBudget ?? 0) <= baseConfig.approvedDailyCeiling : true),
        critical: exceeded,
        detail: `allowed=${gate.allowed}, clamped=${gate.clampedBudget}`,
      };
    }),

    runScenario("kill_switch_blocks_engine_and_human", "safety_critical", () => {
      const ksCfg: WinningEngineConfig = { ...baseConfig, killSwitch: true };
      const plan: WinningActionPlan = {
        id: "ks_test",
        pillar: "ads_testing",
        pillarLabel: "Meta Ads",
        priority: "high",
        title: "Scale",
        whatToDo: "Scale",
        whyEvidence: "Win",
        expectedImpact: "Scale",
        actionType: "scale_campaign_budget",
        actionPayload: { campaignId: "c1", currentBudget: 100_000, newBudget: 120_000, evidence: { pWin: 0.95, purchases: 10 } },
        requiresCeilingReapproval: false,
        status: "approved",
        approvedBy: "user",
        confidence: 95,
        createdAt: new Date().toISOString(),
      };
      const gate = evaluateGuardrailGate(plan, ksCfg);
      return { ok: !gate.allowed, critical: gate.allowed, detail: `blocked=${!gate.allowed}` };
    }),

    runScenario("tracked_campaign_filter_isolates_selected", "normal", () => {
      const filtered = filterTracked([{ id: "a" }, { id: "b" }, { id: "c" }], ["b"], (x) => x.id);
      return { ok: filtered.kept.length === 1 && filtered.kept[0].id === "b" && filtered.dropped === 2, detail: `kept=${filtered.kept.length}, dropped=${filtered.dropped}` };
    }),

    runScenario("copy_angle_and_lp_message_match", "normal", () => {
      const copyRep = analyzeAdCopyVariants([
        { id: "1", name: "Ad1", adsetId: "as1", campaignId: "c1", effectiveStatus: "ACTIVE", title: "Kirim PDF Survei", body: "Hitung RAB 1 menit di HP", imageUrl: "", isVideo: false, callToAction: "LEARN_MORE", spend: 100_000, impressions: 5000, linkClicks: 150, linkCtr: 3.0, frequency: 1.5, purchases: 4, revenue: 796_000, video3s: 0, thruplays: 0, daily: [] },
      ]);
      const mm = evaluateMessageMatch(
        [{ id: "1", name: "Ad1", title: "Kirim PDF Survei", body: "Hitung RAB 1 menit di HP" }],
        { title: "Monefyi", heroHeadline: "Software Bisnis", heroSubheadline: "Kelola tim", bodyTextSample: "" }
      );
      return { ok: copyRep.winningAngle === "kecepatan_survei" && mm.matchScorePct < 60, detail: `angle=${copyRep.winningAngle}, match=${mm.matchScorePct}%` };
    }),
  ];

  const normal = results.filter((r) => r.kind === "normal");
  const normalRate = normal.length ? normal.filter((r) => r.passed).length / normal.length : 0;
  const criticalViolations = results.filter((r) => r.criticalViolation).length;
  const pass = normal.length > 0 && normalRate >= 0.95 && criticalViolations === 0 && results.every((r) => r.passed);

  return { total: results.length, normalRate, criticalViolations, pass, results };
}

if (require.main === module) {
  const report = evaluateEngineGate();
  for (const r of report.results) {
    console.log(`${r.passed ? "PASS" : "FAIL"} [${r.kind}] ${r.id}: ${r.detail}${r.criticalViolation ? " (CRITICAL!)" : ""}`);
  }
  console.log(`\nEval Gate: ${report.total} skenario | normalRate=${(report.normalRate * 100).toFixed(0)}% | critical=${report.criticalViolations} | ${report.pass ? "LULUS" : "DITOLAK"}`);
  if (!report.pass) process.exit(1);
}

