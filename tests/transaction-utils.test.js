import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeTransactions,
  sumMonthExpenses,
  sumByTransactionType,
  getTransactionDedupeKey,
} from '../app/js/utils/transaction-utils.js';

describe('transaction-utils', () => {
  it('dedupeTransactions - same server_id keeps newest', () => {
    const txs = [
      { id: 'local_1', server_id: 'tx_a', amount: 100, date: '2026-08-01', type: 'expense', updated_at: '2026-08-01T00:00:00Z' },
      { id: 'tx_a', server_id: 'tx_a', amount: 100, date: '2026-08-01', type: 'expense', updated_at: '2026-08-02T00:00:00Z' },
    ];
    const out = dedupeTransactions(txs);
    assert.equal(out.length, 1);
    assert.equal(out[0].id, 'tx_a');
  });

  it('sumMonthExpenses - ignores duplicate copies', () => {
    const txs = [
      { id: 'local_1', server_id: 'tx_a', amount: 50000, date: '2026-08-03', type: 'expense' },
      { id: 'tx_a', server_id: 'tx_a', amount: 50000, date: '2026-08-03', type: 'expense' },
      { id: 'tx_b', amount: 30000, date: '2026-08-04', type: 'expense' },
    ];
    assert.equal(sumMonthExpenses(txs, '2026-08'), 80000);
  });

  it('sumByTransactionType - net from deduped rows', () => {
    const txs = [
      { id: 'tx_a', amount: 100000, date: '2026-08-01', type: 'expense' },
      { id: 'tx_a', amount: 100000, date: '2026-08-01', type: 'expense' },
      { id: 'tx_b', amount: 5000000, date: '2026-08-25', type: 'income' },
    ];
    const s = sumByTransactionType(txs);
    assert.equal(s.expense, 100000);
    assert.equal(s.income, 5000000);
    assert.equal(s.net, 4900000);
  });

  it('getTransactionDedupeKey prefers server_id', () => {
    assert.equal(getTransactionDedupeKey({ id: 'local_x', server_id: 'srv_1' }), 'srv_1');
  });
});
