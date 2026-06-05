import { supabase } from '../lib/supabase';
import { calcItemRow, emptyItem, marginFromSelling, sellingFromHpp } from '../lib/estimatorCalc';
import type { EstimationItemDraft, PricelistCategory, PricelistItem } from '../types/estimator';

export function calcPricelistSelling(baseCost: number, marginPct: number): number {
  return sellingFromHpp(baseCost, marginPct);
}

export function applyPricelistPricePatch(
  row: Pick<PricelistItem, 'base_cost' | 'default_margin_pct' | 'selling_price'>,
  field: 'base_cost' | 'default_margin_pct' | 'selling_price',
  value: number,
): Pick<PricelistItem, 'base_cost' | 'default_margin_pct' | 'selling_price'> {
  const hpp = Number(row.base_cost) || 0;
  const margin = Number(row.default_margin_pct) || 0;
  const selling = Number(row.selling_price) || 0;

  if (field === 'base_cost') {
    const nextHpp = value;
    return {
      base_cost: nextHpp,
      default_margin_pct: margin,
      selling_price: calcPricelistSelling(nextHpp, margin),
    };
  }
  if (field === 'default_margin_pct') {
    const nextMargin = value;
    return {
      base_cost: hpp,
      default_margin_pct: nextMargin,
      selling_price: calcPricelistSelling(hpp, nextMargin),
    };
  }
  const nextSelling = value;
  return {
    base_cost: hpp,
    default_margin_pct: marginFromSelling(hpp, nextSelling),
    selling_price: nextSelling,
  };
}

export async function loadPricelistItems(orgId: string, activeOnly = true): Promise<PricelistItem[]> {
  let q = supabase
    .from('planner_pricelist_items')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true });
  if (activeOnly) q = q.eq('is_active', true);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as PricelistItem[];
}

export async function createPricelistItem(
  item: Omit<PricelistItem, 'id' | 'created_at' | 'updated_at'>,
): Promise<PricelistItem> {
  const { data, error } = await supabase
    .from('planner_pricelist_items')
    .insert(item)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PricelistItem;
}

export async function updatePricelistItem(
  id: string,
  patch: Partial<Omit<PricelistItem, 'id' | 'org_id' | 'created_at'>>,
): Promise<PricelistItem> {
  const { data, error } = await supabase
    .from('planner_pricelist_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PricelistItem;
}

export async function deletePricelistItem(id: string): Promise<void> {
  const { error } = await supabase.from('planner_pricelist_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function searchPricelist(
  orgId: string,
  query: string,
): Promise<PricelistItem[]> {
  const items = await loadPricelistItems(orgId);
  const q = query.toLowerCase().trim();
  if (!q) return items;
  return items.filter(
    i =>
      i.name.toLowerCase().includes(q) ||
      (i.product || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q),
  );
}

export function pricelistToDraftRow(item: PricelistItem) {
  const hpp = Number(item.base_cost);
  const selling = Number(item.selling_price) || calcPricelistSelling(hpp, Number(item.default_margin_pct));
  return {
    pricelist_item_id: item.id,
    name: item.product ? `${item.name} — ${item.product}` : item.name,
    category: item.category || 'material',
    unit: item.unit,
    qty: 1,
    hpp_per_unit: hpp,
    margin_pct: Number(item.default_margin_pct),
    selling_price_per_unit: selling,
    notes: item.notes || '',
  };
}

export function pricelistToEstimationItem(item: PricelistItem, sortOrder: number): EstimationItemDraft {
  const base = { ...emptyItem(sortOrder), ...pricelistToDraftRow(item) };
  return { ...base, ...calcItemRow(base) };
}

export interface CsvPricelistRow {
  name: string;
  product: string | null;
  category: PricelistCategory;
  unit: string;
  base_cost: number;
  default_margin_pct: number;
  selling_price: number;
  notes: string | null;
}

const VALID_CATEGORIES = new Set<string>(['material', 'upah', 'alat', 'jasa', 'other']);

export function parseCsvPricelistRows(raw: Record<string, string>[]): CsvPricelistRow[] {
  return raw
    .map(row => {
      const name = (row.name || row.item || row.nama || '').trim();
      if (!name) return null;
      const product = (row.product || row.produk || '').trim() || null;
      const catRaw = (row.category || row.kategori || 'material').toLowerCase().trim();
      const category = (VALID_CATEGORIES.has(catRaw) ? catRaw : 'material') as PricelistCategory;
      const unit = (row.unit || row.satuan || 'pcs').trim();
      const base_cost = Number(row.base_cost || row.hpp || row.harga || 0);
      const default_margin_pct = Number(row.default_margin_pct || row.margin || row['margin%'] || 20);
      const sellingRaw = row.selling_price || row.harga_jual || row['harga jual'];
      const selling_price = sellingRaw
        ? Number(sellingRaw)
        : calcPricelistSelling(base_cost, default_margin_pct);
      const notes = (row.notes || row.catatan || '').trim() || null;
      return { name, product, category, unit, base_cost, default_margin_pct, selling_price, notes };
    })
    .filter((r): r is CsvPricelistRow => r !== null);
}

export async function bulkImportPricelist(
  orgId: string,
  userId: string,
  rows: CsvPricelistRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const payload = rows.map(r => ({
    org_id: orgId,
    name: r.name,
    product: r.product,
    category: r.category,
    unit: r.unit,
    base_cost: r.base_cost,
    default_margin_pct: r.default_margin_pct,
    selling_price: r.selling_price,
    notes: r.notes,
    is_active: true,
    created_by: userId,
  }));
  const { error } = await supabase.from('planner_pricelist_items').insert(payload);
  if (error) throw new Error(error.message);
  return rows.length;
}

export const PRICELIST_CSV_TEMPLATE = `name,product,category,unit,base_cost,default_margin_pct,selling_price,notes
Pasang ACP,ACP Seven 4mm,material,m2,350000,25,437500,
Holo galvanis,Galvanis 40x40,material,btg,34000,20,40800,
Upah pasang,,upah,hari,150000,30,195000,Termasuk makan
Cat tembok,Avian,material,kaleng,450000,20,540000,
`;

export function downloadPricelistTemplate(): void {
  const blob = new Blob([PRICELIST_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template-pricelist.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export const PRICELIST_CATEGORIES: Array<{ value: PricelistCategory; label: string }> = [
  { value: 'material', label: 'Material' },
  { value: 'upah', label: 'Upah' },
  { value: 'alat', label: 'Alat' },
  { value: 'jasa', label: 'Jasa' },
  { value: 'other', label: 'Lainnya' },
];

export const COMMON_UNITS = ['pcs', 'm', 'm2', 'm3', 'kg', 'lm', 'ls', 'hari', 'btg', 'kaleng', 'sak'];
