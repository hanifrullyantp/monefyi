import { accountRouteForType, calcQuickRatio, isBalanceSheetBalanced } from '../../lib/financeV2Calc';
import { ensureChartOfAccounts, loadAccounts } from './accountService';
import type { BalanceSheetData, FinanceKpis } from '../../types/financeV2';

export async function getFinanceV2Snapshot(orgId: string): Promise<{
  accounts: Awaited<ReturnType<typeof loadAccounts>>;
  balanceSheet: BalanceSheetData;
  kpis: FinanceKpis;
}> {
  await ensureChartOfAccounts(orgId);
  const accounts = await loadAccounts(orgId);

  const aktivaRows = accounts
    .filter(a => a.category === 'aktiva' && a.current_balance !== 0)
    .map(a => ({
      accountId: a.id,
      name: a.name,
      type: a.type,
      balance: a.current_balance,
      route: accountRouteForType(a.type),
    }))
    .sort((a, b) => b.balance - a.balance);

  const pasivaRows = accounts
    .filter(a => a.category === 'pasiva' && a.current_balance !== 0)
    .map(a => ({
      accountId: a.id,
      name: a.name,
      type: a.type,
      balance: a.current_balance,
      route: accountRouteForType(a.type),
    }))
    .sort((a, b) => b.balance - a.balance);

  const totalAktiva = Math.round(aktivaRows.reduce((s, r) => s + r.balance, 0) * 100) / 100;
  const totalPasiva = Math.round(pasivaRows.reduce((s, r) => s + r.balance, 0) * 100) / 100;
  const variance = Math.round((totalAktiva - totalPasiva) * 100) / 100;

  const balanceSheet: BalanceSheetData = {
    aktiva: aktivaRows,
    pasiva: pasivaRows,
    totalAktiva,
    totalPasiva,
    isBalanced: isBalanceSheetBalanced(totalAktiva, totalPasiva),
    variance,
  };

  const labaPeriode = accounts
    .filter(a => a.type === 'laba')
    .reduce((s, a) => s + a.current_balance, 0);

  const cashFlow = accounts
    .filter(a => a.type === 'kas')
    .reduce((s, a) => s + a.current_balance, 0);

  const kpis: FinanceKpis = {
    totalAktiva,
    totalPasiva,
    netWorth: variance,
    labaPeriode: Math.round(labaPeriode * 100) / 100,
    cashFlow: Math.round(cashFlow * 100) / 100,
    quickRatio: calcQuickRatio(accounts),
  };

  return { accounts, balanceSheet, kpis };
}
