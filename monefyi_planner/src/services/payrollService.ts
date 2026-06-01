import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';
import { countDaysPresentInMonth, formatCurrency } from './attendanceService';

export interface MemberCompensation {
  id: string;
  org_id: string;
  member_id: string;
  user_id: string;
  monthly_salary: number;
  daily_rate: number;
  currency: string;
  updated_at?: string;
}

export interface PayrollEntry {
  id: string;
  org_id: string;
  user_id: string;
  period_month: string;
  days_present: number;
  base_amount: number;
  bonus_amount: number;
  deduction_amount: number;
  net_amount: number;
  status: 'draft' | 'approved' | 'paid';
  notes?: string | null;
  created_at?: string;
  profiles?: { name?: string | null };
}

export interface BonRequest {
  id: string;
  org_id: string;
  user_id: string;
  amount: number;
  reason?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  reviewed_at?: string | null;
  reject_reason?: string | null;
  created_at?: string;
  profiles?: { name?: string | null };
}

function monthStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function monthStartIso(d = new Date()) {
  return monthStart(d).toISOString().slice(0, 10);
}

function workingDaysInMonth(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  let count = 0;
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  for (let day = 1; day <= days; day++) {
    const wd = new Date(Date.UTC(y, m, day)).getUTCDay();
    if (wd !== 0 && wd !== 6) count++;
  }
  return count || 22;
}

export async function listCompensation(orgId: string): Promise<MemberCompensation[]> {
  const { data, error } = await supabase
    .from('planner_member_compensation')
    .select('*')
    .eq('org_id', orgId);

  assertNoDbError(error);
  return (data || []).map(row => ({
    ...row,
    monthly_salary: Number(row.monthly_salary) || 0,
    daily_rate: Number(row.daily_rate) || 0,
  })) as MemberCompensation[];
}

