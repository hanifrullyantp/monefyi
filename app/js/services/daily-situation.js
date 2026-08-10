/**
 * Daily financial situation — safe-to-spend, runway, prediction, status.
 * @module services/daily-situation
 */

import { dedupeTransactions, isExpenseTransaction, isConsumptionExpense } from '../utils/transaction-utils.js';

/** @typedef {'aman'|'waspada'|'bahaya'|'incomplete'} SituationStatus */

/**
 * @param {Date} from
 * @param {Date} to
 * @returns {number}
 */
function daysBetween(from, to) {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
}

/**
 * @param {number|null|undefined} paydayDay
 * @param {boolean} irregular
 * @returns {{ days: number, label: string, paydayDate: Date }}
 */
export function getDaysUntilPayday(paydayDay, irregular = false) {
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  if (irregular) {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(12, 0, 0, 0);
    const days = daysBetween(now, end);
    return { days, label: `${days} hari (akhir bulan)`, paydayDate: end };
  }

  const day = Math.min(31, Math.max(1, Number(paydayDay) || 0)) || new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let target = new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0, 0);
  if (target <= now) {
    target = new Date(now.getFullYear(), now.getMonth() + 1, day, 12, 0, 0, 0);
  }
  const days = daysBetween(now, target);
  return { days, label: `${days} hari`, paydayDate: target };
}

/** Alias for shared payday helper used across budget hero and home. */
export const getDaysToPayday = getDaysUntilPayday;

/**
 * @param {object} state
 * @returns {{ income: number, fixedPlanned: number, savePlanned: number, flexibleSpent: number, flexibleRemaining: number }}
 */
export function computeFlexibleBudget(state) {
  const period = state?.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const monthData = state?.budgetsByMonth?.[period];
  let income = Number(monthData?.income || 0);

  if (!income && state?.db?.userPreferences?.monthly_income) {
    income = Number(state.db.userPreferences.monthly_income);
  }

  const rows = monthData?.categories?.rows || [];
  const rowList = Array.isArray(rows) ? rows : [];

  const categoryPriority = new Map();
  let fixedPlanned = 0;
  let savePlanned = 0;
  let flexiblePlanned = 0;

  for (const row of rowList) {
    const pri = row.priority || 'penting';
    const amt = Number(row.amount || 0);
    categoryPriority.set(String(row.name || '').toLowerCase(), pri);
    if (pri === 'harus') fixedPlanned += amt;
    else if (pri === 'simpan') savePlanned += amt;
    else flexiblePlanned += amt;
  }

  const periodStart = state?.period?.start || `${period}-01`;
  const periodEnd = state?.period?.end || periodStart;
  const txs = dedupeTransactions(state?.transactions || []).filter(
    (t) => t.date >= periodStart && t.date <= periodEnd,
  );

  let flexibleSpent = 0;
  let totalExpense = 0;
  for (const tx of txs) {
    if (!isConsumptionExpense(tx)) continue;
    const amt = Number(tx.amount || 0);
    totalExpense += amt;
    const cat = String(tx.category || tx.merchant || '').toLowerCase();
    const pri = categoryPriority.get(cat) || inferPriorityFromCategory(cat);
    if (pri === 'harus' || pri === 'simpan') continue;
    flexibleSpent += amt;
  }

  let flexibleBudgetTotal = income - fixedPlanned - savePlanned;
  if (flexibleBudgetTotal <= 0 && income > 0) {
    flexibleBudgetTotal = Math.max(0, income * 0.5);
  }
  if (flexibleBudgetTotal <= 0 && income <= 0) {
    flexibleBudgetTotal = 0;
  }

  let flexibleRemaining = flexibleBudgetTotal - flexibleSpent;
  if (!rowList.length && income > 0) {
    flexibleRemaining = income - totalExpense;
  }

  return {
    income,
    fixedPlanned,
    savePlanned,
    flexibleSpent,
    flexibleRemaining,
    flexibleBudgetTotal,
    totalExpense,
  };
}

