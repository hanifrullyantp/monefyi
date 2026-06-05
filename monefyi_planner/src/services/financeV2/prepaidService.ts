import { supabase } from '../../lib/supabase';
import { calcDailyAmortization } from '../../lib/financeV2AdvancedCalc';
import { findSystemAccount } from './accountService';
import { createJournalEntry } from './journalService';
import type { PrepaidItem } from '../../types/financeV2';

function mapPrepaid(row: Record<string, unknown>): PrepaidItem {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    name: row.name as string,
    total_amount: Number(row.total_amount) || 0,
    start_date: row.start_date as string,
    end_date: row.end_date as string,
    remaining_value: Number(row.remaining_value) || 0,
    account_id: (row.account_id as string) || null,
    notes: (row.notes as string) || null,
    last_amortized_date: (row.last_amortized_date as string) || null,
    created_at: row.created_at as string,
  };
}

export async function loadPrepaidItems(orgId: string): Promise<PrepaidItem[]> {
  const { data, error } = await supabase
    .from('planner_prepaid_items')
    .select('*')
    .eq('org_id', orgId)
    .order('end_date');

  if (error) throw new Error(error.message);
  return (data || []).map(mapPrepaid);
}

export async function createPrepaidItem(input: {
  orgId: string;
  name: string;
  totalAmount: number;
  startDate: string;
  endDate: string;
  notes?: string;
  createdBy?: string;
  withJournal?: boolean;
}): Promise<PrepaidItem> {
  if (input.totalAmount <= 0) throw new Error('Nominal pra bayar harus lebih dari 0.');
  if (input.endDate < input.startDate) throw new Error('Tanggal akhir harus setelah tanggal mulai.');

  const prabayar = await findSystemAccount(input.orgId, 'prabayar');
  const kas = await findSystemAccount(input.orgId, 'kas', 'bisnis');

  const { data, error } = await supabase
    .from('planner_prepaid_items')
    .insert({
      org_id: input.orgId,
      name: input.name.trim(),
      total_amount: input.totalAmount,
      start_date: input.startDate,
      end_date: input.endDate,
      remaining_value: input.totalAmount,
      account_id: prabayar?.id || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const item = mapPrepaid(data);

  if (input.withJournal !== false && prabayar && kas) {
    await createJournalEntry({
      orgId: input.orgId,
      description: `Pra bayar: ${input.name}`,
      referenceType: 'manual',
      referenceId: item.id,
      createdBy: input.createdBy,
      lines: [
        { accountId: prabayar.id, debit: input.totalAmount, credit: 0 },
        { accountId: kas.id, debit: 0, credit: input.totalAmount },
      ],
    });
  }

  return item;
}

export async function amortizePrepaidItem(input: {
  orgId: string;
  itemId: string;
  amount?: number;
  createdBy?: string;
}): Promise<PrepaidItem> {
  const { data: current, error: selErr } = await supabase
    .from('planner_prepaid_items')
    .select('*')
    .eq('id', input.itemId)
    .single();
  if (selErr) throw new Error(selErr.message);

  const item = mapPrepaid(current);
  const today = new Date().toISOString().slice(0, 10);
  if (item.last_amortized_date === today) {
    throw new Error('Item sudah diamortisasi hari ini.');
  }

  const amt = input.amount ?? calcDailyAmortization(
    item.remaining_value,
    item.start_date,
    item.end_date,
    item.last_amortized_date,
  );
  if (amt <= 0) throw new Error('Tidak ada amortisasi untuk hari ini.');

  const actual = Math.min(amt, item.remaining_value);
  const prabayar = await findSystemAccount(input.orgId, 'prabayar');
  const laba = await findSystemAccount(input.orgId, 'laba', 'periode');
  if (!prabayar || !laba) throw new Error('Akun prabayar atau laba tidak ditemukan.');

  await createJournalEntry({
    orgId: input.orgId,
    description: `Amortisasi: ${item.name}`,
    referenceType: 'amortize',
    referenceId: item.id,
    createdBy: input.createdBy,
    lines: [
      { accountId: laba.id, debit: actual, credit: 0 },
      { accountId: prabayar.id, debit: 0, credit: actual },
    ],
  });

  const { data, error } = await supabase
    .from('planner_prepaid_items')
    .update({
      remaining_value: Math.max(0, item.remaining_value - actual),
      last_amortized_date: today,
    })
    .eq('id', item.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapPrepaid(data);
}

export async function deletePrepaidItem(id: string): Promise<void> {
  const { error } = await supabase.from('planner_prepaid_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
