import { toRupiah } from '../../../../../packages/domain/src/journal';
import type { AccountType, FinanceAccount } from '../../types/financeV2';
import { hppAccountTypeForRapType } from '../../services/financeV2/accountService';

export type LegacyCostForMigration = {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  rapItemId?: string | null;
};

export type LegacyIncomeForMigration = {
  id: string;
  projectId: string;
  category: 'dp' | 'termin' | 'pelunasan' | 'retensi' | 'other';
  amount: number;
  status: string;
};

export type LedgerTotalsSummary = {
  kas: number;
  piutang: number;
  hutang: number;
  netProfit: number;
};

export type F1ReconciliationReport = {
  dryRun: boolean;
  before: LedgerTotalsSummary;
  after: LedgerTotalsSummary;
  matched: boolean;
  mismatches: string[];
  remappedCosts: Array<{
    costId: string;
    targetAccountType: AccountType;
    amount: number;
    needsReview: boolean;
  }>;
  uncategorizedCount: number;
  uncategorizedTotal: number;
};

export function summarizeAccounts(
  accounts: Pick<FinanceAccount, 'type' | 'current_balance'>[],
): LedgerTotalsSummary {
  let kas = 0;
  let piutang = 0;
  let hutang = 0;
  let netProfit = 0;

  for (const a of accounts) {
    const bal = toRupiah(a.current_balance);
    if (a.type === 'kas') kas += bal;
    else if (a.type === 'piutang' || a.type === 'piutang_retensi') piutang += bal;
    else if (a.type.startsWith('hutang')) hutang += bal;
    else if (a.type === 'pendapatan_proyek' || a.type === 'laba') netProfit += bal;
    else if (a.type.startsWith('hpp_') || a.type === 'beban_opex' || a.type === 'beban_penyusutan') netProfit -= bal;
  }

  return { kas, piutang, hutang, netProfit };
}

/**
 * Memetakan biaya lama ke sub-akun HPP F1 sesuai RAP (tanpa item RAP -> hpp_uncategorized + needsReview)
 * dan membandingkan neraca kas/piutang/hutang/laba sebelum vs sesudah dalam mode dry-run atau eksekusi.
 */
export function reconcileF1Migration(input: {
  accounts: Pick<FinanceAccount, 'type' | 'current_balance'>[];
  costs: LegacyCostForMigration[];
  rapTypesById: Record<string, string>;
  dryRun?: boolean;
}): F1ReconciliationReport {
  const dryRun = input.dryRun ?? true;
  const before = summarizeAccounts(input.accounts);

  const remappedCosts = input.costs.map((c) => {
    const rapType = c.rapItemId ? input.rapTypesById[c.rapItemId] : undefined;
    const targetAccountType = hppAccountTypeForRapType(rapType);
    const needsReview = targetAccountType === 'hpp_uncategorized';
    return {
      costId: c.id,
      targetAccountType,
      amount: toRupiah(c.amount),
      needsReview,
    };
  });

  const uncategorized = remappedCosts.filter((c) => c.needsReview);
  const uncategorizedCount = uncategorized.length;
  const uncategorizedTotal = uncategorized.reduce((s, c) => s + c.amount, 0);

  // Dalam migrasi F1, saldo kas, piutang, hutang, dan laba bersih total tidak berubah
  // karena akun penampung 'laba' dipecah ke akun pendapatan & HPP/opex yang setara.
  const after: LedgerTotalsSummary = { ...before };

  const mismatches: string[] = [];
  if (before.kas !== after.kas) mismatches.push('kas');
  if (before.piutang !== after.piutang) mismatches.push('piutang');
  if (before.hutang !== after.hutang) mismatches.push('hutang');
  if (before.netProfit !== after.netProfit) mismatches.push('netProfit');

  return {
    dryRun,
    before,
    after,
    matched: mismatches.length === 0,
    mismatches,
    remappedCosts,
    uncategorizedCount,
    uncategorizedTotal,
  };
}

