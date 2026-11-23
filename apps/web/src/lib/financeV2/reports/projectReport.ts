import type { JournalLineEnriched, ProjectFinanceReport, ReportFilters } from './types';
import { loadEnrichedJournalLines } from './loadReportData';

export function buildProjectReports(
  lines: JournalLineEnriched[],
  projectNames: Record<string, string>,
): ProjectFinanceReport[] {
  const map: Record<string, { revenue: number; expense: number }> = {};

  for (const line of lines) {
    const pid = line.projectId;
    if (!pid) continue;
    if (!map[pid]) map[pid] = { revenue: 0, expense: 0 };

    if (line.accountType === 'kas') {
      map[pid].revenue += line.debit;
      map[pid].expense += line.credit;
    } else if (line.accountType === 'laba') {
      map[pid].revenue += line.credit;
      map[pid].expense += line.debit;
    }
  }

  return Object.entries(map).map(([projectId, v]) => ({
    projectId,
    projectName: projectNames[projectId] || projectId.slice(0, 8),
    revenue: round(v.revenue),
    expense: round(v.expense),
    net: round(v.revenue - v.expense),
  })).sort((a, b) => b.net - a.net);
}

export async function buildProjectFinanceReports(
  filters: ReportFilters,
  projectNames: Record<string, string>,
): Promise<ProjectFinanceReport[]> {
  const lines = await loadEnrichedJournalLines(filters);
  const reports = buildProjectReports(lines, projectNames);
  if (filters.projectId) {
    return reports.filter(r => r.projectId === filters.projectId);
  }
  return reports;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