/**
 * @param {string} cat
 * @returns {string}
 */
function inferPriorityFromCategory(cat) {
  const harus = ['listrik', 'air', 'kontrakan', 'sewa', 'cicilan', 'internet', 'tagihan', 'bpjs', 'kpr'];
  const simpan = ['tabung', 'simpan', 'invest', 'dana darurat'];
  if (harus.some((k) => cat.includes(k))) return 'harus';
  if (simpan.some((k) => cat.includes(k))) return 'simpan';
  return 'penting';
}

/**
 * Flexible-only average daily spend over last N days in period.
 * @param {object[]} transactions
 * @param {object} state
 * @param {number} [lookbackDays]
 * @returns {number}
 */
export function getFlexibleAvgDailySpend(transactions = [], state = {}, lookbackDays = 7) {
  const flex = computeFlexibleBudget(state);
  const period = state?.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const periodStart = state?.period?.start || `${period}-01`;
  const periodEnd = state?.period?.end || periodStart;

  const monthData = state?.budgetsByMonth?.[period];
  const rowList = monthData?.categories?.rows || [];
  const categoryPriority = new Map();
  for (const row of rowList) {
    categoryPriority.set(String(row.name || '').toLowerCase(), row.priority || 'penting');
  }

  const today = new Date();
  let total = 0;
  let daysWithData = 0;
  const deduped = dedupeTransactions(transactions).filter(
    (t) => t.date >= periodStart && t.date <= periodEnd,
  );

  for (let i = 0; i < lookbackDays; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const dayTotal = deduped
      .filter((t) => {
        if (t.date !== iso || !isExpenseTransaction(t)) return false;
        const cat = String(t.category || t.merchant || '').toLowerCase();
        const pri = categoryPriority.get(cat) || inferPriorityFromCategory(cat);
        return pri !== 'harus' && pri !== 'simpan';
      })
      .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
    if (dayTotal > 0) daysWithData += 1;
    total += dayTotal;
  }

  const daysPassed = Math.max(1, today.getDate());
  if (flex.flexibleSpent > 0 && daysPassed >= lookbackDays) {
    return flex.flexibleSpent / daysPassed;
  }
  const divisor = Math.max(1, daysWithData || lookbackDays);
  return total / divisor;
}

/**
 * @param {object[]} transactions
 * @param {object[]} [budgetRows]
 * @returns {object[]}
 */
export function detectOutliers(transactions = [], budgetRows = []) {
  const categoryPriority = new Map();
  for (const row of budgetRows || []) {
    categoryPriority.set(String(row.name || '').toLowerCase(), row.priority || 'penting');
  }
  const flexibleTxs = dedupeTransactions(transactions).filter((t) => {
    if (!isExpenseTransaction(t)) return false;
    const cat = String(t.category || t.merchant || '').toLowerCase();
    const pri = categoryPriority.get(cat) || inferPriorityFromCategory(cat);
    return pri !== 'harus' && pri !== 'simpan';
  });
  const amounts = flexibleTxs.map((t) => Math.abs(Number(t.amount || 0))).filter((a) => a > 0);
  if (amounts.length < 3) return [];
  const sorted = [...amounts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const threshold = median * 3;
  return flexibleTxs.filter((t) => Math.abs(Number(t.amount || 0)) > threshold);
}

/**
 * Predict end-of-period flexible surplus/deficit.
 * @param {object} data
 * @returns {object}
 */
export function predictEndOfPeriod(data) {
  const {
    income_actual = 0,
    fixed_bills_paid = 0,
    fixed_bills_pending = 0,
    saving_target = 0,
    flexible_expense_so_far = 0,
    days_passed = 1,
    days_remaining = 1,
  } = data;

  if (days_passed < 7) {
    return {
      prediction: null,
      status: 'incomplete',
      amount: 0,
      confidence: 'low',
      message: 'Butuh min 7 hari data untuk prediksi',
    };
  }

  const flexibleAvailable = income_actual - fixed_bills_paid - fixed_bills_pending - saving_target;
  const flexibleRemaining = flexibleAvailable - flexible_expense_so_far;
  const avgFlexibleDaily = flexible_expense_so_far / Math.max(1, days_passed);
  const projectedFlexible = avgFlexibleDaily * days_remaining;
  const prediction = flexibleRemaining - projectedFlexible;

  if (Math.abs(prediction) > income_actual && income_actual > 0) {
    return {
      prediction: null,
      status: 'unreliable',
      amount: Math.abs(prediction),
      confidence: 'low',
      message: 'Data belum cukup untuk prediksi akurat',
    };
  }

  const confidence = days_passed < 7 ? 'low' : days_passed < 14 ? 'medium' : 'high';
  return {
    prediction,
    status: prediction >= 0 ? 'surplus' : 'deficit',
    amount: Math.abs(prediction),
    confidence,
    avgFlexibleDaily,
    flexibleRemaining,
    projectedFlexible,
  };
}

/**
 * @param {object[]} transactions
 * @returns {number}
 */
export function getAvgDailySpend7d(transactions = [], state = null) {
  if (state) return getFlexibleAvgDailySpend(transactions, state, 7);
  const today = new Date();
  let total = 0;
  let daysWithData = 0;
  const deduped = dedupeTransactions(transactions);
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const dayTotal = deduped
      .filter((t) => t.date === iso && isExpenseTransaction(t))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    if (dayTotal > 0) daysWithData += 1;
    total += dayTotal;
  }
  const divisor = Math.max(1, daysWithData || 7);
  return total / divisor;
}

