import { supabase } from '../../lib/supabase';
import { calcDividend } from '../../lib/financeV2AdvancedCalc';
import { findSystemAccount } from './accountService';
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
  if (input.amount <= 0) throw new Error('Nominal harus lebih dari 0.');

  const { data, error } = await supabase
    .from('planner_investor_transactions')
    .insert({
      investor_id: input.investorId,
      type: input.type,
      amount: input.amount,
      trans_date: input.transDate || new Date().toISOString().slice(0, 10),
      project_id: input.projectId || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const tx = mapTransaction(data);

  const investor = await supabase.from('planner_investors').select('total_invested, name').eq('id', input.investorId).single();
  if (investor.data) {
    let newTotal = Number(investor.data.total_invested) || 0;
    if (input.type === 'invest') newTotal += input.amount;
    else if (input.type === 'withdraw') newTotal = Math.max(0, newTotal - input.amount);
    await supabase.from('planner_investors').update({ total_invested: newTotal }).eq('id', input.investorId);
  }

  if (input.withJournal !== false) {
    const kas = await findSystemAccount(input.orgId, 'kas', 'bisnis');
    const modal = await findSystemAccount(input.orgId, 'modal_disetor');
    const laba = await findSystemAccount(input.orgId, 'laba_ditahan')
      || await findSystemAccount(input.orgId, 'laba', 'periode');

    if (kas && modal && laba) {
      if (input.type === 'invest') {
        await createJournalEntry({
          orgId: input.orgId,
          description: `Investasi: ${investor.data?.name}`,
          referenceType: 'manual',
          referenceId: tx.id,
          createdBy: input.createdBy,
          lines: [
            { accountId: kas.id, debit: input.amount, credit: 0 },
            { accountId: modal.id, debit: 0, credit: input.amount },
          ],
        });
      } else if (input.type === 'withdraw') {
        await createJournalEntry({
          orgId: input.orgId,
          description: `Penarikan modal: ${investor.data?.name}`,
          referenceType: 'manual',
          referenceId: tx.id,
          createdBy: input.createdBy,
          lines: [
            { accountId: modal.id, debit: input.amount, credit: 0 },
            { accountId: kas.id, debit: 0, credit: input.amount },
          ],
        });
      } else if (input.type === 'dividend') {
        await createJournalEntry({
          orgId: input.orgId,
          description: `Dividen: ${investor.data?.name}`,
          referenceType: 'manual',
          referenceId: tx.id,
          createdBy: input.createdBy,
          lines: [
            { accountId: laba.id, debit: input.amount, credit: 0 },
            { accountId: kas.id, debit: 0, credit: input.amount },
          ],
        });
      }
    }
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
