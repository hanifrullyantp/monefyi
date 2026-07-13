import { type DbRapItem } from '../lib/adapters';
import { supabase } from '../lib/supabase';

export type RapItem = DbRapItem;

export async function loadRapItems(projectId: string): Promise<RapItem[]> {
  const { data, error } = await supabase
    .from('planner_rap_items')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as RapItem[];
}

export async function createRapItem(item: Omit<RapItem, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('planner_rap_items').insert(item).select().single();
  if (error) throw new Error(error.message);
  return data as RapItem;
}

export async function updateRapItem(id: string, item: Partial<RapItem>) {
  const { data, error } = await supabase.from('planner_rap_items').update(item).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data as RapItem;
}

export async function deleteRapItem(id: string) {
  const { error } = await supabase.from('planner_rap_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Sinkronkan total_budget proyek dari jumlah RAP yang tersisa. */
export async function syncProjectBudgetFromRap(projectId: string): Promise<number> {
  const { data: items, error } = await supabase
    .from('planner_rap_items')
    .select('quantity, unit_price')
    .eq('project_id', projectId);
  if (error) throw new Error(error.message);

  const total = (items || []).reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    0,
  );
  const { error: updErr } = await supabase
    .from('planner_projects')
    .update({ total_budget: total, updated_at: new Date().toISOString() })
    .eq('id', projectId);
  if (updErr) throw new Error(updErr.message);
  return total;
}

/** Hapus item RAP beserta realisasi biaya terkait, lalu perbarui spent & budget. */
export async function removeRapItemWithCleanup(
  projectId: string,
  rapItemId: string,
): Promise<{ budget: number; spent: number }> {
  const { deleteCostsByRapItemId, recalculateProjectSpent } = await import('./costService');
  const { deleteLaborSlotsByRapItem } = await import('./laborAssignmentService');
  await deleteCostsByRapItemId(projectId, rapItemId);
  await deleteLaborSlotsByRapItem(rapItemId);
  const { error } = await supabase.from('planner_rap_items').delete().eq('id', rapItemId);
  if (error) throw new Error(error.message);
  const spent = await recalculateProjectSpent(projectId);
  const budget = await syncProjectBudgetFromRap(projectId);
  return { budget, spent };
}

/** Duplikat item RAP; untuk tenaga kerja salin juga slot jadwal. */
export async function duplicateRapItem(
  projectId: string,
  sourceId: string,
  userId: string,
  sortOrder: number,
): Promise<RapItem> {
  const { data: source, error } = await supabase
    .from('planner_rap_items')
    .select('*')
    .eq('id', sourceId)
    .single();
  if (error || !source) throw new Error(error?.message || 'Item tidak ditemukan');

  const row = source as RapItem;
  const created = await createRapItem({
    project_id: projectId,
    type: row.type,
    name: `${row.name} (salinan)`,
    description: row.description,
    unit: row.unit,
    quantity: row.quantity,
    unit_price: row.unit_price,
    supplier: row.supplier,
    notes: row.notes,
    member_id: row.member_id,
    is_critical: row.is_critical,
    sort_order: sortOrder,
    updated_by: userId,
  });

  if (row.type === 'labor') {
    const { loadLaborSlots, replaceLaborSlotsForRap } = await import('./laborAssignmentService');
    const slots = await loadLaborSlots(projectId, sourceId);
    if (slots.length) {
      await replaceLaborSlotsForRap(created.id, slots.map(s => ({
        org_id: s.org_id,
        project_id: projectId,
        rap_item_id: created.id,
        member_id: s.member_id,
        work_date: s.work_date,
        slot_kind: s.slot_kind,
        rate_type: s.rate_type,
        day_fraction: s.day_fraction,
        regular_hours: s.regular_hours,
        overtime_hours: s.overtime_hours,
        unit_rate: s.unit_rate,
        notes: s.notes,
        created_by: userId,
      })));
    }
  }

  return created;
}

export async function deleteAllRapItems(projectId: string) {
  const { error } = await supabase.from('planner_rap_items').delete().eq('project_id', projectId);
  if (error) throw new Error(error.message);
}

export function rapSummary(items: RapItem[], actualByType?: Record<string, number>) {
  const byType: Record<string, { planned: number; actual: number }> = {};
  for (const item of items) {
    const total = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    if (!byType[item.type]) byType[item.type] = { planned: 0, actual: 0 };
    byType[item.type].planned += total;
  }
  if (actualByType) {
    for (const [type, amount] of Object.entries(actualByType)) {
      if (!byType[type]) byType[type] = { planned: 0, actual: 0 };
      byType[type].actual = amount / 1_000_000;
    }
  }
  return Object.entries(byType).map(([name, v]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    planned: v.planned / 1_000_000,
    actual: v.actual / 1_000_000,
  }));
}

export function rapActualsFromCosts(
  items: RapItem[],
  byRapId: Record<string, { qty: number; amount: number }>,
) {
  const actualByType: Record<string, number> = {};
  for (const item of items) {
    const actual = byRapId[item.id];
    if (!actual) continue;
    actualByType[item.type] = (actualByType[item.type] || 0) + actual.amount;
  }
  return actualByType;
}
