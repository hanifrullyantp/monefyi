import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function writeAudit(
  sb: SupabaseClient,
  params: {
    orgId?: string;
    userId?: string;
    action: string;
    targetUserId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  },
) {
  await sb.from("planner_audit_logs").insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    target_user_id: params.targetUserId,
    metadata: params.metadata || {},
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
  });
}

export async function createNotification(
  sb: SupabaseClient,
  params: {
    userId: string;
    orgId?: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
  },
) {
  await sb.from("planner_notifications").insert({
    user_id: params.userId,
    org_id: params.orgId,
    type: params.type,
    title: params.title,
    message: params.message,
    action_url: params.actionUrl,
  });
}
