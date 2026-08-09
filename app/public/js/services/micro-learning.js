/**
 * Bite-sized financial education (Growth Fase 3.5).
 * @module services/micro-learning
 */

const LS_PROGRESS = 'monefyi_micro_learning_progress';
const LS_DISMISSED_DAY = 'monefyi_micro_tip_dismissed';

/** @type {object[]} */
export const LESSONS = [
  { id: 'emergency-fund', title: 'Kenapa Dana Darurat Sepenting Itu?', minutes: 2, path: 'basics', feature: 'goals' },
  { id: 'rule-503020', title: 'Rule 50/30/20 Explained', minutes: 3, path: 'basics', feature: 'budget' },
  { id: 'debt-strategies', title: 'Snowball vs Avalanche: Strategi Bayar Utang', minutes: 3, path: 'debt', feature: 'debt_planner' },
  { id: 'compounding', title: 'Apa Itu Compounding Interest?', minutes: 2, path: 'invest', feature: 'what_if' },
  { id: 'credit-vs-debit', title: 'Kredit vs Debit: Mana yang Lebih Baik?', minutes: 2, path: 'debt', feature: 'transactions' },
  { id: 'invest-mistakes', title: '5 Kesalahan Investor Pemula', minutes: 4, path: 'invest', feature: 'investment' },
  { id: 'save-for-house', title: 'Cara Nabung Sambil Beli Rumah', minutes: 3, path: 'goals', feature: 'life_event' },
  { id: 'cash-flow', title: 'Memahami Cash Flow Bulanan', minutes: 2, path: 'basics', feature: 'budget' },
];

/**
 * @returns {object}
 */
export function loadLearningProgress() {
  try {
    return JSON.parse(localStorage.getItem(LS_PROGRESS) || '{}');
  } catch {
    return {};
  }
}

/**
 * @param {string} lessonId
 */
export function markLessonComplete(lessonId) {
  const progress = loadLearningProgress();
  progress[lessonId] = { completed_at: new Date().toISOString() };
  localStorage.setItem(LS_PROGRESS, JSON.stringify(progress));
  return progress;
}

/**
 * @returns {object}
 */
export function getDailyTip() {
  const dayIndex = Math.floor(Date.now() / 86400000) % LESSONS.length;
  return LESSONS[dayIndex];
}

/**
 * @returns {boolean}
 */
export function isDailyTipDismissed() {
  try {
    return localStorage.getItem(LS_DISMISSED_DAY) === String(new Date().toISOString().slice(0, 10));
  } catch {
    return false;
  }
}

/**
 * Dismiss today's tip card.
 */
export function dismissDailyTip() {
  localStorage.setItem(LS_DISMISSED_DAY, new Date().toISOString().slice(0, 10));
}

/**
 * @returns {object}
 */
export function getLearningPathSummary() {
  const progress = loadLearningProgress();
  const completed = LESSONS.filter((l) => progress[l.id]?.completed_at).length;
  return {
    total: LESSONS.length,
    completed,
    percent: Math.round((completed / LESSONS.length) * 100),
    next: LESSONS.find((l) => !progress[l.id]?.completed_at) || LESSONS[0],
  };
}

/**
 * @param {string} category
 * @returns {object|null}
 */
export function getContextualLesson(category) {
  const c = String(category || '').toLowerCase();
  if (/invest|reksadana|saham/.test(c)) {
    return LESSONS.find((l) => l.id === 'invest-mistakes') || null;
  }
  if (/utang|cicilan|kredit/.test(c)) {
    return LESSONS.find((l) => l.id === 'debt-strategies') || null;
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.monefyiMicroLearning = {
    LESSONS, getDailyTip, dismissDailyTip, markLessonComplete, getLearningPathSummary, getContextualLesson,
  };
}
