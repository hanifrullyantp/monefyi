import type {
  BudgetAnalysis,
  BudgetBreakdownSegment,
  BudgetCategory,
  BudgetExternalData,
  BudgetFrequency,
  BudgetItem,
  BudgetScenarioKey,
  BudgetScenarios,
  BudgetUsahaDocument,
  BudgetViewMode,
} from '../../../types/budgetUsaha';
import { BUDGET_CATEGORY_COLORS, SCENARIO_MULTIPLIERS } from '../../../types/budgetUsaha';

const DEFAULT_TAX_RATE = 0.11;
const MONTHS_IN_YEAR = 12;

/** Normalize item amount to monthly equivalent. */
export function itemToMonthly(amount: number, frequency: BudgetFrequency): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  switch (frequency) {
    case 'monthly':
      return amount;
    case 'yearly':
      return amount / MONTHS_IN_YEAR;
    case 'one-time':
      return amount / MONTHS_IN_YEAR;
    default:
      return amount;
  }
}

/** Effective amount for an item (manual override > auto > manual amount). */
export function effectiveItemAmount(item: BudgetItem): number {
  if (item.manualOverride != null && Number.isFinite(item.manualOverride)) {
    return item.manualOverride;
  }
  if (item.isAutoLinked && item.autoAmount != null && Number.isFinite(item.autoAmount)) {
    return item.autoAmount;
  }
  return item.amount;
}

export function categorySubtotal(category: BudgetCategory): number {
  return category.items.reduce(
    (sum, item) => sum + itemToMonthly(effectiveItemAmount(item), item.frequency),
    0,
  );
}

export function documentMonthlyTotal(categories: BudgetCategory[]): number {
  return categories.reduce((sum, cat) => sum + categorySubtotal(cat), 0);
}

export function applyAutoLinkAmounts(
  doc: BudgetUsahaDocument,
  external: BudgetExternalData,
): BudgetUsahaDocument {
  const categories = doc.categories.map(cat => ({
    ...cat,
    items: cat.items.map(item => {
      if (!item.isAutoLinked || !item.linkedTo) return item;
      const key = item.linkedTo.detailKey ?? '';
      let autoAmount = item.autoAmount ?? 0;
      if (key === 'hr.total_gaji_tetap' || key === 'hr.tunjangan') {
        autoAmount = external.hrPayroll.totalMonthly;
      } else if (key === 'hr.thr') {
        autoAmount = external.hrPayroll.totalMonthly;
      } else if (key === 'rap.material') {
        autoAmount = external.rapCosts.materialMonthly;
      } else if (key === 'rap.labor') {
        autoAmount = external.rapCosts.laborMonthly;
      }
      return { ...item, autoAmount };
    }),
    subtotal: undefined as number | undefined,
  }));
  return {
    ...doc,
    categories: categories.map(c => ({ ...c, subtotal: categorySubtotal(c) })),
  };
}

export function calculateNetProfit(
  revenueMonthly: number,
  costMonthly: number,
  taxRate = DEFAULT_TAX_RATE,
): { grossProfit: number; netProfit: number; tax: number } {
  const grossProfit = revenueMonthly - costMonthly;
  const tax = grossProfit > 0 ? grossProfit * taxRate : 0;
  const netProfit = grossProfit - tax;
  return { grossProfit, netProfit, tax };
}

export function calculateMargin(netProfit: number, revenue: number): number {
  if (!revenue || revenue <= 0) return 0;
  return Math.round((netProfit / revenue) * 1000) / 10;
}

export function calculateBreakEven(
  fixedCostsMonthly: number,
  revenueMonthly: number,
  variableCostMonthly: number,
): number {
  if (revenueMonthly <= 0) return fixedCostsMonthly;
  const variableRate = Math.min(0.95, Math.max(0, variableCostMonthly / revenueMonthly));
  const contribution = 1 - variableRate;
  if (contribution <= 0) return fixedCostsMonthly;
  return Math.round(fixedCostsMonthly / contribution);
}

export function calculateROI(netProfitYearly: number, totalInvestment: number): number {
  if (!totalInvestment || totalInvestment <= 0) return 0;
  return Math.round((netProfitYearly / totalInvestment) * 1000) / 10;
}

export function calculateCashRunway(kasBalance: number, monthlyBurn: number): number {
  if (!monthlyBurn || monthlyBurn <= 0) return 99;
  return Math.round((kasBalance / monthlyBurn) * 10) / 10;
}

function projectCategoryTotals(categories: BudgetCategory[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const cat of categories) {
    totals[cat.name] = categorySubtotal(cat);
  }
  return totals;
}

