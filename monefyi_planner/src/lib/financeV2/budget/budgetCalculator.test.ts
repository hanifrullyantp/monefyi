import { describe, it, expect } from 'vitest';
import {
  itemToMonthly,
  effectiveItemAmount,
  categorySubtotal,
  calculateNetProfit,
  calculateMargin,
  calculateBreakEven,
  calculateROI,
  calculateCashRunway,
  calculateBudgetAnalysis,
  applyAutoLinkAmounts,
} from './budgetCalculator';
import type { BudgetCategory, BudgetExternalData, BudgetItem } from '../../../types/budgetUsaha';
import { createEmptyDocument } from '../../../types/budgetUsaha';

function item(partial: Partial<BudgetItem>): BudgetItem {
  return {
    id: '1',
    name: 'Test',
    icon: 'circle',
    amount: 0,
    frequency: 'monthly',
    isAutoLinked: false,
    ...partial,
  };
}

const mockExternal: BudgetExternalData = {
  revenue: {
    fromActiveProjects: 600_000_000,
    fromPipeline: 200_000_000,
    projected: 800_000_000,
    monthlyAverage: 800_000_000 / 12,
    confidence: 'medium',
  },
  hrPayroll: {
    totalMonthly: 25_000_000,
    members: [{ memberId: 'm1', name: 'Budi', monthlySalary: 25_000_000 }],
  },
  rapCosts: {
    materialMonthly: 30_000_000,
    laborMonthly: 20_000_000,
    byProject: [],
  },
  kasBalance: 150_000_000,
};

describe('itemToMonthly', () => {
  it('monthly — returns same amount', () => {
    expect(itemToMonthly(5_000_000, 'monthly')).toBe(5_000_000);
  });

  it('yearly — divides by 12', () => {
    expect(itemToMonthly(12_000_000, 'yearly')).toBe(1_000_000);
  });

  it('one-time — spreads over 12 months', () => {
    expect(itemToMonthly(12_000_000, 'one-time')).toBe(1_000_000);
  });
});

describe('effectiveItemAmount', () => {
  it('manual override wins over auto', () => {
    expect(
      effectiveItemAmount(item({ amount: 1, autoAmount: 2, manualOverride: 3, isAutoLinked: true })),
    ).toBe(3);
  });

  it('auto amount when linked', () => {
    expect(effectiveItemAmount(item({ amount: 1, autoAmount: 2, isAutoLinked: true }))).toBe(2);
  });
});

describe('calculateNetProfit', () => {
  it('applies 11% tax on positive gross', () => {
    const { grossProfit, netProfit } = calculateNetProfit(100_000_000, 60_000_000);
    expect(grossProfit).toBe(40_000_000);
    expect(netProfit).toBeCloseTo(40_000_000 * 0.89, 0);
  });
});

describe('calculateMargin', () => {
  it('returns percent rounded to 1 decimal', () => {
    expect(calculateMargin(25, 100)).toBe(25);
  });
});

describe('calculateBreakEven', () => {
  it('returns fixed costs when no revenue', () => {
    expect(calculateBreakEven(50_000_000, 0, 10_000_000)).toBe(50_000_000);
  });
});

describe('calculateROI', () => {
  it('annual ROI from net profit and investment', () => {
    expect(calculateROI(120_000_000, 600_000_000)).toBe(20);
  });
});

describe('calculateCashRunway', () => {
  it('kas divided by monthly burn', () => {
    expect(calculateCashRunway(120_000_000, 10_000_000)).toBe(12);
  });

  it('returns 99 when no burn', () => {
    expect(calculateCashRunway(100, 0)).toBe(99);
  });
});

describe('applyAutoLinkAmounts', () => {
  it('fills HR and RAP auto amounts', () => {
    const doc = createEmptyDocument('org', 2026);
    doc.categories = [
      {
        id: 'c1',
        name: 'OPERASIONAL',
        icon: 'truck',
        color: '#2563EB',
        order: 1,
        items: [
          item({
            name: 'Gaji',
            isAutoLinked: true,
            linkedTo: { source: 'hr', detailKey: 'hr.total_gaji_tetap' },
          }),
        ],
      },
      {
        id: 'c2',
        name: 'PROYEK',
        icon: 'hammer',
        color: '#F97316',
        order: 2,
        items: [
          item({
            name: 'Material',
            isAutoLinked: true,
            linkedTo: { source: 'rap', detailKey: 'rap.material' },
          }),
        ],
      },
    ] as BudgetCategory[];

    const enriched = applyAutoLinkAmounts(doc, mockExternal);
    expect(enriched.categories[0].items[0].autoAmount).toBe(25_000_000);
    expect(enriched.categories[1].items[0].autoAmount).toBe(30_000_000);
  });
});

describe('calculateBudgetAnalysis', () => {
  it('produces positive net profit with sample data', () => {
    const doc = createEmptyDocument('org', 2026);
    doc.categories = [
      {
        id: 'c1',
        name: 'OPERASIONAL',
        icon: 'truck',
        color: '#2563EB',
        order: 1,
        items: [item({ name: 'Sewa', amount: 8_000_000 })],
      },
    ] as BudgetCategory[];

    const analysis = calculateBudgetAnalysis(doc, mockExternal);
    expect(analysis.netProfitMonthly).toBeGreaterThan(0);
    expect(analysis.margin).toBeGreaterThan(0);
    expect(analysis.breakdown.length).toBeGreaterThan(0);
    expect(analysis.cashRunwayMonths).toBeGreaterThan(0);
  });
});

describe('categorySubtotal', () => {
  it('sums monthly equivalents', () => {
    const cat: BudgetCategory = {
      id: 'c',
      name: 'OPERASIONAL',
      icon: 'truck',
      color: '#2563EB',
      order: 1,
      items: [
        item({ amount: 10_000_000, frequency: 'monthly' }),
        item({ amount: 12_000_000, frequency: 'yearly' }),
      ],
    };
    expect(categorySubtotal(cat)).toBe(11_000_000);
  });
});
