/**
 * Engagement orchestrator — streak reminder, mini wins, weekly check-in.
 * @module services/engagement
 */

import { computeRecordingStreak, getStreakEveningReminder } from './daily-streak.js';
import {
  celebrateStreakMilestone,
  evaluateAndCelebrateMiniWins,
  loadAchievements,
} from './mini-win-engine.js';
import { maybeShowWeeklyCheckin } from './weekly-checkin.js';

/**
 * @param {object} [opts]
 */
export async function runEngagementEval(opts = {}) {
  const state = window.STATE || {};
  const txs = state.transactions || [];
  await loadAchievements();

  if (opts.lastTransaction) {
    await evaluateAndCelebrateMiniWins({
      state,
      transactions: txs,
      lastTransaction: opts.lastTransaction,
    });
  }

  const streakInfo = computeRecordingStreak(txs);
  if (opts.checkStreakMilestone) {
    await celebrateStreakMilestone(streakInfo);
  }
}

/**
 * Evening streak nudge (once per day).
 */
export function maybeShowStreakEveningReminder() {
  const txs = window.STATE?.transactions || [];
  const streakInfo = computeRecordingStreak(txs);
  const msg = getStreakEveningReminder(streakInfo);
  if (!msg) return;

  const key = `streak_reminder_${new Date().toISOString().slice(0, 10)}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');

  if (typeof window.showToast === 'function') {
    window.showToast(msg, 'info', { duration: 5000 });
  }
}

/**
 * Run on home open.
 */
export async function runHomeEngagementHooks() {
  maybeShowStreakEveningReminder();
  try {
    await maybeShowWeeklyCheckin();
  } catch (e) {
    console.warn('[engagement] weekly checkin', e);
  }
}
