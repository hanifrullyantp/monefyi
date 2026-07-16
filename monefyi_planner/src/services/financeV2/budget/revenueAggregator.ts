import type { Project } from '../../../store/appStore';
import type { BudgetConfidence, BudgetRevenueProjection } from '../../../types/budgetUsaha';
import { loadAllIncomes } from '../../incomeService';

const PIPELINE_WEIGHT = 0.6;
const ACTIVE_STATUSES = new Set(['active', 'planning']);
const PIPELINE_STATUSES = new Set(['draft']);

function contractValue(project: Project): number {
  return Number(project.contract_value) || Number(project.total_budget_planned) || 0;
}

function confidenceFromHistory(
  incomes: Awaited<ReturnType<typeof loadAllIncomes>>,
  projected: number,
): BudgetConfidence {
  if (!incomes.length || projected <= 0) return 'low';
  const received = incomes.filter(i => i.status === 'received').length;
  const ratio = received / incomes.length;
  if (ratio >= 0.7) return 'high';
  if (ratio >= 0.4) return 'medium';
  return 'low';
}

/**
 * Aggregate revenue from active projects + pipeline (60% probability on draft).
 */
export async function aggregateRevenue(
  orgId: string,
  projects: Project[],
  year: number,
): Promise<BudgetRevenueProjection> {
  const active = projects.filter(p => ACTIVE_STATUSES.has(p.status));
  const pipeline = projects.filter(p => PIPELINE_STATUSES.has(p.status));

  const fromActiveProjects = active.reduce((s, p) => s + contractValue(p), 0);
  const fromPipeline = pipeline.reduce((s, p) => s + contractValue(p) * PIPELINE_WEIGHT, 0);
  const projected = fromActiveProjects + fromPipeline;

  const monthsSpan = 12;
  const monthlyAverage = projected / monthsSpan;

  let confidence: BudgetConfidence = 'medium';
  try {
    const incomes = await loadAllIncomes(orgId);
    const yearIncomes = incomes.filter(i => i.date.startsWith(String(year)));
    confidence = confidenceFromHistory(yearIncomes.length ? yearIncomes : incomes, projected);
  } catch {
    confidence = projected > 0 ? 'medium' : 'low';
  }

  return {
    fromActiveProjects,
    fromPipeline,
    projected,
    monthlyAverage,
    confidence,
  };
}

/** Monthly revenue curve from historical incomes + even forecast split. */
export function projectMonthlyCurve(
  projects: Project[],
  incomes: Array<{ date: string; amount: number; status: string }>,
  year: number,
): number[] {
  const monthly = Array(12).fill(0) as number[];
  for (const inc of incomes) {
    if (!inc.date.startsWith(String(year)) || inc.status !== 'received') continue;
    const m = parseInt(inc.date.slice(5, 7), 10) - 1;
    if (m >= 0 && m < 12) monthly[m] += inc.amount;
  }

  const hasHistory = monthly.some(v => v > 0);
  if (!hasHistory) {
    const active = projects.filter(p => ACTIVE_STATUSES.has(p.status));
    const total = active.reduce((s, p) => s + contractValue(p), 0);
    const perMonth = total / 12;
    return monthly.map(() => perMonth);
  }
  return monthly;
}
