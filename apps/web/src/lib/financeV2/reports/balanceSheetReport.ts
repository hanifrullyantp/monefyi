import { isBalanceSheetBalanced } from '../../financeV2Calc';
import type { AccountCategory, AccountType } from '../../../types/financeV2';
import type { BalanceSheetReport, ReportFilters } from './types';
import { loadAllJournalLinesUpTo } from './loadReportData';
import { balancesFromLines } from './profitLossReport';
import { loadAccounts } from '../../../services/financeV2/accountService';

export type AccountBalanceEntry = {
  name: string;
  type: string;
  category: AccountCategory;
  balance: number;
};

/**
 * Menyusun Neraca secara deterministik dari peta saldo akun.
 * Akun berkategori 'pendapatan' dan 'beban' tidak pernah masuk ke aktiva[] maupun pasiva[],
 * melainkan digulung menjadi Laba Periode Berjalan (SUM(pendapatan) - SUM(beban)) pada sisi pasiva
 * (digabung dengan akun 'laba' legacy bila ada tanpa double-counting).
 */
export function buildBalanceSheetFromBalances(
  balanceMap: Map<string, AccountBalanceEntry>,
  asOfDate: string,
): BalanceSheetReport {
  const aktiva: BalanceSheetReport['aktiva'] = [];
  const pasiva: BalanceSheetReport['pasiva'] = [];

  let totalPendapatan = 0;
  let totalBeban = 0;
  let legacyLaba = 0;
  let legacyLabaName: string | null = null;

  for (const [, acc] of balanceMap) {
    if (acc.category === 'pendapatan') {
      totalPendapatan += acc.balance;
      continue;
    }
    if (acc.category === 'beban') {
      totalBeban += acc.balance;
      continue;
    }
    if (acc.category === 'pasiva' && acc.type === 'laba') {
      legacyLaba += acc.balance;
      if (!legacyLabaName) legacyLabaName = acc.name;
      continue;
    }
    if (Math.abs(acc.balance) < 0.01) continue;
    const row = { name: acc.name, type: acc.type as AccountType, balance: round(acc.balance) };
    if (acc.category === 'aktiva') aktiva.push(row);
    else pasiva.push(row);
  }

  const computedCurrentProfit = round(totalPendapatan - totalBeban);
  const combinedCurrentProfit = round(legacyLaba + computedCurrentProfit);
  if (Math.abs(combinedCurrentProfit) >= 0.01) {
    pasiva.push({
      name:
        Math.abs(computedCurrentProfit) >= 0.01
          ? 'Laba Periode Berjalan (Dari Buku Besar)'
          : (legacyLabaName || 'Laba Periode Berjalan'),
      type: 'laba',
      balance: combinedCurrentProfit,
    });
  }

  aktiva.sort((a, b) => b.balance - a.balance);
  pasiva.sort((a, b) => b.balance - a.balance);

  const totalAktiva = round(aktiva.reduce((s, r) => s + r.balance, 0));
  const totalPasiva = round(pasiva.reduce((s, r) => s + r.balance, 0));

  return {
    aktiva,
    pasiva,
    totalAktiva,
    totalPasiva,
    isBalanced: isBalanceSheetBalanced(totalAktiva, totalPasiva),
    asOfDate,
  };
}

export async function buildBalanceSheetReport(
  filters: ReportFilters,
): Promise<BalanceSheetReport> {
  const today = new Date().toISOString().slice(0, 10);
  const asOf = filters.dateTo;

  let balanceMap: Map<string, AccountBalanceEntry>;

  if (asOf >= today) {
    const accounts = await loadAccounts(filters.orgId);
    balanceMap = new Map();
    for (const a of accounts) {
      if (filters.projectId && a.project_id !== filters.projectId) continue;
      if (filters.accountId && a.id !== filters.accountId) continue;
      balanceMap.set(a.id, {
        name: a.name,
        type: a.type,
        category: a.category,
        balance: a.current_balance,
      });
    }
  } else {
    const lines = await loadAllJournalLinesUpTo(filters.orgId, asOf);
    const filtered = lines.filter(l => {
      if (filters.projectId && l.projectId !== filters.projectId) return false;
      if (filters.accountId && l.accountId !== filters.accountId) return false;
      return true;
    });
    balanceMap = balancesFromLines(filtered);
  }

  return buildBalanceSheetFromBalances(balanceMap, asOf);
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
