import { supabase } from '../../lib/supabase';
import {
  createAccount,
  ensureChartOfAccounts,
  findSystemAccount,
  loadAccountsByType,
} from './accountService';
import { createJournalEntry } from './journalService';
import type { FinanceAccount } from '../../types/financeV2';

export async function loadKasAccounts(orgId: string): Promise<FinanceAccount[]> {
  await ensureChartOfAccounts(orgId);
  return loadAccountsByType(orgId, 'kas');
}

export async function createKasAccount(input: {
  orgId: string;
  name: string;
  projectId?: string;
}): Promise<FinanceAccount> {
  return createAccount({
    orgId: input.orgId,
    type: 'kas',
    category: 'aktiva',
    name: input.name.trim(),
    projectId: input.projectId,
  });
}

export async function transferKas(input: {
  orgId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  entryDate?: string;
  createdBy?: string;
}) {
  if (input.amount <= 0) throw new Error('Nominal transfer harus lebih dari 0.');
  if (input.fromAccountId === input.toAccountId) {
    throw new Error('Akun asal dan tujuan tidak boleh sama.');
  }

  return createJournalEntry({
    orgId: input.orgId,
    entryDate: input.entryDate,
    description: input.description || 'Transfer antar kas',
    referenceType: 'transfer',
    createdBy: input.createdBy,
    lines: [
      { accountId: input.toAccountId, debit: input.amount, credit: 0 },
      { accountId: input.fromAccountId, debit: 0, credit: input.amount },
    ],
  });
}

export async function closeProjectFinance(input: {
  orgId: string;
  projectId: string;
  finalProfit?: number;
  createdBy?: string;
}) {
  const kasAccounts = await loadKasAccounts(input.orgId);
  const projectKas = kasAccounts.find(a => a.project_id === input.projectId);
  if (!projectKas) throw new Error('Akun kas proyek tidak ditemukan.');

  const businessKas = kasAccounts.find(a => !a.project_id && a.is_system)
    || await findSystemAccount(input.orgId, 'kas', 'bisnis');
  if (!businessKas) throw new Error('Akun Kas Bisnis tidak ditemukan.');

  const amount = projectKas.current_balance;
  if (amount > 0) {
    await createJournalEntry({
      orgId: input.orgId,
      description: `Tutup keuangan proyek — transfer ke Kas Bisnis`,
      referenceType: 'transfer',
      referenceId: input.projectId,
      createdBy: input.createdBy,
      lines: [
        { accountId: businessKas.id, debit: amount, credit: 0 },
        { accountId: projectKas.id, debit: 0, credit: amount },
      ],
    });
  }

  const { error } = await supabase
    .from('planner_projects')
    .update({
      finance_status: 'finance_closed',
      closed_at: new Date().toISOString(),
      final_profit: input.finalProfit ?? amount,
    })
    .eq('id', input.projectId);

  if (error) throw new Error(error.message);

  return { transferred: amount, projectKasId: projectKas.id };
}

export async function getOrCreateProjectKasAccount(
  orgId: string,
  projectId: string,
  projectName: string,
): Promise<FinanceAccount> {
  const existing = await loadAccountsByType(orgId, 'kas', { projectId });
  if (existing[0]) return existing[0];

  return createKasAccount({
    orgId,
    name: `Kas ${projectName}`,
    projectId,
  });
}
