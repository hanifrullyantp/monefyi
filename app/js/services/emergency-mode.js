/**
 * Emergency mode — lock discretionary spend, runway focus (Fase 8.3).
 * @module services/emergency-mode
 */

const LS_ACTIVE = 'monefyi_emergency_mode';
const LS_HISTORY = 'monefyi_emergency_history';

import { getFinancialStatus } from './financial-status.js';
import { computeDailySituation } from './daily-situation.js';

/** Categories treated as non-essential when locked */
export const DISCRETIONARY_CATEGORIES = [
  'Entertainment', 'Hiburan', 'Shopping', 'Belanja', 'Keinginan',
  'Makan', 'Food', 'Kopi', 'Coffee', 'Delivery',
];

/**
 * @returns {boolean}
 */
export function isEmergencyModeActive() {
  return localStorage.getItem(LS_ACTIVE) === '1';
}

/**
 * @param {boolean} active
 * @param {string} [reason]
 */
export function setEmergencyMode(active, reason = 'manual') {
  if (active) {
    localStorage.setItem(LS_ACTIVE, '1');
    appendHistory({ event: 'activated', reason, at: new Date().toISOString() });
  } else {
    localStorage.removeItem(LS_ACTIVE);
    appendHistory({ event: 'deactivated', reason, at: new Date().toISOString() });
  }
  return active;
}

/**
 * @param {object} entry
 */
function appendHistory(entry) {
  const hist = loadEmergencyHistory();
  hist.unshift(entry);
  localStorage.setItem(LS_HISTORY, JSON.stringify(hist.slice(0, 20)));
}

/**
 * @returns {object[]}
 */
export function loadEmergencyHistory() {
  try {
    return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {object} [state]
 * @returns {boolean}
 */
export function shouldAutoTriggerEmergency(state = typeof window !== 'undefined' ? window.STATE : {}) {
  if (isEmergencyModeActive()) return false;
  const status = getFinancialStatus(state);
  if (status.level !== 'DANGER') return false;
  const days = status.situation?.daysUntilRunout;
  return days != null && days <= 7;
}

/**
 * @param {object} [state]
 * @returns {object}
 */
export function getEmergencyRunway(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const situation = computeDailySituation(state);
  const safe = Number(situation.safeToSpend || 0);
  const days = situation.daysUntilRunout ?? situation.daysToPayday ?? null;
  const daily = situation.daysToPayday > 0 ? safe / situation.daysToPayday : safe;

  return {
    safe_to_spend: safe,
    days_until_runout: days,
    safe_per_day: Math.round(daily),
    payday_day: situation.paydayDay,
    actions: [
      'Hentikan pengeluaran discretionary 7 hari',
      'Review tagihan wajib — ada yang bisa ditunda?',
      'Cari income tambah sementara (freelance/gig)',
    ],
  };
}

/**
 * @param {string} category
 * @returns {boolean}
 */
export function isCategoryLockedInEmergency(category) {
  if (!isEmergencyModeActive()) return false;
  const c = String(category || '').toLowerCase();
  return DISCRETIONARY_CATEGORIES.some((d) => c.includes(d.toLowerCase()));
}

/**
 * @param {object} [state]
 * @returns {object}
 */
export function getRecoveryProgress(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const hist = loadEmergencyHistory();
  const lastActivate = hist.find((h) => h.event === 'activated');
  if (!lastActivate) return { active: isEmergencyModeActive(), progress: 0 };

  const status = getFinancialStatus(state);
  let progress = 0;
  if (status.level === 'SAFE') progress = 100;
  else if (status.level === 'WARNING') progress = 60;
  else if (status.level === 'DANGER') progress = 20;

  return {
    active: isEmergencyModeActive(),
    started_at: lastActivate.at,
    progress,
    level: status.level,
  };
}

if (typeof window !== 'undefined') {
  window.monefyiEmergencyMode = {
    isEmergencyModeActive,
    setEmergencyMode,
    shouldAutoTriggerEmergency,
    getEmergencyRunway,
    isCategoryLockedInEmergency,
    getRecoveryProgress,
    DISCRETIONARY_CATEGORIES,
  };
}
