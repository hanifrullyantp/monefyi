/**
 * Transaction deduplication and expense aggregation helpers.
 * @module utils/transaction-utils
 */

/**
 * Stable key for deduplicating the same logical transaction (local + server copies).
 * @param {object|null|undefined} tx
 * @returns {string}
 */
export function getTransactionDedupeKey(tx) {
  if (!tx) return '';
  const serverId = tx.server_id || tx.meta?.server_id;
  if (serverId) return String(serverId);
  if (tx.id) return String(tx.id);
  return `${tx.date || ''}|${tx.type || ''}|${tx.amount || 0}|${tx.merchant || ''}|${tx.category || ''}`;
}

/**
 * Keep one row per logical transaction (prefer newest updated_at, then server_id).
 * @param {object[]|null|undefined} transactions
 * @returns {object[]}
 */
export function dedupeTransactions(transactions) {
  if (!Array.isArray(transactions) || !transactions.length) return [];

  /** @type {Map<string, object>} */
  const byKey = new Map();

  for (const tx of transactions) {
    const key = getTransactionDedupeKey(tx);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, tx);
      continue;
    }
    const prevTs = Date.parse(prev.updated_at || prev.created_at || 0) || 0;
    const nextTs = Date.parse(tx.updated_at || tx.created_at || 0) || 0;
    const prevHasServer = !!(prev.server_id || prev.meta?.server_id);
    const nextHasServer = !!(tx.server_id || tx.meta?.server_id);
    if (nextTs > prevTs || (!prevHasServer && nextHasServer)) {
      byKey.set(key, tx);
    }
  }

  return [...byKey.values()];
}

/**
 * @param {object} tx
 * @returns {string}
 */
export function getTransactionStatus(tx) {
  if (tx?.status) return String(tx.status);
  if (tx?.meta?.status) return String(tx.meta.status);
  if (tx?.meta?.pending === true) return 'pending';
  return 'confirmed';
}

/**
 * Reportable = confirmed and not placeholder category.
 * @param {object} tx
 * @returns {boolean}
 */
export function isReportableTransaction(tx) {
  const status = getTransactionStatus(tx);
  if (status !== 'confirmed') return false;
  const cat = String(tx?.category || '').toLowerCase().trim();
  if (cat === 'menunggu proses' || cat === 'draft') return false;
  return true;
}

/**
 * Consumption expense — excludes assets, transfers, pending.
 * @param {object} tx
 * @returns {boolean}
 */
export function isConsumptionExpense(tx) {
  if (!isExpenseTransaction(tx) || !isReportableTransaction(tx)) return false;
  const treatment = tx.meta?.expense_treatment;
  if (treatment === 'asset' || treatment === 'transfer') return false;
  if (tx.meta?.is_asset_purchase) return false;
  return true;
}

/**
 * Asset acquisition (cash out, not consumption).
 * @param {object} tx
 * @returns {boolean}
 */
export function isAssetAcquisition(tx) {
  if (!isExpenseTransaction(tx) || !isReportableTransaction(tx)) return false;
  return tx.meta?.expense_treatment === 'asset' || tx.meta?.is_asset_purchase === true;
}

/**
 * @param {object[]|null|undefined} transactions
 * @returns {object[]}
 */
export function filterReportableTransactions(transactions) {
  return dedupeTransactions(transactions).filter(isReportableTransaction);
}

/**
 * @param {object[]|null|undefined} transactions
 * @returns {object[]}
 */
export function filterConsumptionExpenses(transactions) {
  return dedupeTransactions(transactions).filter(isConsumptionExpense);
}

/**
 * @param {object} tx
 * @returns {boolean}
 */
export function isExpenseTransaction(tx) {
  const typ = String(tx?.type || 'expense').toLowerCase();
  return typ === 'expense' || typ === 'pengeluaran' || typ === 'out';
}

/**
 * @param {object} tx
 * @returns {boolean}
 */
export function isIncomeTransaction(tx) {
  return String(tx?.type || '').toLowerCase() === 'income';
}

/**
 * @param {object[]|null|undefined} transactions
 * @param {string} [monthKey] YYYY-MM
 * @returns {object[]}
 */
export function filterMonthExpenses(transactions, monthKey, opts = {}) {
  const deduped = dedupeTransactions(transactions);
  const filterFn = opts.consumptionOnly ? isConsumptionExpense : isExpenseTransaction;
  if (!monthKey) return deduped.filter(filterFn);
  const mk = String(monthKey).slice(0, 7);
  return deduped.filter((t) => {
    if (!filterFn(t)) return false;
    return String(t.date || '').slice(0, 10).startsWith(mk);
  });
}

/**
 * @param {object[]|null|undefined} transactions
 * @param {string} [monthKey]
 * @returns {number}
 */
export function sumMonthExpenses(transactions, monthKey) {
  return filterMonthExpenses(transactions, monthKey)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);
}

/**
 * @param {object[]|null|undefined} transactions
 * @param {{ consumptionOnly?: boolean }} [opts]
 * @returns {{ income: number, expense: number, consumptionExpense: number, assetExpense: number, transfer: number, net: number, consumptionNet: number }}
 */
export function sumByTransactionType(transactions, opts = {}) {
  let income = 0;
  let expense = 0;
  let consumptionExpense = 0;
  let assetExpense = 0;
  let transfer = 0;

  for (const tx of dedupeTransactions(transactions)) {
    if (!isReportableTransaction(tx)) continue;
    const amt = Math.abs(Number(tx.amount || 0));
    if (isIncomeTransaction(tx)) {
      income += amt;
    } else if (isAssetAcquisition(tx)) {
      expense += amt;
      assetExpense += amt;
    } else if (isConsumptionExpense(tx)) {
      expense += amt;
      consumptionExpense += amt;
    } else if (isExpenseTransaction(tx)) {
      expense += amt;
      consumptionExpense += amt;
    } else {
      transfer += amt;
    }
  }

  const net = income - expense;
  const consumptionNet = income - consumptionExpense;

  if (opts.consumptionOnly) {
    return {
      income,
      expense: consumptionExpense,
      consumptionExpense,
      assetExpense,
      transfer,
      net: consumptionNet,
      consumptionNet,
    };
  }

  return {
    income,
    expense,
    consumptionExpense,
    assetExpense,
    transfer,
    net,
    consumptionNet,
  };
}

if (typeof window !== 'undefined') {
  window.monefyiTransactionUtils = {
    dedupeTransactions,
    sumMonthExpenses,
    sumByTransactionType,
    filterMonthExpenses,
    getTransactionDedupeKey,
    isReportableTransaction,
    isConsumptionExpense,
    isAssetAcquisition,
    filterReportableTransactions,
    filterConsumptionExpenses,
    getTransactionStatus,
  };
}
