import { balanceDelta } from '../../financeV2Calc';
import type { JournalLineEnriched, ProfitLossReport, ReportFilters } from './types';
import { loadEnrichedJournalLines } from './loadReportData';

export function buildProfitLossFromLines(
  lines: JournalLineEnriched[],
  projectNames: Record<string, string>,
  opexCategoryNames: Record<string, string>,
  receivableProjectMap: Record<string, string | null>,
  opexRealizationCategory: Record<string, string> = {},
): ProfitLossReport {
  let revenue = 0;
  let hpp = 0;
  let opex = 0;
  let otherExpense = 0;

  const revenueByProjectMap: Record<string, number> = {};
  const hppMap: Record<string, number> = {};
  const opexMap: Record<string, number> = {};

  for (const line of lines) {
    if (line.accountType !== 'laba') continue;

    if (line.credit > 0) {
      revenue += line.credit;
      let pid: string | null = line.projectId;
      if (!pid && line.referenceType === 'project_income' && line.referenceId) {
        pid = receivableProjectMap[line.referenceId] ?? null;
      }
      const key = pid || '_none';
      revenueByProjectMap[key] = (revenueByProjectMap[key] || 0) + line.credit;
    }

    if (line.debit > 0) {
      if (line.referenceType === 'opex' && line.referenceId) {
        opex += line.debit;
        const catKey = opexRealizationCategory[line.referenceId] || line.referenceId;
        opexMap[catKey] = (opexMap[catKey] || 0) + line.debit;
      } else if (
        line.referenceType === 'project_expense'
        && line.description?.toLowerCase().includes('stok')
      ) {
        hpp += line.debit;
        hppMap['Persediaan'] = (hppMap['Persediaan'] || 0) + line.debit;
      } else if (line.referenceType === 'amortize' || line.referenceType === 'depreciation') {
        otherExpense += line.debit;
        const label = line.referenceType === 'amortize' ? 'Amortisasi' : 'Depresiasi';
        hppMap[label] = (hppMap[label] || 0) + line.debit;
      } else if (line.referenceType === 'opex') {
        opex += line.debit;
      } else {
        otherExpense += line.debit;
      }
    }
  }

  const grossProfit = revenue - hpp;
  const netProfit = grossProfit - opex - otherExpense;

  return {
    revenue: round(revenue),
    hpp: round(hpp),
    grossProfit: round(grossProfit),
    opex: round(opex),
    otherExpense: round(otherExpense),
    netProfit: round(netProfit),
    revenueByProject: Object.entries(revenueByProjectMap).map(([key, amount]) => ({
      projectId: key === '_none' ? null : key,
      projectName: key === '_none' ? 'Umum' : (projectNames[key] || key.slice(0, 8)),
      amount: round(amount),
    })).sort((a, b) => b.amount - a.amount),
    hppBreakdown: Object.entries(hppMap).map(([label, amount]) => ({
      label,
      amount: round(amount),
    })),
    opexBreakdown: Object.entries(opexMap).map(([categoryId, amount]) => ({
      categoryId,
      categoryName: opexCategoryNames[categoryId] || 'Opex',
      amount: round(amount),
    })),
  };
}

export async function buildProfitLossReport(
  filters: ReportFilters,
  ctx: {
    projectNames: Record<string, string>;
    opexCategoryNames: Record<string, string>;
    receivableProjectMap: Record<string, string | null>;
    opexRealizationCategory: Record<string, string>;
  },
): Promise<ProfitLossReport> {
  let lines = await loadEnrichedJournalLines(filters);
  if (filters.categoryId) {
    lines = lines.filter(line => {
      if (line.referenceType !== 'opex' || !line.referenceId) return true;
      return resolveOpexCategory(line, ctx.opexRealizationCategory) === filters.categoryId;
    });
  }
  return buildProfitLossFromLines(
    lines,
    ctx.projectNames,
    ctx.opexCategoryNames,
    ctx.receivableProjectMap,
    ctx.opexRealizationCategory,
  );
}

function resolveOpexCategory(
  line: JournalLineEnriched,
  map: Record<string, string>,
): string | undefined {
  return line.referenceId ? map[line.referenceId] : undefined;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/** Replay account balances from journal lines for balance sheet as-of. */
export function balancesFromLines(lines: JournalLineEnriched[]): Map<string, {
  name: string;
  type: string;
  category: 'aktiva' | 'pasiva';
  balance: number;
}> {
  const map = new Map<string, { name: string; type: string; category: 'aktiva' | 'pasiva'; balance: number }>();
  for (const line of lines) {
    const existing = map.get(line.accountId) || {
      name: line.accountName,
      type: line.accountType,
      category: line.accountCategory,
      balance: 0,
    };
    existing.balance = round(existing.balance + balanceDelta(line.accountCategory, line.debit, line.credit));
    map.set(line.accountId, existing);
  }
  return map;
}
