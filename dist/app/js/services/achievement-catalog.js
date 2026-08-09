/**
 * Achievement badge catalog + progress (Fase 5.2).
 * @module services/achievement-catalog
 */

import { computeRecordingStreak } from './daily-streak.js';
import { loadJournalEntry } from './monthly-review-journal.js';

/** @type {object[]} */
export const ACHIEVEMENT_BADGES = [
  { id: 'streak_3', icon: '🔥', title: 'Pemula Konsisten', desc: 'Catat 3 hari berturut-turut', xp: 10 },
  { id: 'streak_7', icon: '🔥', title: 'Seminggu Solid', desc: 'Streak 7 hari', xp: 25 },
  { id: 'streak_30', icon: '🏆', title: 'Master Kebiasaan', desc: 'Streak 30 hari', xp: 100 },
  { id: 'first_transaction', icon: '✅', title: 'Langkah Pertama', desc: 'Transaksi pertama tercatat', xp: 5 },
  { id: 'saving_rate_20', icon: '📈', title: 'Tabungan Sehat', desc: 'Saving rate ≥ 20% bulan ini', xp: 40 },
  { id: 'budget_on_track', icon: '🎯', title: 'Budget Hero', desc: 'Semua kategori flexible ≤ 100%', xp: 35 },
  { id: 'monthly_journal', icon: '📔', title: 'Refleksi Bulanan', desc: 'Selesaikan review bulan ini', xp: 20 },
  { id: 'first_emergency_fund', icon: '🌱', title: 'Dana Darurat', desc: 'Tabungan darurat pertama', xp: 30 },
];

/**
 * @param {object} [state]
 * @param {object[]} [earned]
 * @returns {object}
 */
export function computeAchievementProgress(state = {}, earned = []) {
  const txs = state.transactions || [];
  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const { streak } = computeRecordingStreak(txs);

  const income = txs.filter((t) => t.type === 'income' && String(t.date || '').startsWith(month))
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = txs.filter((t) => t.type === 'expense' && String(t.date || '').startsWith(month))
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const savingRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  const rows = state.budgetsByMonth?.[month]?.categories?.rows
    || state.budgetsByMonth?.[month]?.rows
    || [];
  const flexibleOk = rows.length === 0 || rows.every((row) => {
    if (row.category_type === 'fixed_bill') return true;
    const budget = Number(row.amount || 0);
    if (budget <= 0) return true;
    const spent = txs.filter((t) => t.type === 'expense' && String(t.date || '').startsWith(month)
      && String(t.category || '').toLowerCase() === String(row.name || '').toLowerCase())
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return spent <= budget;
  });

  const earnedTypes = new Set((earned || []).map((a) => a.achievement_type));

  const checks = {
    streak_3: streak >= 3,
    streak_7: streak >= 7,
    streak_30: streak >= 30,
    first_transaction: txs.length >= 1,
    saving_rate_20: savingRate >= 20,
    budget_on_track: flexibleOk && rows.length > 0,
    monthly_journal: !!loadJournalEntry(month),
    first_emergency_fund: earnedTypes.has('first_emergency_fund'),
  };

  const badges = ACHIEVEMENT_BADGES.map((b) => ({
    ...b,
    unlocked: !!checks[b.id] || earnedTypes.has(b.id),
    earned_at: earned.find((a) => a.achievement_type === b.id)?.shown_at || null,
  }));

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalXp = badges.filter((b) => b.unlocked).reduce((s, b) => s + b.xp, 0);
  const level = Math.min(10, Math.floor(totalXp / 50) + 1);

  return {
    badges,
    unlockedCount,
    total: badges.length,
    totalXp,
    level,
    levelLabel: level >= 8 ? 'Master' : level >= 5 ? 'Pro' : level >= 3 ? 'Aktif' : 'Pemula',
  };
}

if (typeof window !== 'undefined') {
  window.monefyiAchievementCatalog = { ACHIEVEMENT_BADGES, computeAchievementProgress };
}
