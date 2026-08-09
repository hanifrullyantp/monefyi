/**
 * Monthly review ritual triggers (Growth Sprint 8).
 * @module services/monthly-review-prompt
 */

import { loadJournalEntry } from './monthly-review-journal.js';

/**
 * @param {Date} [now]
 * @returns {string}
 */
export function getCurrentPeriod(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {Date} [now]
 * @returns {boolean}
 */
export function shouldPromptMonthlyReview(now = new Date()) {
  const day = now.getDate();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (day < lastDay - 2) return false;
  const period = getCurrentPeriod(now);
  if (loadJournalEntry(period)) return false;
  try {
    const dismissed = localStorage.getItem(`monefyi_monthly_review_dismiss_${period}`);
    if (dismissed === '1') return false;
  } catch { /* ignore */ }
  return true;
}

/**
 * @param {string} [period]
 */
export function dismissMonthlyReviewPrompt(period = getCurrentPeriod()) {
  localStorage.setItem(`monefyi_monthly_review_dismiss_${period}`, '1');
}

if (typeof window !== 'undefined') {
  window.monefyiMonthlyReviewPrompt = { shouldPromptMonthlyReview, dismissMonthlyReviewPrompt, getCurrentPeriod };
}
