import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toPeriodKey,
  computePeriodTotals,
  stampTransactionPeriod,
  periodDateRange,
} from '../app/js/services/monthly-period.js';
import { buildClosingSummary, buildClosingTransactions } from '../app/js/services/monthly-closing.js';
import {
  buildJournalLinesForTransaction,
  isLoanPaymentTransaction,
} from '../app/js/services/journal-engine.js';

describe('monthly-period', () => {
  it('toPeriodKey - normalizes date to YYYY-MM', () => {
    assert.equal(toPeriodKey('2026-08-15'), '2026-08');
    assert.equal(toPeriodKey('2026-08'), '2026-08');
  });

  it('periodDateRange - August 2026 bounds', () => {
    const { start, end } = periodDateRange('2026-08');
    assert.equal(start, '2026-08-01');
    assert.equal(end, '2026-08-31');
  });

  it('scenario 1 - new user opening balances, zero cash flow', () => {
    const txs = [];
    const totals = computePeriodTotals(txs, '2026-08');
    assert.equal(totals.income, 0);
    assert.equal(totals.expense, 0);
    assert.equal(totals.net, 0);
    assert.equal(totals.txCount, 0);
  });

  it('scenario 2 - salary 5jt increases cash flow net', () => {
    const txs = [
      { id: 'tx_salary', amount: 5_000_000, date: '2026-08-25', type: 'income', account: 'BCA' },
    ];
    const totals = computePeriodTotals(txs, '2026-08');
    assert.equal(totals.income, 5_000_000);
    assert.equal(totals.net, 5_000_000);
  });

  it('scenario 3 - cicilan linked debt uses hutang journal not laba_ditahan', () => {
    const tx = {
      id: 'tx_hp',
      amount: 250_000,
      date: '2026-08-05',
      type: 'expense',
      category: 'Cicilan HP',
      account: 'BCA',
      meta: { linked_debt_id: 'debt_1', expense_treatment: 'loan_payment' },
    };
    assert.equal(isLoanPaymentTransaction(tx), true);
    const lines = buildJournalLinesForTransaction(tx);
    assert.ok(lines.some((l) => l.account_code === 'hutang_lainnya' && l.debit === 250_000));
    assert.ok(!lines.some((l) => l.account_code === 'laba_ditahan' && l.debit === 250_000));

    const totals = computePeriodTotals([tx], '2026-08');
    assert.equal(totals.expense, 250_000);
  });

  it('scenario 4 - closing summary surplus 800rb', () => {
    const txs = [
      { id: 'i1', amount: 5_000_000, date: '2026-08-01', type: 'income' },
      { id: 'e1', amount: 4_200_000, date: '2026-08-10', type: 'expense' },
    ];
    const summary = buildClosingSummary('2026-08', txs);
    assert.equal(summary.isSurplus, true);
    assert.equal(summary.net, 800_000);
    const closingTxs = buildClosingTransactions(
      { type: 'emergency_fund', amount: 800_000, fromAccount: 'BCA', toAccount: 'Tabungan' },
      summary,
    );
    assert.equal(closingTxs.length, 1);
    assert.equal(closingTxs[0].type, 'transfer');
    assert.equal(closingTxs[0].period, '2026-08');
  });

  it('scenario 5 - deficit cover from savings transfer', () => {
    const txs = [
      { id: 'i1', amount: 3_000_000, date: '2026-09-01', type: 'income' },
      { id: 'e1', amount: 3_500_000, date: '2026-09-15', type: 'expense' },
    ];
    const summary = buildClosingSummary('2026-09', txs);
    assert.equal(summary.isSurplus, false);
    assert.equal(summary.net, -500_000);
    const closingTxs = buildClosingTransactions(
      { type: 'cover_from_savings', amount: 500_000, fromAccount: 'Tabungan', toAccount: 'BCA' },
      summary,
    );
    assert.equal(closingTxs[0].type, 'transfer');
    assert.equal(closingTxs[0].account, 'Tabungan');
  });

  it('stampTransactionPeriod - denormalizes period from date', () => {
    const tx = stampTransactionPeriod({ id: 'x', date: '2026-08-07', type: 'expense', amount: 1000 });
    assert.equal(tx.period, '2026-08');
  });
});
