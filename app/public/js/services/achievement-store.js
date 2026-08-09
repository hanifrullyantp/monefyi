/**
 * Sync achievement catalog unlocks to Supabase (Growth Sprint 14 polish).
 * @module services/achievement-store
 */

import { ACHIEVEMENT_BADGES, computeAchievementProgress } from './achievement-catalog.js';

function supa() {
  return typeof window !== 'undefined' ? window.STATE?.db?.supa : null;
}

function userId() {
  return typeof window !== 'undefined' ? window.STATE?.db?.user?.id : null;
}

/**
 * Upsert newly unlocked catalog badges (non-blocking).
 * @param {object} [state]
 * @returns {Promise<object[]>}
 */
export async function syncCatalogAchievements(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const uid = userId();
  const client = supa();
  let earned = [];

  try {
    const { loadAchievements } = await import('./mini-win-engine.js');
    earned = await loadAchievements();
  } catch {
    earned = state.db?.achievements || [];
  }

  const progress = computeAchievementProgress(state, earned);
  const unlocked = progress.badges.filter((b) => b.unlocked);
  if (!uid || !client || navigator.onLine === false) return unlocked;

  const toSync = unlocked.filter((b) => !earned.some((e) => e.achievement_type === b.id));
  if (!toSync.length) return unlocked;

  try {
    await client.from('user_achievements').upsert(
      toSync.map((b) => ({
        user_id: uid,
        achievement_type: b.id,
        title: b.title,
        message: b.desc,
        metadata: { xp: b.xp, source: 'catalog' },
        xp: b.xp,
        shown_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id,achievement_type' },
    );
  } catch (e) {
    console.warn('[achievement-store] sync', e);
  }

  return unlocked;
}

/**
 * @param {object} [state]
 * @returns {object|null}
 */
export function getNextAchievementHint(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const earned = state.db?.achievements || [];
  const progress = computeAchievementProgress(state, earned);
  const next = progress.badges.find((b) => !b.unlocked);
  if (!next) return null;
  return {
    badge: next,
    unlockedCount: progress.unlockedCount,
    total: progress.total,
    level: progress.level,
    levelLabel: progress.levelLabel,
  };
}

if (typeof window !== 'undefined') {
  window.monefyiAchievementStore = { syncCatalogAchievements, getNextAchievementHint };
}
