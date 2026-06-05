import { supabase } from '../lib/supabase';
import { calcItemRow, emptyItem } from '../lib/estimatorCalc';
import type { EstimationItemDraft, PricelistCategory, PricelistItem } from '../types/estimator';

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
    i => i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q),
  );
}

export function pricelistToDraftRow(item: PricelistItem) {
  return {
    pricelist_item_id: item.id,
    name: item.name,
    category: item.category || 'material',
    unit: item.unit,
    qty: 1,
    hpp_per_unit: Number(item.base_cost),
    margin_pct: Number(item.default_margin_pct),
    selling_price_per_unit: Number(item.base_cost) * (1 + Number(item.default_margin_pct) / 100),
    notes: item.notes || '',
  };
}

export function pricelistToEstimationItem(item: PricelistItem, sortOrder: number): EstimationItemDraft {
  const base = { ...emptyItem(sortOrder), ...pricelistToDraftRow(item) };
  return { ...base, ...calcItemRow(base) };
}

export interface CsvPricelistRow {
  name: string;
  category: PricelistCategory;
  unit: string;
  base_cost: number;
  default_margin_pct: number;
  notes: string | null;
}

const VALID_CATEGORIES = new Set<string>(['material', 'upah', 'alat', 'jasa', 'other']);

export function parseCsvPricelistRows(raw: Record<string, string>[]): CsvPricelistRow[] {
  return raw
    .map(row => {
      const name = (row.name || row.nama || '').trim();
      if (!name) return null;
      const catRaw = (row.category || row.kategori || 'material').toLowerCase().trim();
      const category = (VALID_CATEGORIES.has(catRaw) ? catRaw : 'material') as PricelistCategory;
      const unit = (row.unit || row.satuan || 'pcs').trim();
      const base_cost = Number(row.base_cost || row.hpp || row.harga || 0);
      const default_margin_pct = Number(row.default_margin_pct || row.margin || row['margin%'] || 20);
      const notes = (row.notes || row.catatan || '').trim() || null;
      return { name, category, unit, base_cost, default_margin_pct, notes };
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
    category: r.category,
    unit: r.unit,
    base_cost: r.base_cost,
    default_margin_pct: r.default_margin_pct,
    notes: r.notes,
    is_active: true,
    created_by: userId,
  }));
  const { error } = await supabase.from('planner_pricelist_items').insert(payload);
  if (error) throw new Error(error.message);
  return rows.length;
}

export const PRICELIST_CSV_TEMPLATE = `name,category,unit,base_cost,default_margin_pct,notes
Pasang ACP,material,m2,350000,25,
Holo galvanis,material,btg,34000,20,
Upah pasang,upah,hari,150000,30,Termasuk makan
Cat tembok,material,kaleng,450000,20,
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
