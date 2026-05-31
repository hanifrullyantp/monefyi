import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser, getMembership } from "../_shared/auth.ts";
import { writeAudit, createNotification } from "../_shared/audit.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const { target_member_id, org_id } = await req.json();

    if (!target_member_id || !org_id) return jsonResponse({ error: "Missing params" }, 400);

    const membership = await getMembership(sb, user.id, org_id);
    if (!membership || membership.role !== "owner") {
      return jsonResponse({ error: "Only owner can transfer ownership" }, 403);
    }

    const { data: target } = await sb
      .from("planner_org_members")
      .select("*")
      .eq("id", target_member_id)
      .eq("org_id", org_id)
      .single();

    if (!target || target.role !== "manager") {
      return jsonResponse({ error: "Target must be an active manager" }, 400);
    }

    await sb.from("planner_org_members").update({ role: "manager" }).eq("user_id", user.id).eq("org_id", org_id);
    await sb.from("planner_org_members").update({ role: "owner" }).eq("id", target_member_id);
    await sb.from("planner_organizations").update({ owner_id: target.user_id }).eq("id", org_id);

    await writeAudit(sb, {
      orgId: org_id,
      userId: user.id,
      action: "ownership.transferred",
      targetUserId: target.user_id,
    });

    await createNotification(sb, {
      userId: target.user_id,
      orgId: org_id,
      type: "ownership_transferred",
      title: "Anda sekarang Owner",
      message: "Kepemilikan organisasi telah dialihkan kepada Anda.",
    });

    await createNotification(sb, {
      userId: user.id,
      orgId: org_id,
      type: "ownership_transferred",
      title: "Kepemilikan dialihkan",
      message: "Peran Anda sekarang Manager.",
    });

    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    return jsonResponse({ error: msg }, 500);
  }
});
