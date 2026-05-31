import type { UserRole } from '../store/appStore';
import { isPlatformAdmin } from '../services/adminService';

export type UiViewMode = 'auto' | 'owner' | 'worker';

export function isSuperAdminUser(platformRole: string, email?: string) {
  return isPlatformAdmin(platformRole, email);
}

/** Role used for layout / AppShell (super admin can preview worker vs owner). */
export function effectiveUiRole(
  orgRole: UserRole | undefined,
  platformRole: string,
  email: string | undefined,
  uiViewMode: UiViewMode,
): UserRole {
  if (!isSuperAdminUser(platformRole, email)) {
    return orgRole || 'worker';
  }
  if (uiViewMode === 'worker') return 'worker';
  if (uiViewMode === 'owner') return 'owner';
  return orgRole || 'owner';
}

export function showWorkerShell(
  orgRole: UserRole | undefined,
  platformRole: string,
  email: string | undefined,
  uiViewMode: UiViewMode,
) {
  const r = effectiveUiRole(orgRole, platformRole, email, uiViewMode);
  return r === 'worker' || r === 'staff';
}

/** Owner/manager features (HR, team, etc.) — respects super-admin preview mode. */
export function canAccessManagerFeatures(
  orgRole: UserRole | undefined,
  platformRole: string,
  email: string | undefined,
  uiViewMode: UiViewMode,
) {
  const r = effectiveUiRole(orgRole, platformRole, email, uiViewMode);
  return r === 'owner' || r === 'manager';
}
