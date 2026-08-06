/**
 * Transaction impact calculation tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTransactionImpact,
  buildStateSnapshot,
  getCategoryImpact,
} from '../app/js/services/transaction-impact.js';

const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

function baseState(transactions = []) {
  return {
    selectedMonth: month,
    period: { start: `${month}-01`, end: `${month}-28`, label: month },
    transactions,
    budgetsByMonth: {
      [month]: {
        income: 8000000,
        categories: {
          rows: [
            { name: 'Makan', amount: 1500000, priority: 'penting' },
            { name: 'Jajan', amount: 500000, priority: 'mau' },
          ],
        },
      },
    },
    db: {
      userPreferences: { payday_day: 25, payday_irregular: false, near_term_goal: 'safe_until_payday' },
    },
  };
}

describe('getCategoryImpact', () => {
  it('returns warning status above 70%', () => {
    const state = baseState([
      { id: '1', date: `${month}-10`, type: 'expense', amount: 1200000, category: 'Makan' },
    ]);
    const impact = getCategoryImpact(
      { type: 'expense', category: 'Makan', amount: 100000 },
      state,
    );
    assert.ok(impact);
    assert.ok(impact.pct >= 70);
    assert.equal(impact.status, 'attention');
  });
});

describe('computeTransactionImpact', () => {
  it('shows safe-to-spend decrease for expense', () => {
    const beforeTxs = [];
    const tx = { id: 'x1', date: new Date().toISOString().slice(0, 10), type: 'expense', amount: 50000, category: 'Makan' };
    const afterTxs = [tx];
    const before = buildStateSnapshot(baseState(beforeTxs), beforeTxs);
    const after = buildStateSnapshot(baseState(afterTxs), afterTxs);
    const impact = computeTransactionImpact(tx, before, after);
    assert.equal(impact.show, true);
    assert.equal(impact.isExpense, true);
    assert.ok(typeof impact.safeToSpendAfter === 'number');
  });

  it('shows income line for pemasukan', () => {
    const tx = { id: 'x2', date: new Date().toISOString().slice(0, 10), type: 'income', amount: 500000, category: 'Gaji' };
    const before = buildStateSnapshot(baseState([]), []);
    const after = buildStateSnapshot(baseState([tx]), [tx]);
    const impact = computeTransactionImpact(tx, before, after);
    assert.equal(impact.isIncome, true);
    assert.ok(impact.incomeLine);
  });
});
