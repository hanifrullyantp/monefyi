import { supabase } from '../../lib/supabase';
import { findSystemAccount } from './accountService';
import { createJournalEntry } from './journalService';
import type { DebtorType, Receivable, ReceivableStatus } from '../../types/financeV2';

function mapReceivable(row: Record<string, unknown>): Receivable {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    debtor_type: row.debtor_type as DebtorType,
    debtor_name: row.debtor_name as string,
    debtor_project_id: (row.debtor_project_id as string) || null,
    amount: Number(row.amount) || 0,
    paid_amount: Number(row.paid_amount) || 0,
    due_date: (row.due_date as string) || null,
    status: row.status as ReceivableStatus,
    notes: (row.notes as string) || null,
    created_at: row.created_at as string,
  };
}

function deriveStatus(amount: number, paid: number, dueDate: string | null): ReceivableStatus {
  if (paid >= amount) return 'paid';
  if (paid > 0) return 'partial';
  if (dueDate && new Date(dueDate) < new Date()) return 'overdue';
  return 'open';
}

export async function loadReceivables(orgId: string): Promise<Receivable[]> {
  const { data, error } = await supabase
    .from('planner_receivables')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapReceivable);
}

export async function loadReceivablesByProject(orgId: string, projectId: string): Promise<Receivable[]> {
  const { data, error } = await supabase
    .from('planner_receivables')
    .select('*')
    .eq('org_id', orgId)
    .eq('debtor_project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapReceivable);
}

export async function createReceivable(input: {
  orgId: string;
  debtorType: DebtorType;
  debtorName: string;
  debtorProjectId?: string;
  amount: number;
  dueDate?: string;
  notes?: string;
  createdBy?: string;
  withJournal?: boolean;
}): Promise<Receivable> {
  if (input.amount <= 0) throw new Error('Nominal piutang harus lebih dari 0.');

  const { data, error } = await supabase
    .from('planner_receivables')
    .insert({
      org_id: input.orgId,
      debtor_type: input.debtorType,
      debtor_name: input.debtorName.trim(),
      debtor_project_id: input.debtorProjectId || null,
      amount: input.amount,
      paid_amount: 0,
      due_date: input.dueDate || null,
      status: 'open',
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const receivable = mapReceivable(data);

  if (input.withJournal !== false) {
    const piutang = await findSystemAccount(input.orgId, 'piutang');
    const laba = await findSystemAccount(input.orgId, 'laba', 'periode');
    if (piutang && laba) {
      await createJournalEntry({
        orgId: input.orgId,
        description: `Piutang: ${input.debtorName}`,
        referenceType: 'project_income',
        referenceId: receivable.id,
        createdBy: input.createdBy,
        lines: [
          { accountId: piutang.id, debit: input.amount, credit: 0 },
          { accountId: laba.id, debit: 0, credit: input.amount },
        ],
      });
    }
  }

  return receivable;
}

export async function recordReceivablePayment(input: {
  orgId: string;
  receivableId: string;
  amount: number;
  kasAccountId?: string;
  entryDate?: string;
  notes?: string;
  createdBy?: string;
}): Promise<Receivable> {
  if (input.amount <= 0) throw new Error('Nominal pembayaran harus lebih dari 0.');

  const { data: current, error: selErr } = await supabase
    .from('planner_receivables')
    .select('*')
    .eq('id', input.receivableId)
    .single();
  if (selErr) throw new Error(selErr.message);

  const rec = mapReceivable(current);
  const outstanding = rec.amount - rec.paid_amount;
  if (input.amount > outstanding + 0.01) {
    throw new Error(`Pembayaran melebihi sisa piutang (${outstanding.toLocaleString('id-ID')}).`);
  }

  const newPaid = Math.round((rec.paid_amount + input.amount) * 100) / 100;
  const status = deriveStatus(rec.amount, newPaid, rec.due_date);

  const kas = input.kasAccountId
    ? { id: input.kasAccountId }
    : await findSystemAccount(input.orgId, 'kas', 'bisnis');
  const piutang = await findSystemAccount(input.orgId, 'piutang');
  if (!kas || !piutang) throw new Error('Akun kas atau piutang tidak ditemukan.');

  await createJournalEntry({
    orgId: input.orgId,
    entryDate: input.entryDate,
    description: input.notes || `Penerimaan piutang: ${rec.debtor_name}`,
    referenceType: 'project_income',
    referenceId: input.receivableId,
    createdBy: input.createdBy,
    lines: [
      { accountId: kas.id, debit: input.amount, credit: 0 },
      { accountId: piutang.id, debit: 0, credit: input.amount },
    ],
  });

  const { data, error } = await supabase
    .from('planner_receivables')
    .update({ paid_amount: newPaid, status })
    .eq('id', input.receivableId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapReceivable(data);
}

export async function deleteReceivable(id: string): Promise<void> {
  const { error } = await supabase.from('planner_receivables').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
