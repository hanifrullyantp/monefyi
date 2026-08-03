/** STAY Finance V2 — double-entry accounting types */

export type AccountType = 'aktiva' | 'pasiva' | 'pendapatan' | 'beban';

export type AccountSubType =
  | 'kas' | 'bank' | 'xendit' | 'piutang' | 'stok' | 'aset_tetap' | 'prabayar'
  | 'hutang_dagang' | 'hutang_gaji' | 'hutang_pajak' | 'hutang_lain' | 'pendapatan_dimuka' | 'hutang_bank'
  | 'modal' | 'simpanan' | 'laba_ditahan' | 'laba'
  | 'pendapatan' | 'beban';

export type JournalSource =
  | 'booking' | 'payment' | 'pos' | 'payroll' | 'kasbon' | 'expense' | 'refund'
  | 'inventory' | 'xendit' | 'manual' | 'closing' | 'void';

export type JournalStatus = 'draft' | 'posted' | 'void';

export interface ChartAccount {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  accountType: AccountType;
  subType: AccountSubType;
  parentId?: string;
  isSystem: boolean;
  isActive: boolean;
  currentBalance: number;
  metadata?: Record<string, unknown>;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  source: JournalSource;
  referenceType?: string;
  referenceId?: string;
  status: JournalStatus;
  totalAmount: number;
  voidReason?: string;
  voidedAt?: string;
  createdBy?: string;
  createdAt: string;
}

export interface JournalLine {
  id: string;
  journalId: string;
  accountId: string;
  debit: number;
  credit: number;
  notes?: string;
}

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  notes?: string;
}

export interface CreateJournalInput {
  tenantId: string;
  entryDate?: string;
  description: string;
  source: JournalSource;
  referenceType?: string;
  referenceId?: string;
  lines: JournalLineInput[];
  createdBy?: string;
}

export interface BankAccount {
  id: string;
  tenantId: string;
  chartAccountId?: string;
  bankName: string;
  accountNumber: string;
  accountHolder?: string;
  isActive: boolean;
}

export interface BankReconciliation {
  id: string;
  tenantId: string;
  bankAccountId: string;
  periodMonth: number;
  periodYear: number;
  openingBalance: number;
  closingBalance: number;
  bankStatementBalance?: number;
  status: 'open' | 'closed';
}

export interface ReconciliationItem {
  id: string;
  reconciliationId: string;
  journalId?: string;
  transactionDate?: string;
  description?: string;
  amount: number;
  matchStatus: 'matched' | 'unmatched' | 'unchecked' | 'variance';
}

export interface TaxRecord {
  id: string;
  tenantId: string;
  taxType: 'ppn' | 'pph21' | 'pph_final' | 'pajak_daerah';
  periodMonth: number;
  periodYear: number;
  taxableAmount: number;
  taxAmount: number;
  paidAmount: number;
  dueDate?: string;
  status: 'pending' | 'partial' | 'paid';
}

export interface FinancialPeriod {
  id: string;
  tenantId: string;
  periodMonth: number;
  periodYear: number;
  status: 'open' | 'closed';
  closedAt?: string;
}

export interface BudgetItem {
  id: string;
  tenantId: string;
  accountId: string;
  periodMonth: number;
  periodYear: number;
  plannedAmount: number;
  notes?: string;
}

export interface BalanceSheetRow {
  accountId: string;
  code: string;
  name: string;
  subType: AccountSubType;
  balance: number;
  children?: BalanceSheetRow[];
  changePercent?: number;
}

export interface BalanceSheetData {
  aktiva: BalanceSheetRow[];
  pasiva: BalanceSheetRow[];
  totalAktiva: number;
  totalPasiva: number;
  isBalanced: boolean;
  variance: number;
}

export interface IncomeStatementData {
  revenue: { label: string; amount: number }[];
  totalRevenue: number;
  cogs: { label: string; amount: number }[];
  totalCogs: number;
  grossProfit: number;
  operatingExpenses: { label: string; amount: number }[];
  totalOperatingExpenses: number;
  operatingProfit: number;
  otherIncome: number;
  otherExpenses: number;
  profitBeforeTax: number;
  tax: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
}

export interface CashFlowData {
  operating: { label: string; amount: number }[];
  netOperating: number;
  investing: { label: string; amount: number }[];
  netInvesting: number;
  financing: { label: string; amount: number }[];
  netFinancing: number;
  netChange: number;
  openingCash: number;
  closingCash: number;
  cashByAccount: { name: string; balance: number }[];
}

export interface FinanceAlert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
}

export interface FinanceKpis {
  totalCash: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  netProfit: number;
  revenueChange: number;
  expenseChange: number;
  profitChange: number;
}

export type FinanceTab =
  | 'neraca'
  | 'laba-rugi'
  | 'arus-kas'
  | 'jurnal'
  | 'akun'
  | 'rekonsiliasi'
  | 'pajak'
  | 'laporan';

export interface NeracaGroup {
  key: string;
  label: string;
  subTypes: AccountSubType[];
  color: string;
}

export const NERACA_AKTIVA_GROUPS: NeracaGroup[] = [
  { key: 'kas', label: 'KAS', subTypes: ['kas'], color: 'bg-amber-100' },
  { key: 'bank', label: 'BANK', subTypes: ['bank'], color: 'bg-amber-100' },
  { key: 'xendit', label: 'SALDO XENDIT', subTypes: ['xendit'], color: 'bg-amber-100' },
  { key: 'piutang', label: 'PIUTANG', subTypes: ['piutang'], color: 'bg-amber-50' },
  { key: 'stok', label: 'STOK', subTypes: ['stok'], color: 'bg-amber-50' },
  { key: 'properti', label: 'PROPERTI', subTypes: ['aset_tetap'], color: 'bg-amber-50' },
  { key: 'prabayar', label: 'PRA BAYAR', subTypes: ['prabayar'], color: 'bg-amber-50' },
];

export const NERACA_PASIVA_GROUPS: NeracaGroup[] = [
  { key: 'dagang', label: 'DAGANG', subTypes: ['hutang_dagang'], color: 'bg-red-100' },
  { key: 'gaji', label: 'GAJI', subTypes: ['hutang_gaji'], color: 'bg-red-100' },
  { key: 'pajak', label: 'PAJAK', subTypes: ['hutang_pajak'], color: 'bg-red-100' },
  { key: 'lainnya', label: 'LAINNYA', subTypes: ['hutang_lain', 'pendapatan_dimuka', 'hutang_bank'], color: 'bg-red-50' },
  { key: 'modal', label: 'MODAL', subTypes: ['modal', 'simpanan'], color: 'bg-rose-100' },
  { key: 'laba', label: 'LABA', subTypes: ['laba_ditahan', 'laba'], color: 'bg-rose-50' },
];
