/**
 * Referral & buddy accountability (Growth Fase 4.4).
 * @module services/referral-buddy
 */

const LS_REFERRAL = 'monefyi_referral_profile';
const LS_BUDDY = 'monefyi_buddy_match';
const LS_CREDITS = 'monefyi_referral_credits';
const LS_BUDDY_MSG = 'monefyi_buddy_messages';
const LS_BUDDY_PAIR = 'monefyi_buddy_pair_id';

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

  if (typeof window !== 'undefined') {
    import('./community-store.js').then(({ syncReferralProfile }) => {
      syncReferralProfile(profile).catch(() => {});
    }).catch(() => {});
  }

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

function resolveBuddyGoal(state = typeof window !== 'undefined' ? window.STATE : {}) {
  try {
    const enrollment = JSON.parse(localStorage.getItem('monefyi_coaching_enrollment') || 'null');
    if (enrollment?.plan_id) return enrollment.plan_id;
  } catch { /* ignore */ }
  return 'emergency_fund';
}

function pickLocalBuddy(goal) {
  return BUDDY_POOL.find((b) => b.goal === goal) || BUDDY_POOL[0];
}

function persistBuddy(buddy) {
  localStorage.setItem(LS_BUDDY, JSON.stringify(buddy));
  if (typeof window !== 'undefined') {
    import('./community-store.js').then(async ({ syncBuddyPair }) => {
      const pairId = await syncBuddyPair(buddy);
      if (pairId) localStorage.setItem(LS_BUDDY_PAIR, pairId);
    }).catch(() => {});
  }
  return buddy;
}

/**
 * Try matching another active user with similar goal via Supabase.
 * @param {string} goal
 * @returns {Promise<object|null>}
 */
export async function findRemoteBuddy(goal) {
  const uid = typeof window !== 'undefined' ? window.STATE?.db?.user?.id : null;
  const client = typeof window !== 'undefined' ? window.STATE?.db?.supa : null;
  if (!uid || !client || navigator.onLine === false) return null;

  try {
    const { data } = await client
      .from('buddy_pairs')
      .select('user_id, goal, on_track_pct')
      .eq('goal', goal)
      .eq('active', true)
      .neq('user_id', uid)
      .limit(8);
    if (!Array.isArray(data) || !data.length) return null;

    const pick = data[Math.floor(Math.random() * data.length)];
    return {
      id: `buddy_${String(pick.user_id).slice(0, 8)}`,
      buddy_user_id: pick.user_id,
      label: `User#${String(pick.user_id).slice(0, 4).toUpperCase()}`,
      goal: pick.goal,
      on_track: pick.on_track_pct || 75,
      matched_at: new Date().toISOString(),
      remote: true,
      weekly_message: 'Semangat! Progress kita on-track minggu ini 💪',
    };
  } catch (e) {
    console.warn('[referral-buddy] remote match', e);
    return null;
  }
}

/**
 * @param {object} [state]
 * @returns {Promise<object>}
 */
export async function matchBuddyAsync(state = typeof window !== 'undefined' ? window.STATE : {}) {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_BUDDY) || 'null');
    if (saved?.id) return saved;
  } catch { /* ignore */ }

  const goal = resolveBuddyGoal(state);
  const remote = await findRemoteBuddy(goal);
  const match = remote || {
    ...pickLocalBuddy(goal),
    matched_at: new Date().toISOString(),
    weekly_message: 'Semangat! Progress kita on-track minggu ini 💪',
  };
  return persistBuddy(match);
}

/**
 * @param {object} [state]
 * @returns {object}
 */
export function matchBuddy(state = typeof window !== 'undefined' ? window.STATE : {}) {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_BUDDY) || 'null');
    if (saved?.id) return saved;
  } catch { /* ignore */ }

  const goal = resolveBuddyGoal(state);
  const match = {
    ...pickLocalBuddy(goal),
    matched_at: new Date().toISOString(),
    weekly_message: 'Semangat! Progress kita on-track minggu ini 💪',
  };
  return persistBuddy(match);
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
  return sendBuddyMessage(message);
}

