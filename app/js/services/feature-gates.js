/**
 * Pro feature gates — combines plan entitlements + feature flags.
 * @module services/feature-gates
 */

/**
 * @param {string} flagKey
 * @param {string|null} [userId]
 * @returns {Promise<boolean>}
 */
export async function isGatedFeatureEnabled(flagKey, userId = null) {
  try {
    const { isFeatureEnabled } = await import('./feature-flag-store.js');
    return isFeatureEnabled(flagKey, userId);
  } catch {
    return true;
  }
}

/**
 * @param {string} flagKey
 * @param {object} [opts]
 * @returns {Promise<boolean>}
 */
export async function requireFeature(flagKey, opts = {}) {
  const ok = await isGatedFeatureEnabled(flagKey, opts.userId);
  if (ok) return true;
  if (opts.showUpgrade !== false) {
    window.openUpgradeSheet?.({ featureKey: flagKey })
      || window.showToast?.('Fitur belum tersedia', 'warn');
  }
  return false;
}
