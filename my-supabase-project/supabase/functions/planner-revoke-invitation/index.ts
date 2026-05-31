import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser, getMembership } from "../_shared/auth.ts";
import { writeAudit } from "../_shared/audit.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const { invitation_id } = await req.json();
    if (!invitation_id) return jsonResponse({ error: "invitation_id required" }, 400);

    const { data: invite } = await sb.from("planner_invitations").select("org_id").eq("id", invitation_id).single();
    if (!invite) return jsonResponse({ error: "Not found" }, 404);

    const membership = await getMembership(sb, user.id, invite.org_id);
    if (!membership || !["owner", "manager"].includes(membership.role)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    await sb.from("planner_invitations").update({
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
    }).eq("id", invitation_id);

    await writeAudit(sb, {
      orgId: invite.org_id,
      userId: user.id,
      action: "invitation.revoked",
      metadata: { invitation_id },
    });

    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    return jsonResponse({ error: msg }, 500);
  }
});
