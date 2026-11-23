import { supabase } from '../../lib/supabase';
import type { RppMaterial } from '../../types/rpp';

function rowToMaterial(row: Record<string, unknown>): RppMaterial {
  return {
    id: Number(row.id),
    org_id: String(row.org_id),
    name: String(row.name),
    category: String(row.category || 'Umum'),
    unit: String(row.unit || 'Pcs'),
    price: Number(row.price) || 0,
    last_price: row.last_price != null ? Number(row.last_price) : null,
    trend: row.trend != null ? String(row.trend) : null,
    stock: Number(row.stock) || 0,
    used_in: Number(row.used_in) || 0,
    icon: row.icon != null ? String(row.icon) : null,
    vendor: row.vendor != null ? String(row.vendor) : null,
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

export async function loadMaterials(orgId: string): Promise<RppMaterial[]> {
  const { data, error } = await supabase
    .from('rpp_materials')
    .select('*')
    .eq('org_id', orgId)
    .order('name');
  if (error) throw new Error(error.message);
  return (data || []).map((r) => rowToMaterial(r as Record<string, unknown>));
}

export type MaterialInput = {
  name: string;
  category: string;
  unit: string;
  price: number;
  last_price?: number;
  vendor?: string;
  icon?: string;
  stock?: number;
};

export async function createMaterial(orgId: string, input: MaterialInput): Promise<RppMaterial> {
  const { data, error } = await supabase
    .from('rpp_materials')
    .insert({
      org_id: orgId,
      name: input.name,
      category: input.category,
      unit: input.unit,
      price: input.price,
      last_price: input.last_price ?? input.price,
      vendor: input.vendor || '',
      icon: input.icon || 'package',
      stock: input.stock ?? 0,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToMaterial(data as Record<string, unknown>);
}

export async function updateMaterial(
  orgId: string,
  id: number,
  input: Partial<MaterialInput>,
): Promise<RppMaterial> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name != null) patch.name = input.name;
  if (input.category != null) patch.category = input.category;
  if (input.unit != null) patch.unit = input.unit;
  if (input.price != null) patch.price = input.price;
  if (input.last_price != null) patch.last_price = input.last_price;
  if (input.vendor != null) patch.vendor = input.vendor;
  if (input.icon != null) patch.icon = input.icon;
  if (input.stock != null) patch.stock = input.stock;

  const { data, error } = await supabase
    .from('rpp_materials')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToMaterial(data as Record<string, unknown>);
}

export async function deleteMaterial(orgId: string, id: number): Promise<void> {
  const { error } = await supabase
    .from('rpp_materials')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);
}

export async function upsertMaterialFromRapLine(
  orgId: string,
  line: { name: string; unit: string; unitPrice: number; vendor?: string },
): Promise<void> {
  const { data: existing } = await supabase
    .from('rpp_materials')
    .select('id, used_in, price')
    .eq('org_id', orgId)
    .ilike('name', line.name)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('rpp_materials')
      .update({
        last_price: line.unitPrice,
        price: line.unitPrice,
        used_in: (Number(existing.used_in) || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    return;
  }

  await createMaterial(orgId, {
    name: line.name,
    category: 'Umum',
    unit: line.unit,
    price: line.unitPrice,
    vendor: line.vendor,
  });
}
