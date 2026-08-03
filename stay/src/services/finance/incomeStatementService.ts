import type { ChartAccount, IncomeStatementData, JournalEntry, JournalLine } from '../../types/finance';
import { isDateInPeriod } from '../../lib/financeCalc';

const REVENUE_ACCOUNTS: Record<string, string> = {
  '4101': 'Pendapatan Kamar',
  '4102': 'Pendapatan Extra Charges',
  '4103': 'Pendapatan Late Checkout',
  '4104': 'Pendapatan F&B',
  '4105': 'Pendapatan Laundry',
  '4199': 'Pendapatan Lainnya',
};

const COGS_CODES = ['5104', '5103'];
const OPEX_CODES = ['5101', '5102', '5103', '5104', '5105', '5106', '5107', '5108', '5109', '5199'];

export function buildIncomeStatementFromAccounts(
  accounts: ChartAccount[],
  periodMonth: number,
  periodYear: number
): IncomeStatementData {
  const revenueAccounts = accounts.filter((a) => a.accountType === 'pendapatan');
  const expenseAccounts = accounts.filter((a) => a.accountType === 'beban');

  const revenue = revenueAccounts.map((a) => ({
    label: REVENUE_ACCOUNTS[a.code] || a.name,
    amount: a.currentBalance,
  })).filter((r) => r.amount !== 0);

  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);

  const cogs = expenseAccounts
    .filter((a) => COGS_CODES.includes(a.code))
    .map((a) => ({ label: a.name, amount: a.currentBalance }))
    .filter((c) => c.amount !== 0);
  const totalCogs = cogs.reduce((s, c) => s + c.amount, 0);

  const grossProfit = totalRevenue - totalCogs;

  const operatingExpenses = expenseAccounts
    .filter((a) => OPEX_CODES.includes(a.code) && !COGS_CODES.includes(a.code))
    .map((a) => ({ label: a.name, amount: a.currentBalance }))
    .filter((e) => e.amount !== 0);
  const totalOperatingExpenses = operatingExpenses.reduce((s, e) => s + e.amount, 0);

  const operatingProfit = grossProfit - totalOperatingExpenses;

  const otherIncome = 0;
  const otherExpenses = expenseAccounts
    .filter((a) => ['5201', '5203'].includes(a.code))
    .reduce((s, a) => s + a.currentBalance, 0);

  const profitBeforeTax = operatingProfit + otherIncome - otherExpenses;
  const tax = expenseAccounts.find((a) => a.code === '5202')?.currentBalance ?? 0;
  const netProfit = profitBeforeTax - tax;

  return {
    revenue,
    totalRevenue,
    cogs,
    totalCogs,
    grossProfit,
    operatingExpenses,
    totalOperatingExpenses,
    operatingProfit,
    otherIncome,
    otherExpenses,
    profitBeforeTax,
    tax,
    netProfit,
    grossMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0,
    netMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
  };
}

/** Build P&L from journal activity in a period */
export function buildIncomeStatementFromJournals(
  accounts: ChartAccount[],
  journals: JournalEntry[],
  lines: JournalLine[],
  periodMonth: number,
  periodYear: number
): IncomeStatementData {
  const periodJournalIds = new Set(
    journals
      .filter((j) => j.status === 'posted' && isDateInPeriod(j.entryDate, periodMonth, periodYear))
      .map((j) => j.id)
  );

  const accountActivity = new Map<string, number>();

  for (const line of lines) {
    if (!periodJournalIds.has(line.journalId)) continue;
    const prev = accountActivity.get(line.accountId) ?? 0;
    accountActivity.set(line.accountId, prev + line.credit - line.debit);
  }

  const revenueAccounts = accounts.filter((a) => a.accountType === 'pendapatan');
  const expenseAccounts = accounts.filter((a) => a.accountType === 'beban');

  const revenue = revenueAccounts.map((a) => ({
    label: a.name,
    amount: Math.max(0, accountActivity.get(a.id) ?? 0),
  })).filter((r) => r.amount > 0);

  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);

  const cogs = expenseAccounts
    .filter((a) => COGS_CODES.includes(a.code))
    .map((a) => ({ label: a.name, amount: Math.max(0, -(accountActivity.get(a.id) ?? 0)) }))
    .filter((c) => c.amount > 0);
  const totalCogs = cogs.reduce((s, c) => s + c.amount, 0);

  const grossProfit = totalRevenue - totalCogs;

  const operatingExpenses = expenseAccounts
    .filter((a) => OPEX_CODES.includes(a.code) && !COGS_CODES.includes(a.code))
    .map((a) => ({ label: a.name, amount: Math.max(0, -(accountActivity.get(a.id) ?? 0)) }))
    .filter((e) => e.amount > 0);
  const totalOperatingExpenses = operatingExpenses.reduce((s, e) => s + e.amount, 0);

  const operatingProfit = grossProfit - totalOperatingExpenses;
  const tax = Math.max(0, -(accountActivity.get(
    expenseAccounts.find((a) => a.code === '5202')?.id ?? ''
  ) ?? 0));
  const netProfit = operatingProfit - tax;

  return {
    revenue,
    totalRevenue,
    cogs,
    totalCogs,
    grossProfit,
    operatingExpenses,
    totalOperatingExpenses,
    operatingProfit,
    otherIncome: 0,
    otherExpenses: 0,
    profitBeforeTax: operatingProfit,
    tax,
    netProfit,
    grossMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0,
    netMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
  };
}

export function buildProfitTrend(
  accounts: ChartAccount[],
  journals: JournalEntry[],
  lines: JournalLine[],
  months = 12
): { month: string; profit: number }[] {
  const result: { month: string; profit: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const stmt = buildIncomeStatementFromJournals(accounts, journals, lines, month, year);
    result.push({
      month: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      profit: stmt.netProfit,
    });
  }

  return result;
}
