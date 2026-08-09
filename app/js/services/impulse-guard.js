/**
 * Impulse purchase guard — cooldown & impact preview (Fase 8.2).
 * @module services/impulse-guard
 */

import { isEmergencyModeActive } from './emergency-mode.js';

const LS_SETTINGS = 'monefyi_impulse_guard';
const DEFAULT_THRESHOLD = 100000;
const COOLDOWN_SEC = 30;

const DISCRETIONARY = /makan|food|shopping|belanja|entertainment|kopi|coffee|game|hiburan|delivery|gojek|grab/i;

/**
 * @returns {object}
 */
export function loadImpulseSettings() {
  try {
    return { enabled: true, threshold: DEFAULT_THRESHOLD, cooldown_sec: COOLDOWN_SEC, ...JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}') };
  } catch {
    return { enabled: true, threshold: DEFAULT_THRESHOLD, cooldown_sec: COOLDOWN_SEC };
  }
}

/**
 * @param {object} patch
 */
export function saveImpulseSettings(patch) {
  const next = { ...loadImpulseSettings(), ...patch };
  localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
  return next;
}

/**
 * @param {object} tx
 * @param {object} [state]
 * @returns {boolean}
 */
export function shouldInterceptPurchase(tx, state = typeof window !== 'undefined' ? window.STATE : {}) {
  const settings = loadImpulseSettings();
  if (!settings.enabled) return false;
  if (String(tx.type || 'expense') !== 'expense') return false;

  const amount = Math.abs(Number(tx.amount || 0));
  if (amount < settings.threshold) return false;

  const cat = `${tx.category || ''} ${tx.merchant || ''} ${tx.notes || ''}`;
  if (!DISCRETIONARY.test(cat)) return false;

  try {
    if (isEmergencyModeActive()) return true;
  } catch { /* ignore */ }

  return true;
}

/**
 * @param {object} tx
 * @param {object} [state]
 * @returns {object}
 */
export function computeImpulseImpact(tx, state = typeof window !== 'undefined' ? window.STATE : {}) {
  const amount = Math.abs(Number(tx.amount || 0));
  const situation = state._dailySituation || {};
  const safe = Number(situation.safeToSpend || situation.safe_to_spend || 0);
  const daysLeft = Number(situation.daysToPayday || situation.days_to_payday || 15) || 15;
  const after = safe - amount;
  const dailyAfter = daysLeft > 0 ? after / daysLeft : after;

  return {
    amount,
    safe_before: safe,
    safe_after: after,
    daily_after: Math.round(dailyAfter),
    days_to_payday: daysLeft,
    severity: after < 0 ? 'critical' : after < safe * 0.3 ? 'high' : 'medium',
    alternatives: [
      'Tunda 24 jam — masih butuh?',
      'Set budget max 50% dari nominal ini',
      'Cari alternatif gratis/lebih murah',
    ],
  };
}

if (typeof window !== 'undefined') {
  window.monefyiImpulseGuard = {
    loadImpulseSettings, saveImpulseSettings, shouldInterceptPurchase, computeImpulseImpact,
  };
}
