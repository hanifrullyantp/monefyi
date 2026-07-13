import { supabase } from '../../lib/supabase';
import { findSystemAccount } from './accountService';
import { createJournalEntry } from './journalService';
import {
  buildPayrollAllocation,
  type PayrollAllocation,
} from './payrollAllocationService';

/**
 * Post payroll disbursement: Dr Laba (HPP/opex split) / Cr Kas Bisnis.
 */
export async function postPayrollDisbursementJournal(input: {
  orgId: string;
  payrollEntryId: string;
  userId: string;
  periodMonth: string;
  netAmount: number;
  employeeName?: string;
  createdBy?: string;
}): Promise<{ journalId: string; allocation: PayrollAllocation } | null> {
  if (input.netAmount <= 0) return null;

  const { data: existing } = await supabase
    .from('planner_payroll_entries')
    .select('journal_entry_id')
    .eq('id', input.payrollEntryId)
    .maybeSingle();

  if (existing?.journal_entry_id) return null;

  const allocation = await buildPayrollAllocation({
    orgId: input.orgId,
    userId: input.userId,
    periodMonth: input.periodMonth,
    netAmount: input.netAmount,
  });

  const kas = await findSystemAccount(input.orgId, 'kas', 'bisnis');
  const laba = await findSystemAccount(input.orgId, 'laba', 'periode');
  if (!kas || !laba) return null;

  const debitLines = allocation.lines.length
    ? allocation.lines.map(line => ({
        accountId: laba.id,
        debit: line.amount,
        credit: 0,
        notes: line.kind === 'project'
          ? `HPP proyek: ${line.projectName || line.projectId}`
          : line.reason || 'Gaji organisasi',
      }))
    : [{ accountId: laba.id, debit: input.netAmount, credit: 0 }];

  const entry = await createJournalEntry({
    orgId: input.orgId,
    entryDate: new Date().toISOString().slice(0, 10),
    description: `Pembayaran gaji${input.employeeName ? `: ${input.employeeName}` : ''}`,
    referenceType: 'payroll_disbursement',
    referenceId: input.payrollEntryId,
    createdBy: input.createdBy,
    lines: [
      ...debitLines,
      { accountId: kas.id, debit: 0, credit: input.netAmount },
    ],
  });

  await supabase
    .from('planner_payroll_entries')
    .update({
      journal_entry_id: entry.id,
      allocation_json: allocation,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.payrollEntryId);

  return { journalId: entry.id, allocation };
}

/**
 * Post bon disbursement: Dr Laba / Cr Kas.
 */
export async function postBonDisbursementJournal(input: {
  orgId: string;
  bonRequestId: string;
  amount: number;
  employeeName?: string;
  createdBy?: string;
}): Promise<string | null> {
  if (input.amount <= 0) return null;

  const { data: existing } = await supabase
    .from('planner_bon_requests')
    .select('journal_entry_id')
    .eq('id', input.bonRequestId)
    .maybeSingle();

  if (existing?.journal_entry_id) return null;

  const kas = await findSystemAccount(input.orgId, 'kas', 'bisnis');
  const laba = await findSystemAccount(input.orgId, 'laba', 'periode');
  if (!kas || !laba) return null;

  const entry = await createJournalEntry({
    orgId: input.orgId,
    entryDate: new Date().toISOString().slice(0, 10),
    description: `Bon${input.employeeName ? `: ${input.employeeName}` : ''}`,
    referenceType: 'bon_disbursement',
    referenceId: input.bonRequestId,
    createdBy: input.createdBy,
    lines: [
      { accountId: laba.id, debit: input.amount, credit: 0 },
      { accountId: kas.id, debit: 0, credit: input.amount },
    ],
  });

  await supabase
    .from('planner_bon_requests')
    .update({ journal_entry_id: entry.id })
    .eq('id', input.bonRequestId);

  return entry.id;
}
