export interface OwnerParityMetric {
  operational: number;
  ledger: number;
  diff: number;
  matched: boolean;
}

export interface OwnerParityReport {
  mode: 'OFFLINE_LOCAL_ONLY';
  dataset: string;
  ledgerSchemaMode: 'F1_COA' | 'F0_LEGACY_LABA';
  excludedRows: {
    incomes: number;
    costs: number;
    opex: number;
    pendingIncomesExcluded: number;
  };
  comparison: {
    totalPendapatan: OwnerParityMetric & { operationalNonDp: number; operationalDpReceived: number };
    totalHpp: OwnerParityMetric;
    totalOpex: OwnerParityMetric;
    labaBersih: OwnerParityMetric;
    totalKas: {
      accountsBalance: number;
      replayedFromJournalLines: number;
      diff: number;
      matched: boolean;
    };
    neraca: {
      totalAktiva: number;
      totalPasiva: number;
      isBalanced: boolean;
      expenseInAktiva: number;
      aktivaCount: number;
      pasivaCount: number;
    };
  };
  anomalies: {
    missingJournalEntryIdCount: number;
    missingJournalEntryId: Array<Record<string, unknown>>;
    unbalancedJournalsCount: number;
    unbalancedJournals: Array<Record<string, unknown>>;
    needsReviewCount: number;
    needsReviewLines: Array<Record<string, unknown>>;
  };
  ok: boolean;
  status: 'PASS' | 'FAIL';
}

export function buildSyntheticOwnerExport(): Record<string, unknown>;

export function runOwnerParityCheck(
  rawInput: Record<string, unknown>,
  options?: { strictNeedsReview?: boolean },
): OwnerParityReport;
