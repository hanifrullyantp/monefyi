import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';
import { deleteProjectIncome, recalcTotalReceived } from './incomeService';
import { deleteProjectTransfer } from './projectTransferService';

export type ReversibleActionType =
  | 'payroll_status'
  | 'bon_review'
  | 'member_role'
  | 'org_settings'
  | 'org_access'
  | 'attendance_settings'
  | 'compensation_upsert'
  | 'project_income_create'
  | 'project_transfer_create';

export type ReversibleActionStatus = 'active' | 'undone' | 'expired';

export interface ReversibleAction {
  id: string;
  org_id: string;
  actor_id: string;
  action_type: ReversibleActionType;
  entity_type: string;
  entity_id: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  status: ReversibleActionStatus;
  expires_at: string;
  undone_at?: string | null;
  undone_by?: string | null;
  created_at: string;
}

const EXPIRY_DAYS = 7;

export async function recordReversibleAction(params: {
  orgId: string;
  actorId: string;
  actionType: ReversibleActionType;
  entityType: string;
  entityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  label?: string;
}): Promise<ReversibleAction> {
  const expires = new Date();
  expires.setDate(expires.getDate() + EXPIRY_DAYS);

  const { data, error } = await supabase
    .from('planner_reversible_actions')
    .insert({
      org_id: params.orgId,
      actor_id: params.actorId,
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId,
      before_state: params.beforeState ?? {},
      after_state: params.afterState ?? {},
      expires_at: expires.toISOString(),
    })
    .select()
    .single();
  assertNoDbError(error);
  return data as ReversibleAction;
}

export async function listRecentUndoable(orgId: string, limit = 20): Promise<ReversibleAction[]> {
  const { data, error } = await supabase
    .from('planner_reversible_actions')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);
  assertNoDbError(error);
  return (data || []) as ReversibleAction[];
}

