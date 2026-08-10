/**
 * Consumption vs acquisition classification and anomaly detection.
 * @module services/transaction-classification
 */

import {
  dedupeTransactions,
  isExpenseTransaction,
  isIncomeTransaction,
  isReportableTransaction,
  isConsumptionExpense,
} from '../utils/transaction-utils.js';

export const ASSET_CATEGORIES = ['Elektronik', 'Kendaraan', 'Properti', 'Investasi', 'Aset'];
export const ASSET_MERCHANTS = ['erafone', 'ibox', 'digimap', 'honda', 'toyota', 'samsung store', 'xiaomi store'];
export const INSTALLMENT_CATEGORY_NAMES = ['cicilan hp', 'cicilan motor', 'cicilan kpr', 'cicilan utang', 'cicilan'];

/**
 * @param {object[]|null|undefined} transactions
 * @param {string} [monthKey] YYYY-MM
 * @returns {object[]}
 */
export function filterPeriodTransactions(transactions, monthKey) {
  const deduped = dedupeTransactions(transactions);
  if (!monthKey) return deduped;
  const mk = String(monthKey).slice(0, 7);
  return deduped.filter((t) => String(t.date || '').slice(0, 7) === mk);
}

/**
 * @param {object[]|null|undefined} transactions
 * @param {string} [monthKey]
 * @returns {number}
 */
export function calculateAvgDailyConsumption(transactions, monthKey) {
  const monthTxs = filterPeriodTransactions(transactions, monthKey);
  const consumption = monthTxs.filter(isConsumptionExpense);
  if (!consumption.length) return 0;
  const total = consumption.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const days = new Set(consumption.map((t) => String(t.date || '').slice(0, 10))).size || 1;
  return total / days;
}

/**
 * @param {object[]|null|undefined} transactions
 * @param {string} [monthKey]
 * @returns {number}
 */
export function calculateMonthConsumptionTotal(transactions, monthKey) {
  return filterPeriodTransactions(transactions, monthKey)
    .filter(isConsumptionExpense)
    .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
}

/**
 * @param {object[]|null|undefined} transactions
 * @param {string} [monthKey]
 * @returns {number}
 */
export function getMonthlyIncome(transactions, monthKey) {
  return filterPeriodTransactions(transactions, monthKey)
    .filter(isIncomeTransaction)
    .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
}

/**
 * @param {object} tx
 * @param {object} [context]
 * @param {object[]} [context.transactions]
 * @param {string} [context.monthKey]
 * @returns {boolean}
 */
export function detectAnomaly(tx, context = {}) {
  if (!isExpenseTransaction(tx) || !isReportableTransaction(tx)) return false;
  if (tx.meta?.expense_treatment === 'asset' || tx.meta?.is_asset_purchase) return false;
  if (tx.meta?.expense_treatment === 'transfer') return false;

  const amount = Math.abs(Number(tx.amount || 0));
  if (amount <= 0) return false;

  const monthKey = context.monthKey || String(tx.date || '').slice(0, 7);
  const txs = context.transactions || [];
  const avgDaily = calculateAvgDailyConsumption(txs, monthKey);
  if (avgDaily > 0 && amount > avgDaily * 3) return true;

  const monthTotal = calculateMonthConsumptionTotal(txs, monthKey);
  if (monthTotal > 0 && amount > monthTotal * 0.5) return true;

  const monthlyIncome = getMonthlyIncome(txs, monthKey);
  if (monthlyIncome > 0 && amount > monthlyIncome) return true;

  const cat = String(tx.category || '');
  if (ASSET_CATEGORIES.some((a) => cat.toLowerCase().includes(a.toLowerCase()))) return true;

  const merchant = String(tx.merchant || tx.notes || '').toLowerCase();
  if (ASSET_MERCHANTS.some((m) => merchant.includes(m))) return true;

  return false;
}

/**
 * @param {object} tx
 * @returns {boolean}
 */
export function isProperlyClassified(tx) {
  const treatment = tx.meta?.expense_treatment;
  if (treatment === 'asset' || treatment === 'loan_payment' || treatment === 'transfer') return true;
  if (treatment === 'consumption') return true;
  if (tx.meta?.is_asset_purchase) return true;
  if (tx.meta?.classification_skipped) return true;
  return false;
}

/**
 * @param {object} tx
 * @param {object} [context]
 * @returns {boolean}
 */
export function needsClassification(tx, context = {}) {
  if (!isExpenseTransaction(tx)) return false;
  if (!isReportableTransaction(tx)) return false;
  if (isProperlyClassified(tx)) return false;
  return detectAnomaly(tx, context);
}

/**
 * @param {object[]|null|undefined} transactions
 * @param {object} [context]
 * @returns {object[]}
 */
