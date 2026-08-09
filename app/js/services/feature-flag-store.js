/**
 * Feature flags — Supabase-backed with rollout % and per-user overrides.
 * @module services/feature-flag-store
 */

const LS_CACHE = 'monefyi_feature_flags_v2';
const LS_OVERRIDES = 'monefyi_feature_flag_overrides';

/** @type {Record<string, { enabled: boolean, rollout_pct: number, status: string }>} */
const DEFAULT_FLAGS = {
  household_mode: { enabled: true, rollout_pct: 100, status: 'active' },
  weekly_ai_digest: { enabled: true, rollout_pct: 100, status: 'active' },
  debt_payoff_planner: { enabled: true, rollout_pct: 100, status: 'active' },
  multiple_goals: { enabled: true, rollout_pct: 100, status: 'active' },
  in_app_marketing: { enabled: true, rollout_pct: 100, status: 'active' },
  monthly_auto_report: { enabled: true, rollout_pct: 100, status: 'active' },
  new_parser_pipeline: { enabled: true, rollout_pct: 100, status: 'active' },
  beta_feedback: { enabled: false, rollout_pct: 0, status: 'testing' },
  ai_coach_pro: { enabled: true, rollout_pct: 100, status: 'beta' },
  neraca_advanced: { enabled: true, rollout_pct: 100, status: 'active' },
};

function supa() {
  return window.STATE?.db?.supa || window.__monefyiSupabase || null;
}

/**
 * @param {string} userId
 * @param {string} flagKey
 * @returns {number}
 */
export function getRolloutBucket(userId, flagKey) {
  const str = `${userId || 'anon'}:${flagKey}`;
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * @returns {Record<string, object>}
 */
function getFlagMap() {
  if (window.STATE?.featureFlags) return window.STATE.featureFlags;
  try {
    return JSON.parse(localStorage.getItem(LS_CACHE) || '{}');
  } catch {
    return {};
  }
}

/**
 * @returns {Record<string, Record<string, boolean>>}
 */
function getOverrideMap() {
  if (window.STATE?.featureFlagOverrides) return window.STATE.featureFlagOverrides;
  try {
    return JSON.parse(localStorage.getItem(LS_OVERRIDES) || '{}');
  } catch {
    return {};
  }
}

/**
 * @param {string} flagKey
 * @param {string|null} userId
 * @returns {boolean}
 */
export function isFeatureEnabled(flagKey, userId = null) {
  const uid = userId || window.STATE?.db?.user?.id || null;
  const overrides = getOverrideMap();
  if (uid && overrides[uid]?.[flagKey] != null) {
    return !!overrides[uid][flagKey];
  }

  const flags = getFlagMap();
  const flag = flags[flagKey] || DEFAULT_FLAGS[flagKey];
  if (!flag) return false;
  if (flag.status === 'off' || flag.enabled === false) return false;
  if (flag.rollout_pct >= 100) return true;
  if (flag.rollout_pct <= 0) return false;
  if (!uid) return flag.rollout_pct >= 50;
  return getRolloutBucket(uid, flagKey) < flag.rollout_pct;
}

/**
 * @returns {Promise<Record<string, object>>}
 */
export async function syncFeatureFlagsFromRemote() {
  const client = supa();
  if (!client) return getFlagMap();

  try {
    const [{ data: flags }, { data: overrides }] = await Promise.all([
      client.from('feature_flags').select('*'),
      client.from('feature_flag_overrides').select('*'),
    ]);

    if (flags?.length) {
      /** @type {Record<string, object>} */
      const map = {};
      for (const f of flags) {
        map[f.key] = {
          enabled: f.enabled,
          rollout_pct: f.rollout_pct,
          status: f.status,
          name: f.name,
          description: f.description,
        };
      }
      window.STATE = window.STATE || {};
      window.STATE.featureFlags = map;
      localStorage.setItem(LS_CACHE, JSON.stringify(map));
    }

    if (overrides?.length) {
      /** @type {Record<string, Record<string, boolean>>} */
      const oMap = {};
      for (const o of overrides) {
        if (!oMap[o.user_id]) oMap[o.user_id] = {};
        oMap[o.user_id][o.flag_key] = o.enabled;
      }
      window.STATE.featureFlagOverrides = oMap;
      localStorage.setItem(LS_OVERRIDES, JSON.stringify(oMap));
    }

    return getFlagMap();
  } catch (e) {
    console.warn('[feature-flag-store] sync', e);
    return getFlagMap();
  }
}

/**
 * @param {string} flagKey
 * @param {object} patch
 * @returns {Promise<void>}
 */
export async function saveFeatureFlag(flagKey, patch) {
  const client = supa();
  if (client) {
    await client.from('feature_flags').upsert({
      key: flagKey,
      name: patch.name || flagKey,
      description: patch.description || null,
      enabled: patch.enabled !== false,
      rollout_pct: Number(patch.rollout_pct ?? 100),
      status: patch.status || 'active',
      updated_at: new Date().toISOString(),
    });
  }
  await syncFeatureFlagsFromRemote();
}

/**
 * @param {string} userId
 * @param {string} flagKey
 * @param {boolean} enabled
 * @returns {Promise<void>}
 */
export async function setUserFlagOverride(userId, flagKey, enabled) {
  const client = supa();
  if (client && userId) {
    await client.from('feature_flag_overrides').upsert({
      user_id: userId,
      flag_key: flagKey,
      enabled,
      updated_at: new Date().toISOString(),
    });
  }
  await syncFeatureFlagsFromRemote();
}

if (typeof window !== 'undefined') {
  window.monefyiFeatureFlagStore = {
    isFeatureEnabled,
    syncFeatureFlagsFromRemote,
    saveFeatureFlag,
    setUserFlagOverride,
    getRolloutBucket,
  };
}
