import { type DbCostRealization } from '../lib/adapters';
import { supabase } from '../lib/supabase';
import { toRupiah } from '@domain/journal';
import { logProjectAudit } from './auditService';
import { loadRapItems } from './rapService';

export type CostRealization = DbCostRealization;

function isRpcMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PGRST202' || error.code === '42883' || /does not exist|not found/i.test(error.message || '');
}

function isColumnOrConstraintMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42703' || error.code === 'PGRST204' || error.code === '23514'
    || /column .* does not exist|check constraint/i.test(error.message || '');
}

function isActiveCostRow(row: CostRealization): boolean {
  return row.deleted_at == null && row.status !== 'cancelled' && row.status !== 'dividend';
}

async function softDeleteCostRow(id: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('planner_cost_realizations')
    .update({ status: 'cancelled', deleted_at: now, updated_at: now })
    .eq('id', id);
  if (!error) return;
  if (isColumnOrConstraintMissing(error)) {
    const { error: delErr } = await supabase.from('planner_cost_realizations').delete().eq('id', id);
    if (delErr) throw new Error(delErr.message);
    return;
  }
  throw new Error(error.message);
}

export interface RapActualAgg {
  qty: number;
  amount: number;
  lastDate?: string;
  lastRecordedBy?: string;
  lastCostId?: string;
}

/** Membaca total_spent yang dihitung trigger. Klien tidak menulis kolom turunan. */
export async function recalculateProjectSpent(projectId: string) {
  const { data, error } = await supabase
    .from('planner_projects')
    .select('total_spent')
    .eq('id', projectId)
    .single();
  if (error) throw new Error(error.message);
  return Number(data?.total_spent) || 0;
}

export async function deleteAllCosts(projectId: string) {
  const { data: existing, error: selErr } = await supabase
    .from('planner_cost_realizations')
    .select('id, journal_entry_id, description, status, deleted_at')
    .eq('project_id', projectId);
  if (selErr) throw new Error(selErr.message);

  const activeRows = ((existing || []) as CostRealization[]).filter(isActiveCostRow);
  const { reverseProjectJournal } = await import('./financeV2/projectJournalBridge');
  for (const row of activeRows) {
    if (row.journal_entry_id) {
      await reverseProjectJournal(
        row.journal_entry_id,
        `Batal biaya proyek: ${row.description || ''}`.trim(),
      );
    }
    await softDeleteCostRow(row.id);
  }

  await recalculateProjectSpent(projectId);
  void logProjectAudit({
    projectId,
    action: 'cost.bulk_deleted',
    targetType: 'project',
    targetId: projectId,
  });
}

export async function loadCostRealizations(projectId: string): Promise<CostRealization[]> {
  const { data, error } = await supabase
    .from('planner_cost_realizations')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data || []) as CostRealization[]).filter(isActiveCostRow);
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
  return ((data || []) as CostRealization[]).filter(isActiveCostRow);
}

