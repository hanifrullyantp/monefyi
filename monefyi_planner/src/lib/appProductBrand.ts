import type { EntitlementSnapshot } from '../types/entitlement';

/**
 * Logo Estimator (E hijau) hanya untuk paket Estimator / trial gratis.
 * Pengguna Planner Pro / Enterprise selalu chrome Planner — termasuk di /app/estimator.
 */
export function shouldShowEstimatorProductBrand(
  snapshot: Pick<
    EntitlementSnapshot,
    'isPro' | 'isEnterprise' | 'isEstimator' | 'isFree'
  >,
): boolean {
  if (snapshot.isPro || snapshot.isEnterprise) return false;
  if (snapshot.isEstimator) return true;
  if (snapshot.isFree) return true;
  return false;
}