export function findUnhandledAnomalies(transactions, context = {}) {
  return dedupeTransactions(transactions).filter((tx) => needsClassification(tx, {
    ...context,
    transactions: transactions || [],
  }));
}

/**
 * @param {object[]|null|undefined} transactions
 * @returns {object[]}
 */
export function getPendingTransactions(transactions) {
  return dedupeTransactions(transactions).filter((tx) => {
    const status = tx.status || tx.meta?.status;
    return status === 'pending' || status === 'draft';
  });
}

/**
 * @param {object} tx
 * @param {object[]} [history]
 * @returns {string|null}
 */
export function suggestCategoryForLargeTx(tx, history = []) {
  const amount = Math.abs(Number(tx.amount || 0));
  const merchant = String(tx.merchant || tx.notes || '').toLowerCase();

  if (ASSET_MERCHANTS.some((m) => merchant.includes(m)) && amount >= 500_000) {
    return 'Elektronik';
  }

  const installmentTxs = (history || []).filter((t) => {
    const cat = String(t.category || '').toLowerCase();
    return INSTALLMENT_CATEGORY_NAMES.some((n) => cat.includes(n));
  });
  if (installmentTxs.length) {
    const avg = installmentTxs.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0) / installmentTxs.length;
    if (avg > 0 && amount > avg * 5) return 'Elektronik';
  }

  if (merchant.includes('hp') && amount > 1_000_000 && !merchant.includes('cicilan')) {
    return 'Elektronik';
  }

  return null;
}

/**
 * @param {object} tx
 * @param {string} category
 * @param {object[]} [history]
 * @returns {{ warn: boolean, message?: string, suggestions?: string[] }}
 */
export function validateInstallmentCategory(tx, category, history = []) {
  const catLower = String(category || '').toLowerCase();
  const isInstallmentCat = INSTALLMENT_CATEGORY_NAMES.some((n) => catLower.includes(n));
  if (!isInstallmentCat) return { warn: false };

  const amount = Math.abs(Number(tx.amount || 0));
  const installmentTxs = (history || []).filter((t) => {
    const c = String(t.category || '').toLowerCase();
    return INSTALLMENT_CATEGORY_NAMES.some((n) => c.includes(n));
  });

  let norm = 250_000;
  if (installmentTxs.length) {
    norm = installmentTxs.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0) / installmentTxs.length;
  }

  if (amount <= norm * 5) return { warn: false };

  return {
    warn: true,
    message: `Transaksi Rp ${Math.round(amount).toLocaleString('id-ID')} masuk kategori "${category}" — cicilan biasanya ~Rp ${Math.round(norm).toLocaleString('id-ID')}/bulan.`,
    suggestions: ['Elektronik', 'Pelunasan Utang', category],
  };
}

/**
 * @param {object} tx
 * @returns {number}
 */
export function suggestResaleValue(tx) {
  const purchase = Math.abs(Number(tx.amount || 0));
  return Math.round(purchase * 0.92);
}

/**
 * Apply classification choice to transaction object (mutates copy).
 * @param {object} tx
 * @param {string} choice consumption|asset|installment|transfer|other
 * @param {object} [details]
 * @returns {object}
 */
export function applyClassification(tx, choice, details = {}) {
  const next = { ...tx, meta: { ...(tx.meta || {}) } };
  next.status = 'confirmed';
  next.confirmed_at = new Date().toISOString();

  switch (choice) {
    case 'asset':
      next.meta.expense_treatment = 'asset';
      next.meta.is_asset_purchase = true;
      next.meta.asset_category = details.assetCategory || 'elektronik';
      next.meta.asset_account_code = details.assetAccountCode || 'aset_lainnya';
      next.meta.asset_resale_value = Number(details.resaleValue || suggestResaleValue(tx));
      next.meta.asset_name = details.assetName || tx.merchant || tx.category || 'Aset';
      if (details.category) next.category = details.category;
      break;
    case 'installment':
      next.meta.expense_treatment = 'loan_payment';
      next.meta.linked_debt_id = details.debtId || null;
      next.meta.linked_debt_name = details.debtName || tx.category || 'Cicilan';
      if (details.category) next.category = details.category;
      break;
    case 'transfer':
      next.type = 'transfer';
      next.meta.expense_treatment = 'transfer';
      break;
    case 'consumption':
      next.meta.expense_treatment = 'consumption';
      break;
    case 'other':
      next.meta.expense_treatment = 'consumption';
      next.meta.classification_note = details.note || '';
      next.meta.classification_skipped = true;
      break;
    default:
      next.meta.expense_treatment = 'consumption';
  }

  return next;
}

if (typeof window !== 'undefined') {
  window.monefyiTransactionClassification = {
    detectAnomaly,
    needsClassification,
    findUnhandledAnomalies,
    getPendingTransactions,
    suggestCategoryForLargeTx,
    validateInstallmentCategory,
    applyClassification,
  };
}
