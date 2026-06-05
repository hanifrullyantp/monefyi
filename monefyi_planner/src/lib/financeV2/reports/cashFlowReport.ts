import type { CashFlowReport, JournalLineEnriched, ReportFilters } from './types';
import { loadAllJournalLinesUpTo, loadEnrichedJournalLines } from './loadReportData';

export function buildCashFlowFromLines(
  periodLines: JournalLineEnriched[],
  linesBefore: JournalLineEnriched[],
): CashFlowReport {
  const kasBefore = sumKasBalance(linesBefore);
  const byAccount: Record<string, { name: string; inflow: number; outflow: number }> = {};

  let inflows = 0;
  let outflows = 0;

  for (const line of periodLines) {
    if (line.accountType !== 'kas') continue;
    if (!byAccount[line.accountId]) {
      byAccount[line.accountId] = { name: line.accountName, inflow: 0, outflow: 0 };
    }
    byAccount[line.accountId].inflow += line.debit;
    byAccount[line.accountId].outflow += line.credit;
    inflows += line.debit;
    outflows += line.credit;
  }

  const netChange = round(inflows - outflows);

  return {
    openingBalance: round(kasBefore),
    inflows: round(inflows),
    outflows: round(outflows),
    netChange,
    closingBalance: round(kasBefore + netChange),
    byAccount: Object.entries(byAccount).map(([, v]) => ({
      name: v.name,
      inflow: round(v.inflow),
      outflow: round(v.outflow),
      net: round(v.inflow - v.outflow),
    })).sort((a, b) => b.net - a.net),
  };
}

export async function buildCashFlowReport(filters: ReportFilters): Promise<CashFlowReport> {
  const dayBefore = new Date(filters.dateFrom);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const beforeStr = dayBefore.toISOString().slice(0, 10);

  const [periodLines, linesBefore] = await Promise.all([
    loadEnrichedJournalLines(filters),
    loadAllJournalLinesUpTo(filters.orgId, beforeStr),
  ]);

  const filteredBefore = filters.projectId
    ? linesBefore.filter(l => l.projectId === filters.projectId)
    : linesBefore;
  const filteredPeriod = periodLines.filter(l => {
    if (filters.accountId && l.accountId !== filters.accountId) return l.accountType === 'kas';
    return true;
  });

  return buildCashFlowFromLines(
    filteredPeriod.filter(l => l.accountType === 'kas'),
    filteredBefore,
  );
}

function sumKasBalance(lines: JournalLineEnriched[]): number {
  const map: Record<string, number> = {};
  for (const line of lines) {
    if (line.accountType !== 'kas') continue;
    map[line.accountId] = (map[line.accountId] || 0) + line.debit - line.credit;
  }
  return Object.values(map).reduce((s, v) => s + v, 0);
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
