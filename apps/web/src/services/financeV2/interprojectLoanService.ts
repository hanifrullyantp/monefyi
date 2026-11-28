import { supabase } from '../../lib/supabase';
import { orgToday } from '@domain/dates';
import {
  interprojectLoanDisbursement,
  interprojectLoanRepayment,
  toRupiah,
  type TemplateLine,
} from '@domain/journal';
import type { AccountType, JournalLineInput } from '../../types/financeV2';
import { ensureChartOfAccounts, findSystemAccount } from './accountService';
import { postJournalEntry } from './journalService';
import { getOrCreateProjectKasAccount } from './kasService';

export interface PostInterprojectLoanInput {
  orgId: string;
  /** Proyek pemberi pinjaman (pemegang piutang). */
  fromProjectId: string;
  /** Proyek penerima pinjaman (pemegang hutang_lain). */
  toProjectId: string;
  amount: number;
  entryDate?: string;
  description?: string;
  fromProjectName?: string;
  toProjectName?: string;
  createdBy?: string;
  partyId?: string;
}

export interface PostInterprojectLoanResult {
  journalId: string;
  referenceType: 'interproject_loan' | 'interproject_loan_repayment';
  amount: number;
  usedFallback: boolean;
}

export interface InterprojectLoanJournalLine {
  journalId?: string;
  referenceType?: string | null;
  referenceId?: string | null;
  accountType: AccountType | string;
  debit: number;
  credit: number;
  projectId?: string | null;
}

export interface ProjectInterprojectLoanBalance {
  projectId: string;
  receivableBalance: number;
  payableBalance: number;
  cashNetFromLoans: number;
  netBalance: number;
}

export interface InterprojectLoanLedgerSummary {
  byProject: Record<string, ProjectInterprojectLoanBalance>;
  totalReceivable: number;
  totalPayable: number;
  consolidatedCashImpact: number;
  profitLossImpact: number;
  isBalanced: boolean;
}

function isRpcMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST202'
    || error.code === '42883'
    || /does not exist|not found/i.test(error.message || '')
  );
}

function validateInterprojectLoanInput(input: PostInterprojectLoanInput): number {
  if (!input.orgId) throw new Error('orgId wajib diisi.');
  if (!input.fromProjectId || !input.toProjectId) {
    throw new Error('Proyek asal dan proyek tujuan pinjaman wajib diisi.');
  }
  if (input.fromProjectId === input.toProjectId) {
    throw new Error('Proyek asal dan proyek tujuan pinjaman tidak boleh sama.');
  }
  const amount = toRupiah(input.amount);
  if (amount <= 0) {
    throw new Error('Nominal pinjaman antar proyek harus lebih dari 0.');
  }
  return amount;
}

function mapTemplateLinesToJournalInputs(
  templateLines: TemplateLine[],
  accounts: {
    fromKasId: string;
    toKasId: string;
    piutangId: string;
    hutangLainId: string;
  },
  input: PostInterprojectLoanInput,
): JournalLineInput[] {
  return templateLines.map((line) => {
    const projectId = line.side === 'from' ? input.fromProjectId : input.toProjectId;
    let accountId: string;
    if (line.role === 'piutang') {
      accountId = accounts.piutangId;
    } else if (line.role === 'hutang_lain') {
      accountId = accounts.hutangLainId;
    } else if (line.role === 'kas' || line.role === 'kas_tujuan') {
      accountId = line.side === 'from' ? accounts.fromKasId : accounts.toKasId;
    } else {
      throw new Error(`Role akun tidak dikenal pada template pinjaman antar proyek: ${line.role}`);
    }

    const isPartyAccount = line.role === 'piutang' || line.role === 'hutang_lain';
    return {
      accountId,
      debit: line.debit,
      credit: line.credit,
      projectId,
      ...(isPartyAccount && input.partyId ? { partyId: input.partyId } : {}),
    };
  });
}

