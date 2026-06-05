import type { FinanceAccount, FinanceKpis, JournalEntry } from '../../../types/financeV2';

export interface NeracaBreakdownItem {
  name: string;
  amount: number;
  id?: string;
}

export interface NeracaData {
  kas: number;
  kasBreakdown: NeracaBreakdownItem[];
  piutang: number;
  piutangBreakdown: NeracaBreakdownItem[];
  stok: number;
  propertiPeralatan: number;
  praBayar: number;
  hutangDagang: number;
  hutangPajak: number;
  hutangLain: number;
  modalDisetor: number;
  labaDitahan: number;
  labaPeriode: number;
  lastUpdated: Date;
  isLoading: boolean;
  error?: string;
}

export interface DashboardSnapshot {
  neraca: NeracaData;
  kpis: FinanceKpis;
  accounts: FinanceAccount[];
  totalHutangOpen: number;
  kasBebas: number;
  recentEntries: JournalEntry[];
  isBalanced: boolean;
  totalAktiva: number;
  totalPasiva: number;
  variance: number;
}
