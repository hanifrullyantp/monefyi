/**
 * Weekly digest — highlights, patterns, recommendations (Fase 4.1).
 * @module services/weekly-digest
 */

import { generateWeeklyCheckinHeuristic, getWeekRange } from './weekly-checkin.js';
import { generateSmartSuggestions } from './smart-suggestions.js';

/**
 * @param {object} [state]
 * @returns {object}
 */
export function generateWeeklyDigest(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const checkin = generateWeeklyCheckinHeuristic(state);
  const week = getWeekRange();
  const txs = (state.transactions || []).filter((t) => {
    const d = String(t.date || '').slice(0, 10);
    return d >= week.start && d <= week.end;
  });
  const expenses = txs.filter((t) => t.type === 'expense');
  const weekTotal = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const prevStart = new Date(week.start);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(week.start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevExpenses = (state.transactions || []).filter((t) => {
    const d = String(t.date || '').slice(0, 10);
    return t.type === 'expense'
      && d >= prevStart.toISOString().slice(0, 10)
      && d <= prevEnd.toISOString().slice(0, 10);
  });
  const prevTotal = prevExpenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const changePct = prevTotal > 0 ? Math.round(((weekTotal - prevTotal) / prevTotal) * 100) : 0;

  const suggestions = generateSmartSuggestions(state).slice(0, 2);
  const highlights = [...(checkin.good || [])];
  const improvements = [...(checkin.attention || [])];
  const recommendations = [
    checkin.focus,
    ...suggestions.map((s) => s.text || s.title).filter(Boolean),
  ].filter(Boolean).slice(0, 3);

  return {
    ...checkin,
    week_total: weekTotal,
    prev_week_total: prevTotal,
    change_pct: changePct,
    change_label: changePct > 0 ? `↑${changePct}%` : changePct < 0 ? `↓${Math.abs(changePct)}%` : 'stabil',
    highlights,
    improvements,
    recommendations,
    suggestions,
    has_data: checkin.has_data || weekTotal > 0,
  };
}

/**
 * Build push notification copy from digest.
 * @param {object} digest
 * @returns {{ title: string, body: string }}
 */
export function formatWeeklyDigestNotification(digest) {
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const highlight = digest.highlights?.[0] || '';
  const rec = digest.recommendations?.[0] || '';
  return {
    title: 'Rekap Minggu Ini',
    body: [
      `Pengeluaran Rp ${fmt(digest.week_total)} (${digest.change_label || 'stabil'} vs minggu lalu).`,
      highlight,
      rec ? `💡 ${rec}` : '',
    ].filter(Boolean).join(' ').trim(),
  };
}

if (typeof window !== 'undefined') {
  window.monefyiWeeklyDigest = { generateWeeklyDigest, formatWeeklyDigestNotification };
}
