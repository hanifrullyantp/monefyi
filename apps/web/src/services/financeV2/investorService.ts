import { supabase } from '../../lib/supabase';
import { calcDividend } from '../../lib/financeV2AdvancedCalc';
import { toRupiah } from '@domain/journal';
import { orgToday } from '@domain/dates';
import { ensureChartOfAccounts, findSystemAccount } from './accountService';
import { createJournalEntry } from './journalService';
import type { InvestmentType, Investor, InvestorTransaction, InvestorTransactionType } from '../../types/financeV2';

function mapInvestor(row: Record<string, unknown>): Investor {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    name: row.name as string,
    phone: (row.phone as string) || null,
    email: (row.email as string) || null,
    investment_type: (row.investment_type as InvestmentType) || null,
    total_invested: Number(row.total_invested) || 0,
    share_pct: row.share_pct != null ? Number(row.share_pct) : null,
    notes: (row.notes as string) || null,
    joined_date: (row.joined_date as string) || null,
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
  };
}

function mapTransaction(row: Record<string, unknown>): InvestorTransaction {
  return {
    id: row.id as string,
    investor_id: row.investor_id as string,
    type: row.type as InvestorTransactionType,
    amount: Number(row.amount) || 0,
    trans_date: row.trans_date as string,
    project_id: (row.project_id as string) || null,
    notes: (row.notes as string) || null,
    created_at: row.created_at as string,
  };
}

export async function loadInvestors(orgId: string): Promise<Investor[]> {
  const { data, error } = await supabase
    .from('planner_investors')
    .select('*')
    .eq('org_id', orgId)
    .order('name');

  if (error) throw new Error(error.message);
  return (data || []).map(mapInvestor);
}

