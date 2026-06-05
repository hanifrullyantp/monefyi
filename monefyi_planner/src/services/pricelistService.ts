import { supabase } from '../lib/supabase';
import type { PricelistCategory, PricelistItem } from '../types/estimator';

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

export const PRICELIST_CATEGORIES: Array<{ value: PricelistCategory; label: string }> = [
  { value: 'material', label: 'Material' },
  { value: 'upah', label: 'Upah' },
  { value: 'alat', label: 'Alat' },
  { value: 'jasa', label: 'Jasa' },
  { value: 'other', label: 'Lainnya' },
];

export const COMMON_UNITS = ['pcs', 'm', 'm2', 'm3', 'kg', 'lm', 'ls', 'hari', 'btg', 'kaleng', 'sak'];
