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

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'home-streak-badge tap';
  el.setAttribute('aria-label', 'Lihat pencapaian');
  el.innerHTML = `
    <span class="home-streak-badge__icon">🔥</span>
    <span class="home-streak-badge__text">
      <strong>${streak}</strong> hari berturut-turut mencatat
      ${!loggedToday ? '<span class="home-streak-badge__warn"> · belum catat hari ini</span>' : ''}
    </span>
  `;

  el.addEventListener('click', async () => {
    const { showAchievementsPanel } = await import('./achievements-panel.js');
    await showAchievementsPanel();
  });

  return el;
}
