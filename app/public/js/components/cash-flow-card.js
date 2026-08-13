/**
 * Cash flow card helpers — monthly balance display for home/transactions.
 * @module components/cash-flow-card
 */

import { computePeriodTotals, toPeriodKey, periodDateRange } from '../services/monthly-period.js';
import { computeNeracaReport } from '../services/journal-engine.js';
import { computePeriodFinancials } from '../services/financial-metrics.js';

export const SALDO_VIEW_MODES = {
  MONTHLY: 'monthly',
  CUMULATIVE: 'cumulative',
  WEALTH: 'wealth',
};

/**
 * @param {object} state
 * @param {string} [viewMode]
 * @returns {Promise<object>}
 */
export async function buildCashFlowCardData(state, viewMode = SALDO_VIEW_MODES.MONTHLY) {
  const period = toPeriodKey(state?.period?.end || state?.selectedMonth);
  const txs = state?.transactions || [];
  const metrics = computePeriodFinancials(state, period);
  const totals = computePeriodTotals(txs, period);
  const { start, end } = periodDateRange(period);

  let primaryAmount = metrics.consumptionNetCashFlow;
  let primaryLabel = `Uang Tersisa ${formatMonthLabel(period)}`;
  let primarySub = `${metrics.income > 0 ? '+' : ''}${formatCompact(metrics.income)} income · −${formatCompact(metrics.consumptionExpense)} expense rutin`;

  if (metrics.hasUnhandledAnomalies) {
    primarySub = `⚠️ Ada transaksi besar perlu dikategorisasi · Dengan anomali: ${formatCompact(totals.net)} · Tanpa: ${formatCompact(metrics.consumptionNetCashFlow)}`;
  } else if (metrics.assetAcquisitions?.length) {
    const assetTotal = metrics.assetExpense || 0;
    primarySub += ` · Aset: ${formatCompact(assetTotal)}`;
  }

  if (viewMode === SALDO_VIEW_MODES.CUMULATIVE) {
    const all = txs.reduce((acc, tx) => {
      const amt = Math.abs(Number(tx.amount || 0));
      if (tx.type === 'income') acc.income += amt;
      else if (tx.type === 'expense') acc.expense += amt;
      return acc;
    }, { income: 0, expense: 0 });
    primaryAmount = all.income - all.expense;
    primaryLabel = 'Saldo Kumulatif';
    primarySub = 'Semua transaksi tercatat';
  }

  let totalKas = 0;
  let totalKekayaan = 0;
  try {
    const report = await computeNeracaReport({
      endISO: end,
      transactions: txs,
      accounts: state?.settings?.accounts || [],
      periodStart: viewMode === SALDO_VIEW_MODES.MONTHLY ? start : null,
    });
    totalKas = Number(report.aktiva?.find((r) => r.key === 'kas')?.amount || 0);
    totalKekayaan = Number(report.totalAktiva || 0) - Number(report.totalPasiva || 0) + Number(report.diff || 0);
    if (viewMode === SALDO_VIEW_MODES.WEALTH) {
      primaryAmount = totalKekayaan;
      primaryLabel = 'Total Kekayaan';
      primarySub = 'Dari neraca keuangan';
    }
  } catch { /* ignore */ }

  const budgetIncome = Number(state?.budgetsByMonth?.[period]?.income || state?.db?.userPreferences?.monthly_income || 0);
  const hasIncomeGap = budgetIncome > 0 && totals.income === 0;

  return {
    period,
    viewMode,
    primaryLabel,
    primaryAmount,
    primarySub,
    income: metrics.income,
    expense: metrics.consumptionExpense,
    rawNet: totals.net,
    consumptionNet: metrics.consumptionNetCashFlow,
    hasUnhandledAnomalies: metrics.hasUnhandledAnomalies,
    unhandledAnomalies: metrics.unhandledAnomalies,
    assetAcquisitions: metrics.assetAcquisitions,
    txCount: totals.txCount,
    totalKas,
    totalKekayaan,
    hasIncomeGap,
    budgetIncome,
    isPositive: primaryAmount >= 0,
  };
}

/**
 * @param {string} period YYYY-MM
 */
function formatMonthLabel(period) {
  const [y, m] = String(period).slice(0, 7).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/**
 * @param {number} n
 */
function formatCompact(n) {
  const abs = Math.abs(Number(n || 0));
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)} jt`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)} rb`;
  return String(Math.round(abs));
}

if (typeof window !== 'undefined') {
  window.monefyiCashFlowCard = { buildCashFlowCardData, SALDO_VIEW_MODES };
}
