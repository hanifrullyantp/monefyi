import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, GanttChart, Wallet, Package, ArrowLeftRight,
  FileText, Braces,
} from 'lucide-react';

export type CommandTabId =
  | 'overview'
  | 'planning'
  | 'keuangan'
  | 'bahan'
  | 'hutang-piutang'
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
  { id: 'planning', label: 'Planning & Realisasi', icon: GanttChart, shortcut: 2 },
  { id: 'keuangan', label: 'Keuangan', icon: Wallet, shortcut: 3 },
  { id: 'bahan', label: 'Bahan & Tukang', icon: Package, shortcut: 4 },
  { id: 'hutang-piutang', label: 'Hutang-Piutang', icon: ArrowLeftRight, shortcut: 5 },
  { id: 'dokumen', label: 'Dokumen & Laporan', icon: FileText, shortcut: 6 },
  { id: 'json', label: 'JSON', icon: Braces, shortcut: 7 },
];

export interface TabBadges {
  planning?: number;
  keuangan?: number;
  bahan?: number;
  'hutang-piutang'?: number;
}
