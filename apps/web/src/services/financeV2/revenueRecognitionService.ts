import { supabase } from '../../lib/supabase';
import {
  recognizeDownPaymentRevenue,
  toRupiah,
  type JournalAccountRole,
} from '../../../../../packages/domain/src/journal';
import {
  buildScheduledRecognitionPlan,
  normalizePeriodMonth,
  normalizeRevenueRecognitionMethod,
  type RevenueRecognitionMethod,
  type ScheduledRecognitionPlanItem,
  type ScheduledRecognitionProjectInput,
} from '../../../../../packages/domain/src/revenueRecognition';
import type { AccountType, JournalLineInput } from '../../types/financeV2';
import { ensureChartOfAccounts, findSystemAccount, loadAccountsByType } from './accountService';
import { postJournalEntry } from './journalService';

export interface ProjectRecognitionOverride {
  method?: RevenueRecognitionMethod;
  progressPct?: number | null;
  completedTerminPct?: number | null;
  explicitTerminAmount?: number | null;
}

export interface PlanMonthlyRevenueRecognitionInput {
  orgId: string;
  periodMonth: string;
  projectIds?: string[];
  projects?: ScheduledRecognitionProjectInput[];
  overrides?: Record<string, ProjectRecognitionOverride>;
}

export interface PlanMonthlyRevenueRecognitionResult {
  periodMonth: string;
  plan: ScheduledRecognitionPlanItem[];
  skippedProjectIds: string[];
}

export interface PostRevenueRecognitionInput {
  orgId: string;
  projectId: string;
  periodMonth: string;
  amount: number;
  progressPct?: number | null;
  method?: RevenueRecognitionMethod;
  actorId?: string;
  description?: string;
}

export interface PostRevenueRecognitionResult {
  journalId: string;
  scheduleId: string | null;
  usedFallback: boolean;
}

function isRpcMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST202'
    || error.code === '42883'
    || /does not exist|not found/i.test(error.message || '')
  );
}

function isRelationOrColumnMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42703'
    || error.code === '42P01'
    || error.code === 'PGRST204'
    || error.code === 'PGRST205'
    || /does not exist|could not find/i.test(error.message || '')
  );
}

function monthEnd(periodMonthIso: string): string {
  const year = Number(periodMonthIso.slice(0, 4));
  const month = Number(periodMonthIso.slice(5, 7));
  const lastDay = new Date(year, month, 0).getDate();
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

async function loadProjectsForRecognition(
  orgId: string,
  projectIds?: string[],
): Promise<Array<{
  id: string;
  name: string;
  total_budget: number;
  progress_pct: number;
  revenue_recognition_method: RevenueRecognitionMethod;
}>> {
  let query = supabase
    .from('planner_projects')
    .select('id, name, total_budget, progress_pct, revenue_recognition_method, status, deleted_at')
    .eq('org_id', orgId);

  if (projectIds && projectIds.length > 0) {
    query = query.in('id', projectIds);
  }

  let { data, error } = await query;
  if (error && isRelationOrColumnMissing(error)) {
    let fallbackQuery = supabase
      .from('planner_projects')
      .select('id, name, total_budget, progress_pct, status')
      .eq('org_id', orgId);
    if (projectIds && projectIds.length > 0) {
      fallbackQuery = fallbackQuery.in('id', projectIds);
    }
    const fallbackRes = await fallbackQuery;
    data = fallbackRes.data as typeof data;
    error = fallbackRes.error;
  }

  if (error) throw new Error(error.message);

  return (data || [])
    .filter((row) => {
      const r = row as Record<string, unknown>;
      return r.deleted_at == null && r.status !== 'cancelled';
    })
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        name: (r.name as string) || '',
        total_budget: Number(r.total_budget) || 0,
        progress_pct: Number(r.progress_pct) || 0,
        revenue_recognition_method: normalizeRevenueRecognitionMethod(
          r.revenue_recognition_method as string | null | undefined,
        ),
      };
    });
}

