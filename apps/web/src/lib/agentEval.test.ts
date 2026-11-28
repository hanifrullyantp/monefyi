import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { l2Gate, llmJudge, loadReplayInputs, loadScenarios, runLLMJudgeReport, runScenario } from '@agent-core/evalRunner';
import { SOP_CATALOG } from '@agent-core/sopData';
import type { ScenarioResult } from '@agent-core/evalRunner';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const now = Date.parse('2026-11-04T01:00:00.000Z');

describe('gerbang uji agen', () => {
  it('tier rendah lulus 95 persen skenario normal dan nol kesalahan kritis', () => {
    const scenarios = loadScenarios(`${root}evals/scenarios/agent.yaml`);
    const replay = loadReplayInputs(`${root}evals/replays`);
    expect(replay.semen).toBe('beli semen 10 sak 65000');
    const results = scenarios.map((scenario) => runScenario(
      scenario.kind === 'replay' ? { ...scenario, input: replay.semen } : scenario,
      SOP_CATALOG,
      now,
    ));
    const report = l2Gate(results);
    const failed = results.filter((item) => !item.passed).map((item) => `${item.id}:${item.sopId}:${item.writes}`);
    expect(failed, failed.join(', ')).toEqual([]);
    expect(report.critical).toBe(0);
    expect(report.normalRate).toBeGreaterThanOrEqual(0.95);
    expect(report.pass).toBe(true);
    expect(results.every((item) => item.costIdr === 0 && item.tokens > 0)).toBe(true);
  });

  it('laporan di bawah ambang tidak membuka L2', () => {
    const weak: ScenarioResult[] = [
      { id: 'a', kind: 'normal', passed: false, critical: false, steps: 1, tokens: 1, costIdr: 0, latencyMs: 1, sopId: null, writes: 0 },
      { id: 'b', kind: 'normal', passed: true, critical: true, steps: 1, tokens: 1, costIdr: 0, latencyMs: 1, sopId: null, writes: 1 },
    ];
    expect(l2Gate(weak).pass).toBe(false);
  });

  it('llmJudge mengevaluasi kualitas respons memakai model berbeda dari model agen (anti-bias H-AUD-12)', async () => {
    const mockJudgeAI = async (_prompt: string, model: string) => {
      expect(model).toBe('claude-3-5-sonnet');
      return JSON.stringify({
        relevanceScore: 0.95,
        clarityScore: 0.9,
        safetyScore: 1.0,
        delegationAccuracy: 0.9,
        overallPass: true,
        reasons: ['Respons tepat dan aman.'],
      });
    };

    await expect(
      llmJudge('beli semen 10 sak 65000', 'Dicatat Rp 650.000', mockJudgeAI, {
        agentModel: 'gemini-2.5-flash',
        judgeModel: 'gemini-2.5-flash',
      }),
    ).rejects.toThrow(/bias/i);

    const report = await runLLMJudgeReport(
      [{ id: 'normal_semen', input: 'beli semen 10 sak 65000', response: 'Bu Sinta mencatat biaya semen Rp 650.000.' }],
      mockJudgeAI,
      { agentModel: 'gemini-2.5-flash', judgeModel: 'claude-3-5-sonnet' },
    );
    expect(report.passRate).toBe(1);
    expect(report.agentModel).not.toBe(report.judgeModel);
  });
});
