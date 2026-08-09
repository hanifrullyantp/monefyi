/**
 * Sync anonymous benchmark snapshots to Supabase (Growth Sprint 13).
 * @module services/benchmark-store
 */

import { computeAnonymousBenchmark, getIncomeBracket, isBenchmarkOptIn, COHORT_BENCHMARKS } from './anonymous-benchmark.js';

function supa() {
  return window.STATE?.db?.supa || null;
}

function userId() {
  return window.STATE?.db?.user?.id || null;
}

/**
 * Build snapshot row for current month.
 * @param {object} [state]
 * @returns {object|null}
 */
export function buildBenchmarkSnapshot(state = typeof window !== 'undefined' ? window.STATE : {}) {
  if (!isBenchmarkOptIn(state)) return null;

  const benchmark = computeAnonymousBenchmark(state);
  if (!benchmark) return null;

  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const prefs = state.db?.userPreferences || {};
  const txs = (state.transactions || []).filter((t) => String(t.date || '').startsWith(month));
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0)
    || Number(prefs.monthly_income || 0);
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const debtPayment = Number(prefs.monthly_debt_payment || 0);
  const debtRatio = income > 0 ? debtPayment / income : 0;
  const emergencyBalance = Number(prefs.emergency_fund_balance || 0);
  const emergencyMonths = expense > 0 ? emergencyBalance / expense : 0;

  const distribution = {};
  for (const m of benchmark.metrics || []) {
    distribution[m.id] = m.yours;
  }

  return {
    month,
    income_bracket: getIncomeBracket(income),
    age_bracket: prefs.age_bracket || null,
    location_tier: prefs.location_tier || null,
    saving_rate: benchmark.metrics?.find((m) => m.id === 'saving_rate')?.yours || 0,
    category_distribution_json: distribution,
    debt_ratio: Math.round(debtRatio * 1000) / 1000,
    emergency_fund_months: Math.round(emergencyMonths * 10) / 10,
    financial_health_score: 0,
  };
}

/**
 * @param {object} [state]
 * @returns {Promise<object|null>}
 */
export async function syncBenchmarkSnapshot(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const uid = userId();
  const client = supa();
  const row = buildBenchmarkSnapshot(state);
  if (!row || !uid || !client || navigator.onLine === false) return row;

  try {
    let healthScore = row.financial_health_score;
    if (!healthScore) {
      const { computeFinancialHealthScore } = await import('./financial-health-score.js');
      healthScore = computeFinancialHealthScore(state).overall;
    }
    await client.from('user_benchmark_snapshots').upsert({
      user_id: uid,
      ...row,
      financial_health_score: healthScore,
    }, { onConflict: 'user_id,month' });
  } catch (e) {
    console.warn('[benchmark-store] sync', e);
  }
  return row;
}

const LS_COHORT_CACHE = 'monefyi_cohort_cache';

/**
 * @param {string} bracket
 * @param {string} month
 * @returns {Promise<object|null>}
 */
export async function fetchCohortMedians(bracket, month) {
  const cacheKey = `${bracket}_${month}`;
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = JSON.parse(localStorage.getItem(LS_COHORT_CACHE) || '{}')[cacheKey];
      if (cached && Date.now() - cached.at < 86400000) return cached.data;
    }
  } catch { /* ignore */ }

  const client = supa();
  if (!client || navigator.onLine === false) return null;

  try {
    const { data, error } = await client.rpc('get_benchmark_cohort_stats', {
      p_income_bracket: bracket,
      p_month: month,
    });
    if (error || !data || Number(data.sample_size) < 3) return null;

    const payload = {
      saving_rate: Number(data.saving_rate) || COHORT_BENCHMARKS[bracket]?.saving_rate,
      food_pct: Number(data.food_pct) || COHORT_BENCHMARKS[bracket]?.food_pct,
      transport_pct: Number(data.transport_pct) || COHORT_BENCHMARKS[bracket]?.transport_pct,
      sample_size: Number(data.sample_size),
      live: true,
    };

    try {
      if (typeof localStorage !== 'undefined') {
        const all = JSON.parse(localStorage.getItem(LS_COHORT_CACHE) || '{}');
        all[cacheKey] = { at: Date.now(), data: payload };
        localStorage.setItem(LS_COHORT_CACHE, JSON.stringify(all));
      }
    } catch { /* ignore */ }

    return payload;
  } catch (e) {
    console.warn('[benchmark-store] cohort', e);
    return null;
  }
}

/**
 * Merge live cohort medians into benchmark result.
 * @param {object} benchmark
 * @param {object|null} medians
 * @returns {object}
 */
export function applyLiveCohort(benchmark, medians) {
  if (!benchmark || !medians?.live) return benchmark;

  const peerMap = {
    saving_rate: medians.saving_rate,
    food_pct: medians.food_pct,
    transport_pct: medians.transport_pct,
  };

  const metrics = (benchmark.metrics || []).map((m) => {
    const peers = peerMap[m.id] ?? m.peers;
    return {
      ...m,
      peers,
      delta: m.yours - peers,
      status: m.betterWhenHigher
        ? (m.yours >= peers ? 'above' : 'below')
        : (m.yours <= peers ? 'above' : 'below'),
    };
  });

  return {
    ...benchmark,
    metrics,
    sample_note: `Live cohort: ${medians.sample_size} peer anonim bracket ${benchmark.cohort_label}.`,
    cohort_live: true,
  };
}

if (typeof window !== 'undefined') {
  window.monefyiBenchmarkStore = {
    syncBenchmarkSnapshot, buildBenchmarkSnapshot, fetchCohortMedians, applyLiveCohort,
  };
}
