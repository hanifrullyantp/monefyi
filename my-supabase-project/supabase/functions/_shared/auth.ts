import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

export async function requireUser(sb: SupabaseClient, authHeader: string | null): Promise<User> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) throw new Error("UNAUTHORIZED");
  if (!user.email_confirmed_at && Deno.env.get("SKIP_EMAIL_VERIFY") !== "true") {
    throw new Error("EMAIL_NOT_VERIFIED");
  }
  return user;
}

export async function getMembership(
  sb: SupabaseClient,
  userId: string,
  orgId?: string,
) {
  let q = sb
    .from("planner_org_members")
    .select("id, org_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active");
  if (orgId) q = q.eq("org_id", orgId);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export function canInviteRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === "owner") return targetRole === "manager" || targetRole === "worker";
  if (actorRole === "manager") return targetRole === "worker";
  return false;
}

export function canManageMembers(actorRole: string): boolean {
  return actorRole === "owner" || actorRole === "manager";
}
