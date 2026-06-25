import type { EstimationAdjustment, EstimationItemDraft, EstimationSummary } from '../types/estimator';

/** Bulatkan ke Rupiah utuh */
export function roundIdr(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/**
 * Margin = laba dari harga jual (gross margin: laba ÷ jual × 100).
 * Contoh: jual 100rb + margin 40% → HPP 60rb.
 */
export function sellingFromHpp(hppPerUnit: number, marginPct: number): number {
  const m = Math.min(99.999, Math.max(0, Number(marginPct) || 0));
  const denom = 1 - m / 100;
  if (denom <= 0) return roundIdr(hppPerUnit);
  return roundIdr(hppPerUnit / denom);
}

export function marginFromSelling(hppPerUnit: number, sellingPerUnit: number): number {
  if (sellingPerUnit <= 0) return 0;
  return Math.round(((sellingPerUnit - hppPerUnit) / sellingPerUnit) * 1000) / 10;
}

/** HPP estimasi dari harga jual + margin% (gross margin: laba ÷ jual). */
export function hppFromSellingAndMargin(sellingPerUnit: number, marginPct: number): number {
  const m = Math.min(100, Math.max(0, Number(marginPct) || 0));
  if (m >= 100) return 0;
  return roundIdr(sellingPerUnit * (1 - m / 100));
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
  const qty = Math.max(0, Number(draft.qty) || 0);
  let hpp = Number(draft.hpp_per_unit) || 0;
  let selling = Number(draft.selling_price_per_unit) || 0;
  let margin = Number(draft.margin_pct) || 0;

  if (editField === 'qty') {
    // qty only — keep unit prices
  } else if (editField === 'hpp') {
    hpp = Number(draft.hpp_per_unit) || 0;
    if (selling > 0) {
      margin = marginFromSelling(hpp, selling);
    } else if (hpp > 0 && margin > 0) {
      selling = sellingFromHpp(hpp, margin);
    }
  } else if (editField === 'margin') {
    margin = Number(draft.margin_pct) || 0;
    if (selling > 0) {
      hpp = hppFromSellingAndMargin(selling, margin);
    } else if (hpp > 0) {
      selling = sellingFromHpp(hpp, margin);
    }
  } else {
    selling = Number(draft.selling_price_per_unit) || 0;
    if (selling > 0) {
      hpp = hppFromSellingAndMargin(selling, margin);
    } else if (hpp > 0 && margin > 0) {
      selling = sellingFromHpp(hpp, margin);
    }
  }

  hpp = roundIdr(hpp);
  selling = roundIdr(selling);
  const totalHpp = roundIdr(qty * hpp);
  const totalSelling = roundIdr(qty * selling);

  return {
    hpp_per_unit: hpp,
    selling_price_per_unit: selling,
    margin_pct: margin,
    total_hpp: totalHpp,
    total_selling: totalSelling,
    total_profit: effectiveItemSelling({ ...draft, total_hpp: totalHpp, total_selling: totalSelling, is_bonus: draft.is_bonus ?? false, item_discount_pct: draft.item_discount_pct ?? 0, item_discount_amount: draft.item_discount_amount ?? 0 }) - totalHpp,
  };
}

/** Total jual efektif per baris setelah diskon item / bonus. */
export function effectiveItemSelling(
  item: Pick<EstimationItemDraft, 'total_selling' | 'item_discount_pct' | 'item_discount_amount' | 'is_bonus'>,
): number {
  if (item.is_bonus) return 0;
  const base = roundIdr(Number(item.total_selling) || 0);
  const pct = Math.min(100, Math.max(0, Number(item.item_discount_pct) || 0));
  let after = pct > 0 ? roundIdr(base * (1 - pct / 100)) : base;
  const amt = roundIdr(Number(item.item_discount_amount) || 0);
  if (amt > 0) after = Math.max(0, after - amt);
  return after;
}

export function itemDiscountAmount(
  item: Pick<EstimationItemDraft, 'total_selling' | 'item_discount_pct' | 'item_discount_amount' | 'is_bonus'>,
): number {
  const gross = item.is_bonus ? roundIdr(Number(item.total_selling) || 0) : roundIdr(Number(item.total_selling) || 0);
  return Math.max(0, gross - effectiveItemSelling(item));
}

/** Sinkronkan HPP/total jika margin & harga jual tidak konsisten (mis. data lama). */
export function syncEstimationItemPrices(item: EstimationItemDraft): EstimationItemDraft {
  if (!item.selling_price_per_unit || item.selling_price_per_unit <= 0) {
    return item;
  }
  const expectedHpp = hppFromSellingAndMargin(item.selling_price_per_unit, item.margin_pct);
  const actualHpp = roundIdr(item.hpp_per_unit);
  if (expectedHpp === actualHpp) {
    const qty = Math.max(0, Number(item.qty) || 0);
    const totalHpp = roundIdr(qty * item.hpp_per_unit);
    const totalSelling = roundIdr(qty * item.selling_price_per_unit);
    if (totalHpp === roundIdr(item.total_hpp) && totalSelling === roundIdr(item.total_selling)) {
      return item;
    }
  }
  return { ...item, ...calcItemRow(item, 'margin') };
}

export function syncEstimationItemPricesList(items: EstimationItemDraft[]): EstimationItemDraft[] {
  return items.map(syncEstimationItemPrices);
}

const PRICE_SYNC_FIELDS = ['hpp_per_unit', 'total_hpp', 'total_selling', 'total_profit', 'selling_price_per_unit', 'margin_pct'] as const;

/** True jika sync mengubah nilai harga (bukan hanya referensi array baru). */
export function estimationItemsNeedPriceSync(
  before: EstimationItemDraft[],
  after: EstimationItemDraft[],
): boolean {
  if (before.length !== after.length) return true;
  return before.some((row, i) =>
    PRICE_SYNC_FIELDS.some(f => row[f] !== after[i][f]),
  );
}

/** Pastikan harga satuan & total konsisten dengan margin gross. */
export function normalizeEstimationItem(item: EstimationItemDraft): EstimationItemDraft {
  const base = { ...item };
  if (base.selling_price_per_unit > 0) {
    return syncEstimationItemPrices(base);
  }
  if (base.hpp_per_unit > 0) {
    return { ...base, ...calcItemRow(base, 'margin') };
  }
  return { ...base, ...calcItemRow(base, 'qty') };
}

export function normalizeEstimationItems(items: EstimationItemDraft[]): EstimationItemDraft[] {
  return items.map(normalizeEstimationItem);
}

/** Item bernama yang dicentang untuk masuk total estimasi. */
export function isEstimationItemCounted(
  item: Pick<EstimationItemDraft, 'name' | 'included'>,
): boolean {
  return Boolean(item.name.trim()) && item.included !== false;
}

export function countedEstimationItems(items: EstimationItemDraft[]): EstimationItemDraft[] {
  return items.filter(isEstimationItemCounted);
}

export function calcEstimationSummary(
  items: EstimationItemDraft[],
  overheadPct: number,
  discountPct: number,
  taxPct: number,
  opts?: {
    discountAmount?: number;
    adjustments?: EstimationAdjustment[];
  },
): EstimationSummary {
  const counted = countedEstimationItems(items);
  const normalized = counted.map(i => normalizeEstimationItem(i));
  const subtotalHpp = normalized.reduce((s, i) => s + (Number(i.total_hpp) || 0), 0);
  const subtotalSellingGross = normalized.reduce((s, i) => s + (Number(i.total_selling) || 0), 0);
  const itemDiscountTotal = normalized.reduce((s, i) => s + itemDiscountAmount(i), 0);
  const subtotalSellingItems = normalized.reduce((s, i) => s + effectiveItemSelling(i), 0);
  const itemProfit = normalized.reduce(
    (s, i) => s + (effectiveItemSelling(i) - (Number(i.total_hpp) || 0)),
    0,
  );
  const overheadAmount = roundIdr(subtotalHpp * (overheadPct / 100));
  const subtotalBeforeDiscount = subtotalSellingItems + overheadAmount;
  const discountAmountPct = roundIdr(subtotalBeforeDiscount * (discountPct / 100));
  const discountAmountFixed = roundIdr(Math.max(0, Number(opts?.discountAmount) || 0));
  const adjustmentTotal = roundIdr(
    (opts?.adjustments || []).reduce((s, a) => s + Math.max(0, Number(a.amount) || 0), 0),
  );
  const discountAmount = discountAmountPct + discountAmountFixed + adjustmentTotal;
  const afterDiscount = Math.max(0, subtotalBeforeDiscount - discountAmountPct - discountAmountFixed - adjustmentTotal);
  const taxAmount = roundIdr(afterDiscount * (taxPct / 100));
  const grandTotal = afterDiscount + taxAmount;
  const totalProfit = itemProfit + overheadAmount - discountAmountPct - discountAmountFixed - adjustmentTotal;
  const avgMarginPct = subtotalSellingItems > 0
    ? ((subtotalSellingItems - subtotalHpp) / subtotalSellingItems) * 100
    : 0;

  return {
    subtotalHpp,
    subtotalSellingGross,
    itemDiscountTotal,
    subtotalSellingItems,
    overheadAmount,
    subtotalBeforeDiscount,
    discountAmountPct,
    discountAmountFixed,
    adjustmentTotal,
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
    item_discount_pct: 0,
    item_discount_amount: 0,
    is_bonus: false,
    included: true,
    total_hpp: 0,
    total_selling: 0,
    total_profit: 0,
    sort_order: sortOrder,
    notes: '',
  };
}
