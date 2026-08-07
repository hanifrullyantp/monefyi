/**
 * Daily situation calculation tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDailySituation,
  getDaysUntilPayday,
  getAvgDailySpend7d,
  computeFlexibleBudget,
} from '../app/js/services/daily-situation.js';

describe('getDaysUntilPayday', () => {
  it('returns days until end of month when irregular', () => {
    const r = getDaysUntilPayday(null, true);
    assert.ok(r.days >= 1);
    assert.ok(r.label.includes('akhir bulan'));
  });
});

describe('getAvgDailySpend7d', () => {
  it('averages expense over days with data', () => {
    const today = new Date().toISOString().slice(0, 10);
    const avg = getAvgDailySpend7d([
      { date: today, type: 'expense', amount: 100000 },
      { date: today, type: 'expense', amount: 50000 },
    ]);
    assert.ok(avg > 0);
  });
});

describe('computeDailySituation', () => {
  it('returns incomplete when no income', () => {
    const r = computeDailySituation({ transactions: [], budgetsByMonth: {} });
    assert.equal(r.status, 'incomplete');
  });

  it('computes safe-to-spend when income exists', () => {
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const r = computeDailySituation({
      selectedMonth: month,
      period: { start: `${month}-01`, end: `${month}-28` },
      transactions: [],
      budgetsByMonth: {
        [month]: {
          income: 8000000,
          categories: {
            rows: [
              { name: 'Kontrakan', amount: 2000000, priority: 'harus' },
              { name: 'Tabungan', amount: 800000, priority: 'simpan' },
            ],
          },
        },
      },
      db: {
        userPreferences: { payday_day: 25, payday_irregular: false },
      },
    });
    assert.notEqual(r.status, 'incomplete');
    assert.ok(r.safeToSpend >= 0);
    assert.ok(r.daysToPayday >= 1);
  });

  it('never returns negative safeToSpend', () => {
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const r = computeDailySituation({
      selectedMonth: month,
      period: { start: `${month}-01`, end: `${month}-28` },
      transactions: [
        { date: `${month}-05`, type: 'expense', amount: 9000000, category: 'Makan' },
      ],
      budgetsByMonth: {
        [month]: { income: 5000000, categories: { rows: [] } },
      },
      db: { userPreferences: { payday_day: 28, payday_irregular: false } },
    });
    assert.ok(r.safeToSpend >= 0);
    assert.equal(r.isNegativePool, true);
  });
});

describe('computeFlexibleBudget', () => {
  it('subtracts harus and simpan from income', () => {
    const month = '2026-08';
    const f = computeFlexibleBudget({
      selectedMonth: month,
      period: { start: '2026-08-01', end: '2026-08-31' },
      transactions: [],
      budgetsByMonth: {
        '2026-08': {
          income: 10000000,
          categories: {
            rows: [
              { name: 'Sewa', amount: 3000000, priority: 'harus' },
              { name: 'Tabung', amount: 1000000, priority: 'simpan' },
            ],
          },
        },
      },
    });
    assert.equal(f.flexibleBudgetTotal, 6000000);
  });
});
