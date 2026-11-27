import { isSuperAdminHanif } from './estimatorLaunchPromo';

export const RAB_ROUTE = '/app/rab';

/** Feature flag RAB. Default OFF pada produksi. */
export function isRabEnabled(): boolean {
  const env = import.meta.env as Record<string, string | undefined>;
  const raw = env.VITE_RAB_ENABLED ?? env.NEXT_PUBLIC_RAB_ENABLED;
  if (raw === undefined || raw === null) return false;
  return String(raw).trim().toLowerCase() === 'true';
}

/** Hanya super admin terverifikasi (hanif.rullyant@gmail.com) yang boleh mengakses RAB. */
export function isRabSuperAdmin(email?: string | null, emailVerified?: boolean): boolean {
  if (!emailVerified) return false;
  return isSuperAdminHanif(email);
}
