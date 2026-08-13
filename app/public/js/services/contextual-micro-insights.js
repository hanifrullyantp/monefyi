/**
 * Contextual micro-insights at touchpoints (Growth Fase 1.3).
 * @module services/contextual-micro-insights
 */

import { dedupeTransactions } from '../utils/transaction-utils.js';

/**
 * @param {number} n
 */
function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(Number(n) || 0)));
}

/**
 * @param {object} tx
 * @param {object} [state]
 * @returns {object|null}
 */
export function getTransactionInputInsight(tx, state = typeof window !== 'undefined' ? window.STATE : {}) {
  if (!tx || String(tx.type || 'expense') !== 'expense') return null;
  const category = String(tx.category || 'Lainnya');
  const txs = dedupeTransactions(state.transactions || []);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartKey = weekStart.toISOString().slice(0, 10);

  const weekTxs = txs.filter((t) => {
    if (t.type !== 'expense') return false;
    if (String(t.category || '') !== category) return false;
    return String(t.date || '').slice(0, 10) >= weekStartKey;
  });

  const count = weekTxs.length + 1;
  const total = weekTxs.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0)
    + Math.abs(Number(tx.amount || 0));

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekKey = prevWeekStart.toISOString().slice(0, 10);
  const prevWeekTxs = txs.filter((t) => {
    if (t.type !== 'expense' || String(t.category || '') !== category) return false;
    const d = String(t.date || '').slice(0, 10);
    return d >= prevWeekKey && d < weekStartKey;
  });
  const prevTotal = prevWeekTxs.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);

  if (count < 2 && total < 100000) return null;

  let body = `Ini transaksi ${category} ke-${count} minggu ini. Total minggu ini: Rp ${fmt(total)}`;
  if (prevTotal > 0) {
    const diff = Math.round(((total - prevTotal) / prevTotal) * 100);
    body += ` (${diff >= 0 ? '+' : ''}${diff}% vs minggu lalu Rp ${fmt(prevTotal)})`;
  }

  return {
    id: 'tx-input-insight',
    icon: '💡',
    title: 'Micro-insight',
    body,
    severity: total > prevTotal * 1.2 && prevTotal > 0 ? 'warn' : 'info',
  };
}

/**
 * @param {object} [state]
 * @returns {object|null}
 */
export function getDailyDashboardInsight(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const txs = dedupeTransactions(state.transactions || []);
  const discretionary = /nongkrong|kopi|coffee|hiburan|entertainment|belanja|shopping/i;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);

  let streakDays = 0;
  for (let i = 0; i < 14; i += 1) {
    const day = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
    const hadDisc = txs.some((t) => {
      if (t.type !== 'expense' || String(t.date || '').slice(0, 10) !== day) return false;
      const text = `${t.category || ''} ${t.merchant || ''}`;
      return discretionary.test(text);
    });
    if (i === 0 && hadDisc) break;
    if (hadDisc) break;
    streakDays += 1;
  }

  if (streakDays < 3) return null;

  const avgDaily = txs
    .filter((t) => t.type === 'expense' && discretionary.test(`${t.category || ''} ${t.merchant || ''}`))
    .slice(-30)
    .reduce((s, t, _, arr) => s + Math.abs(Number(t.amount || 0)) / Math.max(arr.length, 1), 0);

  const saved = Math.round(avgDaily * Math.min(streakDays, 7));

  return {
    id: 'daily-streak',
    icon: '📊',
    title: 'Insight Hari Ini',
    body: `${streakDays} hari tanpa belanja discretionary besar. ~Rp ${fmt(saved)} tetap di kantong. Keep it up! 🔥`,
    severity: 'good',
  };
}

/**
 * @param {string} category
 * @param {object} [state]
 * @param {{ dailyBudgetTarget?: number }} [opts]
 * @returns {object|null}
 */
export function getCategoryDetailInsight(category, state = typeof window !== 'undefined' ? window.STATE : {}, opts = {}) {
  const txs = dedupeTransactions(state.transactions || []);
  const cat = String(category || 'Lainnya');
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartKey = weekStart.toISOString().slice(0, 10);

  const thisWeek = txs.filter((t) => {
    if (t.type !== 'expense' || String(t.category || '') !== cat) return false;
    return String(t.date || '').slice(0, 10) >= weekStartKey;
  });
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekKey = lastWeekStart.toISOString().slice(0, 10);
  const lastWeek = txs.filter((t) => {
    if (t.type !== 'expense' || String(t.category || '') !== cat) return false;
    const d = String(t.date || '').slice(0, 10);
    return d >= lastWeekKey && d < weekStartKey;
  });

  const thisTotal = thisWeek.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const lastTotal = lastWeek.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  if (thisTotal <= 0 && lastTotal <= 0) return null;

  const pct = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : 0;
  const daily = thisWeek.length ? Math.round(thisTotal / Math.max(now.getDay() || 1, 1)) : 0;
  const dailyTarget = Number(opts.dailyBudgetTarget || 0);

  let body = `Minggu ini: Rp ${fmt(thisTotal)} (${pct >= 0 ? '+' : ''}${pct}% vs minggu lalu). Realisasi harian ~Rp ${fmt(daily)}.`;
  if (dailyTarget > 0 && daily > 0) {
    const vsTarget = Math.round(((dailyTarget - daily) / dailyTarget) * 100);
    if (vsTarget >= 5) body += ` Kamu ${vsTarget}% di bawah target harian ✅`;
    else if (vsTarget <= -10) body += ` ${Math.abs(vsTarget)}% di atas target harian ⚠️`;
  }

  return {
    id: 'category-trend',
    icon: '📈',
    title: `Trend ${cat}`,
    body,
    severity: pct > 15 ? 'warn' : 'info',
  };
}

if (typeof window !== 'undefined') {
  window.monefyiMicroInsights = {
    getTransactionInputInsight,
    getDailyDashboardInsight,
    getCategoryDetailInsight,
  };
}
