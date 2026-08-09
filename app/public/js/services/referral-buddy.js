/**
 * Referral & buddy accountability (Growth Fase 4.4).
 * @module services/referral-buddy
 */

const LS_REFERRAL = 'monefyi_referral_profile';
const LS_BUDDY = 'monefyi_buddy_match';
const LS_CREDITS = 'monefyi_referral_credits';

/**
 * @returns {object}
 */
export function loadReferralProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_REFERRAL) || 'null');
    if (saved?.code) return saved;
  } catch { /* ignore */ }

  const user = window.STATE?.db?.user;
  const base = String(user?.email || user?.id || 'monefyi')
    .split('@')[0]
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 8)
    .toUpperCase() || 'MONEFYI';

  const profile = {
    code: base,
    link: `https://monefyi.com/r/${base}`,
    created_at: new Date().toISOString(),
  };
  localStorage.setItem(LS_REFERRAL, JSON.stringify(profile));
  return profile;
}

/**
 * @returns {number}
 */
export function getReferralCredits() {
  try {
    return Number(JSON.parse(localStorage.getItem(LS_CREDITS) || '0')) || 0;
  } catch {
    return 0;
  }
}

/**
 * @param {number} amount
 * @param {string} [reason]
 */
export function addReferralCredit(amount, reason = 'referral') {
  const next = getReferralCredits() + Math.abs(Number(amount) || 0);
  localStorage.setItem(LS_CREDITS, JSON.stringify(next));
  return { credits: next, reason };
}

/**
 * @returns {object[]}
 */
export function loadReferralHistory() {
  try {
    return JSON.parse(localStorage.getItem('monefyi_referral_history') || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {object} entry
 */
export function appendReferralHistory(entry) {
  const hist = loadReferralHistory();
  hist.unshift({
    ...entry,
    at: new Date().toISOString(),
  });
  localStorage.setItem('monefyi_referral_history', JSON.stringify(hist.slice(0, 20)));
}

/** @type {object[]} */
const BUDDY_POOL = [
  { id: 'buddy_5891', label: 'User#5891', goal: 'emergency_fund', on_track: 82 },
  { id: 'buddy_4521', label: 'User#4521', goal: 'debt_recovery', on_track: 91 },
  { id: 'buddy_8834', label: 'User#8834', goal: 'mindful_spending', on_track: 76 },
];

/**
 * @param {object} [state]
 * @returns {object}
 */
export function matchBuddy(state = typeof window !== 'undefined' ? window.STATE : {}) {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_BUDDY) || 'null');
    if (saved?.id) return saved;
  } catch { /* ignore */ }

  const enrollment = JSON.parse(localStorage.getItem('monefyi_coaching_enrollment') || 'null');
  const goal = enrollment?.plan_id || 'emergency_fund';
  const match = BUDDY_POOL.find((b) => b.goal === goal) || BUDDY_POOL[0];

  const buddy = {
    ...match,
    matched_at: new Date().toISOString(),
    weekly_message: 'Semangat! Progress kita on-track minggu ini 💪',
  };
  localStorage.setItem(LS_BUDDY, JSON.stringify(buddy));
  return buddy;
}

/**
 * Send encouragement to buddy (local simulation).
 * @param {string} message
 */
export function sendBuddyEncouragement(message) {
  const buddy = matchBuddy();
  buddy.last_message = String(message || 'Keep going!').slice(0, 120);
  buddy.sent_at = new Date().toISOString();
  localStorage.setItem(LS_BUDDY, JSON.stringify(buddy));
  return buddy;
}

if (typeof window !== 'undefined') {
  window.monefyiReferralBuddy = {
    loadReferralProfile,
    getReferralCredits,
    addReferralCredit,
    loadReferralHistory,
    matchBuddy,
    sendBuddyEncouragement,
  };
}
