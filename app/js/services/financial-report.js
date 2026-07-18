/**
 * Offline-first financial report — same data sources as Beranda/Budget.
 * @module services/financial-report
 */

import { getFilter, filterTransactions } from './global-filter.js';
import { rowsToBudgetList, calculateProgress } from './budget-model.js';

/**
 * Normalize transaction/period dates to YYYY-MM-DD for inclusive compares.
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function toDateKey(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * Inclusive date-range filter that works with YYYY-MM-DD and ISO datetimes.
 * @param {object[]} transactions
 * @param {string} start
 * @param {string} end
 * @returns {object[]}
 */
export function filterByDateRange(transactions, start, end) {
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  return (transactions || []).filter((t) => {
    const d = toDateKey(t.date);
    if (!d) return false;
    if (startKey && d < startKey) return false;
    if (endKey && d > endKey) return false;
    return true;
  });
}

/**
 * Resolve period bounds from options, STATE.period, or global filter month.
 * @param {object} [options]
 * @returns {{ periodStart: string, periodEnd: string, month: string, periodLabel: string }}
 */
export function resolvePeriod(options = {}) {
  const state = typeof window !== 'undefined' ? window.STATE || {} : {};
  const filter = getFilter();
  const now = new Date();

  let periodStart = options.periodStart || state.period?.start || '';
  let periodEnd = options.periodEnd || state.period?.end || '';

  // Prefer global filter month when STATE period is missing / mismatched
  const filterMonth = options.month || filter.period || state.selectedMonth
    || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (!periodStart || !periodEnd) {
    const [y, m] = filterMonth.split('-').map(Number);
    periodStart = `${filterMonth}-01`;
    periodEnd = new Date(y, m, 0).toISOString().slice(0, 10);
  }

  // If filter month differs from STATE period end month, snap to filter month
  if (filter.period && toDateKey(periodEnd).slice(0, 7) !== filter.period && !options.periodStart) {
    const [y, m] = filter.period.split('-').map(Number);
    periodStart = `${filter.period}-01`;
    periodEnd = new Date(y, m, 0).toISOString().slice(0, 10);
  }

  const month = toDateKey(periodEnd).slice(0, 7) || filterMonth;
  const periodLabel = options.periodLabel
    || state.period?.label
    || `${periodStart} – ${periodEnd}`;

  return { periodStart: toDateKey(periodStart), periodEnd: toDateKey(periodEnd), month, periodLabel };
}

/**
 * Load transactions preferring in-memory STATE (Beranda source of truth).
 * @returns {Promise<object[]>}
 */
export async function loadTransactions() {
  const state = typeof window !== 'undefined' ? window.STATE || {} : {};
  let txs = Array.isArray(state.transactions) ? state.transactions.slice() : [];

  if (txs.length) return txs;

  try {
    const { hydrateStateTransactions, getTransactions } = await import('./data-store.js');
    const userId = state.db?.user?.id;
    const hydrated = await hydrateStateTransactions(userId ? { userId } : {});
    if (hydrated?.length) {
      if (state && Array.isArray(state.transactions) && !state.transactions.length) {
        state.transactions = hydrated;
      }
      return hydrated;
    }
    const fromDb = await getTransactions(userId ? { userId } : {});
    if (fromDb?.length) return fromDb;
  } catch (_) { /* offline / empty */ }

  return txs;
}

/**
 * @param {object[]} transactions
 * @returns {{ income: number, expense: number, transfer: number, net: number, saving_rate: number, count: number }}
 */
export function summarizeTransactions(transactions) {
  let income = 0;
  let expense = 0;
  let transfer = 0;
  for (const t of transactions || []) {
    const amt = Number(t.amount || 0);
    if (t.type === 'income') income += amt;
    else if (t.type === 'expense') expense += amt;
    else if (t.type === 'transfer') transfer += amt;
  }
  const net = income - expense;
  return {
    income,
    expense,
    transfer,
    net,
    saving_rate: income > 0 ? net / income : 0,
    count: (transactions || []).length,
  };
}

/**
 * @param {object[]} transactions
 * @returns {{ category: string, amount: number, percent: number, count: number }[]}
 */
