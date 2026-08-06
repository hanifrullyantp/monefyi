/**
 * Streak badge for beranda.
 * @module components/streak-badge
 */

import { computeRecordingStreak } from '../services/daily-streak.js';

/**
 * @param {object[]} [transactions]
 * @returns {HTMLElement|null}
 */
export function renderStreakBadge(transactions = window.STATE?.transactions || []) {
  const { streak, loggedToday } = computeRecordingStreak(transactions);
  if (streak <= 0 && !loggedToday) return null;

  const el = document.createElement('div');
  el.className = 'home-streak-badge';
  el.innerHTML = `
    <span class="home-streak-badge__icon">🔥</span>
    <span class="home-streak-badge__text">
      <strong>${streak}</strong> hari berturut-turut mencatat
      ${!loggedToday ? '<span class="home-streak-badge__warn"> · belum catat hari ini</span>' : ''}
    </span>
  `;
  return el;
}