async function loadDpTotalsByProject(projectIds: string[]): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};
  const { data, error } = await supabase
    .from('planner_project_incomes')
    .select('project_id, amount, deleted_at')
    .in('project_id', projectIds)
    .eq('category', 'dp')
    .eq('status', 'received');

  if (error) throw new Error(error.message);

  const totals: Record<string, number> = {};
  for (const row of data || []) {
    const r = row as Record<string, unknown>;
    if (r.deleted_at != null) continue;
    const pid = r.project_id as string;
    totals[pid] = (totals[pid] || 0) + toRupiah(Number(r.amount) || 0);
  }
  return totals;
}

async function loadAlreadyRecognizedByProject(
  orgId: string,
  projectIds: string[],
): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};

  const uangMukaAccounts = await loadAccountsByType(orgId, 'uang_muka_klien', { activeOnly: true });
  const uangMukaIds = uangMukaAccounts.map((a) => a.id);
  if (uangMukaIds.length === 0) return {};

  const [{ data: lines, error: linesErr }, { data: entries, error: entriesErr }] = await Promise.all([
    supabase
      .from('planner_journal_lines')
      .select('journal_id, project_id, debit')
      .in('account_id', uangMukaIds)
      .in('project_id', projectIds)
      .gt('debit', 0),
    supabase
      .from('planner_journal_entries')
      .select('id, reference_type, reference_id')
      .eq('org_id', orgId)
      .in('reference_type', ['revenue_recognition', 'project_income', 'reversal']),
  ]);

  if (linesErr) throw new Error(linesErr.message);
  if (entriesErr) throw new Error(entriesErr.message);

  const reversedIds = new Set<string>();
  const entryTypeMap = new Map<string, string>();
  for (const row of entries || []) {
    const r = row as Record<string, unknown>;
    const id = r.id as string;
    const refType = (r.reference_type as string) || '';
    const refId = (r.reference_id as string) || null;
    entryTypeMap.set(id, refType);
    if (refType === 'reversal' && refId) {
      reversedIds.add(refId);
    }
  }

  const recognized: Record<string, number> = {};
  for (const row of lines || []) {
    const r = row as Record<string, unknown>;
    const journalId = r.journal_id as string;
    const pid = r.project_id as string | null;
    if (!pid) continue;
    if (reversedIds.has(journalId)) continue;
    const refType = entryTypeMap.get(journalId);
    if (refType === 'reversal') continue;
    recognized[pid] = (recognized[pid] || 0) + toRupiah(Number(r.debit) || 0);
  }
  return recognized;
}

/**
 * Menyusun rencana pengakuan pendapatan DP bulanan dari proyek aktif organisasi.
 */
export async function planMonthlyRevenueRecognition(
  input: PlanMonthlyRevenueRecognitionInput,
): Promise<PlanMonthlyRevenueRecognitionResult> {
  const periodMonth = normalizePeriodMonth(input.periodMonth);
  let projectInputs: ScheduledRecognitionProjectInput[];

  if (input.projects) {
    projectInputs = input.projects.map((p) => {
      const ov = input.overrides?.[p.projectId];
      return {
        ...p,
        method: ov?.method ?? p.method,
        progressPct: ov?.progressPct !== undefined ? ov.progressPct : p.progressPct,
        completedTerminPct:
          ov?.completedTerminPct !== undefined ? ov.completedTerminPct : p.completedTerminPct,
        explicitTerminAmount:
          ov?.explicitTerminAmount !== undefined ? ov.explicitTerminAmount : p.explicitTerminAmount,
      };
    });
  } else {
    const projects = await loadProjectsForRecognition(input.orgId, input.projectIds);
    const ids = projects.map((p) => p.id);
    const [dpTotals, alreadyRecognized] = await Promise.all([
      loadDpTotalsByProject(ids),
      loadAlreadyRecognizedByProject(input.orgId, ids),
    ]);

    projectInputs = projects.map((p) => {
      const ov = input.overrides?.[p.id];
      return {
        projectId: p.id,
        projectName: p.name,
        method: ov?.method ?? p.revenue_recognition_method,
        contractValue: p.total_budget,
        dpReceivedTotal: dpTotals[p.id] || 0,
        dpAlreadyRecognized: alreadyRecognized[p.id] || 0,
        progressPct: ov?.progressPct !== undefined ? ov.progressPct : p.progress_pct,
        completedTerminPct: ov?.completedTerminPct ?? null,
        explicitTerminAmount: ov?.explicitTerminAmount ?? null,
      };
    });
  }

  const plan = buildScheduledRecognitionPlan(projectInputs, periodMonth);
  const includedIds = new Set(plan.map((item) => item.projectId));
  const skippedProjectIds = projectInputs
    .map((p) => p.projectId)
    .filter((id) => !includedIds.has(id));

  return {
    periodMonth,
    plan,
    skippedProjectIds,
  };
}