/**
 * Find budget category closest to limit for waspada message.
 * @param {object} state
 * @returns {{ name: string, pct: number, remaining: number }|null}
 */
function findNearLimitCategory(state) {
  const period = state?.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const rows = state?.budgetsByMonth?.[period]?.categories?.rows || [];
  if (!rows.length) return null;

  const periodStart = state?.period?.start;
  const periodEnd = state?.period?.end;
  const txs = dedupeTransactions(state?.transactions || []).filter(
    (t) => t.date >= periodStart && t.date <= periodEnd,
  );

  let best = null;
  for (const row of rows) {
    if (row.priority === 'harus' || row.priority === 'simpan') continue;
    const planned = Number(row.amount || 0);
    if (planned <= 0) continue;
    const name = row.name || '';
    const spent = txs
      .filter((t) => {
        const type = String(t.type || '').toLowerCase();
        if (type !== 'expense' && type !== 'pengeluaran' && type !== 'out') return false;
        const cat = String(t.category || '').toLowerCase();
        return cat === name.toLowerCase() || cat.includes(name.toLowerCase());
      })
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const pct = (spent / planned) * 100;
    if (pct >= 70 && (!best || pct > best.pct)) {
      best = { name, pct, remaining: planned - spent };
    }
  }
  return best;
}

/**
 * Compute full daily situation from STATE.
 * @param {object} [state]
 * @returns {object}
 */