async function applyPayrollStatus(before: Record<string, unknown>) {
  const id = String(before.id);
  const { error } = await supabase.from('planner_payroll_entries').update({
    status: before.status,
    bonus_amount: before.bonus_amount,
    deduction_amount: before.deduction_amount,
    net_amount: before.net_amount,
    notes: before.notes ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  assertNoDbError(error);
}

async function applyBonReview(before: Record<string, unknown>) {
  const id = String(before.id);
  const { error } = await supabase.from('planner_bon_requests').update({
    status: before.status ?? 'pending',
    reviewed_by: before.reviewed_by ?? null,
    reviewed_at: before.reviewed_at ?? null,
    reject_reason: before.reject_reason ?? null,
  }).eq('id', id);
  assertNoDbError(error);
}

async function applyMemberRole(before: Record<string, unknown>) {
  const id = String(before.id);
  const { error } = await supabase.from('planner_org_members').update({
    role: before.role,
  }).eq('id', id);
  assertNoDbError(error);
}

async function applyOrgSettings(orgId: string, before: Record<string, unknown>) {
  if (before.settings && typeof before.settings === 'object') {
    const { error } = await supabase.from('planner_organizations')
      .update({ settings: before.settings })
      .eq('id', orgId);
    assertNoDbError(error);
  }
  if (before.fields && typeof before.fields === 'object') {
    const fields = before.fields as Record<string, unknown>;
    const { error } = await supabase.from('planner_organizations')
      .update({
        name: fields.name,
        timezone: fields.timezone,
        brand_color: fields.brand_color,
        industry: fields.industry,
      })
      .eq('id', orgId);
    assertNoDbError(error);
  }
}

async function applyOrgAccess(orgId: string, before: Record<string, unknown>) {
  const { updateOrgAccessSettings } = await import('./memberService');
  await updateOrgAccessSettings(orgId, before as Parameters<typeof updateOrgAccessSettings>[1]);
}

async function applyAttendanceSettings(orgId: string, before: Record<string, unknown>) {
  const { data: current, error } = await supabase.from('planner_organizations').select('settings').eq('id', orgId).single();
  assertNoDbError(error);
  const merged = { ...(current?.settings as Record<string, unknown> || {}), ...before };
  const { error: updErr } = await supabase.from('planner_organizations').update({ settings: merged }).eq('id', orgId);
  assertNoDbError(updErr);
}

async function applyCompensation(before: Record<string, unknown> | null, entityId: string, orgId: string) {
  if (!before || !before.id) {
    await supabase.from('planner_member_compensation').delete().eq('org_id', orgId).eq('member_id', entityId);
    return;
  }
  const { error } = await supabase.from('planner_member_compensation').upsert({
    id: before.id,
    org_id: before.org_id,
    member_id: before.member_id,
    user_id: before.user_id,
    salary_type: before.salary_type ?? 'monthly',
    monthly_salary: before.monthly_salary,
    daily_rate: before.daily_rate,
    currency: before.currency ?? 'IDR',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'org_id,member_id' });
  assertNoDbError(error);
}

export async function undoReversibleAction(
  actionId: string,
  undoneBy: string,
  actorRole: 'owner' | 'manager' | 'worker' | 'admin',
): Promise<void> {
  if (actorRole !== 'owner' && actorRole !== 'manager' && actorRole !== 'admin') {
    throw new Error('Hanya owner/manager yang dapat undo.');
  }

  const { data: action, error: fetchErr } = await supabase
    .from('planner_reversible_actions')
    .select('*')
    .eq('id', actionId)
    .single();
  assertNoDbError(fetchErr);

  const row = action as ReversibleAction;
  if (row.status !== 'active') throw new Error('Aksi ini sudah di-undo atau kedaluwarsa.');
  if (new Date(row.expires_at) < new Date()) throw new Error('Window undo sudah kedaluwarsa.');

  const before = row.before_state;

  switch (row.action_type) {
    case 'payroll_status': {
      if (!before) throw new Error('Snapshot undo tidak valid.');
      const prevStatus = String(before.status);
      const nextWas = String((row.after_state as Record<string, unknown>)?.status || '');
      if (nextWas === 'paid' && prevStatus === 'draft' && actorRole !== 'owner' && actorRole !== 'admin') {
        throw new Error('Hanya owner yang dapat undo paid → draft.');
      }
      await applyPayrollStatus(before);
      break;
    }
    case 'bon_review':
      if (!before) throw new Error('Snapshot undo tidak valid.');
      await applyBonReview(before);
      break;
    case 'member_role':
      if (!before) throw new Error('Snapshot undo tidak valid.');
      await applyMemberRole(before);
      break;
    case 'org_settings':
      await applyOrgSettings(row.org_id, before || {});
      break;
    case 'org_access':
      await applyOrgAccess(row.org_id, before || {});
      break;
    case 'attendance_settings':
      await applyAttendanceSettings(row.org_id, before || {});
      break;
    case 'compensation_upsert':
      await applyCompensation(before, row.entity_id, row.org_id);
      break;
    case 'project_income_create': {
      const after = row.after_state as Record<string, unknown>;
      const projectId = String(after.project_id);
      await deleteProjectIncome(row.entity_id, projectId);
      break;
    }
    case 'project_transfer_create':
      await deleteProjectTransfer(row.entity_id);
      break;
    default:
      throw new Error(`Undo tidak didukung: ${row.action_type}`);
  }

  const { error: updErr } = await supabase
    .from('planner_reversible_actions')
    .update({
      status: 'undone',
      undone_at: new Date().toISOString(),
      undone_by: undoneBy,
    })
    .eq('id', actionId);
  assertNoDbError(updErr);
}

export function actionTypeLabel(type: ReversibleActionType): string {
  const map: Record<ReversibleActionType, string> = {
    payroll_status: 'Status payroll',
    bon_review: 'Review bon',
    member_role: 'Role karyawan',
    org_settings: 'Pengaturan org',
    org_access: 'Akses organisasi',
    attendance_settings: 'Pengaturan absensi',
    compensation_upsert: 'Gaji pokok',
    project_income_create: 'Uang masuk proyek',
    project_transfer_create: 'Transfer antar proyek',
  };
  return map[type] || type;
}

// Re-export for income undo path
export { recalcTotalReceived };
