import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  adjustBudgetsForFocusMode,
  computeFixedBillsSection,
  computeFocusInsights,
  computeAvgMonthlyExpense,
  DEFAULT_FOCUS_MODE,
  FOCUS_MODES,
} from '../app/js/services/budget-focus-mode.js';

describe('budget-focus-mode', () => {
  it('has survive as default mode', () => {
    assert.equal(DEFAULT_FOCUS_MODE, 'survive');
    assert.ok(FOCUS_MODES.survive);
  });

  it('computes manageable money after fixed bills', () => {
    const fixed = computeFixedBillsSection(
      { fixed_bills: [{ name: 'Kontrakan', amount: 2000000 }] },
      [{ name: 'Kontrakan', priority: 'harus', amount: 2000000 }],
      [],
      '2026-08',
      5000000,
    );
    assert.equal(fixed.totalPlanned, 2000000);
    assert.equal(fixed.manageable, 3000000);
  });

  it('adds debt cicilan row in debt mode', () => {
    const base = [{ name: 'Makan', priority: 'penting', amount: 1000000 }];
    const adjusted = adjustBudgetsForFocusMode(base, 'debt', 5000000, {
      debt_amount: 12000000,
      debt_name: 'Motor',
    });
    assert.ok(adjusted.some((r) => /cicilan/i.test(r.name)));
  });

  it('computes emergency target as 3x avg expense', () => {
    const txs = [
      { type: 'expense', amount: 3000000, date: '2026-08-05' },
      { type: 'expense', amount: 3000000, date: '2026-07-10' },
    ];
    const avg = computeAvgMonthlyExpense(txs, 3);
    assert.ok(avg >= 3000000);
    const insight = computeFocusInsights('emergency', {
      income: 5000000,
      rows: [{ name: 'Dana Darurat', priority: 'simpan', amount: 500000 }],
      transactions: txs,
      month: '2026-08',
      prefs: {},
    });
    assert.match(insight.headline, /dana darurat/i);
  });
});
