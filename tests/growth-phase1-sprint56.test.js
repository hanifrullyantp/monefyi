/**
 * Growth Q1 Sprint 5-6 — contextual micro-insights + bulk UX helpers.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { getCategoryDetailInsight } from '../app/js/services/contextual-micro-insights.js';
import { buildBehavioralInsights } from '../app/js/services/monthly-review-patterns.js';

describe('Sprint 5-6 contextual micro-insights', () => {
  beforeEach(() => {
    globalThis.window = { STATE: { transactions: [] } };
  });

  it('getCategoryDetailInsight compares daily spend to budget target', () => {
    const now = new Date();
    const thisWeek = now.toISOString().slice(0, 10);
    window.STATE.transactions = [
      { type: 'expense', category: 'Makan', amount: 40000, date: thisWeek },
      { type: 'expense', category: 'Makan', amount: 35000, date: thisWeek },
    ];
    const insight = getCategoryDetailInsight('Makan', window.STATE, { dailyBudgetTarget: 80000 });
    assert.ok(insight);
    assert.match(insight.body, /di bawah target harian/);
  });

  it('buildBehavioralInsights flags category spike vs prev month', () => {
    const patterns = buildBehavioralInsights('2026-08', [
      { type: 'expense', category: 'Transport', amount: 500000, date: '2026-07-05' },
      { type: 'expense', category: 'Transport', amount: 900000, date: '2026-08-05' },
      { type: 'expense', category: 'Transport', amount: 900000, date: '2026-08-12' },
    ]);
    assert.ok(patterns.some((p) => p.text.includes('Transport')));
  });

  it('buildBehavioralInsights detects new merchant habit', () => {
    const patterns = buildBehavioralInsights('2026-08', [
      { type: 'expense', merchant: 'Gold Gym', amount: 200000, date: '2026-08-01' },
      { type: 'expense', merchant: 'Gold Gym', amount: 200000, date: '2026-08-08' },
      { type: 'expense', merchant: 'Gold Gym', amount: 200000, date: '2026-08-15' },
    ]);
    assert.ok(patterns.some((p) => p.id === 'new_habit'));
  });
});
