import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { sanitizeText } from "../_shared/sanitize.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const sb = getServiceClient();
    const url = new URL(req.url);
    const token = sanitizeText(url.searchParams.get("token") || (await req.json().catch(() => ({}))).token, 128);
    const code = sanitizeText(url.searchParams.get("code") || (await req.json().catch(() => ({}))).code, 16);

    if (!token && !code) return jsonResponse({ error: "token or code required" }, 400);

    let query = sb
      .from("planner_invitations")
      .select(`
        id, org_id, email, role, type, max_uses, used_count, expires_at, revoked_at, personal_message, created_by,
        planner_organizations ( id, name, logo_url, brand_color )
      `);

    if (token) query = query.eq("token", token);
    else query = query.eq("code", code.toUpperCase());

    const { data: invite, error } = await query.maybeSingle();
    if (error) throw error;
    if (!invite) return jsonResponse({ valid: false, error: "Undangan tidak ditemukan" }, 404);
    if (invite.revoked_at) return jsonResponse({ valid: false, error: "Undangan telah dicabut" }, 410);
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return jsonResponse({ valid: false, error: "Undangan sudah kedaluwarsa" }, 410);
    }
    if (invite.max_uses >= 0 && invite.used_count >= invite.max_uses) {
      return jsonResponse({ valid: false, error: "Undangan sudah habis digunakan" }, 410);
    }

    const org = invite.planner_organizations as { id: string; name: string; logo_url?: string; brand_color?: string };
    const { data: inviterProfile } = await sb.from("profiles").select("name").eq("id", invite.created_by).maybeSingle();

    return jsonResponse({
      valid: true,
      invitation_id: invite.id,
      org_id: invite.org_id,
      org_name: org?.name,
      org_logo: org?.logo_url,
      brand_color: org?.brand_color,
      role: invite.role,
      email: invite.email,
      type: invite.type,
      inviter_name: inviterProfile?.name || "Admin",
      personal_message: invite.personal_message,
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
