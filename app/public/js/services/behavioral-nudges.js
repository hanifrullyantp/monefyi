/**
 * Subtle behavioral nudges (Growth Fase 3.6).
 * @module services/behavioral-nudges
 */

const LS_DISMISSED = 'monefyi_nudges_dismissed';

/**
 * @param {string} id
 * @returns {boolean}
 */
function isDismissed(id) {
  try {
    const map = JSON.parse(localStorage.getItem(LS_DISMISSED) || '{}');
    const until = Number(map[id] || 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}

/**
 * @param {string} id
 * @param {number} [hours]
 */
export function dismissNudge(id, hours = 24) {
  try {
    const map = JSON.parse(localStorage.getItem(LS_DISMISSED) || '{}');
    map[id] = Date.now() + hours * 3600000;
    localStorage.setItem(LS_DISMISSED, JSON.stringify(map));
  } catch { /* ignore */ }
}

/**
 * @param {number} n
 */
function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(Number(n) || 0)));
}

/**
 * @param {object} [state]
 * @returns {object[]}
 */
export function getActiveNudges(state = typeof window !== 'undefined' ? window.STATE : {}) {
  /** @type {object[]} */
  const nudges = [];
  const now = new Date();
  const day = now.getDate();
  const payday = Number(state.settings?.payday_day || state.db?.profile?.payday_day || 25);

  if (Math.abs(day - payday) <= 2 && !isDismissed('payday-save-first')) {
    const income = Number(state.db?.profile?.monthly_income || state.db?.userPreferences?.monthly_income || 0);
    const suggested = income > 0 ? Math.round(income * 0.1) : 500000;
    nudges.push({
      id: 'payday-save-first',
      icon: '💰',
      title: 'Kamu baru gajian!',
      body: `Pay yourself first — sisihkan Rp ${fmt(suggested)} ke dana darurat sebelum spending.`,
      actions: [
        { label: 'Sisihkan sekarang', target: 'goals' },
        { label: 'Nanti', target: 'dismiss' },
      ],
      priority: 9,
    });
  }

  const goals = state.db?.financialGoals || [];
  const primary = goals.find((g) => g.status === 'active' || !g.status);
  if (primary && !isDismissed('goal-progress-celebrate')) {
    const target = Number(primary.target_amount || 0);
    const current = Number(primary.current_amount || 0);
    const pct = target > 0 ? Math.round((current / target) * 100) : 0;
    if (pct >= 50 && pct < 55) {
      nudges.push({
        id: 'goal-progress-celebrate',
        icon: '🎉',
        title: 'Milestone tercapai!',
        body: `${primary.name || 'Target'} sudah ${pct}%. Satu langkah lebih dekat ke financial freedom.`,
        actions: [{ label: 'Lanjut', target: 'goals' }],
        priority: 7,
      });
    }
  }

  const coaching = (() => {
    try {
      return JSON.parse(localStorage.getItem('monefyi_coaching_enrollment') || 'null');
    } catch {
      return null;
    }
  })();
  if (coaching && !isDismissed('coaching-daily-focus')) {
    nudges.push({
      id: 'coaching-daily-focus',
      icon: '🌅',
      title: 'Focus coaching hari ini',
      body: 'Catat transaksi same-day & review safe-to-spend sebelum belanja discretionary.',
      actions: [
        { label: 'Check-in', target: 'coaching' },
        { label: 'Skip', target: 'dismiss' },
      ],
      priority: 6,
    });
  }

  return nudges.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 2);
}

/**
 * Queue celebration after saving to goal (call from goals service).
 * @param {object} payload
 */
export function queueSaveCelebration(payload = {}) {
  try {
    sessionStorage.setItem('monefyi_pending_celebration', JSON.stringify({
      ...payload,
      at: Date.now(),
    }));
  } catch { /* ignore */ }
}

/**
 * @returns {object|null}
 */
export function consumeSaveCelebration() {
  try {
    const raw = sessionStorage.getItem('monefyi_pending_celebration');
    if (!raw) return null;
    sessionStorage.removeItem('monefyi_pending_celebration');
    const data = JSON.parse(raw);
    if (Date.now() - data.at > 60000) return null;
    return {
      id: 'save-celebration',
      icon: '🎉',
      title: 'Great!',
      body: `Rp ${fmt(data.amount || 0)} baru masuk ${data.goalName || 'target'}. Progress naik ${data.progressDelta || ''}%`,
      actions: [{ label: 'Continue', target: 'dismiss' }],
      priority: 10,
    };
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.monefyiBehavioralNudges = {
    getActiveNudges, dismissNudge, queueSaveCelebration, consumeSaveCelebration,
  };
}
