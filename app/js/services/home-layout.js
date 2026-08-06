/**
 * Beranda layout v2 flags (TASK 1.3).
 * @module services/home-layout
 */

/** Enable command-center home layout (Phase 1). */
export const HOME_LAYOUT_V2 = true;

/** Compact quick access: Catat, Budget, Target, Advisor */
export const COMPACT_QUICK_ACTIONS = [
  { id: 'add-transaction', label: 'Catat', icon: 'plus', color: '#10b981', bg: 'rgba(16,185,129,0.14)' },
  { id: 'budgeting', label: 'Budget', icon: 'budget', color: '#10b981', bg: 'rgba(16,185,129,0.14)' },
  { id: 'target', label: 'Target', icon: 'target', color: '#0ea5e9', bg: 'rgba(14,165,233,0.14)' },
  { id: 'analisa', label: 'Advisor', icon: 'chartBar', color: '#8b5cf6', bg: 'rgba(139,92,246,0.14)' },
];

/**
 * @param {object} [settings]
 * @returns {boolean}
 */
export function useHomeLayoutV2(settings) {
  if (settings?.homeLayoutV2 === false) return false;
  return HOME_LAYOUT_V2;
}
