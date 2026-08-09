/**
 * Community motivation — stories & challenges (Growth Fase 4.3).
 * @module services/community-features
 */

const LS_CHALLENGES = 'monefyi_community_challenges';

/** @type {object[]} */
export const SUCCESS_STORIES = [
  {
    id: 'story_debt_30jt',
    title: 'Lunas Utang Rp 30jt dalam 18 Bulan',
    excerpt: 'Cut lifestyle inflation + side income Rp 2jt/bulan + snowball method.',
    likes: 1234,
    comments: 89,
    age_band: '28-30',
    region: 'Jakarta',
  },
  {
    id: 'story_emergency_6mo',
    title: 'Dana Darurat 6 Bulan dari Nol',
    excerpt: 'Auto-transfer 15% gaji + review subscription bulanan.',
    likes: 876,
    comments: 54,
    age_band: '25-27',
    region: 'Bandung',
  },
  {
    id: 'story_first_invest',
    title: 'Investasi Pertama Rp 500rb/bulan',
    excerpt: 'Mulai RDPU, naik ke campuran setelah emergency fund penuh.',
    likes: 654,
    comments: 41,
    age_band: '30-35',
    region: 'Surabaya',
  },
];

/** @type {object[]} */
export const MONTHLY_CHALLENGES = [
  {
    id: 'zero_impulse',
    title: 'Zero Impulse Purchase',
    description: 'Tidak ada belanja > Rp 200rb tanpa cooling 24 jam.',
    participants: 3456,
    duration_days: 30,
  },
  {
    id: 'track_daily',
    title: 'Catat Setiap Hari',
    description: 'Minimal 1 transaksi tercatat per hari selama 14 hari.',
    participants: 2100,
    duration_days: 14,
  },
  {
    id: 'no_delivery',
    title: 'No Delivery Week',
    description: 'Cook at home — skip GoFood/GrabFood 7 hari.',
    participants: 1890,
    duration_days: 7,
  },
];

/**
 * @returns {object[]}
 */
export function loadJoinedChallenges() {
  try {
    return JSON.parse(localStorage.getItem(LS_CHALLENGES) || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {string} challengeId
 * @returns {object}
 */
export function joinChallenge(challengeId) {
  const tpl = MONTHLY_CHALLENGES.find((c) => c.id === challengeId);
  if (!tpl) throw new Error('Challenge tidak ditemukan');

  const joined = loadJoinedChallenges().filter((c) => c.id !== challengeId);
  const entry = {
    id: challengeId,
    title: tpl.title,
    joined_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + tpl.duration_days * 86400000).toISOString(),
    streak_days: 0,
    success_rate: 100,
  };
  joined.unshift(entry);
  localStorage.setItem(LS_CHALLENGES, JSON.stringify(joined.slice(0, 5)));
  return entry;
}

/**
 * @param {string} challengeId
 */
export function recordChallengeDay(challengeId) {
  const list = loadJoinedChallenges();
  const idx = list.findIndex((c) => c.id === challengeId);
  if (idx < 0) return null;
  list[idx].streak_days = (list[idx].streak_days || 0) + 1;
  list[idx].last_checkin = new Date().toISOString();
  localStorage.setItem(LS_CHALLENGES, JSON.stringify(list));
  return list[idx];
}

/**
 * @returns {object[]}
 */
export function getActiveChallenges() {
  const now = Date.now();
  return loadJoinedChallenges().filter((c) => new Date(c.ends_at).getTime() > now);
}

if (typeof window !== 'undefined') {
  window.monefyiCommunity = {
    SUCCESS_STORIES, MONTHLY_CHALLENGES, joinChallenge, recordChallengeDay, getActiveChallenges,
  };
}