function buildBreakdown(
  netProfitMonthly: number,
  categoryTotals: Record<string, number>,
  taxMonthly: number,
): BudgetBreakdownSegment[] {
  const segments: Array<{ key: string; label: string; amount: number; color: string }> = [
    { key: 'laba', label: 'Laba Bersih', amount: Math.max(0, netProfitMonthly), color: '#10B981' },
    ...Object.entries(categoryTotals).map(([name, amount]) => ({
      key: name.toLowerCase(),
      label: name.charAt(0) + name.slice(1).toLowerCase(),
      amount,
      color: BUDGET_CATEGORY_COLORS[name] ?? '#94A3B8',
    })),
    { key: 'pajak', label: 'Pajak', amount: taxMonthly, color: BUDGET_CATEGORY_COLORS.PAJAK },
  ].filter(s => s.amount > 0);

  const total = segments.reduce((s, seg) => s + seg.amount, 0) || 1;
  return segments.map(seg => ({
    ...seg,
    percent: Math.round((seg.amount / total) * 1000) / 10,
  }));
}

export function buildScenarios(
  baseNetProfitMonthly: number,
  revenueMonthly: number,
): BudgetScenarios {
  const keys: BudgetScenarioKey[] = ['conservative', 'realistic', 'aggressive'];
  const result: BudgetScenarios = {
    active: 'realistic',
    conservative: { revenueMultiplier: 0.8, netProfit: 0, netProfitMonthly: 0 },
    realistic: { revenueMultiplier: 1.0, netProfit: 0, netProfitMonthly: 0 },
    aggressive: { revenueMultiplier: 1.3, netProfit: 0, netProfitMonthly: 0 },
  };
  for (const key of keys) {
    const mult = SCENARIO_MULTIPLIERS[key];
    const rev = revenueMonthly * mult;
    const costRatio = revenueMonthly > 0 ? 1 - baseNetProfitMonthly / revenueMonthly : 0.7;
    const estimated = rev * (1 - costRatio) * (1 - DEFAULT_TAX_RATE);
    result[key] = {
      revenueMultiplier: mult,
      netProfitMonthly: Math.round(estimated),
      netProfit: Math.round(estimated * MONTHS_IN_YEAR),
    };
  }
  return result;
}

export function calculateBudgetAnalysis(
  doc: BudgetUsahaDocument,
  external: BudgetExternalData,
  viewMode: BudgetViewMode = doc.period.viewMode,
): BudgetAnalysis {
  const enriched = applyAutoLinkAmounts(doc, external);
  const categoryTotals = projectCategoryTotals(enriched.categories);
  const totalCostMonthly = documentMonthlyTotal(enriched.categories);
  const totalCostYearly = totalCostMonthly * MONTHS_IN_YEAR;

  const scenarioMult = SCENARIO_MULTIPLIERS[doc.scenarios.active] ?? 1;
  const revenueMonthly = external.revenue.monthlyAverage * scenarioMult;
  const revenueYearly = external.revenue.projected * scenarioMult;

  const projectCostMonthly =
    (categoryTotals.PROYEK ?? 0) +
    external.rapCosts.materialMonthly +
    external.rapCosts.laborMonthly;
  const variableMonthly = projectCostMonthly;
  const fixedMonthly = Math.max(0, totalCostMonthly - projectCostMonthly);

  const { grossProfit, netProfit, tax } = calculateNetProfit(revenueMonthly, totalCostMonthly);
  const netProfitYearly = netProfit * MONTHS_IN_YEAR;
  const margin = calculateMargin(netProfit, revenueMonthly);
  const breakEvenPoint = calculateBreakEven(fixedMonthly, revenueMonthly, variableMonthly);
  const roiProjected = calculateROI(netProfitYearly, totalCostYearly);
  const cashRunwayMonths = calculateCashRunway(external.kasBalance, totalCostMonthly);
  const cashFlowPositive = netProfit > 0;
  const positiveFromMonth = cashFlowPositive ? 1 : 0;

  const displayMultiplier = viewMode === 'yearly' ? MONTHS_IN_YEAR : 1;

  return {
    revenue: {
      ...external.revenue,
      projected: revenueYearly,
      monthlyAverage: revenueMonthly,
    },
    totalCostMonthly: totalCostMonthly * displayMultiplier,
    totalCostYearly,
    grossProfit: grossProfit * displayMultiplier,
    netProfit: netProfitYearly,
    netProfitMonthly: netProfit,
    margin,
    breakEvenPoint: breakEvenPoint * displayMultiplier,
    roiProjected,
    cashRunwayMonths,
    cashFlowPositive,
    positiveFromMonth,
    kasBalance: external.kasBalance,
    breakdown: buildBreakdown(netProfit, categoryTotals, tax),
    categoryTotals: Object.fromEntries(
      Object.entries(categoryTotals).map(([k, v]) => [k, v * displayMultiplier]),
    ),
  };
}

export function recalculateDocument(
  doc: BudgetUsahaDocument,
  external: BudgetExternalData,
): { doc: BudgetUsahaDocument; analysis: BudgetAnalysis } {
  const enriched = applyAutoLinkAmounts(doc, external);
  const analysis = calculateBudgetAnalysis(enriched, external);
  const scenarios = buildScenarios(analysis.netProfitMonthly, analysis.revenue.monthlyAverage);
  scenarios.active = doc.scenarios.active;
  const now = new Date().toISOString();
  return {
    doc: {
      ...enriched,
      scenarios,
      metadata: {
        ...enriched.metadata,
        updatedAt: now,
        lastCalculatedAt: now,
      },
    },
    analysis,
  };
}
