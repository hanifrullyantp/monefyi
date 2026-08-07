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
export function filterMonthExpenses(transactions, monthKey) {
  const deduped = dedupeTransactions(transactions);
  if (!monthKey) return deduped.filter(isExpenseTransaction);
  const mk = String(monthKey).slice(0, 7);
  return deduped.filter((t) => {
    if (!isExpenseTransaction(t)) return false;
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
 * @returns {{ income: number, expense: number, transfer: number, net: number }}
 */
export function sumByTransactionType(transactions) {
  let income = 0;
  let expense = 0;
  let transfer = 0;

  for (const tx of dedupeTransactions(transactions)) {
    const amt = Math.abs(Number(tx.amount || 0));
    if (isIncomeTransaction(tx)) income += amt;
    else if (isExpenseTransaction(tx)) expense += amt;
    else transfer += amt;
  }

  return { income, expense, transfer, net: income - expense };
}

if (typeof window !== 'undefined') {
  window.monefyiTransactionUtils = {
    dedupeTransactions,
    sumMonthExpenses,
    sumByTransactionType,
    filterMonthExpenses,
    getTransactionDedupeKey,
  };
}
