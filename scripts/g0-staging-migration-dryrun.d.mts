import type { AccountType } from '../apps/web/src/types/financeV2';

export function createSeededRng(seed?: number): () => number;

export function hppAccountTypeForRapType(rapType?: string | null): AccountType;

export function normalCategoryForAccountType(type: AccountType): 'aktiva' | 'pasiva' | 'pendapatan' | 'beban';

export interface SyntheticF1Dataset {
  dataset: 'SYNTHETIC';
  seed: number;
  projects: Array<{ id: string; name: string }>;
  rapTypesById: Record<string, string>;
  costs: Array<{
    id: string;
    projectId: string;
    description: string;
    amount: number;
    rapItemId: string | null;
  }>;
  incomes: Array<{
    id: string;
    projectId: string;
    category: 'dp' | 'termin' | 'pelunasan' | 'retensi' | 'other';
    amount: number;
    status: string;
  }>;
  piutangItems: Array<{ id: string; projectId: string; amount: number }>;
  hutangItems: Array<{ id: string; projectId: string; amount: number }>;
  modalDisetor: number;
  dividendItems: Array<{ id: string; amount: number }>;
  accounts: Array<{ type: AccountType; current_balance: number }>;
  stats: {
    projects: number;
    costs: number;
    uncategorizedCosts: number;
    incomes: number;
    receivedIncomes: number;
    pendingIncomes: number;
    piutangEntries: number;
    hutangEntries: number;
    dividendEntries: number;
    totalTransactions: number;
  };
}

export function generateSyntheticF1Dataset(options?: {
  seed?: number;
  projectCount?: number;
  costCount?: number;
  incomeCount?: number;
}): SyntheticF1Dataset;

export function runStagingDryRunSimulation(options?: {
  seed?: number;
  projectCount?: number;
  costCount?: number;
  incomeCount?: number;
}): {
  dataset: 'SYNTHETIC';
  seed: number;
  counts: SyntheticF1Dataset['stats'] & { journalsGenerated: number };
  before: { kas: number; piutang: number; hutang: number; uangMukaKlien: number; netProfit: number };
  after: { kas: number; piutang: number; hutang: number; uangMukaKlien: number; netProfit: number };
  dpReclassified: number;
  reconciliation: {
    dryRunMatched: boolean;
    executeMatched: boolean;
    matched: boolean;
    mismatches: string[];
    inputMutatedDuringDryRun: boolean;
    allJournalsBalanced: boolean;
    uncategorizedCount: number;
    uncategorizedTotal: number;
  };
  balanceSheetAfter: {
    totalAktiva: number;
    totalPasiva: number;
    balanceSheetBalanced: boolean;
    expenseInAktiva: number;
    revenueInAktiva: number;
    expenseInPasiva: number;
    rowsAktivaCount: number;
    rowsPasivaCount: number;
  };
  status: 'PASS' | 'FAIL';
};
