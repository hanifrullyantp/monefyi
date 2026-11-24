import { supabase } from '../../lib/supabase';
import {
  buildOverviewThreeCards,
  type FinanceOverviewThreeCardsData,
} from '../../lib/financeV2/overviewCards';
import { loadEnrichedJournalLines } from '../../lib/financeV2/reports/loadReportData';
import { loadAccounts } from './accountService';
import { loadOpexBudgets, loadOpexCategories } from './opexService';
import { loadPayables } from './payableService';
import { loadReceivables } from './receivableService';

function currentMonthRange(now = new Date()): {
  todayIso: string;
  monthStart: string;
  monthEnd: string;
  month: number;
  year: number;
  monthLabel: string;
} {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  return {
    todayIso: now.toISOString().slice(0, 10),
    monthStart: `${year}-${mm}-01`,
    monthEnd: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    month,
    year,
    monthLabel: `${year}-${mm}`,
  };
}

export async function loadOverviewThreeCards(
  orgId: string,
  projects: { id: string; name: string }[],
): Promise<FinanceOverviewThreeCardsData> {
  const range = currentMonthRange();
  const [
    accounts,
    monthLines,
    allProjectLines,
    receivables,
    payables,
    opexCategories,
    opexBudgets,
    rapRes,
    opexRealRes,
  ] = await Promise.all([
    loadAccounts(orgId),
    loadEnrichedJournalLines({ orgId, dateFrom: range.monthStart, dateTo: range.monthEnd }),
    loadEnrichedJournalLines({ orgId, dateFrom: '2000-01-01', dateTo: '2099-12-31' }),
    loadReceivables(orgId),
    loadPayables(orgId),
    loadOpexCategories(orgId),
    loadOpexBudgets(orgId, range.month, range.year),
    supabase.from('planner_rap_items').select('project_id, planned_amount').eq('org_id', orgId),
    supabase.from('planner_opex_realizations').select('id, category_id').eq('org_id', orgId),
  ]);

  const projectNames: Record<string, string> = {};
  for (const p of projects) {
    projectNames[p.id] = p.name;
  }

  const rapPlannedByProject: Record<string, number> = {};
  for (const row of rapRes.data || []) {
    const pid = row.project_id as string;
    if (!pid) continue;
    rapPlannedByProject[pid] = (rapPlannedByProject[pid] || 0) + (Number(row.planned_amount) || 0);
  }

  const opexCategoryNames: Record<string, string> = {};
  for (const c of opexCategories) {
    opexCategoryNames[c.id] = c.name;
  }

  const opexRealizationCategory: Record<string, string> = {};
  for (const r of opexRealRes.data || []) {
    opexRealizationCategory[r.id as string] = r.category_id as string;
  }

  const receivableProjectMap: Record<string, string | null> = {};
  for (const rec of receivables) {
    receivableProjectMap[rec.id] = rec.debtor_project_id;
  }

  const monthlyOpexPlanned = opexBudgets.reduce((s, b) => s + (b.planned_amount || 0), 0);

  return buildOverviewThreeCards({
    todayIso: range.todayIso,
    monthLabel: range.monthLabel,
    accounts,
    monthLines,
    allProjectLines,
    projectNames,
    opexCategoryNames,
    receivableProjectMap,
    opexRealizationCategory,
    rapPlannedByProject,
    receivables,
    payables,
    monthlyOpexPlanned,
  });
}

