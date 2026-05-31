import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser, getMembership } from "../_shared/auth.ts";
import { writeAudit, createNotification } from "../_shared/audit.ts";
import { sendEmail } from "../_shared/email.ts";
import { requestStatusHtml } from "../_shared/email-templates.ts";
import { sanitizeText } from "../_shared/sanitize.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const { request_id } = await req.json();
    if (!request_id) return jsonResponse({ error: "request_id required" }, 400);

    const { data: jr } = await sb.from("planner_join_requests").select("*").eq("id", request_id).single();
    if (!jr || jr.status !== "pending") return jsonResponse({ error: "Request not found" }, 404);

    const membership = await getMembership(sb, user.id, jr.org_id);
    if (!membership || !["owner", "manager"].includes(membership.role)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { data: org } = await sb.from("planner_organizations").select("name, owner_id").eq("id", jr.org_id).single();

    const { data: existingMember } = await sb
      .from("planner_org_members")
      .select("id")
      .eq("org_id", jr.org_id)
      .eq("user_id", jr.user_id)
      .maybeSingle();

    if (existingMember) {
      await sb.from("planner_org_members").update({
        role: jr.requested_role,
        status: "active",
        accepted_at: new Date().toISOString(),
      }).eq("id", existingMember.id);
    } else {
      await sb.from("planner_org_members").insert({
        org_id: jr.org_id,
        user_id: jr.user_id,
        role: jr.requested_role,
        status: "active",
        accepted_at: new Date().toISOString(),
      });
    }

    await sb.from("planner_join_requests").update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", request_id);

    await writeAudit(sb, {
      orgId: jr.org_id,
      userId: user.id,
      action: "join_request.approved",
      targetUserId: jr.user_id,
    });

    await createNotification(sb, {
      userId: jr.user_id,
      orgId: jr.org_id,
      type: "join_request_approved",
      title: "Permintaan disetujui",
      message: `Anda bergabung dengan ${org?.name}.`,
      actionUrl: "/onboarding/member",
    });

    const { data: requester } = await sb.auth.admin.getUserById(jr.user_id);
    if (requester?.user?.email) {
      await sendEmail({
        to: requester.user.email,
        subject: `Disetujui — ${org?.name}`,
        html: requestStatusHtml({ orgName: org?.name || "", approved: true }),
        text: `Permintaan bergabung ke ${org?.name} disetujui.`,
      }).catch(console.error);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    return jsonResponse({ error: msg }, 500);
  }
});