/**
 * @returns {object[]}
 */
export function loadBuddyMessages() {
  try {
    return JSON.parse(localStorage.getItem(LS_BUDDY_MSG) || '[]');
  } catch {
    return [];
  }
}

/**
 * @returns {Promise<object[]>}
 */
export async function loadBuddyMessagesAsync() {
  const local = loadBuddyMessages();
  const pairId = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_BUDDY_PAIR) : null;
  if (!pairId || typeof window === 'undefined') return local;

  try {
    const { loadBuddyThreadMessages } = await import('./community-store.js');
    const remote = await loadBuddyThreadMessages(pairId);
    if (remote.length) {
      localStorage.setItem(LS_BUDDY_MSG, JSON.stringify(remote));
      return remote;
    }
  } catch (e) {
    console.warn('[referral-buddy] load messages', e);
  }
  return local;
}

/**
 * @param {string} message
 * @returns {Promise<object>}
 */
export async function sendBuddyMessageAsync(message) {
  const text = String(message || 'Semangat! 💪').trim().slice(0, 240);
  const buddy = matchBuddy();
  const entry = {
    id: `msg_${Date.now()}`,
    body: text,
    from: 'me',
    sent_at: new Date().toISOString(),
  };

  const pairId = localStorage.getItem(LS_BUDDY_PAIR);
  if (pairId && typeof window !== 'undefined') {
    const { syncBuddyMessage } = await import('./community-store.js');
    const saved = await syncBuddyMessage(pairId, text);
    if (saved?.id) entry.id = saved.id;
    if (buddy.remote) {
      const thread = [...loadBuddyMessages(), entry].slice(-40);
      localStorage.setItem(LS_BUDDY_MSG, JSON.stringify(thread));
      return entry;
    }
  }

  return sendBuddyMessage(message);
}

/**
 * @param {string} message
 * @returns {object}
 */
export function sendBuddyMessage(message) {
  const text = String(message || 'Semangat! 💪').trim().slice(0, 240);
  const entry = {
    id: `msg_${Date.now()}`,
    body: text,
    from: 'me',
    sent_at: new Date().toISOString(),
  };
  const buddyReply = {
    id: `msg_${Date.now() + 1}`,
    body: 'Mantap! Aku juga on-track minggu ini 🔥',
    from: 'buddy',
    sent_at: new Date(Date.now() + 500).toISOString(),
  };
  const thread = [...loadBuddyMessages(), entry, buddyReply].slice(-40);
  localStorage.setItem(LS_BUDDY_MSG, JSON.stringify(thread));

  const pairId = localStorage.getItem(LS_BUDDY_PAIR);
  if (pairId && typeof window !== 'undefined') {
    import('./community-store.js').then(({ syncBuddyMessage }) => {
      syncBuddyMessage(pairId, text).catch(() => {});
    }).catch(() => {});
  }

  return entry;
}

/**
 * @returns {object}
 */
export function getBuddyWeeklyStatus() {
  const buddy = matchBuddy();
  const day = new Date().getDate();
  const myTrack = 65 + (day % 25);
  return {
    buddy,
    my_on_track: myTrack,
    buddy_on_track: buddy.on_track || 80,
    both_strong: myTrack >= 70 && (buddy.on_track || 0) >= 70,
  };
}

if (typeof window !== 'undefined') {
  window.monefyiReferralBuddy = {
    loadReferralProfile,
    getReferralCredits,
    addReferralCredit,
    loadReferralHistory,
    matchBuddy,
    matchBuddyAsync,
    findRemoteBuddy,
    sendBuddyEncouragement,
    loadBuddyMessages,
    loadBuddyMessagesAsync,
    sendBuddyMessage,
    sendBuddyMessageAsync,
    getBuddyWeeklyStatus,
  };
}
