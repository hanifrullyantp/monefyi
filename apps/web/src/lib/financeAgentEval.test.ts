import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  evaluateFinanceGoldSet,
  loadFinanceGoldCases,
} from '@agent-core/financeEvalRunner';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const goldPath = `${root}evals/finance/gold_200_id.yaml`;

describe('F3 — Gold Set Evaluasi Keuangan (>= 200 Kalimat Indonesia pada >= 2 Model Kecil)', () => {
  const cases = loadFinanceGoldCases(goldPath);

  it('dataset gold memiliki >= 200 kasus unik dan mencakup 3 contoh kalimat wajib', () => {
    expect(cases.length).toBeGreaterThanOrEqual(200);
    const ids = new Set(cases.map((c) => c.id));
    expect(ids.size).toBe(cases.length);
    const texts = cases.map((c) => c.input.toLowerCase());
    expect(texts.some((t) => t.includes('belanja engsel pintu proyek a 50.000'))).toBe(true);
    expect(texts.some((t) => t.includes('belanja rp150.000 untuk proyek b'))).toBe(true);
    expect(texts.some((t) => t.includes('beli keramik perbaikan workshop'))).toBe(true);
  });

  it('model kecil 1 (tier-small-flash-lite): nominal/tanggal 100%, top-1 >= 95%, salah auto-commit = 0', () => {
    const summary = evaluateFinanceGoldSet(cases, 'tier-small-flash-lite');
    console.info('[F3-EVAL]', {
      model: summary.model,
      totalCases: summary.totalCases,
      passedCases: summary.passedCases,
      nominalDateRate: summary.nominalDateRate,
      top1ClassificationRate: summary.top1ClassificationRate,
      autoCommitWrongPostings: summary.autoCommitWrongPostings,
      ambiguousHandlingRate: summary.ambiguousHandlingRate,
      avgTokensPerCase: summary.avgTokensPerCase,
    });
    expect(summary.failures, JSON.stringify(summary.failures.slice(0, 5))).toEqual([]);
    expect(summary.nominalDateRate).toBe(1);
    expect(summary.top1ClassificationRate).toBeGreaterThanOrEqual(0.95);
    expect(summary.autoCommitWrongPostings).toBe(0);
    expect(summary.ambiguousHandlingRate).toBe(1);
    expect(summary.avgTokensPerCase).toBeLessThanOrEqual(350);
    expect(summary.pass).toBe(true);
  });

  it('model kecil 2 (tier-small-haiku-mini): nominal/tanggal 100%, top-1 >= 95%, salah auto-commit = 0', () => {
    const summary = evaluateFinanceGoldSet(cases, 'tier-small-haiku-mini');
    console.info('[F3-EVAL]', {
      model: summary.model,
      totalCases: summary.totalCases,
      passedCases: summary.passedCases,
      nominalDateRate: summary.nominalDateRate,
      top1ClassificationRate: summary.top1ClassificationRate,
      autoCommitWrongPostings: summary.autoCommitWrongPostings,
      ambiguousHandlingRate: summary.ambiguousHandlingRate,
      avgTokensPerCase: summary.avgTokensPerCase,
    });
    expect(summary.failures, JSON.stringify(summary.failures.slice(0, 5))).toEqual([]);
    expect(summary.nominalDateRate).toBe(1);
    expect(summary.top1ClassificationRate).toBeGreaterThanOrEqual(0.95);
    expect(summary.autoCommitWrongPostings).toBe(0);
    expect(summary.ambiguousHandlingRate).toBe(1);
    expect(summary.avgTokensPerCase).toBeLessThanOrEqual(350);
    expect(summary.pass).toBe(true);
  });
});
