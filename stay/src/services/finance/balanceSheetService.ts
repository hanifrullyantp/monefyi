import type { BalanceSheetData, BalanceSheetRow, ChartAccount } from '../../types/finance';
import { NERACA_AKTIVA_GROUPS as AKTIVA_GROUPS, NERACA_PASIVA_GROUPS as PASIVA_GROUPS } from '../../types/finance';
import { calcPercentChange, isBalanceSheetBalanced } from '../../lib/financeCalc';

function buildGroupRows(
  accounts: ChartAccount[],
  groups: typeof NERACA_AKTIVA_GROUPS | typeof NERACA_PASIVA_GROUPS,
  previousBalances?: Map<string, number>
): BalanceSheetRow[] {
  return groups.map((group) => {
    const groupAccounts = accounts.filter(
      (a) => group.subTypes.includes(a.subType) && (a.accountType === 'aktiva' || a.accountType === 'pasiva')
    );
    const children: BalanceSheetRow[] = groupAccounts.map((a) => ({
      accountId: a.id,
      code: a.code,
      name: a.name,
      subType: a.subType,
      balance: a.currentBalance,
      changePercent: previousBalances
        ? calcPercentChange(a.currentBalance, previousBalances.get(a.id) ?? 0)
        : undefined,
    }));
    const total = children.reduce((s, c) => s + c.balance, 0);
    return {
      accountId: group.key,
      code: '',
      name: group.label,
      subType: group.subTypes[0],
      balance: total,
      children,
    };
  }).filter((g) => g.balance !== 0 || (g.children && g.children.length > 0));
}

export function buildBalanceSheet(
  accounts: ChartAccount[],
  previousAccounts?: ChartAccount[]
): BalanceSheetData {
  const prevMap = previousAccounts
    ? new Map(previousAccounts.map((a) => [a.id, a.currentBalance]))
    : undefined;

  const aktiva = buildGroupRows(
    accounts.filter((a) => a.accountType === 'aktiva'),
    AKTIVA_GROUPS,
    prevMap
  );
  const pasiva = buildGroupRows(
    accounts.filter((a) => a.accountType === 'pasiva'),
    PASIVA_GROUPS,
    prevMap
  );

  const totalAktiva = Math.round(accounts
    .filter((a) => a.accountType === 'aktiva')
    .reduce((s, a) => s + a.currentBalance, 0) * 100) / 100;

  const totalPasiva = Math.round(accounts
    .filter((a) => a.accountType === 'pasiva')
    .reduce((s, a) => s + a.currentBalance, 0) * 100) / 100;

  const variance = Math.round((totalAktiva - totalPasiva) * 100) / 100;

  return {
    aktiva,
    pasiva,
    totalAktiva,
    totalPasiva,
    isBalanced: isBalanceSheetBalanced(totalAktiva, totalPasiva),
    variance,
  };
}

export function getAccountJournals(
  accountId: string,
  journals: { id: string; entryDate: string; description: string; source: string; status: string }[],
  lines: { journalId: string; accountId: string; debit: number; credit: number }[]
): typeof journals {
  const journalIds = new Set(
    lines.filter((l) => l.accountId === accountId).map((l) => l.journalId)
  );
  return journals.filter((j) => journalIds.has(j.id) && j.status === 'posted');
}

export function getTotalCash(accounts: ChartAccount[]): number {
  return accounts
    .filter((a) => ['kas', 'bank', 'xendit'].includes(a.subType))
    .reduce((s, a) => s + a.currentBalance, 0);
}
