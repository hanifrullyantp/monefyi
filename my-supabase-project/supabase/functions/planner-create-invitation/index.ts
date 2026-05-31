import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser, getMembership, canInviteRole } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { writeAudit } from "../_shared/audit.ts";
import { sanitizeText, generateToken, generateInviteCode } from "../_shared/sanitize.ts";

const EXPIRY_DAYS: Record<string, number | null> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  never: null,
};

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const body = await req.json();

    const orgId = body.org_id as string;
    if (!orgId) return jsonResponse({ error: "org_id required" }, 400);

    const membership = await getMembership(sb, user.id, orgId);
    if (!membership || !canInviteRole(membership.role, body.role || "worker")) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    await checkRateLimit(sb, user.id, "invitation_create");

    const type = body.type as "link" | "email" | "code";
    if (!["link", "email", "code"].includes(type)) {
      return jsonResponse({ error: "Invalid invitation type" }, 400);
    }

    const role = sanitizeText(body.role, 20) || "worker";
    if (!canInviteRole(membership.role, role)) {
      return jsonResponse({ error: "Cannot invite this role" }, 403);
    }

    const expiryKey = body.expiry as string || "7d";
    const days = EXPIRY_DAYS[expiryKey];
    const expiresAt = days
      ? new Date(Date.now() + days * 86400000).toISOString()
      : null;

    const maxUsesMap: Record<string, number> = { "1": 1, "5": 5, "10": 10, unlimited: -1 };
    const maxUses = maxUsesMap[String(body.max_uses)] ?? 1;

    const token = generateToken();
    const code = type === "code" ? generateInviteCode() : null;
    const email = type === "email" ? sanitizeText(body.email, 200).toLowerCase() : null;

    if (type === "email" && !email) return jsonResponse({ error: "email required" }, 400);

    const { data: invite, error } = await sb
      .from("planner_invitations")
      .insert({
        org_id: orgId,
        token,
        code,
        email,
        role,
        type,
        personal_message: sanitizeText(body.personal_message, 500) || null,
        max_uses: maxUses,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    const appUrl = Deno.env.get("APP_URL") || "https://app.monefyi.com";
    const joinUrl = `${appUrl}/join?token=${token}`;

    await writeAudit(sb, {
      orgId,
      userId: user.id,
      action: "invitation.created",
      metadata: { invitation_id: invite.id, type, role },
    });

    return jsonResponse({
      invitation: invite,
      join_url: joinUrl,
      code: invite.code,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    if (msg === "EMAIL_NOT_VERIFIED") return jsonResponse({ error: "Email belum diverifikasi" }, 403);
    if (msg === "RATE_LIMIT_EXCEEDED") return jsonResponse({ error: "Batas undangan harian tercapai (10/hari)" }, 429);
    console.error(e);
    return jsonResponse({ error: msg }, 500);
  }
});
