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
    const body = await req.json();
    const requestId = body.request_id as string;
    const reason = sanitizeText(body.reject_reason, 300);

    if (!requestId) return jsonResponse({ error: "request_id required" }, 400);

    const { data: jr } = await sb.from("planner_join_requests").select("*").eq("id", requestId).single();
    if (!jr || jr.status !== "pending") return jsonResponse({ error: "Request not found" }, 404);

    const membership = await getMembership(sb, user.id, jr.org_id);
    if (!membership || !["owner", "manager"].includes(membership.role)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { data: org } = await sb.from("planner_organizations").select("name").eq("id", jr.org_id).single();

    await sb.from("planner_join_requests").update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      reject_reason: reason || null,
    }).eq("id", requestId);

    await writeAudit(sb, {
      orgId: jr.org_id,
      userId: user.id,
      action: "join_request.rejected",
      targetUserId: jr.user_id,
      metadata: { reason },
    });

    await createNotification(sb, {
      userId: jr.user_id,
      type: "join_request_rejected",
      title: "Permintaan ditolak",
      message: reason || `Permintaan ke ${org?.name} ditolak.`,
    });

    const { data: requester } = await sb.auth.admin.getUserById(jr.user_id);
    if (requester?.user?.email) {
      await sendEmail({
        to: requester.user.email,
        subject: `Ditolak — ${org?.name}`,
        html: requestStatusHtml({ orgName: org?.name || "", approved: false, reason }),
        text: `Permintaan ditolak. ${reason || ""}`,
      }).catch(console.error);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    return jsonResponse({ error: msg }, 500);
  }
});