export async function createCostRealization(
  item: Omit<CostRealization, 'id' | 'created_at' | 'updated_at'>,
) {
  const amount = toRupiah(Number(item.total_amount) || 0);
  const status = item.status || 'recorded';

  let savedRow: Record<string, unknown> | null = null;
  const { data: rpcRow, error: rpcErr } = await supabase.rpc('planner_create_cost_realization_atomic', {
    p_project_id: item.project_id,
    p_rap_item_id: item.rap_item_id ?? null,
    p_date: item.date,
    p_description: item.description,
    p_quantity: item.quantity ?? null,
    p_unit_price: item.unit_price ?? null,
    p_total_amount: amount,
    p_payment_method: item.payment_method ?? null,
    p_supplier: item.supplier ?? null,
    p_status: status,
    p_recorded_by: item.recorded_by,
  });

  if (!rpcErr && rpcRow) {
    savedRow = rpcRow as Record<string, unknown>;
  } else if (rpcErr && !isRpcMissing(rpcErr)) {
    throw new Error(rpcErr.message);
  } else {
    // Fallback atomik kompensasi bila RPC belum ter-deploy di remote.
    const { data, error } = await supabase
      .from('planner_cost_realizations')
      .insert({ ...item, total_amount: amount, status })
      .select()
      .single();
    if (error) throw new Error(error.message);
    savedRow = data as Record<string, unknown>;

    if (amount > 0 && status !== 'dividend' && status !== 'cancelled') {
      try {
        const { postProjectExpenseJournal } = await import('./financeV2/projectJournalBridge');
        const journalId = await postProjectExpenseJournal({
          projectId: item.project_id,
          amount,
          description: `Biaya proyek: ${item.description || ''}`,
          referenceId: savedRow.id as string,
          entryDate: item.date,
          createdBy: item.recorded_by,
          rapItemId: item.rap_item_id ?? null,
          paymentMethod: item.payment_method ?? null,
          status,
        });
        if (!journalId) {
          throw new Error('Jurnal biaya proyek gagal dibuat.');
        }
        const { error: linkErr } = await supabase
          .from('planner_cost_realizations')
          .update({ journal_entry_id: journalId, synced_at: new Date().toISOString() })
          .eq('id', savedRow.id);
        if (linkErr) throw new Error(linkErr.message);
        savedRow = { ...savedRow, journal_entry_id: journalId };
      } catch (err) {
        await supabase.from('planner_cost_realizations').delete().eq('id', savedRow.id);
        throw err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  await recalculateProjectSpent(item.project_id);

  void logProjectAudit({
    projectId: item.project_id,
    actorId: item.recorded_by,
    action: 'cost.created',
    targetType: 'cost',
    targetId: savedRow.id as string,
    metadata: {
      description: item.description,
      total_amount: Number(savedRow.total_amount) || 0,
      date: item.date,
      rap_item_id: item.rap_item_id ?? null,
    },
  });

  return savedRow as unknown as CostRealization;
}

export async function deleteCostRealization(id: string, projectId: string) {
  const { data: existing, error: selErr } = await supabase
    .from('planner_cost_realizations')
    .select('id, journal_entry_id, description, total_amount')
    .eq('id', id)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (!existing) return;

  if (existing.journal_entry_id) {
    const { reverseProjectJournal } = await import('./financeV2/projectJournalBridge');
    await reverseProjectJournal(
      existing.journal_entry_id as string,
      `Batal biaya proyek: ${(existing.description as string) || ''}`.trim(),
    );
  }

  await softDeleteCostRow(id);
  await recalculateProjectSpent(projectId);

  void logProjectAudit({
    projectId,
    action: 'cost.deleted',
    targetType: 'cost',
    targetId: id,
    metadata: {
      description: (existing.description as string | undefined) ?? undefined,
      total_amount: existing.total_amount != null ? Number(existing.total_amount) : undefined,
    },
  });
}

export async function deleteCostsByRapItemId(projectId: string, rapItemId: string) {
  const { data: existing, error: selErr } = await supabase
    .from('planner_cost_realizations')
    .select('id, journal_entry_id, description, status, deleted_at')
    .eq('project_id', projectId)
    .eq('rap_item_id', rapItemId);
  if (selErr) throw new Error(selErr.message);

  const activeRows = ((existing || []) as CostRealization[]).filter(isActiveCostRow);
  const { reverseProjectJournal } = await import('./financeV2/projectJournalBridge');
  for (const row of activeRows) {
    if (row.journal_entry_id) {
      await reverseProjectJournal(
        row.journal_entry_id,
        `Batal realisasi RAP: ${row.description || ''}`.trim(),
      );
    }
    await softDeleteCostRow(row.id);
  }

  await recalculateProjectSpent(projectId);
}

/** Toggle checklist realisasi: satu baris konsolidasi per item RAP. */
export async function setRapItemRealization(input: {
  projectId: string;
  rapItemId: string;
  rapItemName: string;
  plannedQty: number;
  plannedUnitPrice: number;
  realized: boolean;
  amount?: number | null;
  actualQty?: number | null;
  recordedBy: string;
  date?: string;
}) {
  const { projectId, rapItemId, realized } = input;

  await deleteCostsByRapItemId(projectId, rapItemId);

  if (!realized) {
    void logProjectAudit({
      projectId,
      actorId: input.recordedBy,
      action: 'cost.rap_realization_cleared',
      targetType: 'rap_item',
      targetId: rapItemId,
      metadata: { name: input.rapItemName },
    });
    return;
  }

  const plannedQty = Math.max(0, Number(input.plannedQty) || 0);
  const plannedUnitPrice = Number(input.plannedUnitPrice) || 0;
  const plannedTotal = Math.round(plannedQty * plannedUnitPrice);

  let quantity = plannedQty;
  let unitPrice = plannedUnitPrice;
  let totalAmount = plannedTotal;

  if (input.actualQty != null && input.actualQty >= 0) {
    quantity = input.actualQty;
    unitPrice = plannedUnitPrice;
    totalAmount = Math.round(quantity * unitPrice);
  } else {
    const customAmount = input.amount != null && input.amount > 0 ? Math.round(input.amount) : null;
    totalAmount = customAmount ?? plannedTotal;
    if (customAmount != null && customAmount !== plannedTotal) {
      quantity = 1;
      unitPrice = customAmount;
    }
  }

  if (totalAmount <= 0) return;

  await createCostRealization({
    project_id: projectId,
    rap_item_id: rapItemId,
    date: input.date || new Date().toISOString().slice(0, 10),
    description: `Realisasi: ${input.rapItemName}`,
    quantity,
    unit_price: unitPrice,
    total_amount: totalAmount,
    recorded_by: input.recordedBy,
    status: 'recorded',
  });
}

export async function updateCostRealization(
  id: string,
  projectId: string,
  patch: Partial<Pick<CostRealization, 'date' | 'description' | 'quantity' | 'unit_price' | 'total_amount'>>,
) {
  const { data: existing, error: selErr } = await supabase
    .from('planner_cost_realizations')
    .select('id, date, description, total_amount, journal_entry_id, recorded_by, rap_item_id, payment_method, status')
    .eq('id', id)
    .single();
  if (selErr || !existing) throw new Error(selErr?.message || 'Realisasi biaya tidak ditemukan.');

  const { postProjectExpenseJournal, reverseProjectJournal } = await import('./financeV2/projectJournalBridge');

  if (existing.journal_entry_id) {
    await reverseProjectJournal(
      existing.journal_entry_id as string,
      `Koreksi biaya proyek: ${(existing.description as string) || ''}`.trim(),
    );
  }

  const nextAmount = toRupiah(
    Number(patch.total_amount !== undefined ? patch.total_amount : existing.total_amount) || 0,
  );
  const nextDate = patch.date ?? (existing.date as string);
  const nextDesc = patch.description ?? (existing.description as string);

  let nextJournalId: string | null = null;
  if (nextAmount > 0) {
    nextJournalId = await postProjectExpenseJournal({
      projectId,
      amount: nextAmount,
      description: `Biaya proyek: ${nextDesc || ''}`,
      referenceId: id,
      entryDate: nextDate,
      createdBy: (existing.recorded_by as string) || undefined,
      rapItemId: (existing.rap_item_id as string) || null,
      paymentMethod: (existing.payment_method as string) || null,
      status: (existing.status as string) || 'recorded',
    });
  }

  const updatePayload: Record<string, unknown> = {
    ...patch,
    ...(patch.total_amount !== undefined ? { total_amount: nextAmount } : {}),
    journal_entry_id: nextJournalId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('planner_cost_realizations').update(updatePayload).eq('id', id);
  if (error) throw new Error(error.message);
  await recalculateProjectSpent(projectId);
  void logProjectAudit({
    projectId,
    action: 'cost.updated',
    targetType: 'cost',
    targetId: id,
    metadata: {
      fields: Object.keys(patch),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.total_amount !== undefined ? { total_amount: nextAmount } : {}),
    },
  });
}

export async function aggregateCostByRapItem(projectId: string) {
  const costs = await loadCostRealizations(projectId);
  const byRap: Record<string, RapActualAgg> = {};

  for (const c of costs) {
    if (!c.rap_item_id) continue;
    if (!byRap[c.rap_item_id]) {
      byRap[c.rap_item_id] = { qty: 0, amount: 0 };
    }
    const agg = byRap[c.rap_item_id];
    agg.qty += Number(c.quantity) || 0;
    agg.amount += Number(c.total_amount) || 0;
    const d = c.date || '';
    if (!agg.lastDate || d > agg.lastDate) {
      agg.lastDate = d;
      agg.lastRecordedBy = c.recorded_by;
      agg.lastCostId = c.id;
    }
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