export function computeDailySituation(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const prefs = state?.db?.userPreferences || {};
  const paydayDay = prefs.payday_day;
  const paydayIrregular = !!prefs.payday_irregular;
  const payday = getDaysUntilPayday(paydayDay, paydayIrregular);

  const flex = computeFlexibleBudget(state);
  const avgDaily = getFlexibleAvgDailySpend(state?.transactions || [], state);
  const daysPassed = new Date().getDate();
  const daysLeftInMonth = (() => {
    const period = state?.selectedMonth
      || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const [y, m] = period.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const now = new Date();
    if (now.getFullYear() === y && now.getMonth() === m - 1) {
      return Math.max(0, daysInMonth - now.getDate());
    }
    return daysInMonth;
  })();

  if (flex.income <= 0) {
    return {
      status: 'incomplete',
      incompleteReason: 'income',
      message: 'Isi pemasukan bulanan dulu supaya kami bisa hitung batas aman harianmu.',
      action: 'onboarding',
    };
  }

  const daysToPayday = payday.days;
  const flexibleRemaining = flex.flexibleRemaining;

  const predictionResult = predictEndOfPeriod({
    income_actual: flex.income,
    fixed_bills_paid: flex.fixedPlanned,
    fixed_bills_pending: 0,
    saving_target: flex.savePlanned,
    flexible_expense_so_far: flex.flexibleSpent,
    days_passed: daysPassed,
    days_remaining: daysToPayday,
  });

  let safeToSpend = Math.floor(flexibleRemaining / daysToPayday);
  const isNegativePool = flexibleRemaining < 0;
  if (isNegativePool) safeToSpend = 0;

  const avgFlexibleDaily = predictionResult.avgFlexibleDaily ?? avgDaily;
  const runwayDays = avgFlexibleDaily > 0 ? flexibleRemaining / avgFlexibleDaily : daysToPayday;
  const predictedEndBalance = predictionResult.prediction ?? (flexibleRemaining - avgFlexibleDaily * daysToPayday);

  let status = /** @type {SituationStatus} */ ('aman');
  if (predictionResult.status === 'incomplete') {
    status = flex.income <= 0 ? 'incomplete' : 'waspada';
  } else if (predictedEndBalance < 0 || runwayDays < daysToPayday * 0.85) {
    status = 'bahaya';
  } else if (runwayDays < daysToPayday * 1.1 || predictedEndBalance < flex.income * 0.03) {
    status = 'waspada';
  }

  const nearCat = findNearLimitCategory(state);
  const now = new Date();
  const runoutDay = avgFlexibleDaily > 0 && flexibleRemaining > 0
    ? new Date(now.getTime() + runwayDays * 86400000)
    : null;

  return {
    status,
    safeToSpend,
    isNegativePool,
    flexibleRemaining,
    avgDailySpend: avgFlexibleDaily,
    runwayDays: Math.round(runwayDays * 10) / 10,
    daysToPayday,
    paydayLabel: payday.label,
    predictedEndBalance,
    predictionConfidence: predictionResult.confidence,
    predictionMessage: predictionResult.message || null,
    predictionStatus: predictionResult.status,
    daysLeftInMonth,
    projectedSurplus: predictedEndBalance >= 0,
    nearCategory: nearCat,
    runoutDate: runoutDay ? runoutDay.toISOString().slice(0, 10) : null,
    runoutDayOfMonth: runoutDay ? runoutDay.getDate() : null,
    daysUntilRunout: runoutDay ? daysBetween(now, runoutDay) : null,
    income: flex.income,
  };
}

let _lastSnapshotDate = null;

/**
 * Persist today's snapshot to Supabase (once per day per session).
 * @param {object} situation
 */
export async function saveDailySnapshot(situation) {
  const uid = window.STATE?.db?.user?.id;
  const supa = window.STATE?.db?.supa;
  if (!uid || !supa || !situation || situation.status === 'incomplete') return;

  const today = new Date().toISOString().slice(0, 10);
  if (_lastSnapshotDate === today) return;

  const row = {
    user_id: uid,
    snapshot_date: today,
    safe_to_spend: situation.safeToSpend,
    runway_days: situation.runwayDays,
    days_to_payday: situation.daysToPayday,
    predicted_end_balance: situation.predictedEndBalance,
    status: situation.status,
    payload: {
      avgDailySpend: situation.avgDailySpend,
      flexibleRemaining: situation.flexibleRemaining,
      paydayLabel: situation.paydayLabel,
    },
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supa.from('daily_snapshots').upsert(row, { onConflict: 'user_id,snapshot_date' });
    if (!error) _lastSnapshotDate = today;
  } catch (e) {
    console.warn('[daily-situation] snapshot save', e);
  }
}

if (typeof window !== 'undefined') {
  window.__monefyiDailySituation = {
    computeDailySituation,
    getDaysUntilPayday,
    getDaysToPayday,
    computeFlexibleBudget,
    getAvgDailySpend7d,
    getFlexibleAvgDailySpend,
    predictEndOfPeriod,
    detectOutliers,
    saveDailySnapshot,
  };
}