async function executeInterprojectLoan(
  input: PostInterprojectLoanInput,
  isRepayment: boolean,
): Promise<PostInterprojectLoanResult> {
  const amount = validateInterprojectLoanInput(input);
  const entryDate = input.entryDate || orgToday();
  const referenceType: PostInterprojectLoanResult['referenceType'] = isRepayment
    ? 'interproject_loan_repayment'
    : 'interproject_loan';
  const defaultDesc = isRepayment
    ? `Pelunasan pinjaman antar proyek: ${input.toProjectName || input.toProjectId} -> ${input.fromProjectName || input.fromProjectId}`
    : `Pinjaman antar proyek: ${input.fromProjectName || input.fromProjectId} -> ${input.toProjectName || input.toProjectId}`;
  const description = input.description?.trim() || defaultDesc;

  const { data: rpcJournalId, error: rpcErr } = await supabase.rpc('planner_post_interproject_loan', {
    p_org_id: input.orgId,
    p_from_project_id: input.fromProjectId,
    p_to_project_id: input.toProjectId,
    p_amount: amount,
    p_entry_date: entryDate,
    p_description: description,
    p_is_repayment: isRepayment,
    p_actor: input.createdBy || null,
  });

  if (!rpcErr && rpcJournalId) {
    return {
      journalId: rpcJournalId as string,
      referenceType,
      amount,
      usedFallback: false,
    };
  }

  if (rpcErr && !isRpcMissing(rpcErr)) {
    throw new Error(rpcErr.message);
  }

  await ensureChartOfAccounts(input.orgId);

  const [fromKas, toKas, piutangAcc, hutangLainAcc] = await Promise.all([
    getOrCreateProjectKasAccount(
      input.orgId,
      input.fromProjectId,
      input.fromProjectName || input.fromProjectId,
    ),
    getOrCreateProjectKasAccount(
      input.orgId,
      input.toProjectId,
      input.toProjectName || input.toProjectId,
    ),
    findSystemAccount(input.orgId, 'piutang'),
    findSystemAccount(input.orgId, 'hutang_lain'),
  ]);

  if (!piutangAcc) throw new Error('Akun sistem piutang tidak ditemukan.');
  if (!hutangLainAcc) throw new Error('Akun sistem hutang_lain tidak ditemukan.');

  const templateLines = isRepayment
    ? interprojectLoanRepayment(amount)
    : interprojectLoanDisbursement(amount);

  const journalLines = mapTemplateLinesToJournalInputs(
    templateLines,
    {
      fromKasId: fromKas.id,
      toKasId: toKas.id,
      piutangId: piutangAcc.id,
      hutangLainId: hutangLainAcc.id,
    },
    input,
  );

  const entry = await postJournalEntry({
    orgId: input.orgId,
    entryDate,
    description,
    referenceType,
    createdBy: input.createdBy,
    lines: journalLines,
  });

  return {
    journalId: entry.id,
    referenceType,
    amount,
    usedFallback: true,
  };
}

/** Mencatat pencairan pinjaman antar proyek (Proyek A -> Proyek B) lewat jurnal 4-baris seimbang. */
export async function postInterprojectLoan(
  input: PostInterprojectLoanInput,
): Promise<PostInterprojectLoanResult> {
  return executeInterprojectLoan(input, false);
}

/** Mencatat pelunasan pinjaman antar proyek (Proyek B -> Proyek A) lewat jurnal 4-baris seimbang. */
export async function postInterprojectLoanRepayment(
  input: PostInterprojectLoanInput,
): Promise<PostInterprojectLoanResult> {
  return executeInterprojectLoan(input, true);
}

/**
 * Menghitung saldo piutang/hutang pinjaman antar proyek dan dampak kas/L&R konsolidasi
 * langsung dari baris jurnal buku besar.
 */
