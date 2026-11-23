import { isBalanceSheetBalanced } from '../../financeV2Calc';
import type { AccountType } from '../../../types/financeV2';
import type { BalanceSheetReport, ReportFilters } from './types';
import { loadAllJournalLinesUpTo } from './loadReportData';
import { balancesFromLines } from './profitLossReport';
import { loadAccounts } from '../../../services/financeV2/accountService';

export async function buildBalanceSheetReport(
  filters: ReportFilters,
): Promise<BalanceSheetReport> {
  const today = new Date().toISOString().slice(0, 10);
  const asOf = filters.dateTo;

  let balanceMap: Map<string, { name: string; type: string; category: 'aktiva' | 'pasiva'; balance: number }>;

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

  const aktiva: BalanceSheetReport['aktiva'] = [];
  const pasiva: BalanceSheetReport['pasiva'] = [];

  for (const [, acc] of balanceMap) {
    if (Math.abs(acc.balance) < 0.01) continue;
    const row = { name: acc.name, type: acc.type as AccountType, balance: acc.balance };
    if (acc.category === 'aktiva') aktiva.push(row);
    else pasiva.push(row);
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
    asOfDate: asOf,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
