/**
 * Apply money personality to defaults, copy, and feature CTAs (Growth Sprint 19).
 * @module services/personality-personalization
 */

import { loadPersonalityResult } from './money-personality.js';
import { saveImpulseSettings } from './impulse-guard.js';
import { enrollCoachingPlan, getActivePlanWithProgress } from './coaching-plans.js';

/** @type {Record<string, object[]>} */
export const PERSONALITY_ACTIONS = {
  saver: [
    { id: 'goals', label: 'Cek progress target', action: 'goals' },
    { id: 'health', label: 'Lihat health score', action: 'health_score' },
  ],
  spender: [
    { id: 'impulse', label: 'Aktifkan Impulse Guard', action: 'enable_impulse' },
    { id: 'what_if', label: 'Simulasi before buy', action: 'what_if' },
  ],
  planner: [
    { id: 'review', label: 'Monthly review', action: 'monthly_review' },
    { id: 'recurring', label: 'Atur tagihan rutin', action: 'recurring' },
  ],
  investor: [
    { id: 'what_if', label: 'Proyeksi investasi', action: 'what_if' },
    { id: 'invest', label: 'Portfolio tracker', action: 'investment' },
  ],
  debt_focused: [
    { id: 'debt', label: 'Debt payoff planner', action: 'debt_planner' },
    { id: 'budget', label: 'Budget fokus utang', action: 'budget' },
  ],
  balanced: [
    { id: 'digest', label: 'Weekly digest', action: 'weekly_digest' },
    { id: 'benchmark', label: 'Benchmark anonim', action: 'benchmark' },
  ],
  spontaneous: [
    { id: 'impulse', label: 'Impulse Guard + wishlist', action: 'enable_impulse' },
    { id: 'streak', label: 'Catat transaksi hari ini', action: 'add_tx' },
  ],
  avoider: [
    { id: 'wellness', label: 'Wellness check-in', action: 'wellness' },
    { id: 'coach', label: 'Chat Monevisor', action: 'monevisor' },
  ],
};

/**
 * @param {object} result
 * @returns {object}
 */
export function applyPersonalityDefaults(result) {
  const typeId = result?.type_id || 'balanced';
  /** @type {string[]} */
  const applied = [];

  if (['spender', 'spontaneous'].includes(typeId)) {
    saveImpulseSettings({ enabled: true, threshold: 75000, cooldown_sec: 45 });
    applied.push('impulse_guard');
  }

  if (typeId === 'debt_focused') {
    if (!getActivePlanWithProgress()) enrollCoachingPlan('debt_recovery');
    applied.push('coaching_debt');
  }

  if (typeId === 'avoider') {
    try {
      localStorage.setItem('monefyi_wellness_prompt', '1');
    } catch { /* ignore */ }
    applied.push('wellness_prompt');
  }

  if (typeId === 'planner') {
    try {
      localStorage.setItem('monefyi_monthly_review_nudge', '1');
    } catch { /* ignore */ }
    applied.push('monthly_review_nudge');
  }

  try {
    localStorage.setItem('monefyi_personality_applied', JSON.stringify({
      type_id: typeId,
      applied,
      at: new Date().toISOString(),
    }));
  } catch { /* ignore */ }

  return { type_id: typeId, applied };
}

/**
 * @param {object|null} [result]
 * @returns {object|null}
 */
export function getPersonalityDashboardCard(result = loadPersonalityResult()) {
  if (!result?.type_id) return null;

  const actions = PERSONALITY_ACTIONS[result.type_id] || PERSONALITY_ACTIONS.balanced;
  const primary = actions[0];

  return {
    icon: result.icon || '🎯',
    title: `${result.name} — ${result.tagline}`,
    body: result.strategy,
    primaryAction: primary,
    secondaryAction: actions[1] || null,
    type_id: result.type_id,
  };
}

/**
 * @param {string} action
 * @param {object} [callbacks]
 */
export async function runPersonalityAction(action, callbacks = {}) {
  switch (action) {
    case 'enable_impulse': {
      const { saveImpulseSettings } = await import('./impulse-guard.js');
      saveImpulseSettings({ enabled: true });
      window.showToast?.('Impulse Guard aktif', 'success');
      break;
    }
    case 'what_if': {
      const { showWhatIfSimulator } = await import('../components/what-if-simulator.js');
      await showWhatIfSimulator({ tab: 'purchase' });
      break;
    }
    case 'debt_planner':
      callbacks.onDebtPlanner?.();
      break;
    case 'monthly_review': {
      const { showMonthlyReviewSheet } = await import('../components/monthly-review-sheet.js');
      await showMonthlyReviewSheet();
      break;
    }
    case 'wellness': {
      const { showWellnessCheckinSheet } = await import('../components/wellness-checkin-sheet.js');
      showWellnessCheckinSheet();
      break;
    }
    case 'wishlist': {
      const { showImpulseWishlistSheet } = await import('../components/impulse-wishlist-sheet.js');
      showImpulseWishlistSheet();
      break;
    }
    case 'weekly_digest':
      callbacks.onViewAdvisor?.();
      break;
    case 'budget':
      callbacks.onViewBudget?.();
      break;
    case 'add_tx':
      callbacks.onAddTransaction?.();
      break;
    case 'monevisor':
      callbacks.onViewAdvisor?.();
      break;
    default:
      break;
  }
}

if (typeof window !== 'undefined') {
  window.monefyiPersonalityPersonalization = {
    PERSONALITY_ACTIONS,
    applyPersonalityDefaults,
    getPersonalityDashboardCard,
    runPersonalityAction,
  };
}
