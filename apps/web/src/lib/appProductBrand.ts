import type { EntitlementSnapshot } from '../types/entitlement';

/**
 * Logo Estimator hanya untuk lisensi Estimator (bukan Free Plan, Pro, atau Enterprise).
 * Pengguna Free Plan, Pro, maupun Enterprise memakai chrome Froyek.
 */
export function shouldShowEstimatorProductBrand(
  snapshot: Pick<
    EntitlementSnapshot,
    'isPro' | 'isEnterprise' | 'isEstimator' | 'isFree'
  >,
): boolean {
  return Boolean(snapshot.isEstimator && !snapshot.isPro && !snapshot.isEnterprise);
}

/**
 * Cek apakah user/org memiliki akses modul Estimator berlisensi
 * (paket Estimator, Pro, Enterprise, atau Super Admin akses penuh).
 * User Free Plan tidak melihat menu/chrome "Estimator" (Keputusan Produk #2).
 */
export function hasEstimatorLicenseAccess(
  snapshot: Pick<EntitlementSnapshot, 'isEstimator' | 'isPro' | 'isEnterprise'>,
  adminFullAccess = false,
): boolean {
  return adminFullAccess || Boolean(snapshot.isEstimator || snapshot.isPro || snapshot.isEnterprise);
}
