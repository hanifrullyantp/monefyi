import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeTargetStats,
  inferSavingsContribution,
} from '../app/js/services/financial-targets.js';

describe('financial-targets', () => {
  it('computes progress and ETA', () => {
    const stats = computeTargetStats({
      target_amount: 10000000,
      current_amount: 5200000,
      monthly_contribution: 200000,
    });
    assert.equal(stats.pct, 52);
    assert.equal(stats.remaining, 4800000);
    assert.ok(stats.monthsLeft >= 24);
    assert.ok(stats.etaLabel);
  });

  it('detects savings contribution from income category', () => {
    const amt = inferSavingsContribution({
      type: 'income',
      category: 'Tabungan',
      amount: 200000,
    });
    assert.equal(amt, 200000);
  });

  it('ignores regular expense', () => {
    const amt = inferSavingsContribution({
      type: 'expense',
      category: 'Makan',
      amount: 50000,
    });
    assert.equal(amt, 0);
  });
});
