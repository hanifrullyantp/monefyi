import { supabase } from '../../lib/supabase';
import { findSystemAccount } from './accountService';
import { createJournalEntry } from './journalService';
import type { InventoryItem } from '../../types/financeV2';

function mapItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    name: row.name as string,
    unit: row.unit as string,
    qty: Number(row.qty) || 0,
    unit_cost: Number(row.unit_cost) || 0,
    total_value: Number(row.total_value) || 0,
    min_stock: Number(row.min_stock) || 0,
    location: (row.location as string) || null,
    updated_at: row.updated_at as string,
  };
}

export async function loadInventoryItems(orgId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('planner_inventory_items')
    .select('*')
    .eq('org_id', orgId)
    .order('name');

  if (error) throw new Error(error.message);
  return (data || []).map(mapItem);
}

export async function createInventoryItem(input: {
  orgId: string;
  name: string;
  unit?: string;
  qty?: number;
  unitCost?: number;
  minStock?: number;
  location?: string;
}): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('planner_inventory_items')
    .insert({
      org_id: input.orgId,
      name: input.name.trim(),
      unit: input.unit || 'pcs',
      qty: input.qty ?? 0,
      unit_cost: input.unitCost ?? 0,
      min_stock: input.minStock ?? 0,
      location: input.location?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapItem(data);
}

export async function updateInventoryItem(
  id: string,
  patch: Partial<Pick<InventoryItem, 'name' | 'unit' | 'min_stock' | 'location' | 'unit_cost'>>,
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('planner_inventory_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapItem(data);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase.from('planner_inventory_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adjustStock(input: {
  orgId: string;
  itemId: string;
  qtyDelta: number;
  unitCost?: number;
  reason?: string;
  kasAccountId?: string;
  createdBy?: string;
}): Promise<InventoryItem> {
  if (input.qtyDelta === 0) throw new Error('Perubahan qty tidak boleh 0.');

  const { data: current, error: selErr } = await supabase
    .from('planner_inventory_items')
    .select('*')
    .eq('id', input.itemId)
    .single();
  if (selErr) throw new Error(selErr.message);

  const item = mapItem(current);
  const cost = input.unitCost ?? item.unit_cost;
  const newQty = Math.round((item.qty + input.qtyDelta) * 10000) / 10000;
  if (newQty < 0) throw new Error('Stok tidak boleh negatif.');

  const movementValue = Math.round(Math.abs(input.qtyDelta) * cost * 100) / 100;
  const stok = await findSystemAccount(input.orgId, 'stok');
  const kas = input.kasAccountId
    ? { id: input.kasAccountId }
    : await findSystemAccount(input.orgId, 'kas', 'bisnis');
  const laba = await findSystemAccount(input.orgId, 'laba', 'periode');

  if (stok && kas && laba && movementValue > 0) {
    if (input.qtyDelta > 0) {
      await createJournalEntry({
        orgId: input.orgId,
        description: input.reason || `Stok masuk: ${item.name}`,
        referenceType: 'project_expense',
        referenceId: input.itemId,
        createdBy: input.createdBy,
        lines: [
          { accountId: stok.id, debit: movementValue, credit: 0 },
          { accountId: kas.id, debit: 0, credit: movementValue },
        ],
      });
    } else {
      await createJournalEntry({
        orgId: input.orgId,
        description: input.reason || `Stok keluar: ${item.name}`,
        referenceType: 'project_expense',
        referenceId: input.itemId,
        createdBy: input.createdBy,
        lines: [
          { accountId: laba.id, debit: movementValue, credit: 0 },
          { accountId: stok.id, debit: 0, credit: movementValue },
        ],
      });
    }
  }

  const { data, error } = await supabase
    .from('planner_inventory_items')
    .update({
      qty: newQty,
      unit_cost: cost,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.itemId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapItem(data);
}
