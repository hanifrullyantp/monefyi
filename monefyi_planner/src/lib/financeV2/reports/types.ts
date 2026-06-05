import type { AccountType } from '../../../types/financeV2';

export type ReportKind = 'pl' | 'neraca' | 'cashflow' | 'project' | 'investor';

export interface ReportFilters {
  orgId: string;
  dateFrom: string;
  dateTo: string;
  projectId?: string;
  accountId?: string;
  categoryId?: string;
}

export interface JournalLineEnriched {
  journalId: string;
  entryDate: string;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  accountId: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: 'aktiva' | 'pasiva';
  projectId: string | null;
  debit: number;
  credit: number;
}

export interface ProfitLossReport {
  revenue: number;
  hpp: number;
  grossProfit: number;
  opex: number;
  otherExpense: number;
  netProfit: number;
  revenueByProject: { projectId: string | null; projectName: string; amount: number }[];
  hppBreakdown: { label: string; amount: number }[];
  opexBreakdown: { categoryId: string; categoryName: string; amount: number }[];
}

export interface BalanceSheetReport {
  aktiva: { name: string; type: AccountType; balance: number }[];
  pasiva: { name: string; type: AccountType; balance: number }[];
  totalAktiva: number;
  totalPasiva: number;
  isBalanced: boolean;
  asOfDate: string;
}

export interface CashFlowReport {
  openingBalance: number;
  inflows: number;
  outflows: number;
  netChange: number;
  closingBalance: number;
  byAccount: { name: string; inflow: number; outflow: number; net: number }[];
}

export interface ProjectFinanceReport {
  projectId: string;
  projectName: string;
  revenue: number;
  expense: number;
  net: number;
}

export interface InvestorReportRow {
  investorId: string;
  investorName: string;
  invested: number;
  withdrawn: number;
  dividends: number;
  sharePct: number | null;
  suggestedDividend: number;
}

export interface FinanceReportBundle {
  filters: ReportFilters;
  profitLoss: ProfitLossReport;
  balanceSheet: BalanceSheetReport;
  cashFlow: CashFlowReport;
  projects: ProjectFinanceReport[];
  investors: InvestorReportRow[];
}
