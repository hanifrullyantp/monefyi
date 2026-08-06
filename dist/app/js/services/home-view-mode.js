/**
 * Home view mode — simple vs full (TASK 3.3).
 * @module services/home-view-mode
 */

const STORAGE_KEY = 'monefyi_home_view_mode';

/**
 * @param {object} [state]
 * @returns {'simple'|'full'}
 */
export function resolveHomeViewMode(state = window.STATE) {
  const prefs = state?.db?.userPreferences || {};
  const mode = prefs.home_view_mode || localStorage.getItem(STORAGE_KEY) || 'auto';

  if (mode === 'simple') return 'simple';
  if (mode === 'full') return 'full';

  const profile = state?.db?.profile || state?.db?.user;
  const created = profile?.created_at || profile?.createdAt;
  if (created) {
    const days = (Date.now() - new Date(created).getTime()) / 86400000;
    if (days <= 7) return 'simple';
  }

  const plan = state?.db?.firstWeekPlan;
  if (plan?.started_at && !plan.completed_at) {
    const started = new Date(plan.started_at).getTime();
    if ((Date.now() - started) / 86400000 <= 7) return 'simple';
  }

  return 'full';
}

/**
 * @param {'simple'|'full'|'auto'} mode
 */
export async function saveHomeViewMode(mode) {
  localStorage.setItem(STORAGE_KEY, mode);
  try {
    const { saveUserPreferences } = await import('./onboarding-prefs.js');
    const existing = window.STATE?.db?.userPreferences || {};
    await saveUserPreferences({ ...existing, home_view_mode: mode });
  } catch (e) {
    console.warn('[home-view-mode] save', e);
  }
}

/**
 * @param {object} [state]
 * @returns {boolean}
 */
export function isSimpleHomeMode(state = window.STATE) {
  return resolveHomeViewMode(state) === 'simple';
}
