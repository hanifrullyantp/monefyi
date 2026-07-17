/**
 * Auto-link transactions to budget rows and realtime evaluation.
 * @module services/budget-linker
 */

import {
  suggestBudget,
  calculateProgress,
  getLinkedTransactions,
  rowsToBudgetList,
  normalizeBudgetRow,
} from './budget-model.js';

/**
 * @param {object} transaction
 * @param {object} row
 * @param {object[]} allTransactions
 * @returns {object|null}
 */
export function findMatchingItem(transaction, row, allTransactions = []) {
  if (!row?.items?.length) return null;

  const pendingItems = row.items.filter(
    (i) => i.status === 'planned' || i.status === 'pending'
  );
  const candidates = pendingItems.length ? pendingItems : row.items;

  const txText = `${transaction.merchant || ''} ${transaction.notes || ''}`.toLowerCase();
  const txAmt = Number(transaction.amount || 0);

  const scored = candidates.map((item) => {
    const itemText = `${item.name || ''} ${item.notes || ''}`.toLowerCase();
    let score = 0;
    if (itemText && txText && (itemText.includes(txText) || txText.includes(itemText))) score += 0.5;

    const itemAmt = (item.qty || 1) * (item.price || 0);
    if (itemAmt > 0 && txAmt > 0) {
      score += (1 - Math.abs(itemAmt - txAmt) / Math.max(itemAmt, txAmt)) * 0.3;
    }

    if (item.target_date && transaction.date) {
      const daysDiff = Math.abs(new Date(item.target_date) - new Date(transaction.date)) / 86400000;
      if (daysDiff < 3) score += 0.2;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored[0]?.score > 0.3) return scored[0].item;
  return candidates[0] || null;
}

/**
 * @param {object} ctx
 * @returns {Promise<{ budgets: object[], transactions: object[], month: string, income: number }>}
 */
async function resolveBudgetContext(ctx = {}) {
  if (ctx.budgets && ctx.transactions) {
    return {
      budgets: ctx.budgets,
      transactions: ctx.transactions,
      month: ctx.month || getMonthFromState(),
      income: ctx.income ?? getIncomeFromState(ctx.month),
    };
  }

  const month = ctx.month || getMonthFromState();
  const state = typeof window !== 'undefined' ? window.STATE : null;
  const transactions = ctx.transactions
    || state?.transactions
    || [];

  let rows = ctx.budgets;
  if (!rows) {
    rows = rowsToBudgetList(month, state?.budgetsByMonth || {});
  }

  return {
    budgets: rows,
    transactions,
    month,
    income: ctx.income ?? getIncomeFromState(month),
  };
}

/**
 * @returns {string}
 */
function getMonthFromState() {
  const state = typeof window !== 'undefined' ? window.STATE : null;
  if (state?.selectedMonth) return state.selectedMonth;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {string} month
 * @returns {number}
 */
function getIncomeFromState(month) {
  const mk = month || getMonthFromState();
  const state = typeof window !== 'undefined' ? window.STATE : null;
  return Number(state?.budgetsByMonth?.[mk]?.income || 0);
}

/**
 * @param {object} transaction
 * @param {object} [ctx]
 * @returns {Promise<object|null>}
 */
export async function linkTransactionToBudget(transaction, ctx = {}) {
  const { budgets, transactions, month } = await resolveBudgetContext(ctx);
  const suggestion = suggestBudget(transaction, budgets);
  if (!suggestion) return null;

  const { budget, confidence, reason } = suggestion;
  const meta = { ...(typeof transaction.meta === 'object' ? transaction.meta : {}) };

  meta.budget_id = budget.id;
  meta.budget_category = budget.name;
  meta.budget_link_confidence = confidence;
  meta.budget_link_reason = reason;

  const matchedItem = findMatchingItem(transaction, budget, transactions);
  if (matchedItem) {
    meta.budget_item_id = matchedItem.id;
  }

  transaction.meta = meta;

  return { budget, item: matchedItem, confidence, reason };
}

/**
 * @param {object} transaction
 * @param {object} [ctx]
 * @returns {Promise<object>}
 */
export async function evaluateTransaction(transaction, ctx = {}) {
  const { budgets, transactions, month } = await resolveBudgetContext(ctx);

  if (transaction.type && transaction.type !== 'expense') {
    return { hasWarning: false, message: null, suggestedBudget: null, severity: 'info' };
  }

  const suggestion = suggestBudget(transaction, budgets);
  if (!suggestion) {
    return { hasWarning: false, message: null, suggestedBudget: null, severity: 'info' };
  }

  const { budget } = suggestion;
  const currentProgress = calculateProgress(budget, transactions, month);
  const txAmt = Number(transaction.amount || 0);
  const newSpent = currentProgress.spent + txAmt;
  const budgetAmount = Number(budget.amount || 0);
  const newPercent = budgetAmount > 0 ? (newSpent / budgetAmount) * 100 : 0;

  let hasWarning = false;
  let message = null;
  let severity = 'info';
  let blocked = false;

  if (newPercent >= 100) {
    hasWarning = true;
    severity = budget.allow_overspend === false ? 'danger' : 'danger';
    blocked = budget.allow_overspend === false;
    message = `⚠️ Akan melebihi budget "${budget.name}" (${Math.round(newPercent)}%)`;
  } else if (newPercent >= 90) {
    hasWarning = true;
    severity = 'warning';
    message = `⚠️ Budget "${budget.name}" hampir habis (${Math.round(newPercent)}%)`;
  } else if (newPercent >= 75) {
    severity = 'info';
    message = `💡 Budget "${budget.name}" ${Math.round(newPercent)}% terpakai`;
  } else {
    message = `✓ Masuk budget "${budget.name}" (${Math.round(newPercent)}%)`;
  }

  return {
    hasWarning,
    blocked,
    severity,
    message,
    suggestedBudget: budget,
    currentPercent: Math.round(currentProgress.percentUsed),
    newPercent: Math.round(newPercent),
    remaining: budgetAmount - newSpent,
  };
}

/**
 * Update budget row items with linked transaction id in STATE.
 * @param {object} tx
 * @param {object} linkResult
 */
function updateBudgetRowLinks(tx, linkResult) {
  if (!linkResult?.budget || typeof window === 'undefined') return;

  const state = window.STATE;
  const month = getMonthFromState();
  const budgetMonth = state?.budgetsByMonth?.[month];
  if (!budgetMonth?.categories?.rows) return;

  const rowIdx = budgetMonth.categories.rows.findIndex((r) => r.id === linkResult.budget.id);
  if (rowIdx < 0) return;

  const row = normalizeBudgetRow(budgetMonth.categories.rows[rowIdx]);
  if (linkResult.item) {
    const itemIdx = row.items.findIndex((i) => i.id === linkResult.item.id);
    if (itemIdx >= 0) {
      const item = row.items[itemIdx];
      if (!item.linked_transactions) item.linked_transactions = [];
      if (tx.id && !item.linked_transactions.includes(tx.id)) {
        item.linked_transactions.push(tx.id);
      }
      const linked = getLinkedTransactions(row, state.transactions || [], month);
      const itemSpent = linked
        .filter((t) => item.linked_transactions.includes(t.id))
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const itemTotal = (item.qty || 1) * (item.price || 0);
      if (itemTotal > 0 && itemSpent >= itemTotal) item.status = 'done';
      else if (itemSpent > 0) item.status = 'pending';
    }
  }

  budgetMonth.categories.rows[rowIdx] = row;
  if (state.budgetDraft?.month === month) {
    const draftIdx = state.budgetDraft.rows?.findIndex((r) => r.id === row.id);
    if (draftIdx >= 0) state.budgetDraft.rows[draftIdx] = row;
  }
}

/**
 * @param {object} tx
 * @returns {Promise<object|null>}
 */
export async function applyBudgetLinkOnSave(tx) {
  if (tx.type !== 'expense') return null;

  try {
    const link = await linkTransactionToBudget(tx);
    if (link) updateBudgetRowLinks(tx, link);
    return link;
  } catch (e) {
    console.warn('[budget-linker] applyBudgetLinkOnSave failed:', e);
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetLinker = {
    linkTransactionToBudget,
    evaluateTransaction,
    findMatchingItem,
    applyBudgetLinkOnSave,
  };
}
