import { accountRouteForType, calcQuickRatio, isBalanceSheetBalanced } from '../../lib/financeV2Calc';
import { computePeriodProfitFromAccounts, ensureChartOfAccounts, loadAccounts } from './accountService';
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
    .filter(a => a.category === 'pasiva' && a.type !== 'laba' && a.current_balance !== 0)
    .map(a => ({
      accountId: a.id,
      name: a.name,
      type: a.type,
      balance: a.current_balance,
      route: accountRouteForType(a.type),
    }));

  const pendapatanTotal = accounts
    .filter(a => a.category === 'pendapatan')
    .reduce((s, a) => s + a.current_balance, 0);
  const bebanTotal = accounts
    .filter(a => a.category === 'beban')
    .reduce((s, a) => s + a.current_balance, 0);
  const computedCurrentProfit = Math.round((pendapatanTotal - bebanTotal) * 100) / 100;

  const legacyLabaAccounts = accounts.filter(a => a.category === 'pasiva' && a.type === 'laba');
  const legacyLaba = legacyLabaAccounts.reduce((s, a) => s + a.current_balance, 0);
  const combinedCurrentProfit = Math.round((legacyLaba + computedCurrentProfit) * 100) / 100;

  if (Math.abs(combinedCurrentProfit) >= 0.01) {
    pasivaRows.push({
      accountId: legacyLabaAccounts[0]?.id || 'computed-current-profit',
      name:
        Math.abs(computedCurrentProfit) >= 0.01
          ? 'Laba Periode Berjalan (Dari Buku Besar)'
          : (legacyLabaAccounts[0]?.name || 'Laba Periode Berjalan'),
      type: 'laba',
      balance: combinedCurrentProfit,
      route: undefined,
    });
  }

  pasivaRows.sort((a, b) => b.balance - a.balance);

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

  const labaPeriode = computePeriodProfitFromAccounts(accounts);

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
