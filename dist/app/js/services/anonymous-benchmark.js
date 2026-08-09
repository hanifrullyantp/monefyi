/**
 * Anonymous peer benchmarking — opt-in, cohort-based (Fase 5.1).
 * @module services/anonymous-benchmark
 */

const LS_OPT_IN = 'monefyi_benchmark_opt_in';

/** @type {Record<string, { saving_rate: number, food_pct: number, transport_pct: number, label: string }>} */
const COHORT_BENCHMARKS = {
  under_5jt: { label: '< Rp 5 jt/bulan', saving_rate: 12, food_pct: 28, transport_pct: 12 },
  '5_15jt': { label: 'Rp 5–15 jt/bulan', saving_rate: 18, food_pct: 22, transport_pct: 15 },
  '15_30jt': { label: 'Rp 15–30 jt/bulan', saving_rate: 22, food_pct: 18, transport_pct: 14 },
  above_30jt: { label: '> Rp 30 jt/bulan', saving_rate: 28, food_pct: 15, transport_pct: 12 },
};

/**
 * @param {number} income
 * @returns {string}
 */
export function getIncomeBracket(income) {
  const n = Number(income) || 0;
  if (n < 5000000) return 'under_5jt';
  if (n < 15000000) return '5_15jt';
  if (n < 30000000) return '15_30jt';
  return 'above_30jt';
}

/**
 * @param {object} [state]
 * @returns {boolean}
 */
export function isBenchmarkOptIn(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const prefs = state.db?.userPreferences || {};
  if (typeof prefs.benchmark_opt_in === 'boolean') return prefs.benchmark_opt_in;
  try {
    return localStorage.getItem(LS_OPT_IN) === '1';
  } catch {
    return false;
  }
}

/**
 * @param {boolean} enabled
 */
export function setBenchmarkOptInLocal(enabled) {
  try {
    localStorage.setItem(LS_OPT_IN, enabled ? '1' : '0');
  } catch { /* ignore */ }
  if (enabled && typeof window !== 'undefined') {
    import('./benchmark-store.js').then(({ syncBenchmarkSnapshot }) => {
      syncBenchmarkSnapshot(window.STATE).catch(() => {});
    }).catch(() => {});
  }
}

/**
 * @param {object} [state]
 * @returns {object|null}
 */
export function computeAnonymousBenchmark(state = typeof window !== 'undefined' ? window.STATE : {}) {
  if (!isBenchmarkOptIn(state)) return null;

  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const txs = (state.transactions || []).filter((t) => String(t.date || '').startsWith(month));
  const prefs = state.db?.userPreferences || {};

  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0)
    || Number(prefs.monthly_income || 0);
  if (income <= 0) return null;

  const expenses = txs.filter((t) => t.type === 'expense');
  const totalExpense = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const savingRate = Math.round(((income - totalExpense) / income) * 100);

  const catSpend = (pattern) => expenses
    .filter((t) => pattern.test(String(t.category || t.merchant || '').toLowerCase()))
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const foodSpend = catSpend(/makan|food|kopi|coffee|resto|warung/);
  const transportSpend = catSpend(/transport|ojek|gojek|grab|bensin|tol|parkir/);

  const foodPct = totalExpense > 0 ? Math.round((foodSpend / totalExpense) * 100) : 0;
  const transportPct = totalExpense > 0 ? Math.round((transportSpend / totalExpense) * 100) : 0;

  const bracket = getIncomeBracket(income);
  const cohort = COHORT_BENCHMARKS[bracket];

  const metrics = [
    {
      id: 'saving_rate',
      label: 'Saving rate',
      yours: savingRate,
      peers: cohort.saving_rate,
      unit: '%',
      betterWhenHigher: true,
    },
    {
      id: 'food_pct',
      label: 'Pengeluaran makan',
      yours: foodPct,
      peers: cohort.food_pct,
      unit: '%',
      betterWhenHigher: false,
    },
    {
      id: 'transport_pct',
      label: 'Transport',
      yours: transportPct,
      peers: cohort.transport_pct,
      unit: '%',
      betterWhenHigher: false,
    },
  ].map((m) => ({
    ...m,
    delta: m.yours - m.peers,
    status: m.betterWhenHigher
      ? (m.yours >= m.peers ? 'above' : 'below')
      : (m.yours <= m.peers ? 'above' : 'below'),
  }));

  return {
    bracket,
    cohort_label: cohort.label,
    income,
    metrics,
    sample_note: 'Perbandingan anonim berdasarkan cohort income serupa (data agregat).',
  };
}

if (typeof window !== 'undefined') {
  window.monefyiBenchmark = { computeAnonymousBenchmark, isBenchmarkOptIn, setBenchmarkOptInLocal };
}
