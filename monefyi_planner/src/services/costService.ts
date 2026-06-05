import { type DbCostRealization } from '../lib/adapters';
import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';
import { loadRapItems } from './rapService';

export type CostRealization = DbCostRealization;

export async function recalculateProjectSpent(projectId: string) {
  const { data: costs, error } = await supabase
    .from('planner_cost_realizations')
    .select('total_amount')
    .eq('project_id', projectId);
  if (error) throw new Error(error.message);

  const totalSpent = (costs || []).reduce((s, c) => s + (Number(c.total_amount) || 0), 0);
  const { error: updErr } = await supabase
    .from('planner_projects')
    .update({ total_spent: totalSpent })
    .eq('id', projectId);
  assertNoDbError(updErr);
  return totalSpent;
}

export async function deleteAllCosts(projectId: string) {
  const { error } = await supabase.from('planner_cost_realizations').delete().eq('project_id', projectId);
  if (error) throw new Error(error.message);
  await recalculateProjectSpent(projectId);
}

export async function loadCostRealizations(projectId: string): Promise<CostRealization[]> {
  const { data, error } = await supabase
    .from('planner_cost_realizations')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as CostRealization[];
}

export async function loadAllCosts(orgId: string): Promise<CostRealization[]> {
  const { data: projects, error: projErr } = await supabase
    .from('planner_projects')
    .select('id')
    .eq('org_id', orgId);
  if (projErr) throw new Error(projErr.message);

  const ids = (projects || []).map(p => p.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('planner_cost_realizations')
    .select('*')
    .in('project_id', ids)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as CostRealization[];
}

export async function createCostRealization(
  item: Omit<CostRealization, 'id' | 'created_at' | 'updated_at'>,
) {
  const { data, error } = await supabase
    .from('planner_cost_realizations')
    .insert(item)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await recalculateProjectSpent(item.project_id);

  return data as CostRealization;
}

export async function deleteCostRealization(id: string, projectId: string) {
  const { error } = await supabase.from('planner_cost_realizations').delete().eq('id', id);
  if (error) throw new Error(error.message);

  await recalculateProjectSpent(projectId);
}

export async function aggregateCostByRapItem(projectId: string) {
  const costs = await loadCostRealizations(projectId);
  const byRap: Record<string, { qty: number; amount: number }> = {};

  for (const c of costs) {
    if (!c.rap_item_id) continue;
    if (!byRap[c.rap_item_id]) byRap[c.rap_item_id] = { qty: 0, amount: 0 };
    byRap[c.rap_item_id].qty += Number(c.quantity) || 0;
    byRap[c.rap_item_id].amount += Number(c.total_amount) || 0;
  }

  return byRap;
}

export async function aggregateCashflow(orgId: string, days = 30) {
  const costs = await loadAllCosts(orgId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const byDay: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    byDay[d.toISOString().slice(0, 10)] = 0;
  }

  for (const c of costs) {
    const d = c.date;
    if (new Date(d) >= cutoff) {
      byDay[d] = (byDay[d] || 0) + (Number(c.total_amount) || 0);
    }
  }

  return Object.entries(byDay).map(([date, amount]) => ({
    date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    amount: amount / 1_000_000,
  }));
}

export async function aggregateByProject(orgId: string) {
  const { data: projects, error } = await supabase
    .from('planner_projects')
    .select('id, name, total_budget, total_spent, total_received')
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);

  return (projects || []).map(p => ({
    projectId: p.id,
    name: p.name,
    budget: Number(p.total_budget) || 0,
    spent: Number(p.total_spent) || 0,
    received: Number(p.total_received) || 0,
  }));
}

/** Gabungkan duplikat import & hitung ulang nominal dari RAP saat ini (Vol × Harga Satuan). */
export async function repairImportCosts(projectId: string, recordedBy: string) {
  const [costs, rapItems] = await Promise.all([
    loadCostRealizations(projectId),
    loadRapItems(projectId),
  ]);

  const rapById = new Map(rapItems.map(r => [r.id, r]));
  const importCosts = costs.filter(c => String(c.description || '').startsWith('Import:'));
  if (!importCosts.length) {
    return { removed: 0, fixed: 0, totalSpent: await recalculateProjectSpent(projectId) };
  }

  const groups = new Map<string, CostRealization[]>();
  for (const c of importCosts) {
    const key = c.rap_item_id || String(c.description || '').trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const idsToDelete = importCosts.map(c => c.id);
  const { error: delErr } = await supabase
    .from('planner_cost_realizations')
    .delete()
    .in('id', idsToDelete);
  if (delErr) throw new Error(delErr.message);

  const today = new Date().toISOString().slice(0, 10);
  const inserts: Omit<CostRealization, 'id' | 'created_at' | 'updated_at'>[] = [];

  for (const [, group] of groups) {
    const first = group[0];
    const rap = first.rap_item_id ? rapById.get(first.rap_item_id) : undefined;
    if (!rap) continue;

    const qty = Number(first.quantity) || Number(rap.quantity) || 0;
    const unitPrice = Number(rap.unit_price) || 0;
    if (qty <= 0 || unitPrice <= 0) continue;

    inserts.push({
      project_id: projectId,
      rap_item_id: rap.id,
      date: first.date || today,
      description: `Import: ${rap.name}`,
      quantity: qty,
      unit_price: unitPrice,
      total_amount: qty * unitPrice,
      recorded_by: recordedBy,
      status: 'recorded',
    });
  }

  if (inserts.length) {
    const { error: insErr } = await supabase.from('planner_cost_realizations').insert(inserts);
    if (insErr) throw new Error(insErr.message);
  }

  const totalSpent = await recalculateProjectSpent(projectId);
  return { removed: idsToDelete.length, fixed: inserts.length, totalSpent };
}
