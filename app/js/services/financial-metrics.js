/**
 * Central financial metrics — consumption vs acquisition aware.
 * @module services/financial-metrics
 */

import { periodDateRange } from './monthly-period.js';
import {
  dedupeTransactions,
  sumByTransactionType,
  isReportableTransaction,
  isConsumptionExpense,
  isAssetAcquisition,
} from '../utils/transaction-utils.js';
import {
  detectAnomaly,
  findUnhandledAnomalies,
  getPendingTransactions,
} from './transaction-classification.js';

/**
 * @param {string} period YYYY-MM
 * @returns {number} 0-100
 */
export function getMonthProgress(period) {
  const { start, end } = periodDateRange(period);
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  const now = Date.now();
  if (now <= startMs) return 0;
  if (now >= endMs) return 100;
  return Math.round(((now - startMs) / (endMs - startMs)) * 100);
}

/**
 * @param {object[]|null|undefined} transactions
 * @param {string} period YYYY-MM
 * @returns {object[]}
 */
export function filterPeriodReportable(transactions, period) {
  const { start, end } = periodDateRange(period);
  return dedupeTransactions(transactions).filter((tx) => {
    if (!isReportableTransaction(tx)) return false;
    const d = String(tx.date || '').slice(0, 10);
    return d >= start && d <= end;
  });
}

/**
 * @param {object} [state]
 * @param {string} [period] YYYY-MM
 * @returns {object}
 */
export function computePeriodFinancials(state = {}, period) {
  const month = period
    || state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const allTxs = state.transactions || [];
  const periodTxs = filterPeriodReportable(allTxs, month);
  const totals = sumByTransactionType(periodTxs);

  const assetAcquisitions = periodTxs.filter(isAssetAcquisition);
  const transfers = periodTxs.filter((t) => t.type === 'transfer' || t.meta?.expense_treatment === 'transfer');
  const anomalies = periodTxs.filter((t) => detectAnomaly(t, { transactions: allTxs, monthKey: month }));
  const unhandledAnomalies = findUnhandledAnomalies(allTxs, { monthKey: month })
    .filter((t) => String(t.date || '').startsWith(month));
  const pendingTransactions = getPendingTransactions(allTxs);

  const savingRateReal = totals.income > 0
    ? (totals.income - totals.consumptionExpense) / totals.income
    : 0;

  const monthProgress = getMonthProgress(month);

  return {
    period: month,
    monthProgress,
    income: totals.income,
    expense: totals.expense,
    consumptionExpense: totals.consumptionExpense,
    assetExpense: totals.assetExpense,
    transferTotal: totals.transfer,
    netCashFlow: totals.net,
    consumptionNetCashFlow: totals.consumptionNet,
    assetAcquisitions,
    transfers,
    anomalies,
    unhandledAnomalies,
    pendingTransactions,
    pendingCount: pendingTransactions.length,
    savingRateReal,
    hasUnhandledAnomalies: unhandledAnomalies.length > 0,
  };
}

/**
 * Anomaly-aware future projection.
 * @param {object} [state]
 * @param {number} [months]
 * @returns {object}
 */
export function predictFuture(state = {}, months = 6) {
  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const metrics = computePeriodFinancials(state, month);
  const { start, end } = periodDateRange(month);
  const periodTxs = filterPeriodReportable(state.transactions || [], month);
  const normalTxs = periodTxs.filter((t) => !detectAnomaly(t, {
    transactions: state.transactions || [],
    monthKey: month,
  }) || isAssetAcquisition(t) || t.meta?.expense_treatment);

  const consumption = normalTxs.filter(isConsumptionExpense);
  const daysElapsed = Math.max(1, Math.ceil((Date.now() - Date.parse(start)) / 86400000));
  const dailyAvg = consumption.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0) / daysElapsed;

  const daysInFuture = months * 30;
  const projectedExpense = dailyAvg * daysInFuture;
  const monthlyIncome = metrics.income || 0;
  const totalIncome = monthlyIncome * months;
  const projectedNet = totalIncome - projectedExpense;

  const excluded = metrics.anomalies.filter((a) => !isAssetAcquisition(a));
  const excludedSum = excluded.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);

  return {
    months,
    projection: projectedNet,
    monthlySurplus: monthlyIncome - (dailyAvg * 30),
    excluded,
    excludedSum,
    disclaimer: excluded.length > 0
      ? `Prediksi tidak termasuk ${excluded.length} transaksi besar (Rp ${Math.round(excludedSum).toLocaleString('id-ID')})`
      : null,
    confidence: consumption.length >= 7 ? 'confident' : consumption.length >= 3 ? 'preliminary' : 'low',
  };
}

if (typeof window !== 'undefined') {
  window.monefyiFinancialMetrics = {
    computePeriodFinancials,
    predictFuture,
    getMonthProgress,
  };
}
