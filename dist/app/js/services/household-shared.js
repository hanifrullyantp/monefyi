/**
 * Household shared dashboard — personal vs shared transaction views.
 * @module services/household-shared
 */

import { loadHousehold } from './household-mode.js';

const LS_VIEW = 'monefyi_household_view';

/**
 * @returns {boolean}
 */
export function hasActiveHousehold() {
  const hh = loadHousehold();
  return !!(hh?.id || hh?.members?.length);
}

/**
 * @returns {'personal'|'shared'}
 */
export function getDashboardViewMode() {
  if (!hasActiveHousehold()) return 'personal';
  try {
    const v = localStorage.getItem(LS_VIEW);
    return v === 'shared' ? 'shared' : 'personal';
  } catch {
    return 'personal';
  }
}

/**
 * @param {'personal'|'shared'} mode
 */
export function setDashboardViewMode(mode) {
  localStorage.setItem(LS_VIEW, mode === 'shared' ? 'shared' : 'personal');
}

/**
 * @param {object} tx
 * @returns {'personal'|'shared'}
 */
export function getTransactionVisibility(tx) {
  return tx?.visibility || tx?.meta?.visibility || 'personal';
}

/**
 * @param {object} tx
 * @param {'personal'|'shared'} visibility
 * @returns {object}
 */
export function applyTransactionVisibility(tx, visibility) {
  const v = visibility === 'shared' ? 'shared' : 'personal';
  const hh = loadHousehold();
  return {
    ...tx,
    visibility: v,
    household_id: v === 'shared' && hh?.id ? hh.id : tx.household_id || null,
    meta: { ...(tx.meta || {}), visibility: v },
  };
}

/**
 * @param {object[]} transactions
 * @param {'personal'|'shared'|'all'} [mode]
 * @returns {object[]}
 */
export function filterTransactionsForView(transactions = [], mode = getDashboardViewMode()) {
  if (mode === 'all' || !hasActiveHousehold()) return transactions;
  if (mode === 'shared') {
    return transactions.filter((t) => getTransactionVisibility(t) === 'shared');
  }
  return transactions;
}

/**
 * Shared-only monthly summary for household card.
 * @param {object} [state]
 * @returns {{ expense: number, income: number, txCount: number }}
 */
export function getSharedMonthSummary(state = window.STATE || {}) {
  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const txs = filterTransactionsForView(state.transactions || [], 'shared')
    .filter((t) => String(t.date || '').startsWith(month));
  let expense = 0;
  let income = 0;
  for (const t of txs) {
    const amt = Number(t.amount) || 0;
    if (t.type === 'expense') expense += amt;
    else if (t.type === 'income') income += amt;
  }
  return { expense, income, txCount: txs.length };
}

/**
 * @returns {HTMLElement|null}
 */
export function renderHouseholdViewToggle() {
  if (!hasActiveHousehold()) return null;
  const mode = getDashboardViewMode();
  const el = document.createElement('div');
  el.className = 'household-view-toggle home-section';
  el.innerHTML = `
    <div class="household-view-toggle__inner" role="tablist">
      <button type="button" class="household-view-toggle__btn ${mode === 'personal' ? 'is-active' : ''}" data-view="personal">Saya</button>
      <button type="button" class="household-view-toggle__btn ${mode === 'shared' ? 'is-active' : ''}" data-view="shared">Bersama</button>
    </div>
  `;
  el.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setDashboardViewMode(btn.getAttribute('data-view'));
      if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
    });
  });
  return el;
}