export async function upsertCompensation(params: {
  org_id: string;
  member_id: string;
  user_id: string;
  monthly_salary: number;
  daily_rate?: number;
  currency?: string;
}) {
  const daily =
    params.daily_rate ??
    (params.monthly_salary > 0 ? Math.round(params.monthly_salary / workingDaysInMonth()) : 0);

  const { data, error } = await supabase
    .from('planner_member_compensation')
    .upsert(
      {
        org_id: params.org_id,
        member_id: params.member_id,
        user_id: params.user_id,
        monthly_salary: params.monthly_salary,
        daily_rate: daily,
        currency: params.currency || 'IDR',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,member_id' },
    )
    .select()
    .single();

  assertNoDbError(error);
  return data as MemberCompensation;
}

export async function listPayrollEntries(orgId: string, limit = 24): Promise<PayrollEntry[]> {
  const { data, error } = await supabase
    .from('planner_payroll_entries')
    .select('*, profiles(name)')
    .eq('org_id', orgId)
    .order('period_month', { ascending: false })
    .limit(limit);

  assertNoDbError(error);
  return (data || []).map(row => ({
    ...row,
    base_amount: Number(row.base_amount) || 0,
    bonus_amount: Number(row.bonus_amount) || 0,
    deduction_amount: Number(row.deduction_amount) || 0,
    net_amount: Number(row.net_amount) || 0,
    days_present: Number(row.days_present) || 0,
  })) as PayrollEntry[];
}

export async function getUserPayrollForMonth(
  orgId: string,
  userId: string,
  periodMonth = monthStart(),
): Promise<PayrollEntry | null> {
  const { data, error } = await supabase
    .from('planner_payroll_entries')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .eq('period_month', monthStartIso(periodMonth))
    .maybeSingle();

  assertNoDbError(error);
  if (!data) return null;
  return {
    ...data,
    base_amount: Number(data.base_amount) || 0,
    bonus_amount: Number(data.bonus_amount) || 0,
    deduction_amount: Number(data.deduction_amount) || 0,
    net_amount: Number(data.net_amount) || 0,
    days_present: Number(data.days_present) || 0,
  } as PayrollEntry;
}

export async function generatePayrollForOrg(
  orgId: string,
  members: { id: string; user_id: string; role: string }[],
  periodMonth = monthStart(),
) {
  const periodIso = monthStartIso(periodMonth);
  const compList = await listCompensation(orgId);
  const compByUser = new Map(compList.map(c => [c.user_id, c]));
  const workDays = workingDaysInMonth(periodMonth);
  const rows: PayrollEntry[] = [];

  for (const m of members.filter(x => x.role === 'worker' || x.role === 'manager')) {
    const comp = compByUser.get(m.user_id);
    const daysPresent = await countDaysPresentInMonth(m.user_id, orgId, periodMonth);
    const monthly = comp?.monthly_salary || 0;
    const daily = comp?.daily_rate || (monthly > 0 ? monthly / workDays : 0);
    const baseAmount = daily > 0 ? Math.round(daily * daysPresent) : 0;

    const { data, error } = await supabase
      .from('planner_payroll_entries')
      .upsert(
        {
          org_id: orgId,
          user_id: m.user_id,
          period_month: periodIso,
          days_present: daysPresent,
          base_amount: baseAmount,
          bonus_amount: 0,
          deduction_amount: 0,
          net_amount: baseAmount,
          status: 'draft',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,user_id,period_month' },
      )
      .select('*, profiles(name)')
      .single();

    assertNoDbError(error);
    rows.push({
      ...data,
      base_amount: Number(data.base_amount) || 0,
      net_amount: Number(data.net_amount) || 0,
      days_present: Number(data.days_present) || 0,
    } as PayrollEntry);
  }

  return rows;
}

export async function updatePayrollStatus(
  entryId: string,
  status: PayrollEntry['status'],
  patch?: { bonus_amount?: number; deduction_amount?: number; notes?: string },
) {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (patch?.bonus_amount != null) updates.bonus_amount = patch.bonus_amount;
  if (patch?.deduction_amount != null) updates.deduction_amount = patch.deduction_amount;
  if (patch?.notes != null) updates.notes = patch.notes;

  const { data: existing, error: fetchErr } = await supabase
    .from('planner_payroll_entries')
    .select('*')
    .eq('id', entryId)
    .single();
  assertNoDbError(fetchErr);

  const base = Number(existing.base_amount) || 0;
  const bonus = patch?.bonus_amount ?? (Number(existing.bonus_amount) || 0);
  const deduction = patch?.deduction_amount ?? (Number(existing.deduction_amount) || 0);
  updates.net_amount = base + bonus - deduction;

  const { data, error } = await supabase
    .from('planner_payroll_entries')
    .update(updates)
    .eq('id', entryId)
    .select('*, profiles(name)')
    .single();

  assertNoDbError(error);
  return data as PayrollEntry;
}

export async function listBonRequests(orgId: string, status?: BonRequest['status']) {
  let q = supabase
    .from('planner_bon_requests')
    .select('*, profiles(name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  assertNoDbError(error);
  return (data || []).map(row => ({
    ...row,
    amount: Number(row.amount) || 0,
  })) as BonRequest[];
}

export async function createBonRequest(orgId: string, userId: string, amount: number, reason?: string) {
  const { data, error } = await supabase
    .from('planner_bon_requests')
    .insert({
      org_id: orgId,
      user_id: userId,
      amount,
      reason: reason || null,
    })
    .select('*, profiles(name)')
    .single();

  assertNoDbError(error);
  return { ...data, amount: Number(data.amount) || 0 } as BonRequest;
}

export async function reviewBonRequest(
  requestId: string,
  status: 'approved' | 'rejected' | 'paid',
  reviewerId: string,
  rejectReason?: string,
) {
  const { data, error } = await supabase
    .from('planner_bon_requests')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reject_reason: rejectReason || null,
    })
    .eq('id', requestId)
    .select('*, profiles(name)')
    .single();

  assertNoDbError(error);
  return { ...data, amount: Number(data.amount) || 0 } as BonRequest;
}

export function payrollSummary(entries: PayrollEntry[]) {
  const current = entries.filter(e => e.period_month === monthStartIso())[0];
  const pendingBon = 0;
  return {
    currentMonthNet: current?.net_amount || 0,
    currentMonthLabel: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    formattedNet: formatCurrency(current?.net_amount || 0),
    pendingBon,
  };
}

export { formatCurrency, monthStartIso, workingDaysInMonth };
