import { supabase } from '../../supabase';
import type { FinanceReportBundle, ReportFilters } from './types';
import { buildProfitLossReport } from './profitLossReport';
import { buildBalanceSheetReport } from './balanceSheetReport';
import { buildCashFlowReport } from './cashFlowReport';
import { buildProjectFinanceReports } from './projectReport';
import { buildInvestorReport } from './investorReport';

async function loadReportContext(orgId: string) {
  const [projectsRes, opexRes, recvRes, opexRealRes] = await Promise.all([
    supabase.from('planner_projects').select('id, name').eq('org_id', orgId),
    supabase.from('planner_opex_categories').select('id, name').eq('org_id', orgId),
    supabase.from('planner_receivables').select('id, debtor_project_id').eq('org_id', orgId),
    supabase.from('planner_opex_realizations').select('id, category_id').eq('org_id', orgId),
  ]);

  const projectNames: Record<string, string> = {};
  for (const p of projectsRes.data || []) {
    projectNames[p.id as string] = p.name as string;
  }

  const opexCategoryNames: Record<string, string> = {};
  for (const c of opexRes.data || []) {
    opexCategoryNames[c.id as string] = c.name as string;
  }

  const receivableProjectMap: Record<string, string | null> = {};
  for (const r of recvRes.data || []) {
    receivableProjectMap[r.id as string] = (r.debtor_project_id as string) || null;
  }

  const opexRealizationCategory: Record<string, string> = {};
  for (const r of opexRealRes.data || []) {
    opexRealizationCategory[r.id as string] = r.category_id as string;
  }

  return { projectNames, opexCategoryNames, receivableProjectMap, opexRealizationCategory };
}

export async function buildFinanceReportBundle(filters: ReportFilters): Promise<FinanceReportBundle> {
  const ctx = await loadReportContext(filters.orgId);

  const profitLoss = await buildProfitLossReport(filters, ctx);
  const [balanceSheet, cashFlow, projects, investors] = await Promise.all([
    buildBalanceSheetReport(filters),
    buildCashFlowReport(filters),
    buildProjectFinanceReports(filters, ctx.projectNames),
    buildInvestorReport(filters, profitLoss.netProfit),
  ]);

  return {
    filters,
    profitLoss,
    balanceSheet,
    cashFlow,
    projects,
    investors,
  };
}

export * from './types';
export { buildProfitLossReport } from './profitLossReport';
export { buildBalanceSheetReport } from './balanceSheetReport';
export { buildCashFlowReport } from './cashFlowReport';
