import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";
import { writeAudit, createNotification } from "../_shared/audit.ts";
import { sanitizeText } from "../_shared/sanitize.ts";

async function validateInvitation(sb: ReturnType<typeof getServiceClient>, token?: string, code?: string) {
  let q = sb.from("planner_invitations").select("*");
  if (token) q = q.eq("token", token);
  else if (code) q = q.eq("code", code.toUpperCase());
  else return null;

  const { data: invite } = await q.maybeSingle();
  if (!invite || invite.revoked_at) return null;
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return null;
  if (invite.max_uses >= 0 && invite.used_count >= invite.max_uses) return null;
  return invite;
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const body = await req.json();

    const token = sanitizeText(body.token, 128);
    const code = sanitizeText(body.code, 16);

    const invite = await validateInvitation(sb, token || undefined, code || undefined);
    if (!invite) return jsonResponse({ error: "Undangan tidak valid atau kedaluwarsa" }, 400);

    if (invite.email && user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return jsonResponse({ error: "Email tidak cocok dengan undangan" }, 403);
    }

    const { data: existingMember } = await sb
      .from("planner_org_members")
      .select("id, status")
      .eq("org_id", invite.org_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember?.status === "active") {
      return jsonResponse({ error: "Anda sudah menjadi anggota organisasi ini" }, 409);
    }

    // Domain auto-join check handled here if no invite but domain match — skip for invite path

    if (existingMember) {
      await sb.from("planner_org_members").update({
        role: invite.role,
        status: "active",
        invitation_id: invite.id,
        invited_by: invite.created_by,
        accepted_at: new Date().toISOString(),
        removed_at: null,
      }).eq("id", existingMember.id);
    } else {
      const { error: memErr } = await sb.from("planner_org_members").insert({
        org_id: invite.org_id,
        user_id: user.id,
        role: invite.role,
        status: "active",
        invitation_id: invite.id,
        invited_by: invite.created_by,
        accepted_at: new Date().toISOString(),
      });
      if (memErr) throw memErr;
    }

    await sb.from("planner_invitations")
      .update({ used_count: invite.used_count + 1 })
      .eq("id", invite.id);

    await sb.from("profiles").upsert({
      id: user.id,
      name: sanitizeText(body.name || user.user_metadata?.name, 120),
      onboarding_completed: false,
    });

    const { data: org } = await sb
      .from("planner_organizations")
      .select("name, owner_id")
      .eq("id", invite.org_id)
      .single();

    await writeAudit(sb, {
      orgId: invite.org_id,
      userId: user.id,
      action: "member.joined",
      targetUserId: user.id,
      metadata: { invitation_id: invite.id, role: invite.role },
    });

    await createNotification(sb, {
      userId: user.id,
      orgId: invite.org_id,
      type: "welcome",
      title: `Selamat datang di ${org?.name || "organisasi"}`,
      message: "Lengkapi profil Anda untuk memulai.",
      actionUrl: "/onboarding/member",
    });

    if (org?.owner_id) {
      await createNotification(sb, {
        userId: org.owner_id,
        orgId: invite.org_id,
        type: "invitation_accepted",
        title: "Undangan diterima",
        message: `${user.user_metadata?.name || user.email} bergabung sebagai ${invite.role}.`,
        actionUrl: "/app?tab=team",
      });
    }

    return jsonResponse({
      org_id: invite.org_id,
      role: invite.role,
      org_name: org?.name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    if (msg === "EMAIL_NOT_VERIFIED") return jsonResponse({ error: "Email belum diverifikasi" }, 403);
    console.error(e);
    return jsonResponse({ error: msg }, 500);
  }
});
