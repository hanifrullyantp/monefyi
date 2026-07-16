import type { BudgetAnalysis, BudgetInsight, BudgetUsahaDocument } from '../../../types/budgetUsaha';

const MARKETING_BASELINE = 0.08;
const OPERATIONAL_BASELINE = 0.25;

/**
 * Rule-based budget insights — no LLM dependency.
 */
export function generateBudgetInsights(
  doc: BudgetUsahaDocument,
  analysis: BudgetAnalysis,
): BudgetInsight[] {
  const insights: BudgetInsight[] = [];
  const revenue = analysis.revenue.monthlyAverage;
  if (revenue <= 0) return insights;

  const marketingCat = doc.categories.find(c => c.name === 'MARKETING');
  const marketingMonthly = marketingCat?.subtotal ?? analysis.categoryTotals.MARKETING ?? 0;
  const marketingRatio = marketingMonthly / revenue;

  if (marketingRatio < MARKETING_BASELINE) {
    insights.push({
      id: 'marketing-low',
      type: 'warning',
      icon: 'lightbulb',
      message: `Budget Marketing ${(marketingRatio * 100).toFixed(1)}% — rata-rata industri 8–10%. Pertimbangkan naik.`,
      action: {
        label: 'Terapkan Saran',
        kind: 'apply_suggestion',
        payload: { category: 'MARKETING', targetRatio: MARKETING_BASELINE },
      },
    });
  }

  const opMonthly = analysis.categoryTotals.OPERASIONAL ?? 0;
  const opRatio = opMonthly / revenue;
  if (opRatio < OPERATIONAL_BASELINE) {
    insights.push({
      id: 'operational-healthy',
      type: 'success',
      icon: 'check-circle',
      message: `Sehat: Rasio operasional ${(opRatio * 100).toFixed(1)}% (baseline <${OPERATIONAL_BASELINE * 100}%)`,
    });
  }

  const growthProfit = Math.round(analysis.netProfitMonthly * 1.4);
  insights.push({
    id: 'growth-tip',
    type: 'tip',
    icon: 'trending-up',
    message: `Dengan menaikkan revenue 20%, laba bisa naik ke Rp ${formatMillion(growthProfit)}/bln`,
    action: {
      label: 'Simulasikan',
      kind: 'simulate',
      payload: { scenario: 'aggressive' },
    },
  });

  if (analysis.cashRunwayMonths < 6 && analysis.cashRunwayMonths > 0) {
    insights.push({
      id: 'runway-warning',
      type: 'warning',
      icon: 'alert-triangle',
      message: `Runway kas hanya ${analysis.cashRunwayMonths} bulan — pertimbangkan menambah cadangan.`,
    });
  }

  return insights.slice(0, 3);
}

function formatMillion(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  return n.toLocaleString('id-ID');
}
