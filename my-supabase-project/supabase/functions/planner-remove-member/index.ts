import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser, getMembership } from "../_shared/auth.ts";
import { writeAudit, createNotification } from "../_shared/audit.ts";
import { sendEmailSafe } from "../_shared/email.ts";
import { memberRemovedHtml } from "../_shared/email-templates.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const { member_id } = await req.json();
    if (!member_id) return jsonResponse({ error: "member_id required" }, 400);

    const { data: member } = await sb.from("planner_org_members").select("*").eq("id", member_id).single();
    if (!member) return jsonResponse({ error: "Member not found" }, 404);

    const membership = await getMembership(sb, user.id, member.org_id);
    if (!membership) return jsonResponse({ error: "Forbidden" }, 403);

    if (member.user_id === user.id) return jsonResponse({ error: "Cannot remove yourself" }, 403);
    if (member.role === "owner") return jsonResponse({ error: "Cannot remove owner" }, 403);

    if (membership.role === "manager" && member.role !== "worker") {
      return jsonResponse({ error: "Manager can only remove workers" }, 403);
    }
    if (membership.role !== "owner" && membership.role !== "manager") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    await sb.from("planner_org_members").update({
      status: "removed",
      removed_at: new Date().toISOString(),
    }).eq("id", member_id);

    const { data: org } = await sb.from("planner_organizations").select("name").eq("id", member.org_id).single();

    await writeAudit(sb, {
      orgId: member.org_id,
      userId: user.id,
      action: "member.removed",
      targetUserId: member.user_id,
    });

    await createNotification(sb, {
      userId: member.user_id,
      type: "member_removed",
      title: "Akses dihapus",
      message: `Anda dihapus dari ${org?.name}.`,
    });

    const { data: target } = await sb.auth.admin.getUserById(member.user_id);
    if (target?.user?.email) {
      await sendEmailSafe({
        to: target.user.email,
        subject: "Akses dihapus",
        html: memberRemovedHtml(org?.name || ""),
        text: `Anda dihapus dari ${org?.name}.`,
      });
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    return jsonResponse({ error: msg }, 500);
  }
});
