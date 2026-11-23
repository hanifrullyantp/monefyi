import { startOfMonthDate } from './financeReportMonth';

export interface ProjectReportMeta {
  id: string;
  finance_report_month?: string | null;
}

export function isProjectInReportPeriod(
  project: ProjectReportMeta,
  dateFrom: string,
  dateTo: string,
): boolean {
  if (!project.finance_report_month) return true;
  const reportMonth = project.finance_report_month.slice(0, 10);
  const fromMonth = startOfMonthDate(parseYmdLocal(dateFrom));
  const toMonth = startOfMonthDate(parseYmdLocal(dateTo));
  return reportMonth >= fromMonth && reportMonth <= toMonth;
}

function parseYmdLocal(s: string): Date {
  const [y, mo, day] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, mo - 1, day);
}

export function filterEligibleProjectIds<T extends ProjectReportMeta>(
  projects: T[],
  dateFrom: string,
  dateTo: string,
  projectIdFilter?: string,
): Set<string> {
  const eligible = projects.filter(p => isProjectInReportPeriod(p, dateFrom, dateTo));
  const ids = projectIdFilter
    ? eligible.filter(p => p.id === projectIdFilter).map(p => p.id)
    : eligible.map(p => p.id);
  return new Set(ids);
}
