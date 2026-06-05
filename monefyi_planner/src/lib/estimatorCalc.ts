import type { EstimationItemDraft, EstimationSummary } from '../types/estimator';

export function sellingFromHpp(hppPerUnit: number, marginPct: number): number {
  return hppPerUnit * (1 + marginPct / 100);
}

export function marginFromSelling(hppPerUnit: number, sellingPerUnit: number): number {
  if (hppPerUnit <= 0) return 0;
  return ((sellingPerUnit - hppPerUnit) / hppPerUnit) * 100;
}

/** HPP estimasi dari harga jual + margin% (harga jual ditentukan dulu). */
export function hppFromSellingAndMargin(sellingPerUnit: number, marginPct: number): number {
  const m = Number(marginPct) || 0;
  if (m <= -100) return sellingPerUnit;
  return sellingPerUnit / (1 + m / 100);
}

export type ItemPriceEdit = 'selling' | 'margin' | 'hpp' | 'qty';

/**
 * Harga jual + margin% adalah input utama; HPP diestimasi dari keduanya.
 * Edit HPP manual → margin% disesuaikan (harga jual tetap).
 */
export function calcItemRow(
  draft: Pick<EstimationItemDraft, 'qty' | 'hpp_per_unit' | 'margin_pct' | 'selling_price_per_unit'>,
  editField: ItemPriceEdit = 'selling',
): Pick<EstimationItemDraft, 'hpp_per_unit' | 'selling_price_per_unit' | 'total_hpp' | 'total_selling' | 'total_profit' | 'margin_pct'> {
  const qty = Number(draft.qty) || 0;
  let hpp = Number(draft.hpp_per_unit) || 0;
  let selling = Number(draft.selling_price_per_unit) || 0;
  let margin = Number(draft.margin_pct) || 0;

  if (editField === 'qty') {
    // hanya update total
  } else if (editField === 'hpp') {
    hpp = Number(draft.hpp_per_unit) || 0;
    margin = marginFromSelling(hpp, selling);
  } else if (editField === 'margin') {
    margin = Number(draft.margin_pct) || 0;
    hpp = hppFromSellingAndMargin(selling, margin);
  } else {
    selling = Number(draft.selling_price_per_unit) || 0;
    hpp = hppFromSellingAndMargin(selling, margin);
  }

  const totalHpp = qty * hpp;
  const totalSelling = qty * selling;
  return {
    hpp_per_unit: hpp,
    selling_price_per_unit: selling,
    margin_pct: margin,
    total_hpp: totalHpp,
    total_selling: totalSelling,
    total_profit: totalSelling - totalHpp,
  };
}

export function calcEstimationSummary(
  items: EstimationItemDraft[],
  overheadPct: number,
  discountPct: number,
  taxPct: number,
): EstimationSummary {
  const subtotalHpp = items.reduce((s, i) => s + (Number(i.total_hpp) || 0), 0);
  const subtotalSellingItems = items.reduce((s, i) => s + (Number(i.total_selling) || 0), 0);
  const overheadAmount = subtotalHpp * (overheadPct / 100);
  const subtotalBeforeDiscount = subtotalSellingItems + overheadAmount;
  const discountAmount = subtotalBeforeDiscount * (discountPct / 100);
  const afterDiscount = subtotalBeforeDiscount - discountAmount;
  const taxAmount = afterDiscount * (taxPct / 100);
  const grandTotal = afterDiscount + taxAmount;
  const itemProfit = items.reduce((s, i) => s + (Number(i.total_profit) || 0), 0);
  const totalProfit = itemProfit - discountAmount;
  const avgMarginPct = subtotalHpp > 0
    ? ((subtotalSellingItems - subtotalHpp) / subtotalHpp) * 100
    : 0;

  return {
    subtotalHpp,
    subtotalSellingItems,
    overheadAmount,
    subtotalBeforeDiscount,
    discountAmount,
    afterDiscount,
    taxAmount,
    grandTotal,
    totalProfit,
    avgMarginPct,
  };
}

export function emptyItem(sortOrder = 0): EstimationItemDraft {
  return {
    name: '',
    category: 'material',
    unit: 'pcs',
    qty: 1,
    hpp_per_unit: 0,
    margin_pct: 20,
    selling_price_per_unit: 0,
    total_hpp: 0,
    total_selling: 0,
    total_profit: 0,
    sort_order: sortOrder,
    notes: '',
  };
}
