import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';
import { aggregateSlotsToRap } from '../lib/laborCostCalculator';
import type { LaborRateType, LaborSlot, LaborSlotInput } from '../types/labor';

function mapRow(row: Record<string, unknown>): LaborSlot {
  return {
    id: String(row.id),
    org_id: String(row.org_id),
    project_id: String(row.project_id),
    rap_item_id: row.rap_item_id != null ? String(row.rap_item_id) : null,
    member_id: row.member_id != null ? String(row.member_id) : null,
    work_date: String(row.work_date).slice(0, 10),
    slot_kind: row.slot_kind as LaborSlot['slot_kind'],
    rate_type: row.rate_type as LaborRateType,
    day_fraction: Number(row.day_fraction) || 0,
    regular_hours: Number(row.regular_hours) || 0,
    overtime_hours: Number(row.overtime_hours) || 0,
    unit_rate: Number(row.unit_rate) || 0,
    notes: row.notes != null ? String(row.notes) : null,
    created_by: row.created_by != null ? String(row.created_by) : null,
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

export async function loadLaborSlots(
  projectId: string,
  rapItemId?: string,
): Promise<LaborSlot[]> {
  let q = supabase
    .from('planner_labor_slots')
    .select('*')
    .eq('project_id', projectId)
    .order('work_date', { ascending: true });

  if (rapItemId) q = q.eq('rap_item_id', rapItemId);

  const { data, error } = await q;
  assertNoDbError(error);
  return (data || []).map(r => mapRow(r as Record<string, unknown>));
}

export async function deleteLaborSlotsByRapItem(rapItemId: string): Promise<void> {
  const { error } = await supabase
    .from('planner_labor_slots')
    .delete()
    .eq('rap_item_id', rapItemId);
  assertNoDbError(error);
}

export async function upsertLaborSlots(slots: LaborSlotInput[]): Promise<LaborSlot[]> {
  if (!slots.length) return [];

  const rows = slots.map(s => ({
    ...s,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('planner_labor_slots')
    .upsert(rows, { onConflict: 'rap_item_id,work_date,slot_kind' })
    .select();

  assertNoDbError(error);
  return (data || []).map(r => mapRow(r as Record<string, unknown>));
}

export async function replaceLaborSlotsForRap(
  rapItemId: string,
  slots: LaborSlotInput[],
): Promise<LaborSlot[]> {
  const { error: delErr } = await supabase
    .from('planner_labor_slots')
    .delete()
    .eq('rap_item_id', rapItemId);
  assertNoDbError(delErr);

  if (!slots.length) return [];
  const { data, error } = await supabase
    .from('planner_labor_slots')
    .insert(slots.map(s => ({ ...s, updated_at: new Date().toISOString() })))
    .select();
  assertNoDbError(error);
  return (data || []).map(r => mapRow(r as Record<string, unknown>));
}

export { aggregateSlotsToRap };