async function resolveAccountMapForRoles(
  orgId: string,
  roles: JournalAccountRole[],
): Promise<Record<string, string>> {
  await ensureChartOfAccounts(orgId);
  const map: Record<string, string> = {};
  for (const role of new Set(roles)) {
    const acc = await findSystemAccount(orgId, role as AccountType);
    if (!acc) {
      throw new Error(`Akun sistem '${role}' tidak ditemukan.`);
    }
    map[role] = acc.id;
  }
  return map;
}

async function ensureOrReadScheduleFallback(input: {
  orgId: string;
  projectId: string;
  periodMonth: string;
  method: RevenueRecognitionMethod;
  progressPct: number | null;
  amount: number;
}): Promise<{ scheduleId: string | null; existingJournalId: string | null }> {
  const { data: existing, error: selErr } = await supabase
    .from('planner_revenue_recognition_schedules')
    .select('id, status, journal_entry_id')
    .eq('project_id', input.projectId)
    .eq('period_month', input.periodMonth)
    .maybeSingle();

  if (selErr) {
    if (isRelationOrColumnMissing(selErr)) {
      return { scheduleId: null, existingJournalId: null };
    }
    throw new Error(selErr.message);
  }

  if (existing) {
    if (existing.status === 'posted' && existing.journal_entry_id) {
      return {
        scheduleId: existing.id as string,
        existingJournalId: existing.journal_entry_id as string,
      };
    }
    return { scheduleId: existing.id as string, existingJournalId: null };
  }

  const { data: inserted, error: insErr } = await supabase
    .from('planner_revenue_recognition_schedules')
    .insert({
      org_id: input.orgId,
      project_id: input.projectId,
      period_month: input.periodMonth,
      recognition_method: input.method,
      progress_pct: input.progressPct,
      amount_rupiah: input.amount,
      status: 'scheduled',
    })
    .select('id')
    .single();

  if (insErr) {
    if (isRelationOrColumnMissing(insErr)) {
      return { scheduleId: null, existingJournalId: null };
    }
    throw new Error(insErr.message);
  }

  return { scheduleId: (inserted?.id as string) || null, existingJournalId: null };
}

async function findExistingPeriodRecognitionJournalFallback(input: {
  orgId: string;
  projectId: string;
  periodMonth: string;
}): Promise<string | null> {
  const end = monthEnd(input.periodMonth);
  const { data: entries, error: entErr } = await supabase
    .from('planner_journal_entries')
    .select('id')
    .eq('org_id', input.orgId)
    .eq('reference_type', 'revenue_recognition')
    .gte('entry_date', input.periodMonth)
    .lte('entry_date', end);

  if (entErr || !entries || entries.length === 0) return null;
  const candidateIds = entries.map((e) => (e as Record<string, unknown>).id as string);

  const [{ data: lines }, { data: reversals }] = await Promise.all([
    supabase
      .from('planner_journal_lines')
      .select('journal_id')
      .in('journal_id', candidateIds)
      .eq('project_id', input.projectId),
    supabase
      .from('planner_journal_entries')
      .select('reference_id')
      .eq('org_id', input.orgId)
      .eq('reference_type', 'reversal')
      .in('reference_id', candidateIds),
  ]);

  const reversedSet = new Set(
    (reversals || []).map((r) => (r as Record<string, unknown>).reference_id as string),
  );
  for (const row of lines || []) {
    const jid = (row as Record<string, unknown>).journal_id as string;
    if (!reversedSet.has(jid)) return jid;
  }
  return null;
}

