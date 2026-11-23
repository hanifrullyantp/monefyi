import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { assertNoDbError } from '../lib/supabaseErrors';
import type { MemberRole, MemberProfilePatch, OrgMember } from '../types/onboarding';
import { logAudit } from './auditService';

async function invokeFn<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body || {} });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function listMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from('planner_org_members')
    .select('*, profiles!user_id(name, avatar_url)')
    .eq('org_id', orgId)
    .neq('status', 'removed')
    .order('accepted_at', { ascending: true, nullsFirst: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    org_id: row.org_id,
    user_id: row.user_id,
    role: row.role as MemberRole,
    status: row.status,
    position: row.position,
    department: row.department,
    phone: row.phone,
    bio: row.bio,
    employee_id: row.employee_id,
    address: row.address,
    employment_type: row.employment_type,
    bank_name: row.bank_name,
    bank_account: row.bank_account,
    bank_holder: row.bank_holder,
    joined_at: row.accepted_at || row.invited_at,
    last_active_at: row.last_active_at,
    profile: row.profiles as { name?: string; avatar_url?: string },
  }));
}

export async function updateMemberProfile(memberId: string, patch: MemberProfilePatch) {
  const { error } = await supabase
    .from('planner_org_members')
    .update(patch)
    .eq('id', memberId);
  assertNoDbError(error);

  try {
    const { data: row } = await supabase
      .from('planner_org_members')
      .select('org_id, user_id')
      .eq('id', memberId)
      .maybeSingle();
    if (row?.org_id) {
      void logAudit({
        orgId: row.org_id as string,
        action: 'member.profile_updated',
        targetType: 'member',
        targetId: memberId,
        targetUserId: (row.user_id as string | null) ?? null,
        metadata: { fields: Object.keys(patch) },
      });
    }
  } catch {
    // Audit metadata lookup must never break profile save.
  }
}

export async function changeMemberRole(
  memberId: string,
  role: MemberRole,
  undoContext?: { orgId: string; actorId: string },
): Promise<{ ok: boolean; undoActionId?: string }> {
  const { data: existing, error: fetchErr } = await supabase
    .from('planner_org_members')
    .select('*')
    .eq('id', memberId)
    .single();
  assertNoDbError(fetchErr);

  const result = await invokeFn<{ ok: boolean }>(config.fnChangeMemberRole, { member_id: memberId, role });

  const orgId = undoContext?.orgId ?? (existing?.org_id as string | undefined);
  if (orgId) {
    void logAudit({
      orgId,
      actorId: undoContext?.actorId ?? null,
      action: 'member.role_changed',
      targetType: 'member',
      targetId: memberId,
      targetUserId: (existing?.user_id as string | undefined) ?? null,
      metadata: {
        previous_role: existing?.role,
        new_role: role,
      },
    });
  }

  let undoActionId: string | undefined;
  if (undoContext) {
    const { recordReversibleAction } = await import('./undoService');
    const action = await recordReversibleAction({
      orgId: undoContext.orgId,
      actorId: undoContext.actorId,
      actionType: 'member_role',
      entityType: 'planner_org_members',
      entityId: memberId,
      beforeState: existing as Record<string, unknown>,
      afterState: { ...existing, role } as Record<string, unknown>,
    });
    undoActionId = action.id;
  }

  return { ...result, undoActionId };
}

export async function removeMember(memberId: string) {
  let existing: { org_id?: string | null; user_id?: string | null; role?: string | null } | null = null;
  try {
    const { data } = await supabase
      .from('planner_org_members')
      .select('org_id, user_id, role')
      .eq('id', memberId)
      .maybeSingle();
    existing = (data as { org_id?: string | null; user_id?: string | null; role?: string | null } | null) ?? null;
  } catch {
    existing = null;
  }

  const result = await invokeFn<{ ok: boolean }>(config.fnRemoveMember, { member_id: memberId });

  if (existing?.org_id) {
    void logAudit({
      orgId: existing.org_id,
      action: 'member.removed',
      targetType: 'member',
      targetId: memberId,
      targetUserId: existing.user_id ?? null,
      metadata: {
        previous_role: existing.role ?? undefined,
      },
    });
  }

  return result;
}

export async function transferOwnership(orgId: string, targetMemberId: string) {
  const result = await invokeFn<{ ok: boolean }>(config.fnTransferOwnership, {
    org_id: orgId,
    target_member_id: targetMemberId,
  });
  void logAudit({
    orgId,
    action: 'ownership.transferred',
    targetType: 'member',
    targetId: targetMemberId,
  });
  return result;
}

export async function updateOrgAccessSettings(orgId: string, settings: {
  allow_join_request?: boolean;
  allow_email_domain_signup?: boolean;
  allowed_email_domains?: string[];
  default_role_for_domain?: string;
  is_public_discoverable?: boolean;
}, undoContext?: { actorId: string }) {
  const { data: existing, error: selErr } = await supabase
    .from('planner_organizations')
    .select('allow_join_request, allow_email_domain_signup, allowed_email_domains, default_role_for_domain, is_public_discoverable')
    .eq('id', orgId)
    .single();
  assertNoDbError(selErr);

  const { error } = await supabase.from('planner_organizations').update(settings).eq('id', orgId);
  assertNoDbError(error);

  void logAudit({
    orgId,
    actorId: undoContext?.actorId ?? null,
    action: 'org.access_updated',
    targetType: 'organization',
    targetId: orgId,
    metadata: { fields: Object.keys(settings) },
  });

  let undoActionId: string | undefined;
  if (undoContext) {
    const { recordReversibleAction } = await import('./undoService');
    const action = await recordReversibleAction({
      orgId,
      actorId: undoContext.actorId,
      actionType: 'org_access',
      entityType: 'planner_organizations',
      entityId: orgId,
      beforeState: existing as Record<string, unknown>,
      afterState: { ...existing, ...settings } as Record<string, unknown>,
    });
    undoActionId = action.id;
  }

  return { undoActionId };
}