export function computeInterprojectLoanBalancesFromLines(
  lines: InterprojectLoanJournalLine[],
): InterprojectLoanLedgerSummary {
  const reversedJournalIds = new Set<string>();
  for (const line of lines) {
    if (line.referenceType === 'reversal' && line.referenceId) {
      reversedJournalIds.add(line.referenceId);
    }
  }

  const byProject: Record<string, ProjectInterprojectLoanBalance> = {};
  const ensureProj = (projectId: string): ProjectInterprojectLoanBalance => {
    if (!byProject[projectId]) {
      byProject[projectId] = {
        projectId,
        receivableBalance: 0,
        payableBalance: 0,
        cashNetFromLoans: 0,
        netBalance: 0,
      };
    }
    return byProject[projectId];
  };

  let profitLossImpact = 0;

  for (const line of lines) {
    if (line.referenceType === 'reversal') continue;
    if (line.journalId && reversedJournalIds.has(line.journalId)) continue;
    if (
      line.referenceType !== 'interproject_loan'
      && line.referenceType !== 'interproject_loan_repayment'
    ) {
      continue;
    }

    const debit = toRupiah(line.debit);
    const credit = toRupiah(line.credit);

    if (
      line.accountType === 'pendapatan_proyek'
      || line.accountType === 'laba'
      || String(line.accountType).startsWith('hpp_')
      || line.accountType === 'beban_opex'
      || line.accountType === 'beban_penyusutan'
    ) {
      const isIncome = line.accountType === 'pendapatan_proyek' || line.accountType === 'laba';
      profitLossImpact += isIncome ? (credit - debit) : -(debit - credit);
    }

    if (!line.projectId) continue;
    const proj = ensureProj(line.projectId);

    if (line.accountType === 'piutang') {
      proj.receivableBalance += debit - credit;
    } else if (line.accountType === 'hutang_lain') {
      proj.payableBalance += credit - debit;
    } else if (line.accountType === 'kas') {
      proj.cashNetFromLoans += debit - credit;
    }
    proj.netBalance = proj.receivableBalance - proj.payableBalance;
  }

  let totalReceivable = 0;
  let totalPayable = 0;
  let consolidatedCashImpact = 0;
  for (const proj of Object.values(byProject)) {
    totalReceivable += proj.receivableBalance;
    totalPayable += proj.payableBalance;
    consolidatedCashImpact += proj.cashNetFromLoans;
  }

  return {
    byProject,
    totalReceivable,
    totalPayable,
    consolidatedCashImpact,
    profitLossImpact,
    isBalanced: totalReceivable === totalPayable && consolidatedCashImpact === 0 && profitLossImpact === 0,
  };
}

/** Membaca dan menghitung saldo pinjaman antar proyek organisasi langsung dari buku besar. */
export async function loadInterprojectLoanBalances(
  orgId: string,
): Promise<InterprojectLoanLedgerSummary> {
  const { data: entries, error: entriesErr } = await supabase
    .from('planner_journal_entries')
    .select('id, reference_type, reference_id')
    .eq('org_id', orgId)
    .in('reference_type', ['interproject_loan', 'interproject_loan_repayment', 'reversal']);

  if (entriesErr) throw new Error(entriesErr.message);
  if (!entries || entries.length === 0) {
    return computeInterprojectLoanBalancesFromLines([]);
  }

  const entryIds = entries.map((e) => e.id as string);
  const entryMap = new Map(
    entries.map((e) => [
      e.id as string,
      {
        referenceType: (e.reference_type as string) || null,
        referenceId: (e.reference_id as string) || null,
      },
    ]),
  );

  const [{ data: lines, error: linesErr }, { data: accounts, error: accErr }] = await Promise.all([
    supabase
      .from('planner_journal_lines')
      .select('journal_id, account_id, debit, credit, project_id')
      .in('journal_id', entryIds),
    supabase
      .from('planner_finance_accounts')
      .select('id, type')
      .eq('org_id', orgId),
  ]);

  if (linesErr) throw new Error(linesErr.message);
  if (accErr) throw new Error(accErr.message);

  const accountTypeMap = new Map(
    (accounts || []).map((a) => [a.id as string, a.type as string]),
  );

  const enriched: InterprojectLoanJournalLine[] = (lines || []).map((l) => {
    const journalId = l.journal_id as string;
    const entryMeta = entryMap.get(journalId);
    return {
      journalId,
      referenceType: entryMeta?.referenceType ?? null,
      referenceId: entryMeta?.referenceId ?? null,
      accountType: accountTypeMap.get(l.account_id as string) || 'kas',
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      projectId: (l.project_id as string) || null,
    };
  });

  return computeInterprojectLoanBalancesFromLines(enriched);
}
