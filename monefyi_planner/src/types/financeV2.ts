/** v3 = Keuangan Bisnis sandbox (mockup terbaru). v2 = alias v3 (legacy DB). v1 = klasik. */
export type FinanceVersion = 'v1' | 'v2' | 'v3';

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
  | 'opening'
  | 'project_close'
  | 'payroll_disbursement'
  | 'bon_disbursement'
  | 'payroll_accrual'
  | 'period_close';

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

export type ReceivableStatus = 'open' | 'partial' | 'paid' | 'overdue';
export type PayableStatus = 'open' | 'partial' | 'paid' | 'overdue';
export type DebtorType = 'person' | 'company' | 'project';
export type PayableCategory = 'dagang' | 'pajak' | 'lain';

export interface Receivable {
  id: string;
  org_id: string;
  debtor_type: DebtorType;
  debtor_name: string;
  debtor_project_id: string | null;
  amount: number;
  paid_amount: number;
  due_date: string | null;
  status: ReceivableStatus;
  notes: string | null;
  created_at: string;
}

export interface Payable {
  id: string;
  org_id: string;
  creditor_type: string;
  creditor_name: string;
  creditor_project_id: string | null;
  category: PayableCategory | null;
  amount: number;
  paid_amount: number;
  due_date: string | null;
  status: PayableStatus;
  notes: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  org_id: string;
  name: string;
  unit: string;
  qty: number;
  unit_cost: number;
  total_value: number;
  min_stock: number;
  location: string | null;
  updated_at: string;
}

export const RECEIVABLE_STATUS_LABEL: Record<ReceivableStatus, string> = {
  open: 'Belum Lunas',
  partial: 'Sebagian',
  paid: 'Lunas',
  overdue: 'Jatuh Tempo',
};

export const PAYABLE_STATUS_LABEL: Record<PayableStatus, string> = {
  open: 'Belum Lunas',
  partial: 'Sebagian',
  paid: 'Lunas',
  overdue: 'Jatuh Tempo',
};

export type InvestmentType = 'equity' | 'project_based' | 'profit_share';
export type InvestorTransactionType = 'invest' | 'withdraw' | 'dividend';
export type DepreciationMethod = 'straight' | 'none';

export interface PrepaidItem {
  id: string;
  org_id: string;
  name: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  remaining_value: number;
  account_id: string | null;
  notes: string | null;
  last_amortized_date: string | null;
  created_at: string;
}

export interface FixedAsset {
  id: string;
  org_id: string;
  name: string;
  category: string | null;
  purchase_date: string | null;
  purchase_value: number;
  current_value: number;
  depreciation_method: DepreciationMethod;
  useful_life_months: number | null;
  last_depreciation_month: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface Investor {
  id: string;
  org_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  investment_type: InvestmentType | null;
  total_invested: number;
  share_pct: number | null;
  notes: string | null;
  joined_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InvestorTransaction {
  id: string;
  investor_id: string;
  type: InvestorTransactionType;
  amount: number;
  trans_date: string;
  project_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface OpexCategory {
  id: string;
  org_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface OpexBudget {
  id: string;
  org_id: string;
  category_id: string;
  period_month: number;
  period_year: number;
  planned_amount: number;
  notes: string | null;
}

export interface OpexRealization {
  id: string;
  org_id: string;
  category_id: string;
  paid_date: string;
  amount: number;
  source_account_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface OpexComparisonRow {
  categoryId: string;
  categoryName: string;
  planned: number;
  actual: number;
  variance: number;
  pctUsed: number | null;
}

export const INVESTMENT_TYPE_LABEL: Record<InvestmentType, string> = {
  equity: 'Equity',
  project_based: 'Berbasis Proyek',
  profit_share: 'Bagi Hasil',
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
