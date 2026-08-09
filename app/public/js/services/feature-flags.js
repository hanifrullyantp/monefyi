/**
 * @file js/services/feature-flags.js
 * @description Feature flags service for Monefyi.
 *
 * Reads from Supabase cache (feature-flag-store) when available,
 * otherwise localStorage overrides for legacy flags.
 */

import { isFeatureEnabled as storeIsEnabled } from './feature-flag-store.js';

/** Default flag values when no localStorage override exists. */
const DEFAULT_FLAGS = {
  new_parser_pipeline: true,
};

/** @type {Storage | { getItem: Function, setItem: Function } | null} */
let _storage = (typeof localStorage !== 'undefined') ? localStorage : null;

/**
 * Overrides the storage backend.
 * Use in tests or SSR environments where localStorage is unavailable.
 * @param {{ getItem: Function, setItem: Function } | null} adapter
 */
export function _setStorage(adapter) {
  _storage = adapter;
}

/**
 * Returns whether a feature flag is enabled for the given user.
 * Checks per-user key first, then global key, then DEFAULT_FLAGS.
 *
 * @param {string} flagName - flag identifier (e.g. 'new_parser_pipeline')
 * @param {string|null} [userId] - optional user ID for per-user overrides
 * @returns {boolean}
 *
 * @example
 * isEnabled('new_parser_pipeline')           // default true
 * isEnabled('new_parser_pipeline', 'user-1') // per-user override
 */
export function isEnabled(flagName, userId = null) {
  const uid = userId || (typeof window !== 'undefined' ? window.STATE?.db?.user?.id : null);
  const hasRemote = typeof window !== 'undefined' && (
    window.STATE?.featureFlags?.[flagName] != null
    || localStorage.getItem('monefyi_feature_flags_v2')
  );
  if (hasRemote) {
    try {
      return storeIsEnabled(flagName, uid);
    } catch { /* fall through */ }
  }
  if (!_storage) return DEFAULT_FLAGS[flagName] ?? false;
  try {
    if (userId) {
      const userKey = `feature_${flagName}_${userId}`;
      const userVal = _storage.getItem(userKey);
      if (userVal !== null) return userVal === 'true';
    }
    const globalKey = `feature_${flagName}`;
    const globalVal = _storage.getItem(globalKey);
    if (globalVal === 'true') return true;
    if (globalVal === 'false') return false;
    return DEFAULT_FLAGS[flagName] ?? false;
  } catch {
    return DEFAULT_FLAGS[flagName] ?? false;
  }
}

/**
 * Enables a feature flag globally, or for a specific user if userId is given.
 * @param {string} flagName
 * @param {string|null} [userId]
 */
export function enable(flagName, userId = null) {
  if (!_storage) return;
  try {
    const key = userId ? `feature_${flagName}_${userId}` : `feature_${flagName}`;
    _storage.setItem(key, 'true');
  } catch {}
}

/**
 * Disables a feature flag globally, or for a specific user if userId is given.
 * @param {string} flagName
 * @param {string|null} [userId]
 */
export function disable(flagName, userId = null) {
  if (!_storage) return;
  try {
    const key = userId ? `feature_${flagName}_${userId}` : `feature_${flagName}`;
    _storage.setItem(key, 'false');
  } catch {}
}

/**
 * Returns all flag values for debugging / admin UI.
 * Scans localStorage for keys matching 'feature_*'.
 * @returns {Record<string, boolean>}
 */
export function listAll() {
  /** @type {Record<string, boolean>} */
  const result = {};
  if (!_storage) return result;
  try {
    const len = _storage.length ?? 0;
    for (let i = 0; i < len; i++) {
      const key = _storage.key?.(i) ?? null;
      if (key && key.startsWith('feature_')) {
        result[key] = _storage.getItem(key) === 'true';
      }
    }
  } catch {}
  return result;
}
