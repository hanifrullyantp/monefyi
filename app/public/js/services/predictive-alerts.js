/**
 * Predictive alerts before problems occur (Growth Fase 1.4).
 * @module services/predictive-alerts
 */

import { dedupeTransactions } from '../utils/transaction-utils.js';
import { computeDailySituation } from './daily-situation.js';

const LS_DISMISSED = 'monefyi_predictive_dismissed';

/**
 * @param {number} n
 */
function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(Number(n) || 0)));
}

/**
 * @param {string} id
 * @returns {boolean}
 */
function isDismissed(id) {
  try {
    const map = JSON.parse(localStorage.getItem(LS_DISMISSED) || '{}');
    const until = Number(map[id] || 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}

/**
 * @param {string} id
 * @param {number} [hours]
 */
export function dismissPredictiveAlert(id, hours = 24) {
  try {
    const map = JSON.parse(localStorage.getItem(LS_DISMISSED) || '{}');
    map[id] = Date.now() + hours * 3600000;
    localStorage.setItem(LS_DISMISSED, JSON.stringify(map));
  } catch { /* ignore */ }
}

/**
 * @param {object} [state]
 * @returns {object[]}
 */
export function generatePredictiveAlerts(state = typeof window !== 'undefined' ? window.STATE : {}) {
  /** @type {object[]} */
  const alerts = [];

  const budgetAlert = detectPreOverspend(state);
  if (budgetAlert && !isDismissed(budgetAlert.id)) alerts.push(budgetAlert);

  const cashAlert = detectCashFlowWarning(state);
  if (cashAlert && !isDismissed(cashAlert.id)) alerts.push(cashAlert);

  const goalAlert = detectGoalDelayWarning(state);
  if (goalAlert && !isDismissed(goalAlert.id)) alerts.push(goalAlert);

  return alerts.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 2);
}

/**
 * @param {object} state
 */
function detectPreOverspend(state) {
  const budgets = state.budget?.rows || state.budget?.categories || [];
  const rows = Array.isArray(budgets) ? budgets : Object.entries(budgets).map(([name, amount]) => ({ name, amount }));
  const txs = dedupeTransactions(state.transactions || []);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();

  for (const row of rows) {
    const cat = String(row.name || row.category || '');
    const limit = Number(row.amount || 0);
    if (limit <= 0) continue;

    const spent = txs
      .filter((t) => t.type === 'expense' && String(t.date || '').startsWith(month) && String(t.category || '') === cat)
      .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);

    const pct = spent / limit;
    if (pct < 0.75 || daysLeft <= 3) continue;

    const dailyAvg = spent / Math.max(now.getDate(), 1);
    const projected = spent + dailyAvg * daysLeft;
    if (projected <= limit * 1.05) continue;

    const over = Math.round(projected - limit);
    return {
      id: `pre-overspend-${cat}`,
      type: 'pre_overspend',
      icon: '⚠️',
      title: `Prediksi: Budget ${cat} habis sebelum akhir bulan`,
      body: `Sekarang Rp ${fmt(spent)} dari Rp ${fmt(limit)} (${Math.round(pct * 100)}%). Kalau lanjut pola ini, over ~Rp ${fmt(over)}.`,
      actions: [
        { label: 'Cek budget', target: 'budget' },
        { label: 'Ide hemat', target: 'advisor' },
      ],
      priority: 8,
    };
  }
  return null;
}

/**
 * @param {object} state
 */
function detectCashFlowWarning(state) {
  const cached = state._dailySituation || {};
  const situation = cached.safeToSpend != null
    ? cached
    : computeDailySituation(state);
  const safe = Number(situation.safeToSpend || situation.safe_to_spend || 0);
  const days = Number(situation.daysToPayday || situation.days_to_payday || 0);
  if (days <= 0 || safe <= 0) return null;

  const txs = dedupeTransactions(state.transactions || []);
  const weekAgoKey = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const recent = txs.filter((t) => {
    if (t.type !== 'expense') return false;
    return String(t.date || '').slice(0, 10) >= weekAgoKey;
  });
  const weeklySpend = recent.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const dailyAvg = weeklySpend / 7 || safe / days;
  const projected = safe - dailyAvg * days;

  if (projected >= 0) return null;

  return {
    id: 'cash-flow-warning',
    type: 'cash_flow',
    icon: '🔴',
    title: 'Perhatian: prediksi tekor sebelum gajian',
    body: `Safe-to-spend Rp ${fmt(safe)}, ${days} hari ke gajian. Realisasi Rp ${fmt(dailyAvg)}/hari → prediksi Rp ${fmt(projected)}.`,
    actions: [
      { label: 'Mode darurat', target: 'emergency' },
      { label: 'Lihat saran', target: 'advisor' },
    ],
    priority: 10,
  };
}

/**
 * @param {object} state
 */
function detectGoalDelayWarning(state) {
  const goals = state.db?.financialGoals || state.financialGoals || [];
  const active = goals.filter((g) => g.status === 'active' || !g.status);
  if (!active.length) return null;

  const g = active[0];
  const target = Number(g.target_amount || g.target || 0);
  const current = Number(g.current_amount || g.current || 0);
  const targetDate = g.target_date ? new Date(g.target_date) : null;
  if (!target || !targetDate || Number.isNaN(targetDate.getTime())) return null;

  const monthsLeft = Math.max(1, Math.ceil((targetDate - Date.now()) / (30 * 86400000)));
  const needed = (target - current) / monthsLeft;
  const gap = target - current;
  if (gap <= 0) return null;

  const prefs = state.db?.userPreferences || {};
  const monthlySave = Number(prefs.monthly_saving_target || prefs.monthlySaving || 0);
  if (monthlySave <= 0 || monthlySave >= needed) return null;

  return {
    id: `goal-delay-${g.id || 'primary'}`,
    type: 'goal_delay',
    icon: '🎯',
    title: `Update: ${g.name || 'Target'} mundur dari rencana`,
    body: `Butuh ~Rp ${fmt(needed)}/bulan, rencana nabung Rp ${fmt(monthlySave)}/bulan. Naikkan saving atau geser target.`,
    actions: [
      { label: 'Adjust target', target: 'goals' },
      { label: 'What-if', target: 'whatif' },
    ],
    priority: 7,
  };
}

if (typeof window !== 'undefined') {
  window.monefyiPredictiveAlerts = { generatePredictiveAlerts, dismissPredictiveAlert };
}
