import { toRupiah } from '@domain/journal';
import type { AccountCategory, AccountType, FinanceAccount } from '../../types/financeV2';
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
  uangMukaKlien: number;
  netProfit: number;
};

export type AccountBalanceSnapshot = {
  type: AccountType;
  current_balance: number;
};

export type ReclassificationJournalLine = {
  accountType: AccountType;
  debit: number;
  credit: number;
  projectId: string;
  needsReview: boolean;
  notes?: string;
};

export type ReclassificationJournalEntry = {
  referenceType: 'f1_migration';
  referenceId: string;
  sourceKind: 'cost' | 'income';
  projectId: string;
  description: string;
  lines: ReclassificationJournalLine[];
};

export type F1ReconciliationReport = {
  dryRun: boolean;
  before: LedgerTotalsSummary;
  after: LedgerTotalsSummary;
  dpReclassified: number;
  matched: boolean;
  mismatches: string[];
  reclassificationJournals: ReclassificationJournalEntry[];
  remappedCosts: Array<{
    costId: string;
    targetAccountType: AccountType;
    amount: number;
    needsReview: boolean;
  }>;
  remappedIncomes: Array<{
    incomeId: string;
    targetAccountType: AccountType;
    amount: number;
    isDp: boolean;
  }>;
  uncategorizedCount: number;
  uncategorizedTotal: number;
  simulatedAccounts: AccountBalanceSnapshot[];
};

const AKTIVA_ACCOUNT_TYPES = new Set<AccountType>([
  'kas',
  'piutang',
  'piutang_retensi',
  'stok',
  'aset_tetap',
  'prabayar',
]);

const PENDAPATAN_ACCOUNT_TYPES = new Set<AccountType>([
  'pendapatan_proyek',
]);

const BEBAN_ACCOUNT_TYPES = new Set<AccountType>([
  'hpp_material',
  'hpp_labor',
  'hpp_equipment',
  'hpp_overhead',
  'hpp_other',
  'hpp_uncategorized',
  'beban_opex',
  'beban_penyusutan',
]);

export function normalCategoryForAccountType(type: AccountType): AccountCategory {
  if (AKTIVA_ACCOUNT_TYPES.has(type)) return 'aktiva';
  if (PENDAPATAN_ACCOUNT_TYPES.has(type)) return 'pendapatan';
  if (BEBAN_ACCOUNT_TYPES.has(type)) return 'beban';
  return 'pasiva';
}

export function summarizeAccounts(
  accounts: Pick<FinanceAccount, 'type' | 'current_balance'>[],
): LedgerTotalsSummary {
  let kas = 0;
  let piutang = 0;
  let hutang = 0;
  let uangMukaKlien = 0;
  let netProfit = 0;

  for (const a of accounts) {
    const bal = toRupiah(a.current_balance);
    if (a.type === 'kas') kas += bal;
    else if (a.type === 'piutang' || a.type === 'piutang_retensi') piutang += bal;
    else if (a.type.startsWith('hutang')) hutang += bal;
    else if (a.type === 'uang_muka_klien') uangMukaKlien += bal;
    else if (a.type === 'pendapatan_proyek' || a.type === 'laba') netProfit += bal;
    else if (a.type.startsWith('hpp_') || a.type === 'beban_opex' || a.type === 'beban_penyusutan') netProfit -= bal;
  }

  return { kas, piutang, hutang, uangMukaKlien, netProfit };
}

/**
 * Menerapkan daftar jurnal reklasifikasi append-only ke salinan saldo akun tanpa mengubah array asli.
 * Memverifikasi keseimbangan debit == credit untuk setiap jurnal sebelum memperbarui saldo.
 */
export function applyReclassificationJournalsToAccounts(
  accounts: Pick<FinanceAccount, 'type' | 'current_balance'>[],
  journals: ReclassificationJournalEntry[],
): AccountBalanceSnapshot[] {
  const cloned: AccountBalanceSnapshot[] = accounts.map((a) => ({
    type: a.type,
    current_balance: toRupiah(a.current_balance),
  }));

  for (const journal of journals) {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of journal.lines) {
      const debit = toRupiah(line.debit);
      const credit = toRupiah(line.credit);
      if (debit < 0 || credit < 0 || (debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
        throw new Error(`Baris jurnal reklasifikasi tidak valid (${journal.referenceId})`);
      }
      totalDebit += debit;
      totalCredit += credit;
    }
    if (totalDebit <= 0 || totalDebit !== totalCredit) {
      throw new Error(`Jurnal reklasifikasi tidak seimbang (${journal.referenceId})`);
    }

    for (const line of journal.lines) {
      const debit = toRupiah(line.debit);
      const credit = toRupiah(line.credit);
      let target = cloned.find((a) => a.type === line.accountType);
      if (!target) {
        target = { type: line.accountType, current_balance: 0 };
        cloned.push(target);
      }
      const category = normalCategoryForAccountType(line.accountType);
      const delta = category === 'aktiva' || category === 'beban' ? debit - credit : credit - debit;
      target.current_balance += delta;
    }
  }

  return cloned;
}

