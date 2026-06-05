import { supabase } from '../../lib/supabase';
import { findSystemAccount } from './accountService';
import { createJournalEntry } from './journalService';
import type { Payable, PayableCategory, PayableStatus } from '../../types/financeV2';

function mapPayable(row: Record<string, unknown>): Payable {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    creditor_type: row.creditor_type as string,
    creditor_name: row.creditor_name as string,
    creditor_project_id: (row.creditor_project_id as string) || null,
    category: (row.category as PayableCategory) || null,
    amount: Number(row.amount) || 0,
    paid_amount: Number(row.paid_amount) || 0,
    due_date: (row.due_date as string) || null,
    status: row.status as PayableStatus,
    notes: (row.notes as string) || null,
    created_at: row.created_at as string,
  };
}

function deriveStatus(amount: number, paid: number, dueDate: string | null): PayableStatus {
  if (paid >= amount) return 'paid';
  if (paid > 0) return 'partial';
  if (dueDate && new Date(dueDate) < new Date()) return 'overdue';
  return 'open';
}

function hutangAccountType(category: PayableCategory | null): 'hutang_dagang' | 'hutang_pajak' | 'hutang_lain' {
  if (category === 'pajak') return 'hutang_pajak';
  if (category === 'lain') return 'hutang_lain';
  return 'hutang_dagang';
}

export async function loadPayables(orgId: string): Promise<Payable[]> {
  const { data, error } = await supabase
    .from('planner_payables')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapPayable);
}

export async function createPayable(input: {
  orgId: string;
  creditorType: string;
  creditorName: string;
  creditorProjectId?: string;
  category?: PayableCategory;
  amount: number;
  dueDate?: string;
  notes?: string;
  createdBy?: string;
  withJournal?: boolean;
}): Promise<Payable> {
  if (input.amount <= 0) throw new Error('Nominal hutang harus lebih dari 0.');

  const category = input.category || 'dagang';

  const { data, error } = await supabase
    .from('planner_payables')
    .insert({
      org_id: input.orgId,
      creditor_type: input.creditorType,
      creditor_name: input.creditorName.trim(),
      creditor_project_id: input.creditorProjectId || null,
      category,
      amount: input.amount,
      paid_amount: 0,
      due_date: input.dueDate || null,
      status: 'open',
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const payable = mapPayable(data);

  if (input.withJournal !== false) {
    const hutang = await findSystemAccount(input.orgId, hutangAccountType(category));
    const laba = await findSystemAccount(input.orgId, 'laba', 'periode');
    if (hutang && laba) {
      await createJournalEntry({
        orgId: input.orgId,
        description: `Hutang: ${input.creditorName}`,
        referenceType: 'project_expense',
        referenceId: payable.id,
        createdBy: input.createdBy,
        lines: [
          { accountId: laba.id, debit: input.amount, credit: 0 },
          { accountId: hutang.id, debit: 0, credit: input.amount },
        ],
      });
    }
  }

  return payable;
}

export async function recordPayablePayment(input: {
  orgId: string;
  payableId: string;
  amount: number;
  kasAccountId?: string;
  entryDate?: string;
  notes?: string;
  createdBy?: string;
}): Promise<Payable> {
  if (input.amount <= 0) throw new Error('Nominal pembayaran harus lebih dari 0.');

  const { data: current, error: selErr } = await supabase
    .from('planner_payables')
    .select('*')
    .eq('id', input.payableId)
    .single();
  if (selErr) throw new Error(selErr.message);

  const pay = mapPayable(current);
  const outstanding = pay.amount - pay.paid_amount;
  if (input.amount > outstanding + 0.01) {
    throw new Error(`Pembayaran melebihi sisa hutang (${outstanding.toLocaleString('id-ID')}).`);
  }

  const newPaid = Math.round((pay.paid_amount + input.amount) * 100) / 100;
  const status = deriveStatus(pay.amount, newPaid, pay.due_date);

  const kas = input.kasAccountId
    ? { id: input.kasAccountId }
    : await findSystemAccount(input.orgId, 'kas', 'bisnis');
  const hutang = await findSystemAccount(input.orgId, hutangAccountType(pay.category));
  if (!kas || !hutang) throw new Error('Akun kas atau hutang tidak ditemukan.');

  await createJournalEntry({
    orgId: input.orgId,
    entryDate: input.entryDate,
    description: input.notes || `Pelunasan hutang: ${pay.creditor_name}`,
    referenceType: 'project_expense',
    referenceId: input.payableId,
    createdBy: input.createdBy,
    lines: [
      { accountId: hutang.id, debit: input.amount, credit: 0 },
      { accountId: kas.id, debit: 0, credit: input.amount },
    ],
  });

  const { data, error } = await supabase
    .from('planner_payables')
    .update({ paid_amount: newPaid, status })
    .eq('id', input.payableId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapPayable(data);
}

export async function deletePayable(id: string): Promise<void> {
  const { error } = await supabase.from('planner_payables').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