export async function createInvestor(input: {
  orgId: string;
  name: string;
  phone?: string;
  email?: string;
  investmentType?: InvestmentType;
  sharePct?: number;
  joinedDate?: string;
  notes?: string;
}): Promise<Investor> {
  const { data, error } = await supabase
    .from('planner_investors')
    .insert({
      org_id: input.orgId,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      investment_type: input.investmentType || null,
      share_pct: input.sharePct ?? null,
      joined_date: input.joinedDate || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapInvestor(data);
}

export async function updateInvestor(
  id: string,
  patch: Partial<Pick<Investor, 'name' | 'phone' | 'email' | 'share_pct' | 'is_active' | 'notes'>>,
): Promise<Investor> {
  const { data, error } = await supabase
    .from('planner_investors')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapInvestor(data);
}

export async function loadInvestorTransactions(investorId: string): Promise<InvestorTransaction[]> {
  const { data, error } = await supabase
    .from('planner_investor_transactions')
    .select('*')
    .eq('investor_id', investorId)
    .order('trans_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapTransaction);
}

export async function computeInvestorTotalFromTransactions(investorId: string): Promise<number> {
  const txs = await loadInvestorTransactions(investorId);
  const net = txs.reduce((sum, tx) => {
    if (tx.type === 'invest') return sum + toRupiah(tx.amount);
    if (tx.type === 'withdraw') return sum - toRupiah(tx.amount);
    return sum;
  }, 0);
  return Math.max(0, net);
}

export async function recordInvestorTransaction(input: {
  orgId: string;
  investorId: string;
  type: InvestorTransactionType;
  amount: number;
  transDate?: string;
  projectId?: string;
  notes?: string;
  createdBy?: string;
  withJournal?: boolean;
}): Promise<InvestorTransaction> {
  const amount = toRupiah(input.amount);
  if (amount <= 0) throw new Error('Nominal harus lebih dari 0.');

  const { data: investorRow } = await supabase
    .from('planner_investors')
    .select('id, name')
    .eq('id', input.investorId)
    .single();

  let kasAccountId: string | null = null;
  let modalAccountId: string | null = null;
  let labaDitahanAccountId: string | null = null;

  if (input.withJournal !== false || input.type === 'dividend') {
    await ensureChartOfAccounts(input.orgId);
    const kas = await findSystemAccount(input.orgId, 'kas', 'bisnis');
    const modal = await findSystemAccount(input.orgId, 'modal_disetor');
    const labaDitahan = await findSystemAccount(input.orgId, 'laba_ditahan');

    if (input.type === 'dividend') {
      if (!kas) throw new Error('Akun Kas Bisnis tidak ditemukan.');
      if (!labaDitahan) throw new Error('Akun Laba Ditahan tidak ditemukan.');
      if (amount > Math.round(kas.current_balance)) {
        throw new Error(
          `Kas tersedia tidak mencukupi untuk dividen (tersedia Rp ${Math.round(kas.current_balance).toLocaleString('id-ID')}).`,
        );
      }
      if (amount > Math.round(labaDitahan.current_balance)) {
        throw new Error(
          `Saldo Laba Ditahan tidak mencukupi untuk dividen (tersedia Rp ${Math.round(labaDitahan.current_balance).toLocaleString('id-ID')}).`,
        );
      }
    }

    kasAccountId = kas?.id ?? null;
    modalAccountId = modal?.id ?? null;
    labaDitahanAccountId = labaDitahan?.id ?? null;
  }

  const effectiveDate = input.transDate || orgToday();
  const { data, error } = await supabase
    .from('planner_investor_transactions')
    .insert({
      investor_id: input.investorId,
      type: input.type,
      amount,
      trans_date: effectiveDate,
      project_id: input.projectId || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const tx = mapTransaction(data);

  try {
    // Turunkan total_invested langsung dari agregasi transaksi untuk menghindari race condition baca-ubah-tulis.
    const derivedTotal = await computeInvestorTotalFromTransactions(input.investorId);
    const { error: updErr } = await supabase
      .from('planner_investors')
      .update({ total_invested: derivedTotal })
      .eq('id', input.investorId);
    if (updErr) throw new Error(updErr.message);

    if (input.withJournal !== false) {
      if (input.type === 'invest' && kasAccountId && modalAccountId) {
        await createJournalEntry({
          orgId: input.orgId,
          entryDate: effectiveDate,
          description: `Investasi: ${investorRow?.name || input.investorId}`,
          referenceType: 'manual',
          referenceId: tx.id,
          createdBy: input.createdBy,
          lines: [
            { accountId: kasAccountId, debit: amount, credit: 0 },
            { accountId: modalAccountId, debit: 0, credit: amount },
          ],
        });
      } else if (input.type === 'withdraw' && kasAccountId && modalAccountId) {
        await createJournalEntry({
          orgId: input.orgId,
          entryDate: effectiveDate,
          description: `Penarikan modal: ${investorRow?.name || input.investorId}`,
          referenceType: 'manual',
          referenceId: tx.id,
          createdBy: input.createdBy,
          lines: [
            { accountId: modalAccountId, debit: amount, credit: 0 },
            { accountId: kasAccountId, debit: 0, credit: amount },
          ],
        });
      } else if (input.type === 'dividend' && kasAccountId && labaDitahanAccountId) {
        await createJournalEntry({
          orgId: input.orgId,
          entryDate: effectiveDate,
          description: `Dividen: ${investorRow?.name || input.investorId}`,
          referenceType: 'dividend',
          referenceId: tx.id,
          createdBy: input.createdBy,
          lines: [
            { accountId: labaDitahanAccountId, debit: amount, credit: 0 },
            { accountId: kasAccountId, debit: 0, credit: amount },
          ],
        });
      }
    }
  } catch (err) {
    // Kompensasi rollback transaksi bila posting jurnal gagal
    await supabase.from('planner_investor_transactions').delete().eq('id', tx.id);
    const restoredTotal = await computeInvestorTotalFromTransactions(input.investorId).catch(() => null);
    if (restoredTotal !== null) {
      await supabase.from('planner_investors').update({ total_invested: restoredTotal }).eq('id', input.investorId);
    }
    throw err instanceof Error ? err : new Error(String(err));
  }

  return tx;
}

export function calculateInvestorDividend(profit: number, sharePct: number): number {
  return calcDividend(profit, sharePct);
}

export async function deleteInvestor(id: string): Promise<void> {
  const { error } = await supabase.from('planner_investors').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
