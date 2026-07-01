import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Layers, TrendingUp, Package, FileText, Braces,
} from 'lucide-react';

export type CommandTabId =
  | 'overview'
  | 'planning'
  | 'realisasi'
  | 'bahan'
  | 'dokumen'
  | 'json';

export interface CommandTabDef {
  id: CommandTabId;
  label: string;
  icon: LucideIcon;
  shortcut: number;
}

export const COMMAND_TABS: CommandTabDef[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, shortcut: 1 },
  { id: 'planning', label: 'Planning', icon: Layers, shortcut: 2 },
  { id: 'realisasi', label: 'Realisasi', icon: TrendingUp, shortcut: 3 },
  { id: 'bahan', label: 'Bahan & Tukang', icon: Package, shortcut: 4 },
  { id: 'dokumen', label: 'Dokumen & Laporan', icon: FileText, shortcut: 5 },
  { id: 'json', label: 'JSON', icon: Braces, shortcut: 6 },
];

export interface TabBadges {
  planning?: number;
  realisasi?: number;
  bahan?: number;
}
