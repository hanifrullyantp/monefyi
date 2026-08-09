/**
 * Data & Logic Audit — end-to-end regression tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computePeriodTotals } from '../app/js/services/monthly-period.js';
import {
  predictEndOfPeriod,
  computeFlexibleBudget,
} from '../app/js/services/daily-situation.js';
import {
  calculateProgress,
  countFlexibleOverBudget,
  inferCategoryType,
  CATEGORY_TYPES,
} from '../app/js/services/budget-model.js';
import { buildIntervention } from '../app/js/services/monevisor-intervention.js';
import { generateRecommendations } from '../app/js/services/budget-recommender.js';
import { getGreeting } from '../app/js/services/monevisor-messages.js';

describe('Audit 1 — Net saldo via computePeriodTotals', () => {
  it('income 5jt − expense 2.539jt = 2.461jt net', () => {
    const txs = [
      { date: '2026-08-01', type: 'income', amount: 5000000 },
      { date: '2026-08-05', type: 'expense', amount: 2539000 },
    ];
    const totals = computePeriodTotals(txs, '2026-08');
    assert.equal(totals.income, 5000000);
    assert.equal(totals.expense, 2539000);
    assert.equal(totals.net, 2461000);
  });
});

describe('Audit 2 — Flexible-only prediction surplus', () => {
  it('day 9, flexible 789rb, 16 days to payday → surplus ~58rb', () => {
    const result = predictEndOfPeriod({
      income_actual: 5000000,
      fixed_bills_paid: 1500000,
      fixed_bills_pending: 500000,
      saving_target: 750000,
      flexible_expense_so_far: 789000,
      days_passed: 9,
      days_remaining: 16,
    });
    assert.equal(result.status, 'surplus');
    assert.ok(result.prediction > 50000 && result.prediction < 70000, `expected ~58rb, got ${result.prediction}`);
  });
});

describe('Audit 3 — Fixed bill at 100% is paid, not over', () => {
  it('Kost at 100% has status paid', () => {
    const row = { name: 'Kost', amount: 1500000, priority: 'harus' };
    const txs = [{ date: '2026-08-01', type: 'expense', amount: 1500000, category: 'Kost' }];
    const progress = calculateProgress(row, txs, '2026-08');
    assert.equal(inferCategoryType(row), CATEGORY_TYPES.FIXED_BILL);
    assert.equal(progress.status, 'paid');
    assert.notEqual(progress.status, 'over');
  });
});

describe('Audit 4 — countFlexibleOverBudget excludes fixed bills', () => {
  it('Kost 100% excluded from over count', () => {
    const rows = [
      { id: 'kost-1', name: 'Kost', amount: 1500000, priority: 'harus' },
      { id: 'makan-1', name: 'Hiburan', amount: 800000, priority: 'penting' },
    ];
    const txs = [
      { date: '2026-08-01', type: 'expense', amount: 1500000, category: 'Kost', meta: { budget_id: 'kost-1' } },
      { date: '2026-08-02', type: 'expense', amount: 500000, category: 'Hiburan', meta: { budget_id: 'makan-1' } },
    ];
    assert.equal(countFlexibleOverBudget(rows, txs, '2026-08'), 0);
  });
});

describe('Audit 5 — Monevisor does not freeze fixed bills at 100%', () => {
  it('fixed bill 100% → no freeze recommendation', async () => {
    const report = {
      month: '2026-08',
      metrics: { income: 5000000, totalIncome: 5000000, expense: 2000000, totalExpense: 2000000, net: 3000000, saving_rate: 0.6 },
      budgetComparison: [
        {
          id: 'kost',
          category: 'Kost',
          name: 'Kost',
          amount: 1500000,
          spent: 1500000,
          percent_used: 100,
          status: 'paid',
          category_type: 'fixed_bill',
          priority: 'harus',
        },
      ],
      transactions: [],
    };
    const intervention = buildIntervention(report, { health: { score: 70 } }, {});
    assert.notEqual(intervention.step.action?.type, 'decrease_budget');
    assert.ok(!intervention.step.text.toLowerCase().includes('bekukan kost'));

    const recs = await generateRecommendations({
      month: '2026-08',
      budgets: report.budgetComparison,
      transactions: [],
      income: 5000000,
    });
    assert.ok(!recs.some((r) => r.type === 'reduce_category' && r.category === 'Kost'));
  });
});

describe('Audit 6 — Message sync: DANGER greeting never says bagus', () => {
  it('DANGER level greeting does not contain "bagus"', () => {
    const greeting = getGreeting('DANGER');
    assert.ok(!greeting.toLowerCase().includes('bagus'));
  });
});