export function compareF1Reconciliation(
  before: LedgerTotalsSummary,
  after: LedgerTotalsSummary,
  dpReclassified = 0,
): { matched: boolean; mismatches: string[] } {
  const dp = toRupiah(dpReclassified);
  const mismatches: string[] = [];

  if (before.kas !== after.kas) mismatches.push('kas');
  if (before.piutang !== after.piutang) mismatches.push('piutang');
  if (before.hutang !== after.hutang) mismatches.push('hutang');
  if (after.netProfit + dp !== before.netProfit) mismatches.push('netProfit');
  if (after.uangMukaKlien - before.uangMukaKlien !== dp) mismatches.push('uangMukaKlien');

  return {
    matched: mismatches.length === 0,
    mismatches,
  };
}

/**
 * Menyusun jurnal reklasifikasi append-only F1 dari akun penampung 'laba' ke akun F1
 * (hpp_<rapType>, pendapatan_proyek, uang_muka_klien), menerapkannya pada salinan buku besar,
 * lalu menghitung ulang neraca sesudah secara independen untuk memverifikasi rekonsiliasi nyata.
 */
export function reconcileF1Migration(input: {
  accounts: Pick<FinanceAccount, 'type' | 'current_balance'>[];
  costs: LegacyCostForMigration[];
  incomes?: LegacyIncomeForMigration[];
  rapTypesById: Record<string, string>;
  alreadyMigratedReferenceIds?: Iterable<string>;
  dryRun?: boolean;
  postJournals?: (
    accounts: AccountBalanceSnapshot[],
    journals: ReclassificationJournalEntry[],
  ) => AccountBalanceSnapshot[];
}): F1ReconciliationReport {
  const dryRun = input.dryRun ?? true;
  const alreadyMigrated = new Set(input.alreadyMigratedReferenceIds ?? []);
  const before = summarizeAccounts(input.accounts);

  const reclassificationJournals: ReclassificationJournalEntry[] = [];
  const remappedCosts: F1ReconciliationReport['remappedCosts'] = [];
  const remappedIncomes: F1ReconciliationReport['remappedIncomes'] = [];
  let dpReclassified = 0;

  for (const c of input.costs) {
    const amount = toRupiah(c.amount);
    const rapType = c.rapItemId ? input.rapTypesById[c.rapItemId] : undefined;
    const targetAccountType = hppAccountTypeForRapType(rapType);
    const needsReview = !c.rapItemId || targetAccountType === 'hpp_uncategorized';

    remappedCosts.push({
      costId: c.id,
      targetAccountType,
      amount,
      needsReview,
    });

    if (amount <= 0 || alreadyMigrated.has(c.id)) continue;

    reclassificationJournals.push({
      referenceType: 'f1_migration',
      referenceId: c.id,
      sourceKind: 'cost',
      projectId: c.projectId,
      description: `Reklasifikasi F1 biaya: ${c.description}`,
      lines: [
        {
          accountType: targetAccountType,
          debit: amount,
          credit: 0,
          projectId: c.projectId,
          needsReview,
          notes: needsReview ? 'Biaya tanpa item RAP — perlu tinjauan pemilik' : undefined,
        },
        {
          accountType: 'laba',
          debit: 0,
          credit: amount,
          projectId: c.projectId,
          needsReview: false,
        },
      ],
    });
  }

  for (const inc of input.incomes ?? []) {
    if (inc.status !== 'received') continue;
    const amount = toRupiah(inc.amount);
    if (amount <= 0) continue;

    const isDp = inc.category === 'dp';
    const targetAccountType: AccountType = isDp ? 'uang_muka_klien' : 'pendapatan_proyek';

    remappedIncomes.push({
      incomeId: inc.id,
      targetAccountType,
      amount,
      isDp,
    });

    if (alreadyMigrated.has(inc.id)) continue;

    if (isDp) {
      dpReclassified += amount;
    }

    reclassificationJournals.push({
      referenceType: 'f1_migration',
      referenceId: inc.id,
      sourceKind: 'income',
      projectId: inc.projectId,
      description: isDp
        ? `Reklasifikasi F1 uang muka klien (${inc.id})`
        : `Reklasifikasi F1 pendapatan proyek (${inc.category})`,
      lines: [
        {
          accountType: 'laba',
          debit: amount,
          credit: 0,
          projectId: inc.projectId,
          needsReview: false,
        },
        {
          accountType: targetAccountType,
          debit: 0,
          credit: amount,
          projectId: inc.projectId,
          needsReview: false,
        },
      ],
    });
  }

  const uncategorized = remappedCosts.filter((c) => c.needsReview);
  const uncategorizedCount = uncategorized.length;
  const uncategorizedTotal = uncategorized.reduce((s, c) => s + c.amount, 0);

  // Salin akun agar dry-run maupun eksekusi tidak memutasi array akun asli pemanggil
  const clonedBefore: AccountBalanceSnapshot[] = input.accounts.map((a) => ({
    type: a.type,
    current_balance: toRupiah(a.current_balance),
  }));

  const applier = input.postJournals ?? applyReclassificationJournalsToAccounts;
  const simulatedAccounts = applier(clonedBefore, reclassificationJournals);

  // Hitung ulang total sesudah secara independen dari saldo buku besar pasca-posting
  const after = summarizeAccounts(simulatedAccounts);
  const { matched, mismatches } = compareF1Reconciliation(before, after, dpReclassified);

  return {
    dryRun,
    before,
    after,
    dpReclassified,
    matched,
    mismatches,
    reclassificationJournals,
    remappedCosts,
    remappedIncomes,
    uncategorizedCount,
    uncategorizedTotal,
    simulatedAccounts,
  };
}
