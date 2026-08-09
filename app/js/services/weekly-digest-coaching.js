/**
 * Personalized coaching tone for weekly digest (Growth Sprint 7).
 * @module services/weekly-digest-coaching
 */

/**
 * @param {object} [state]
 * @returns {'beginner'|'intermediate'|'advanced'}
 */
export function getCoachingLevel(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const txs = state.transactions || [];
  let firstOpenAt = null;
  try {
    if (typeof localStorage !== 'undefined') {
      firstOpenAt = localStorage.getItem('monefyi_first_open_at');
    }
  } catch { /* ignore */ }
  const created = state.db?.user?.created_at
    || state.db?.profile?.created_at
    || firstOpenAt;

  let monthsActive = 0;
  if (created) {
    monthsActive = (Date.now() - new Date(created).getTime()) / (30 * 86400000);
  } else if (txs.length) {
    const dates = txs.map((t) => String(t.date || '').slice(0, 10)).filter(Boolean).sort();
    if (dates.length) {
      monthsActive = (Date.now() - new Date(dates[0]).getTime()) / (30 * 86400000);
    }
  }

  if (monthsActive < 1 || txs.length < 25) return 'beginner';
  if (monthsActive < 3 || txs.length < 120) return 'intermediate';
  return 'advanced';
}

/** @type {Record<string, object>} */
const TONE = {
  beginner: {
    greeting: 'Minggu ini kamu sudah mulai membangun kebiasaan — keep going!',
    focusPrefix: 'Next step:',
    recStyle: 'encouraging',
  },
  intermediate: {
    greeting: 'Pattern kamu mulai terlihat — saatnya optimize.',
    focusPrefix: 'Optimize:',
    recStyle: 'empowering',
  },
  advanced: {
    greeting: 'Data menunjukkan tren jelas — strategi advanced siap dieksekusi.',
    focusPrefix: 'Strategi:',
    recStyle: 'peer',
  },
};

/**
 * @param {object} digest
 * @param {object} [state]
 * @returns {object}
 */
export function applyCoachingTone(digest, state = typeof window !== 'undefined' ? window.STATE : {}) {
  const level = getCoachingLevel(state);
  const tone = TONE[level] || TONE.beginner;

  const recommendations = [...(digest.recommendations || [])];
  if (digest.focus && !recommendations.includes(digest.focus)) {
    recommendations.unshift(`${tone.focusPrefix} ${digest.focus}`);
  }

  return {
    ...digest,
    coaching_level: level,
    coaching_greeting: tone.greeting,
    recommendations: recommendations.slice(0, 4),
  };
}

if (typeof window !== 'undefined') {
  window.monefyiDigestCoaching = { getCoachingLevel, applyCoachingTone };
}
