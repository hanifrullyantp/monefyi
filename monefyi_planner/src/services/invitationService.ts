import { agentDebugLog } from '../lib/agentDebugLog';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import type { InvitationRecord, InvitationType, MemberRole } from '../types/onboarding';

async function invokeFn<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body || {} });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function createInvitation(params: {
  org_id: string;
  type: InvitationType;
  role: MemberRole;
  expiry?: string;
  max_uses?: string | number;
  email?: string;
  personal_message?: string;
}) {
  return invokeFn<{ invitation: InvitationRecord; join_url: string; code?: string }>(
    config.fnCreateInvitation,
    params,
  );
}

export async function sendInvitationEmails(invitationId: string, emails: string[]) {
  // #region agent log
  agentDebugLog('H5', 'invitationService.ts:send', 'invite email request', {
    invitationId,
    recipientCount: emails.length,
    domains: emails.map(e => e.split('@')[1] || '').filter(Boolean),
  });
  // #endregion
  const result = await invokeFn<{ results: { email: string; ok: boolean; error?: string }[] }>(
    config.fnSendInvitationEmail,
    { invitation_id: invitationId, emails },
  );
  // #region agent log
  agentDebugLog('H5', 'invitationService.ts:send', 'invite email response', {
    results: result.results?.map(r => ({ ok: r.ok, hasError: !!r.error })),
  });
  // #endregion
  return result;
}

export async function revokeInvitation(invitationId: string) {
  return invokeFn<{ ok: boolean }>(config.fnRevokeInvitation, { invitation_id: invitationId });
}

export async function listInvitations(orgId: string) {
  const { data, error } = await supabase
    .from('planner_invitations')
    .select('*')
    .eq('org_id', orgId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as InvitationRecord[];
}
