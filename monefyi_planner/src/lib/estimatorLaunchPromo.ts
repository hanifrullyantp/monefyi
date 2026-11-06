import {
  ESTIMATOR_LAUNCH_PROMO_ORG_LIMIT,
  ESTIMATOR_LAUNCH_PROMO_PRICE_IDR,
  ESTIMATOR_LIST_PRICE_IDR,
} from './entitlement';

export type EstimatorLaunchPromoStatus = {
  used: number;
  limit: number;
  remaining: number;
  promoActive: boolean;
  promoPrice: number;
  listPrice: number;
};

export const SUPER_ADMIN_LAUNCH_ALERT_EMAIL = 'hanif.rullyant@gmail.com';

/**
 * Memeriksa apakah pengguna saat ini adalah Super Admin Hanif.
 * Fitur tertentu seperti 3D Intero Instant Generation dibatasi hanya untuk Super Admin Hanif.
 */
export function isSuperAdminHanif(email?: string | null, platformRole?: string | null): boolean {
  const normEmail = String(email || '').trim().toLowerCase();
  const normRole = String(platformRole || '').trim().toLowerCase();

  if (normEmail === SUPER_ADMIN_LAUNCH_ALERT_EMAIL) return true;
  if (normEmail.includes('hanif') && (normRole === 'super_admin' || normRole === 'platform_admin' || normRole === 'admin')) {
    return true;
  }
  return false;
}

/** Tampilkan popup admin saat sisa slot promo ≤ ambang ini. */
export const LAUNCH_PROMO_ADMIN_WARN_REMAINING = 15;

export function normalizeLaunchPromoStatus(raw: unknown): EstimatorLaunchPromoStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const used = Number(o.used);
  const limit = Number(o.limit) || ESTIMATOR_LAUNCH_PROMO_ORG_LIMIT;
  const promoPrice = Number(o.promoPrice) || ESTIMATOR_LAUNCH_PROMO_PRICE_IDR;
  const listPrice = Number(o.listPrice) || ESTIMATOR_LIST_PRICE_IDR;
  if (!Number.isFinite(used)) return null;
  const remaining = Math.max(0, limit - used);
  const promoActive = o.promoActive === true || (o.promoActive !== false && used < limit);
  return { used, limit, remaining, promoActive, promoPrice, listPrice };
}

export function resolveEstimatorStandardCheckoutAmount(
  status: EstimatorLaunchPromoStatus | null,
): number {
  if (!status) return ESTIMATOR_LAUNCH_PROMO_PRICE_IDR;
  return status.promoActive ? status.promoPrice : status.listPrice;
}

export function launchPromoAdminSeverity(
  status: EstimatorLaunchPromoStatus,
): 'info' | 'warn' | 'critical' | null {
  if (status.remaining > LAUNCH_PROMO_ADMIN_WARN_REMAINING) return null;
  if (status.remaining <= 5) return 'critical';
  if (status.remaining <= 10) return 'warn';
  return 'info';
}
