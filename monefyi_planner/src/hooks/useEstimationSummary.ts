import { useMemo } from 'react';
import { calcEstimationSummary, countedEstimationItems } from '../lib/estimatorCalc';
import type { EstimationFormDraft, EstimationSummary } from '../types/estimator';

const EMPTY_SUMMARY: EstimationSummary = {
  subtotalHpp: 0,
  subtotalSellingGross: 0,
  itemDiscountTotal: 0,
  subtotalSellingItems: 0,
  overheadAmount: 0,
  subtotalBeforeDiscount: 0,
  discountAmountPct: 0,
  discountAmountFixed: 0,
  adjustmentTotal: 0,
  discountAmount: 0,
  afterDiscount: 0,
  taxAmount: 0,
  grandTotal: 0,
  totalProfit: 0,
  avgMarginPct: 0,
};

export function useEstimationSummary(draft: EstimationFormDraft | null) {
  return useMemo(() => {
    if (!draft) {
      return { summary: EMPTY_SUMMARY, countedItemCount: 0 };
    }
    const countedItems = countedEstimationItems(draft.items);
    const summary = calcEstimationSummary(
      countedItems,
      draft.overhead_pct,
      draft.discount_pct,
      draft.tax_pct,
      { discountAmount: draft.discount_amount, adjustments: draft.adjustments },
    );
    return { summary, countedItemCount: countedItems.length };
  }, [draft]);
}
