import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildIntervention, generateStarterQuestions } from '../app/js/services/monevisor-intervention.js';

const baseState = {
  selectedMonth: '2026-08',
  period: { start: '2026-08-01', end: '2026-08-31' },
  db: { userPreferences: { monthly_income: 5000000, payday_day: 25 } },
  budgetsByMonth: {
    '2026-08': {
      income: 5000000,
      categories: {
        rows: [
          { id: 'b1', name: 'Hiburan', amount: 500000, priority: 'penting' },
          { id: 'b2', name: 'Makan', amount: 1500000, priority: 'penting' },
        ],
      },
    },
  },
  transactions: [],
};

describe('buildIntervention', () => {
  it('returns income action when data incomplete', () => {
    const report = {
      metrics: { income: 0, expense: 100000, net: -100000 },
      budgetComparison: [],
      transactions: [],
    };
    const dx = { health: { score: 40, label: 'Kurang', message: 'Perlu perhatian' } };
    const iv = buildIntervention(report, dx, { ...baseState, db: { userPreferences: {} }, budgetsByMonth: {} });
    assert.equal(iv.step.action.type, 'navigate');
    assert.equal(iv.step.action.payload.target, 'income');
  });

  it('suggests freeze for over-budget category', () => {
    const report = {
      month: '2026-08',
      metrics: { income: 5000000, expense: 4200000, net: 800000, savingRate: 0.16 },
      budgetComparison: [{
        id: 'b1', category: 'Hiburan', name: 'Hiburan', amount: 500000, spent: 620000, percent_used: 124,
      }],
      transactions: [],
    };
    const dx = { health: { score: 55 } };
    const iv = buildIntervention(report, dx, baseState);
    assert.match(iv.condition.text, /Hiburan/);
    assert.equal(iv.step.action.type, 'decrease_budget');
    assert.equal(iv.step.action.payload.new_amount, 0);
  });
});

describe('generateStarterQuestions', () => {
  it('includes category question when budget high', () => {
    const report = {
      metrics: { income: 5000000, savingRate: 0.05 },
      budgetComparison: [{ category: 'Makan', percent_used: 85 }],
    };
    const qs = generateStarterQuestions(report, {}, baseState);
    assert.ok(qs.some((q) => q.includes('Makan')));
    assert.ok(qs.length >= 3 && qs.length <= 4);
  });
});
