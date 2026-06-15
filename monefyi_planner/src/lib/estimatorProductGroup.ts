import type { EstimationItemDraft } from '../types/estimator';

const NAME_PRODUCT_SEP = ' — ';

/** Kelompok produk untuk sinkron qty global (dari pricelist `product` atau suffix nama). */
export function getEstimationItemProductGroup(item: EstimationItemDraft): string {
  if (item.product_group?.trim()) return item.product_group.trim();
  const idx = item.name.indexOf(NAME_PRODUCT_SEP);
  if (idx >= 0) return item.name.slice(idx + NAME_PRODUCT_SEP.length).trim();
  return '';
}

export function hasProductGroup(item: EstimationItemDraft): boolean {
  return getEstimationItemProductGroup(item).length > 0;
}

export interface EstimationItemGroup {
  key: string;
  indices: number[];
}

/** Urutan baris tetap; grup hanya untuk item yang punya kelompok produk sama. */
export function groupEstimationItemsByProduct(items: EstimationItemDraft[]): EstimationItemGroup[] {
  const order: string[] = [];
  const map = new Map<string, number[]>();

  items.forEach((item, idx) => {
    const key = getEstimationItemProductGroup(item);
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(idx);
  });

  return order.map(key => ({ key, indices: map.get(key)! }));
}

export function groupSharedQty(indices: number[], items: EstimationItemDraft[]): number | null {
  if (!indices.length) return null;
  const first = items[indices[0]]?.qty;
  if (first == null) return null;
  return indices.every(i => items[i].qty === first) ? first : null;
}