export function categoryBreakdown(transactions) {
  const map = new Map();
  let total = 0;
  for (const t of transactions || []) {
    if (t.type !== 'expense') continue;
    const cat = t.category || 'Lainnya';
    const amt = Number(t.amount || 0);
    const prev = map.get(cat) || { category: cat, amount: 0, count: 0 };
    prev.amount += amt;
    prev.count += 1;
    map.set(cat, prev);
    total += amt;
  }
  return [...map.values()]
    .map((row) => ({
      ...row,
      percent: total > 0 ? Math.round((row.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * @param {object[]} transactions
 * @param {number} [limit]
 * @returns {object[]}
 */
export function topSpending(transactions, limit = 8) {
  return (transactions || [])
    .filter((t) => t.type === 'expense')
    .slice()
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, limit)
    .map((t) => ({
      id: t.id,
      date: toDateKey(t.date),
      merchant: t.merchant || t.notes || t.category || '—',
      category: t.category || 'Lainnya',
      amount: Number(t.amount || 0),
      account: t.account || '',
    }));
}

/**
 * @param {object[]} transactions
 * @param {string} periodStart
 * @param {string} periodEnd
 * @returns {{ date: string, expense: number, income: number }[]}
 */
export function dailyTrend(transactions, periodStart, periodEnd) {
  const start = toDateKey(periodStart);
  const end = toDateKey(periodEnd);
  if (!start || !end) return [];

  const byDay = new Map();
  const cursor = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  while (cursor <= endDate) {
    const key = cursor.toISOString().slice(0, 10);
    byDay.set(key, { date: key, expense: 0, income: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const t of transactions || []) {
    const key = toDateKey(t.date);
    const row = byDay.get(key);
    if (!row) continue;
    const amt = Number(t.amount || 0);
    if (t.type === 'expense') row.expense += amt;
    else if (t.type === 'income') row.income += amt;
  }

  return [...byDay.values()];
}

/**
 * @param {string} month YYYY-MM
 * @param {object[]} periodTx
 * @returns {Promise<object[]>}
 */
export async function budgetVsActual(month, periodTx) {
  const state = typeof window !== 'undefined' ? window.STATE || {} : {};
  let rows = rowsToBudgetList(month, state.budgetsByMonth || {});
  if (!rows.length) {
    try {
      const { getBudgetRowsForMonth } = await import('./data-store.js');
      rows = await getBudgetRowsForMonth(month);
    } catch (_) { /* empty */ }
  }

  return (rows || []).map((b) => {
    const p = calculateProgress(b, periodTx, month);
    return {
      id: b.id,
      category: b.name || b.category,
      priority: b.priority || 'penting',
      amount: Number(b.amount || 0),
      spent: p.spent,
      remaining: p.remaining,
      percent_used: p.percentUsed,
      status: p.status,
      items: b.items,
    };
  });
}

/**
 * @param {string} month YYYY-MM
 * @returns {Promise<{ total: number, sources: object[] }>}
 */
export async function resolveIncome(month, periodTx) {
  const state = typeof window !== 'undefined' ? window.STATE || {} : {};
  let total = Number(
    state.budgetsByMonth?.[month]?.income
    || state.budgetDraft?.income
    || 0,
  );
  let sources = [];

  try {
    const { getTotalIncome, getIncomeSources } = await import('./income-source.js');
    const fromSources = await getTotalIncome(month);
    if (fromSources > 0) total = fromSources;
    sources = await getIncomeSources(month);
  } catch (_) { /* ignore */ }

  if (!total) {
    total = (periodTx || [])
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }

  return { total, sources };
}

/**
 * Previous calendar month bounds relative to `month`.
 * @param {string} month YYYY-MM
 */
function previousMonthBounds(month) {
  const [y, m] = month.split('-').map(Number);
  const prev = new Date(y, m - 2, 1);
  const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const start = `${prevMonth}-01`;
  const end = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { month: prevMonth, start, end };
}

/**
 * Build full offline financial report (metrics + sections).
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function buildFinancialReport(options = {}) {
  const { periodStart, periodEnd, month, periodLabel } = resolvePeriod(options);
  const allTx = await loadTransactions();

  // Global filter (account/type/period month) then inclusive date clamp
  let filtered = filterTransactions(allTx);
  // Ensure period clamp even if filter period differs from custom range
  filtered = filterByDateRange(filtered, periodStart, periodEnd);

  // If global filter emptied by period mismatch, fall back to STATE period range only
  if (!filtered.length && allTx.length) {
    const state = window.STATE || {};
    const account = state.filters?.account || '';
    const type = state.filters?.type || '';
    filtered = filterByDateRange(allTx, periodStart, periodEnd).filter((t) => {
      if (account && t.account !== account) return false;
      if (type && t.type !== type) return false;
      return true;
    });
  }

  const metrics = summarizeTransactions(filtered);
  const categories = categoryBreakdown(filtered);
  const top = topSpending(filtered);
  const trend = dailyTrend(filtered, periodStart, periodEnd);
  const budgets = await budgetVsActual(month, filtered);
  const income = await resolveIncome(month, filtered);

  // Prefer planned/source income for headline when available
  if (income.total > 0 && metrics.income === 0) {
    metrics.income = income.total;
    metrics.net = metrics.income - metrics.expense;
    metrics.saving_rate = metrics.income > 0 ? metrics.net / metrics.income : 0;
  } else if (income.total > metrics.income) {
    // Keep tx income in metrics; expose planned separately
  }

  const prev = previousMonthBounds(month);
  const prevTx = filterByDateRange(allTx, prev.start, prev.end);
  const previousMonth = summarizeTransactions(prevTx);

  const comparison = {
    current: { month, ...metrics },
    previous: { month: prev.month, ...previousMonth },
    expenseDelta: metrics.expense - previousMonth.expense,
    incomeDelta: metrics.income - previousMonth.income,
    netDelta: metrics.net - previousMonth.net,
  };

  return {
    periodStart,
    periodEnd,
    month,
    periodLabel,
    metrics: {
      ...metrics,
      plannedIncome: income.total,
    },
    income,
    categories,
    topSpending: top,
    budgets,
    dailyTrend: trend,
    comparison,
    previousMonth,
    transactions: filtered,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Context shape for monevisor-client / heuristic / edge functions.
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function gatherReportContext(options = {}) {
  const report = await buildFinancialReport(options);
  const state = typeof window !== 'undefined' ? window.STATE || {} : {};
  const lang = options.lang || state.settings?.lang || 'id';

  return {
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    start: report.periodStart,
    end: report.periodEnd,
    periodLabel: report.periodLabel,
    lang,
    budgets: report.budgets,
    income: report.income,
    transactions: report.transactions.slice(0, 200),
    previous_month_summary: report.previousMonth,
    metrics: report.metrics,
    report,
  };
}

if (typeof window !== 'undefined') {
  window.monefyiFinancialReport = {
    buildFinancialReport,
    gatherReportContext,
    loadTransactions,
    toDateKey,
    filterByDateRange,
  };
}
