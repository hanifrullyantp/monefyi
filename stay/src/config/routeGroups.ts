import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Settings2,
  Briefcase,
} from 'lucide-react';
import type { RouteConfig } from './routes';

export interface RouteGroupConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  paths: string[];
}

/** Kelompok menu sidebar — operasional vs manajemen */
export const ROUTE_GROUPS: RouteGroupConfig[] = [
  {
    id: 'operations',
    label: 'Operasional',
    icon: Briefcase,
    paths: ['/pos', '/payments', '/rooms', '/bookings', '/guests', '/housekeeping'],
  },
  {
    id: 'management',
    label: 'Manajemen',
    icon: LayoutDashboard,
    paths: ['/xendit', '/dashboard', '/reports', '/finance', '/staff', '/pricing', '/settings'],
  },
];

export function groupSidebarRoutes(routes: RouteConfig[]): {
  primary: RouteConfig | undefined;
  groups: { group: RouteGroupConfig; items: RouteConfig[] }[];
} {
  const primary = routes.find((r) => r.path === '/front-desk');
  const pathSet = new Set(routes.map((r) => r.path));

  const groups = ROUTE_GROUPS.map((group) => ({
    group,
    items: group.paths
      .map((path) => routes.find((r) => r.path === path))
      .filter((r): r is RouteConfig => !!r && pathSet.has(r.path)),
  })).filter((g) => g.items.length > 0);

  return { primary, groups };
}

/** Ikon untuk item menu overflow mobile */
export const MOBILE_MORE_GROUP_LABEL = 'Menu';

export function getBottomNavPrimary(routes: RouteConfig[]): RouteConfig[] {
  const primaryPaths = ['/front-desk', '/pos', '/rooms', '/bookings'];
  return primaryPaths
    .map((path) => routes.find((r) => r.path === path))
    .filter((r): r is RouteConfig => !!r);
}

export function getBottomNavOverflow(routes: RouteConfig[]): RouteConfig[] {
  const shown = new Set(['/front-desk', '/pos', '/rooms', '/bookings']);
  return routes.filter((r) => !shown.has(r.path));
}
