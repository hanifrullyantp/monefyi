import { describe, expect, it } from 'vitest';
import { calcEstimationSummary, summaryOptsFromDraft } from './estimatorCalc';
import { emptyBillingConfig } from './estimationBillingConfig';
import type { EstimationFormDraft } from '../types/estimator';

describe('calcEstimationSummary - potongan tagihan', () => {
  it('subtracts billing discount from grand total', () => {
    const items = [{
      name: 'Item',
      category: 'jasa',
      unit: 'ls',
      qty: 1,
      hpp_per_unit: 1_000_000,
      margin_pct: 0,
      selling_price_per_unit: 10_000_000,
      item_discount_pct: 0,
      item_discount_amount: 0,
      is_bonus: false,
      included: true,
      total_hpp: 1_000_000,
      total_selling: 10_000_000,
      total_profit: 9_000_000,
      sort_order: 0,
      notes: '',
    }];
    const s = calcEstimationSummary(items, 0, 0, 0, {
      billingDiscountAmount: 2_000_000,
      billingBonusNote: 'Free 1 bulan garansi',
    });
    expect(s.grossTotal).toBe(10_000_000);
    expect(s.grandTotal).toBe(8_000_000);
    expect(s.billingBonusNote).toBe('Free 1 bulan garansi');
  });
});

describe('summaryOptsFromDraft', () => {
  it('reads billing fields from draft', () => {
    const draft = {
      discount_amount: 0,
      adjustments: [],
      billing_config: {
        ...emptyBillingConfig(50),
        billing_discount_amount: 500_000,
        billing_bonus_note: 'Bonus cat',
      },
    } as Pick<EstimationFormDraft, 'discount_amount' | 'adjustments' | 'billing_config'>;
    const opts = summaryOptsFromDraft(draft);
    expect(opts.billingDiscountAmount).toBe(500_000);
    expect(opts.billingBonusNote).toBe('Bonus cat');
  });
});
