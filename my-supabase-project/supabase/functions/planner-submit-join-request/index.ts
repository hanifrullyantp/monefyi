import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";
import { createNotification } from "../_shared/audit.ts";
import { notifyJoinRequestAdmins } from "../_shared/email.ts";
import { sanitizeText } from "../_shared/sanitize.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const body = await req.json();
    const orgId = body.org_id as string;
    const message = sanitizeText(body.message, 500);

    if (!orgId) return jsonResponse({ error: "org_id required" }, 400);

    const { data: org } = await sb
      .from("planner_organizations")
      .select("id, name, owner_id, allow_join_request")
      .eq("id", orgId)
      .single();

    if (!org?.allow_join_request) {
      return jsonResponse({ error: "Organisasi tidak menerima permintaan join" }, 403);
    }

    const { data: existing } = await sb
      .from("planner_join_requests")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) return jsonResponse({ error: "Permintaan sudah ada" }, 409);

    const { data: jr, error: insertErr } = await sb
      .from("planner_join_requests")
      .insert({
        org_id: orgId,
        user_id: user.id,
        requested_role: "worker",
        message: message || null,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    const requesterName =
      sanitizeText(user.user_metadata?.name, 120) || user.email?.split("@")[0] || "Pengguna";
    const requesterEmail = user.email || "";

    if (org.owner_id) {
      await createNotification(sb, {
        userId: org.owner_id,
        orgId,
        type: "join_request",
        title: "Permintaan bergabung",
        message: `${requesterEmail} ingin bergabung ke ${org.name}.`,
        actionUrl: "/app?tab=hr",
      });
    }

    const emailResults = await notifyJoinRequestAdmins({
      sb,
      orgId,
      orgName: org.name,
      requesterName,
      requesterEmail,
      message: message || undefined,
    });

    return jsonResponse({
      request: jr,
      email: {
        configured: emailResults.length > 0,
        sent: emailResults.filter((r) => r.ok).length,
        skipped: emailResults.filter((r) => r.skipped).length,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    return jsonResponse({ error: msg }, 500);
  }
});
