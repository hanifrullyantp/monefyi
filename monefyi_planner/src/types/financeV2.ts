export type FinanceVersion = 'v1' | 'v2';

export type AccountType =
  | 'kas'
  | 'piutang'
  | 'stok'
  | 'aset_tetap'
  | 'prabayar'
  | 'hutang_dagang'
  | 'hutang_pajak'
  | 'hutang_lain'
  | 'modal_disetor'
  | 'laba_ditahan'
  | 'laba';

export type AccountCategory = 'aktiva' | 'pasiva';

export type JournalReferenceType =
  | 'project_expense'
  | 'project_income'
  | 'opex'
  | 'transfer'
  | 'manual'
  | 'amortize'
  | 'depreciation'
  | 'opening';

export interface FinanceAccount {
  id: string;
  org_id: string;
  type: AccountType;
  category: AccountCategory;
  name: string;
  project_id: string | null;
  parent_id: string | null;
  is_system: boolean;
  is_active: boolean;
  current_balance: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  org_id: string;
  entry_date: string;
  description: string | null;
  reference_type: JournalReferenceType | null;
  reference_id: string | null;
  total_amount: number;
  created_by: string | null;
  created_at: string;
}

export interface JournalLine {
  id: string;
  journal_id: string;
  account_id: string;
  debit: number;
  credit: number;
  notes: string | null;
}

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  notes?: string;
}

export interface CreateJournalInput {
  orgId: string;
  entryDate?: string;
  description?: string;
  referenceType?: JournalReferenceType;
  referenceId?: string;
  lines: JournalLineInput[];
  createdBy?: string;
}

export interface BalanceSheetRow {
  accountId: string;
  name: string;
  type: AccountType;
  balance: number;
  route?: string;
}

export interface BalanceSheetData {
  aktiva: BalanceSheetRow[];
  pasiva: BalanceSheetRow[];
  totalAktiva: number;
  totalPasiva: number;
  isBalanced: boolean;
  variance: number;
}

export interface FinanceKpis {
  totalAktiva: number;
  totalPasiva: number;
  netWorth: number;
  labaPeriode: number;
  cashFlow: number;
  quickRatio: number | null;
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  kas: 'Kas',
  piutang: 'Piutang',
  stok: 'Stok',
  aset_tetap: 'Aset Tetap',
  prabayar: 'Pra Bayar',
  hutang_dagang: 'Hutang Dagang',
  hutang_pajak: 'Hutang Pajak',
  hutang_lain: 'Hutang Lain',
  modal_disetor: 'Modal Disetor',
  laba_ditahan: 'Laba Ditahan',
  laba: 'Laba Periode',
};

export const FINANCE_V2_NAV = [
  { path: '', label: 'Dashboard', slug: 'dashboard' },
  { path: 'kas', label: 'Kas', slug: 'kas' },
  { path: 'piutang', label: 'Piutang', slug: 'piutang' },
  { path: 'hutang', label: 'Hutang', slug: 'hutang' },
  { path: 'stok', label: 'Stok', slug: 'stok' },
  { path: 'aset', label: 'Aset', slug: 'aset' },
  { path: 'prabayar', label: 'Pra Bayar', slug: 'prabayar' },
  { path: 'investor', label: 'Investor', slug: 'investor' },
  { path: 'opex', label: 'Opex', slug: 'opex' },
  { path: 'laporan', label: 'Laporan', slug: 'laporan' },
] as const;
