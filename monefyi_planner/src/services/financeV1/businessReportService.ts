import { supabase } from '../../lib/supabase';
import type { CostRealization } from '../costService';
import type { ProjectIncome } from '../incomeService';
import type {
  BusinessFinanceReport,
  FinanceV1ReportFilters,
  HppTypeRow,
  OpexCategoryRow,
  ProjectAmountRow,
  ProjectProfitRow,
} from '../../types/financeV1Report';
import { HPP_TYPE_LABELS } from '../../types/financeV1Report';
import { ensureDefaultOpexCategories, loadOpexRealizationsInRange } from './opexService';
import { filterEligibleProjectIds } from '../../lib/financeReportEligibility';

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function inDateRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

async function loadProjects(orgId: string) {
  const { data, error } = await supabase
    .from('planner_projects')
    .select('id, name, finance_report_month')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('name');
  if (error) throw new Error(error.message);
  return (data || []) as { id: string; name: string; finance_report_month?: string | null }[];
}

async function loadIncomesInRange(
  projectIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<ProjectIncome[]> {
  if (!projectIds.length) return [];

  const { data, error } = await supabase
    .from('planner_project_incomes')
    .select('*')
    .in('project_id', projectIds)
    .eq('status', 'received')
    .gte('date', dateFrom)
    .lte('date', dateTo);

  if (error) throw new Error(error.message);
  return (data || []).map(row => ({
    ...row,
    amount: Number(row.amount) || 0,
  })) as ProjectIncome[];
}

async function loadCostsInRange(
  projectIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<CostRealization[]> {
  if (!projectIds.length) return [];

  const { data, error } = await supabase
    .from('planner_cost_realizations')
    .select('*')
    .in('project_id', projectIds)
    .gte('date', dateFrom)
    .lte('date', dateTo);

  if (error) throw new Error(error.message);
  return (data || []).map(row => ({
    ...row,
    total_amount: Number(row.total_amount) || 0,
  })) as CostRealization[];
}

async function loadRapTypes(projectIds: string[]): Promise<Map<string, string>> {
  if (!projectIds.length) return new Map();

  const { data, error } = await supabase
    .from('planner_rap_items')
    .select('id, type')
    .in('project_id', projectIds);

  if (error) throw new Error(error.message);
  return new Map((data || []).map(r => [r.id as string, (r.type as string) || 'other']));
}

export async function buildBusinessFinanceReport(
  orgId: string,
  filters: FinanceV1ReportFilters,
): Promise<BusinessFinanceReport> {
  const projects = await loadProjects(orgId);
  const projectNameMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

  const eligibleIds = filterEligibleProjectIds(
    projects,
    filters.dateFrom,
    filters.dateTo,
    filters.projectId,
  );

  const scopedIds = filters.projectId
    ? [...eligibleIds]
    : [...eligibleIds];

  const [incomes, costs, rapTypes, categories] = await Promise.all([
    loadIncomesInRange(scopedIds, filters.dateFrom, filters.dateTo),
    loadCostsInRange(scopedIds, filters.dateFrom, filters.dateTo),
    loadRapTypes(scopedIds),
    ensureDefaultOpexCategories(orgId),
  ]);

  const opexRows = await loadOpexRealizationsInRange(orgId, filters.dateFrom, filters.dateTo);
  const categoryNameMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  const revenueByProject: Record<string, number> = {};
  for (const inc of incomes) {
    if (!inDateRange(inc.date, filters.dateFrom, filters.dateTo)) continue;
    revenueByProject[inc.project_id] = (revenueByProject[inc.project_id] || 0) + inc.amount;
  }

  const totalRevenue = Object.values(revenueByProject).reduce((s, v) => s + v, 0);

  const revenueRows: ProjectAmountRow[] = Object.entries(revenueByProject)
    .map(([projectId, amount]) => ({
      projectId,
      projectName: projectNameMap[projectId] || 'Proyek',
      amount,
      pctOfTotal: pct(amount, totalRevenue),
    }))
    .sort((a, b) => b.amount - a.amount);

  const hppByType: Record<string, number> = {};
  const hppByProject: Record<string, number> = {};

  for (const cost of costs) {
    if (!inDateRange(cost.date, filters.dateFrom, filters.dateTo)) continue;
    const amount = Number(cost.total_amount) || 0;
    const rapType = cost.rap_item_id ? (rapTypes.get(cost.rap_item_id) || 'other') : 'uncategorized';
    hppByType[rapType] = (hppByType[rapType] || 0) + amount;
    hppByProject[cost.project_id] = (hppByProject[cost.project_id] || 0) + amount;
  }

  const totalHpp = Object.values(hppByType).reduce((s, v) => s + v, 0);

  const typeOrder = ['material', 'labor', 'equipment', 'overhead', 'other', 'uncategorized'];
  const hppRows: HppTypeRow[] = typeOrder
    .filter(t => (hppByType[t] || 0) > 0)
    .map(type => ({
      type,
      label: HPP_TYPE_LABELS[type] || type,
      amount: hppByType[type] || 0,
      pctOfTotal: pct(hppByType[type] || 0, totalHpp),
    }));

  const grossProfit = totalRevenue - totalHpp;

  const opexByCategory: Record<string, number> = {};
  for (const row of opexRows) {
    opexByCategory[row.category_id] = (opexByCategory[row.category_id] || 0) + row.amount;
  }

  const totalOpex = Object.values(opexByCategory).reduce((s, v) => s + v, 0);

  const opexCategoryRows: OpexCategoryRow[] = Object.entries(opexByCategory)
    .map(([categoryId, amount]) => ({
      categoryId,
      categoryName: categoryNameMap[categoryId] || 'Kategori',
      amount,
      pctOfTotal: pct(amount, totalOpex),
    }))
    .sort((a, b) => b.amount - a.amount);

  const netProfit = grossProfit - totalOpex;

  const allProjectIds = new Set([
    ...Object.keys(revenueByProject),
    ...Object.keys(hppByProject),
  ]);

  const byProjectProfit: ProjectProfitRow[] = [...allProjectIds].map(projectId => {
    const revenue = revenueByProject[projectId] || 0;
    const hpp = hppByProject[projectId] || 0;
    const gp = revenue - hpp;
    return {
      projectId,
      projectName: projectNameMap[projectId] || 'Proyek',
      revenue,
      hpp,
      grossProfit: gp,
      marginPct: pct(gp, revenue),
    };
  }).sort((a, b) => b.grossProfit - a.grossProfit);

  return {
    filters,
    generatedAt: new Date().toISOString(),
    revenue: { total: totalRevenue, byProject: revenueRows },
    hpp: { total: totalHpp, byType: hppRows },
    grossProfit,
    grossMarginPct: pct(grossProfit, totalRevenue),
    opex: { total: totalOpex, byCategory: opexCategoryRows },
    netProfit,
    netMarginPct: pct(netProfit, totalRevenue),
    byProjectProfit,
  };
}

export function currentMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const dateFrom = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const dateTo = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { dateFrom, dateTo };
}

export function presetRange(preset: 'this_month' | 'last_month' | 'this_quarter' | 'this_year'): {
  dateFrom: string;
  dateTo: string;
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (preset === 'this_month') return currentMonthRange();

  if (preset === 'last_month') {
    const lm = m === 0 ? 11 : m - 1;
    const ly = m === 0 ? y - 1 : y;
    const dateFrom = `${ly}-${String(lm + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(ly, lm + 1, 0).getDate();
    const dateTo = `${ly}-${String(lm + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { dateFrom, dateTo };
  }

  if (preset === 'this_quarter') {
    const qStart = Math.floor(m / 3) * 3;
    const dateFrom = `${y}-${String(qStart + 1).padStart(2, '0')}-01`;
    const qEnd = qStart + 2;
    const lastDay = new Date(y, qEnd + 1, 0).getDate();
    const dateTo = `${y}-${String(qEnd + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { dateFrom, dateTo };
  }

  return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31` };
}
