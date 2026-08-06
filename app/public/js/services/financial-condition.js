/**
 * Sync user financial condition (aman/waspada/bahaya) for notifications.
 * @module services/financial-condition
 */

import { computeDailySituation } from './daily-situation.js';

/**
 * @param {object} [state]
 * @returns {import('./daily-situation.js').SituationStatus|string}
 */
export function computeFinancialCondition(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const situation = computeDailySituation(state);
  return situation.status || 'incomplete';
}

let lastConditionSyncMs = 0;
const CONDITION_SYNC_MIN_MS = 5 * 60 * 1000;

/**
 * Persist condition to STATE + Supabase (best-effort).
 * @param {object} [state]
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<string>}
 */
export async function syncFinancialCondition(
  state = typeof window !== 'undefined' ? window.STATE : {},
  opts = {},
) {
  const condition = computeFinancialCondition(state);
  const nowMs = Date.now();
  if (!opts.force && nowMs - lastConditionSyncMs < CONDITION_SYNC_MIN_MS) {
    return condition;
  }
  const now = new Date().toISOString();

  if (state.db) {
    state.db.financialCondition = condition;
    if (state.db.userPreferences) {
      state.db.userPreferences.financial_condition = condition;
      state.db.userPreferences.financial_condition_updated_at = now;
    }
  }

  const uid = state.db?.user?.id;
  const supa = state.db?.supa;
  if (!uid || !supa) return condition;

  try {
    await supa.from('user_preferences').upsert({
      user_id: uid,
      financial_condition: condition,
      financial_condition_updated_at: now,
      updated_at: now,
    }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('[financial-condition] sync', e);
  }

  lastConditionSyncMs = nowMs;
  return condition;
}

/**
 * @param {object} [state]
 * @returns {string}
 */
export function getFinancialCondition(state = typeof window !== 'undefined' ? window.STATE : {}) {
  return state?.db?.financialCondition
    || state?.db?.userPreferences?.financial_condition
    || computeFinancialCondition(state);
}
