/**
 * Global filter state — shared across budget, transactions, etc.
 * @module services/global-filter
 */

const STORAGE_KEY = 'monefyi_global_filter';
const _listeners = new Set();

/** @type {object} */
let _state = loadState();

function getDefaultPeriod() {
  const state = typeof window !== 'undefined' ? window.STATE : null;
  // Prefer main period chip (STATE.period) so budget matches transaksi list
  if (state?.period?.end && /^\d{4}-\d{2}/.test(String(state.period.end))) {
    return String(state.period.end).slice(0, 7);
  }
  if (state?.selectedMonth) return state.selectedMonth;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getDefaults() {
  return {
    period: getDefaultPeriod(),
    priority: 'all',
    account: 'all',
    type: 'all',
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...getDefaults(), ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return getDefaults();
}

/**
 * @returns {object}
 */
export function getFilter() {
  return { ..._state };
}

/**
 * @param {object} updates
 */
export function updateFilter(updates) {
  _state = { ..._state, ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch { /* ignore */ }
  syncToAppState(_state);
  _notify();
}

export function resetFilter() {
  _state = getDefaults();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch { /* ignore */ }
  syncToAppState(_state);
  _notify();
}

/**
 * @param {object} f
 */
function syncToAppState(f) {
  const state = typeof window !== 'undefined' ? window.STATE : null;
  if (!state) return;
  if (f.type !== undefined) state.filters.type = f.type === 'all' ? '' : f.type;
  if (f.account !== undefined) state.filters.account = f.account === 'all' ? '' : f.account;
}

/**
 * @param {(state: object) => void} callback
 * @returns {() => void}
 */
export function onFilterChange(callback) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

function _notify() {
  _listeners.forEach((cb) => { try { cb(_state); } catch { /* ignore */ } });
}

/**
 * @param {object[]} transactions
 * @returns {object[]}
 */
export function filterTransactions(transactions) {
  return (transactions || []).filter((t) => {
    if (_state.period) {
      const txPeriod = t.date?.substring(0, 7);
      if (txPeriod !== _state.period) return false;
    }
    if (_state.account !== 'all' && t.account !== _state.account) return false;
    if (_state.type !== 'all' && t.type !== _state.type) return false;
    return true;
  });
}

/**
 * @param {object[]} budgets
 * @returns {object[]}
 */
export function filterBudgets(budgets) {
  return (budgets || []).filter((b) => {
    if (_state.priority !== 'all' && b.priority !== _state.priority) return false;
    return true;
  });
}

/**
 * Sync period from app STATE (period chip / selectedMonth).
 * @param {string} [monthOverride] YYYY-MM
 */
export function syncPeriodFromState(monthOverride) {
  const period = (monthOverride && /^\d{4}-\d{2}/.test(monthOverride))
    ? String(monthOverride).slice(0, 7)
    : getDefaultPeriod();
  if (_state.period !== period) {
    _state.period = period;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    } catch { /* ignore */ }
    _notify();
  }
}

if (typeof window !== 'undefined') {
  window.monefyiFilter = {
    getFilter,
    updateFilter,
    resetFilter,
    onFilterChange,
    filterTransactions,
    filterBudgets,
    syncPeriodFromState,
  };
}
