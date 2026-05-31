import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser, getMembership } from "../_shared/auth.ts";
import { writeAudit, createNotification } from "../_shared/audit.ts";
import { sendEmail } from "../_shared/email.ts";
import { roleChangedHtml } from "../_shared/email-templates.ts";
import { sanitizeText } from "../_shared/sanitize.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const body = await req.json();
    const memberId = body.member_id as string;
    const newRole = sanitizeText(body.role, 20);

    if (!memberId || !["manager", "worker"].includes(newRole)) {
      return jsonResponse({ error: "Invalid params" }, 400);
    }

    const { data: member } = await sb.from("planner_org_members").select("*").eq("id", memberId).single();
    if (!member) return jsonResponse({ error: "Member not found" }, 404);

    const membership = await getMembership(sb, user.id, member.org_id);
    if (!membership || membership.role !== "owner") {
      return jsonResponse({ error: "Only owner can change roles" }, 403);
    }

    if (member.user_id === user.id) {
      return jsonResponse({ error: "Cannot change own role" }, 403);
    }

    if (member.role === "owner") {
      return jsonResponse({ error: "Use transfer ownership for owner" }, 403);
    }

    await sb.from("planner_org_members").update({ role: newRole }).eq("id", memberId);

    const { data: org } = await sb.from("planner_organizations").select("name").eq("id", member.org_id).single();

    await writeAudit(sb, {
      orgId: member.org_id,
      userId: user.id,
      action: "member.role_changed",
      targetUserId: member.user_id,
      metadata: { new_role: newRole },
    });

    await createNotification(sb, {
      userId: member.user_id,
      orgId: member.org_id,
      type: "role_changed",
      title: "Peran diperbarui",
      message: `Peran Anda diubah menjadi ${newRole}.`,
    });

    const { data: target } = await sb.auth.admin.getUserById(member.user_id);
    if (target?.user?.email) {
      await sendEmail({
        to: target.user.email,
        subject: "Peran diperbarui",
        html: roleChangedHtml({ orgName: org?.name || "", newRole }),
        text: `Peran Anda diubah menjadi ${newRole}.`,
      }).catch(console.error);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    return jsonResponse({ error: msg }, 500);
  }
});
