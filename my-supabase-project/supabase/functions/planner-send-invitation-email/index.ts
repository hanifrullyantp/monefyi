import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser, getMembership, canInviteRole } from "../_shared/auth.ts";
import { getAppUrl, sendInvitationEmail } from "../_shared/email.ts";
import { sanitizeText } from "../_shared/sanitize.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const body = await req.json();

    const invitationId = body.invitation_id as string;
    const emails: string[] = Array.isArray(body.emails)
      ? body.emails.slice(0, 10).map((e: string) => sanitizeText(e, 200).toLowerCase()).filter(Boolean)
      : body.email ? [sanitizeText(body.email, 200).toLowerCase()] : [];

    if (!invitationId || emails.length === 0) {
      return jsonResponse({ error: "invitation_id and email(s) required" }, 400);
    }

    const { data: invite } = await sb
      .from("planner_invitations")
      .select("*, planner_organizations(name, brand_color)")
      .eq("id", invitationId)
      .maybeSingle();

    if (!invite || invite.revoked_at) return jsonResponse({ error: "Invitation not found" }, 404);

    const membership = await getMembership(sb, user.id, invite.org_id);
    if (!membership || !canInviteRole(membership.role, invite.role)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const org = invite.planner_organizations as { name: string; brand_color?: string };
    const appUrl = getAppUrl();
    const joinUrl = `${appUrl}/join?token=${invite.token}`;
    const inviterName = sanitizeText(user.user_metadata?.name, 120) || user.email || "Admin";

    const results: { email: string; ok: boolean; error?: string }[] = [];

    for (const email of emails) {
      try {
        await sendInvitationEmail({
          to: email,
          orgName: org?.name || "Organisasi",
          role: invite.role,
          inviterName,
          joinUrl,
          personalMessage: invite.personal_message || undefined,
          brandColor: org?.brand_color,
        });
        results.push({ email, ok: true });
      } catch (e) {
        results.push({ email, ok: false, error: e instanceof Error ? e.message : "Failed" });
      }
    }

    return jsonResponse({ results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    console.error(e);
    return jsonResponse({ error: msg }, 500);
  }
});
