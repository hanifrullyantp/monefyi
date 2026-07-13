import { supabase } from '../../lib/supabase';
import {
  createAccount,
  ensureChartOfAccounts,
  findSystemAccount,
  loadAccountsByType,
} from './accountService';
import { createJournalEntry } from './journalService';
import { buildProjectClosePreview } from './projectCloseService';
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
  createdBy?: string;
  force?: boolean;
}) {
  const preview = await buildProjectClosePreview(input.orgId, input.projectId);
  if (!preview.canClose) throw new Error('Keuangan proyek sudah ditutup.');
  if (!input.force && preview.interProjectDebt > 0) {
    throw new Error('Selesaikan hutang antar-proyek sebelum menutup keuangan.');
  }

  await ensureChartOfAccounts(input.orgId);
  const projectKas = await getOrCreateProjectKasAccount(
    input.orgId,
    input.projectId,
    preview.projectName,
  );

  const kasAccounts = await loadKasAccounts(input.orgId);
  const businessKas = kasAccounts.find(a => !a.project_id && a.is_system)
    || await findSystemAccount(input.orgId, 'kas', 'bisnis');
  if (!businessKas) throw new Error('Akun Kas Bisnis tidak ditemukan.');

  const laba = await findSystemAccount(input.orgId, 'laba', 'periode');
  const labaDitahan = await findSystemAccount(input.orgId, 'laba_ditahan');
  if (!laba || !labaDitahan) throw new Error('Akun laba tidak ditemukan.');

  const kasRemainder = Math.max(0, projectKas.current_balance);
  const finalProfit = preview.finalProfit;

  if (kasRemainder > 0) {
    await createJournalEntry({
      orgId: input.orgId,
      description: `Tutup proyek ${preview.projectName} — transfer kas`,
      referenceType: 'project_close',
      referenceId: input.projectId,
      createdBy: input.createdBy,
      lines: [
        { accountId: businessKas.id, debit: kasRemainder, credit: 0 },
        { accountId: projectKas.id, debit: 0, credit: kasRemainder },
      ],
    });
  }

  if (finalProfit > 0) {
    await createJournalEntry({
      orgId: input.orgId,
      description: `Pengakuan laba proyek ${preview.projectName}`,
      referenceType: 'project_close',
      referenceId: input.projectId,
      createdBy: input.createdBy,
      lines: [
        { accountId: laba.id, debit: finalProfit, credit: 0 },
        { accountId: labaDitahan.id, debit: 0, credit: finalProfit },
      ],
    });
  } else if (finalProfit < 0) {
    const loss = Math.abs(finalProfit);
    await createJournalEntry({
      orgId: input.orgId,
      description: `Pencatatan defisit proyek ${preview.projectName}`,
      referenceType: 'project_close',
      referenceId: input.projectId,
      createdBy: input.createdBy,
      lines: [
        { accountId: labaDitahan.id, debit: loss, credit: 0 },
        { accountId: laba.id, debit: 0, credit: loss },
      ],
    });
  }

  const { error } = await supabase
    .from('planner_projects')
    .update({
      finance_status: 'finance_closed',
      closed_at: new Date().toISOString(),
      final_profit: finalProfit,
    })
    .eq('id', input.projectId);

  if (error) throw new Error(error.message);

  return {
    transferred: kasRemainder,
    finalProfit,
    projectKasId: projectKas.id,
  };
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