/**
 * Mengeksekusi posting pengakuan pendapatan DP (Dr uang_muka_klien, Cr pendapatan_proyek)
 * secara idempoten lewat RPC `planner_recognize_project_dp_revenue`,
 * dengan fallback `postJournalEntry` memakai template `recognizeDownPaymentRevenue`.
 */
export async function postRevenueRecognition(
  input: PostRevenueRecognitionInput,
): Promise<PostRevenueRecognitionResult> {
  const amount = toRupiah(input.amount);
  if (amount <= 0) {
    throw new Error('nominal_tidak_valid');
  }

  const periodMonth = normalizePeriodMonth(input.periodMonth);
  const method = normalizeRevenueRecognitionMethod(input.method);

  const { data: rpcJournalId, error: rpcErr } = await supabase.rpc(
    'planner_recognize_project_dp_revenue',
    {
      p_org_id: input.orgId,
      p_project_id: input.projectId,
      p_period_month: periodMonth,
      p_amount: amount,
      p_progress_pct: input.progressPct ?? null,
      p_actor: input.actorId ?? null,
    },
  );

  if (!rpcErr && rpcJournalId) {
    return {
      journalId: rpcJournalId as string,
      scheduleId: null,
      usedFallback: false,
    };
  }

  if (rpcErr && !isRpcMissing(rpcErr)) {
    throw new Error(rpcErr.message);
  }

  // Fallback ketika RPC belum ter-deploy di remote (BLOCKED remote)
  const { scheduleId, existingJournalId } = await ensureOrReadScheduleFallback({
    orgId: input.orgId,
    projectId: input.projectId,
    periodMonth,
    method,
    progressPct: input.progressPct ?? null,
    amount,
  });

  if (existingJournalId) {
    return {
      journalId: existingJournalId,
      scheduleId,
      usedFallback: true,
    };
  }

  if (!scheduleId) {
    const existingPeriodJournalId = await findExistingPeriodRecognitionJournalFallback({
      orgId: input.orgId,
      projectId: input.projectId,
      periodMonth,
    });
    if (existingPeriodJournalId) {
      return {
        journalId: existingPeriodJournalId,
        scheduleId: null,
        usedFallback: true,
      };
    }
  }

  const templateLines = recognizeDownPaymentRevenue(amount);
  const accountMap = await resolveAccountMapForRoles(
    input.orgId,
    templateLines.map((l) => l.role),
  );

  const lines: JournalLineInput[] = templateLines.map((line) => ({
    accountId: accountMap[line.role],
    debit: line.debit,
    credit: line.credit,
    projectId: input.projectId,
  }));

  const entry = await postJournalEntry({
    orgId: input.orgId,
    entryDate: monthEnd(periodMonth),
    description:
      input.description?.trim()
      || `Pengakuan pendapatan DP (${method}) periode ${periodMonth.slice(0, 7)}`,
    referenceType: 'revenue_recognition',
    referenceId: scheduleId ?? undefined,
    createdBy: input.actorId,
    lines,
  });

  if (scheduleId) {
    await supabase
      .from('planner_revenue_recognition_schedules')
      .update({
        recognition_method: method,
        progress_pct: input.progressPct ?? null,
        amount_rupiah: amount,
        status: 'posted',
        journal_entry_id: entry.id,
        posted_at: new Date().toISOString(),
      })
      .eq('id', scheduleId);
  }

  return {
    journalId: entry.id,
    scheduleId,
    usedFallback: true,
  };
}
