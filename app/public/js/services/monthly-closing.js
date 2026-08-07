/**
 * Monthly closing ritual — surplus/defisit allocation.
 * @module services/monthly-closing
 */

import { closePeriod, computePeriodCategoryBreakdown, computePeriodTotals, toPeriodKey } from './monthly-period.js';
import { stampTransactionPeriod } from './monthly-period.js';

/**
 * @param {string} period YYYY-MM
 * @param {object[]} transactions
 * @returns {object}
 */
export function buildClosingSummary(period, transactions) {
  const totals = computePeriodTotals(transactions, period);
  const net = totals.net;
  const categories = computePeriodCategoryBreakdown(transactions, period).slice(0, 5);
  return {
    period,
    income: totals.income,
    expense: totals.expense,
    net,
    isSurplus: net >= 0,
    txCount: totals.txCount,
    topCategories: categories,
  };
}

/**
 * @param {object} allocation
 * @param {object} summary
 * @returns {object[]}
 */
export function buildClosingTransactions(allocation, summary) {
  const txs = [];
  const today = summary.period ? `${summary.period}-28` : new Date().toISOString().slice(0, 10);
  const amount = Math.abs(Number(allocation.amount || summary.net || 0));
  if (amount <= 0) return txs;

  const base = {
    date: today,
    currency: 'IDR',
    notes: `Tutup buku ${summary.period}`,
    meta: { source: 'monthly_closing', allocation: allocation.type },
  };

  switch (allocation.type) {
    case 'emergency_fund':
    case 'investment':
    case 'debt_extra':
      txs.push(stampTransactionPeriod({
        ...base,
        id: `tx_close_${Date.now()}_t`,
        type: 'transfer',
        amount,
        account: allocation.fromAccount || 'BCA',
        category: 'Transfer',
        merchant: allocation.label || 'Alokasi surplus',
        meta: { ...base.meta, transfer_to: allocation.toAccount || 'Tabungan' },
      }));
      break;
    case 'carry_over':
      txs.push(stampTransactionPeriod({
        ...base,
        id: `tx_close_${Date.now()}_i`,
        type: 'income',
        amount,
        account: allocation.account || 'BCA',
        category: 'Carry Over',
        merchant: 'Sisa bulan lalu',
      }));
      break;
    case 'personal':
      txs.push(stampTransactionPeriod({
        ...base,
        id: `tx_close_${Date.now()}_e`,
        type: 'expense',
        amount,
        account: allocation.account || 'BCA',
        category: 'Pengeluaran Pribadi',
        merchant: 'Alokasi surplus pribadi',
      }));
      break;
    case 'cover_from_savings':
      txs.push(stampTransactionPeriod({
        ...base,
        id: `tx_close_${Date.now()}_t2`,
        type: 'transfer',
        amount,
        account: allocation.fromAccount || 'Tabungan',
        category: 'Transfer',
        merchant: 'Tutup defisit dari tabungan',
        meta: { ...base.meta, transfer_to: allocation.toAccount || 'BCA' },
      }));
      break;
    case 'new_debt':
      txs.push(stampTransactionPeriod({
        ...base,
        id: `tx_close_${Date.now()}_i2`,
        type: 'income',
        amount,
        account: allocation.account || 'BCA',
        category: 'Pinjaman',
        merchant: allocation.label || 'Utang tutup defisit',
        meta: { ...base.meta, expense_treatment: 'loan_proceeds' },
      }));
      break;
    default:
      break;
  }
  return txs;
}

/**
 * Execute monthly closing with allocation.
 * @param {object} opts
 */
export async function executeMonthlyClosing(opts = {}) {
  const {
    periodId,
    period,
    allocation = {},
    transactions = window.STATE?.transactions || [],
    upsertTransaction,
  } = opts;

  const summary = buildClosingSummary(period || toPeriodKey(), transactions);
  const closingTxs = buildClosingTransactions(allocation, summary);

  for (const tx of closingTxs) {
    if (typeof upsertTransaction === 'function') {
      await upsertTransaction(tx, { silent: true, skipUndo: true });
    }
  }

  const result = await closePeriod(periodId, {
    ...allocation,
    amount: Math.abs(summary.net),
    executedAt: new Date().toISOString(),
  }, [...transactions, ...closingTxs]);

  return { ...result, summary, closingTxs };
}

/**
 * Check if closing prompt should show (1st of month or unclosed past month).
 * @param {object} state
 */
export function shouldPromptMonthlyClosing(state = window.STATE) {
  const now = new Date();
  const day = now.getDate();
  const period = toPeriodKey(state?.period?.end);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = toPeriodKey(prev);
  const prevPeriod = state?.monthlyPeriods?.[prevKey];
  if (prevPeriod && prevPeriod.status !== 'closed') return { show: true, period: prevKey, reason: 'month_start' };
  if (day >= 28) return { show: true, period, reason: 'month_end' };
  return { show: false };
}

if (typeof window !== 'undefined') {
  window.monefyiMonthlyClosing = {
    buildClosingSummary,
    executeMonthlyClosing,
    shouldPromptMonthlyClosing,
    buildClosingTransactions,
  };
}
