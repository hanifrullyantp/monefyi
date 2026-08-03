import type { UserRole } from '../types';

export interface RouteConfig {
  path: string;
  label: string;
  roles: UserRole[];
  showInSidebar?: boolean;
  showInBottomNav?: boolean;
}

export const MANAGER_ROLES: UserRole[] = ['owner', 'manager'];
export const ALL_STAFF_ROLES: UserRole[] = ['owner', 'manager', 'receptionist'];

export const ROUTES: RouteConfig[] = [
  { path: '/front-desk', label: 'Front Desk', roles: ALL_STAFF_ROLES, showInSidebar: true, showInBottomNav: true },
  { path: '/pos', label: 'Kasir / POS', roles: ALL_STAFF_ROLES, showInSidebar: true, showInBottomNav: true },
  { path: '/payments', label: 'Pembayaran', roles: ALL_STAFF_ROLES, showInSidebar: true },
  { path: '/rooms', label: 'Kamar', roles: ALL_STAFF_ROLES, showInSidebar: true, showInBottomNav: true },
  { path: '/bookings', label: 'Booking', roles: ALL_STAFF_ROLES, showInSidebar: true, showInBottomNav: true },
  { path: '/guests', label: 'Tamu', roles: ALL_STAFF_ROLES, showInSidebar: true, showInBottomNav: true },
  { path: '/housekeeping', label: 'Housekeeping', roles: ALL_STAFF_ROLES, showInSidebar: true },
  { path: '/dashboard', label: 'Analytics', roles: MANAGER_ROLES, showInSidebar: true },
  { path: '/reports', label: 'Laporan', roles: MANAGER_ROLES, showInSidebar: true },
  { path: '/finance', label: 'Keuangan', roles: MANAGER_ROLES, showInSidebar: true },
  { path: '/staff', label: 'Manajemen Staff', roles: MANAGER_ROLES, showInSidebar: true },
  { path: '/pricing', label: 'Dynamic Pricing', roles: MANAGER_ROLES, showInSidebar: true },
  { path: '/accounting', label: 'Accounting', roles: MANAGER_ROLES, showInSidebar: true },
  { path: '/settings', label: 'Pengaturan', roles: MANAGER_ROLES, showInSidebar: true },
];

export function getRouteRoles(path: string): UserRole[] | undefined {
  const route = ROUTES.find((r) => r.path === path);
  return route?.roles;
}

export function canAccessRoute(path: string, role: UserRole): boolean {
  const roles = getRouteRoles(path);
  if (!roles) return true;
  return roles.includes(role);
}

export const DEFAULT_AUTH_REDIRECT = '/front-desk';
export const ROLE_DENIED_REDIRECT = '/front-desk';
