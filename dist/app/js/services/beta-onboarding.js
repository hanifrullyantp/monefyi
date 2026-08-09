/**
 * Beta tester onboarding helpers (Sprint 6 / launch checklist §7).
 * @module services/beta-onboarding
 */

/**
 * @param {object|null|undefined} profile
 * @param {(key: string) => boolean} isFeatureEnabled
 * @returns {boolean}
 */
export function isBetaTester(profile, isFeatureEnabled) {
  if (profile?.early_access === true) return true;
  try {
    return !!isFeatureEnabled?.('beta_feedback');
  } catch {
    return false;
  }
}

/**
 * @param {object} [profile]
 * @returns {boolean}
 */
export function shouldShowBetaWelcome(profile) {
  if (!profile?.early_access) return false;
  try {
    return localStorage.getItem('monefyi_beta_welcome_seen') !== '1';
  } catch {
    return false;
  }
}

export function markBetaWelcomeSeen() {
  try {
    localStorage.setItem('monefyi_beta_welcome_seen', '1');
  } catch { /* ignore */ }
}

if (typeof window !== 'undefined') {
  window.monefyiBetaOnboarding = { isBetaTester, shouldShowBetaWelcome, markBetaWelcomeSeen };
}
