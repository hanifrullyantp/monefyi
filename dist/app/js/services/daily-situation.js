/**
 * Daily financial situation — safe-to-spend, runway, prediction, status.
 * @module services/daily-situation
 */

import { dedupeTransactions, isExpenseTransaction } from '../utils/transaction-utils.js';

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
    if (!isExpenseTransaction(tx)) continue;
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
 * @param {object[]} transactions
 * @returns {number}
 */
export function getAvgDailySpend7d(transactions = []) {
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
  const avgDaily = getAvgDailySpend7d(state?.transactions || []);
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

  let safeToSpend = Math.floor(flexibleRemaining / daysToPayday);
  const isNegativePool = flexibleRemaining < 0;
  if (isNegativePool) safeToSpend = 0;

  const runwayDays = avgDaily > 0 ? flexibleRemaining / avgDaily : daysToPayday;
  const projectedSpend = avgDaily * Math.min(daysToPayday, daysLeftInMonth || daysToPayday);
  const predictedEndBalance = flexibleRemaining - projectedSpend;

  let status = /** @type {SituationStatus} */ ('aman');
  if (predictedEndBalance < 0 || runwayDays < daysToPayday * 0.85) {
    status = 'bahaya';
  } else if (runwayDays < daysToPayday * 1.1 || predictedEndBalance < flex.income * 0.03) {
    status = 'waspada';
  }

  const nearCat = findNearLimitCategory(state);
  const now = new Date();
  const runoutDay = avgDaily > 0 && flexibleRemaining > 0
    ? new Date(now.getTime() + runwayDays * 86400000)
    : null;

  return {
    status,
    safeToSpend,
    isNegativePool,
    flexibleRemaining,
    avgDailySpend: avgDaily,
    runwayDays: Math.round(runwayDays * 10) / 10,
    daysToPayday,
    paydayLabel: payday.label,
    predictedEndBalance,
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
    computeFlexibleBudget,
    getAvgDailySpend7d,
    saveDailySnapshot,
  };
}
