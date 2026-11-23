import { supabase } from '../../lib/supabase';
import type { RppWorker } from '../../types/rpp';

function rowToWorker(row: Record<string, unknown>): RppWorker {
  return {
    id: Number(row.id),
    org_id: String(row.org_id),
    name: String(row.name),
    level: String(row.level || 'Menengah'),
    rate: Number(row.rate) || 0,
    contact: row.contact != null ? String(row.contact) : null,
    rating: Number(row.rating) || 5,
  };
}

export async function loadWorkers(orgId: string): Promise<RppWorker[]> {
  const { data, error } = await supabase
    .from('rpp_workers')
    .select('*')
    .eq('org_id', orgId)
    .order('name');
  if (error) throw new Error(error.message);
  return (data || []).map((r) => rowToWorker(r as Record<string, unknown>));
}

export type WorkerInput = {
  name: string;
  level: string;
  rate: number;
  contact?: string;
  rating?: number;
};

export async function createWorker(orgId: string, input: WorkerInput): Promise<RppWorker> {
  const { data, error } = await supabase
    .from('rpp_workers')
    .insert({
      org_id: orgId,
      name: input.name,
      level: input.level,
      rate: input.rate,
      contact: input.contact || '',
      rating: input.rating ?? 5,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToWorker(data as Record<string, unknown>);
}

export async function updateWorker(
  orgId: string,
  id: number,
  input: Partial<WorkerInput>,
): Promise<RppWorker> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name != null) patch.name = input.name;
  if (input.level != null) patch.level = input.level;
  if (input.rate != null) patch.rate = input.rate;
  if (input.contact != null) patch.contact = input.contact;
  if (input.rating != null) patch.rating = input.rating;

  const { data, error } = await supabase
    .from('rpp_workers')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToWorker(data as Record<string, unknown>);
}

export async function deleteWorker(orgId: string, id: number): Promise<void> {
  const { error } = await supabase
    .from('rpp_workers')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);
}

export async function upsertWorkerFromRapLine(
  orgId: string,
  line: { name: string; unitPrice: number },
): Promise<void> {
  const { data: existing } = await supabase
    .from('rpp_workers')
    .select('id')
    .eq('org_id', orgId)
    .ilike('name', line.name)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('rpp_workers')
      .update({ rate: line.unitPrice, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    return;
  }

  await createWorker(orgId, {
    name: line.name,
    level: 'Menengah',
    rate: line.unitPrice,
  });
}
