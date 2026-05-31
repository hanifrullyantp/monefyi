import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";
import { writeAudit, createNotification } from "../_shared/audit.ts";
import { sanitizeText, slugify } from "../_shared/sanitize.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const body = await req.json();

    const orgName = sanitizeText(body.org_name, 120);
    if (!orgName) return jsonResponse({ error: "org_name required" }, 400);

    const { data: existingMember } = await sb
      .from("planner_org_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingMember) {
      return jsonResponse({ error: "User already belongs to an organization" }, 409);
    }

    const slug = `${slugify(orgName)}-${Date.now().toString(36)}`;
    const industry = sanitizeText(body.industry, 80) || "construction";
    const teamSize = sanitizeText(body.team_size, 20) || "1-10";
    const timezone = sanitizeText(body.timezone, 60) || "Asia/Jakarta";
    const currency = sanitizeText(body.currency, 10) || "IDR";
    const businessType = sanitizeText(body.business_type, 40) || industry;

    const { data: org, error: orgErr } = await sb
      .from("planner_organizations")
      .insert({
        name: orgName,
        slug,
        owner_id: user.id,
        industry,
        team_size: teamSize,
        timezone,
        brand_color: "#6366f1",
        onboarding_completed: false,
        settings: { business_type: businessType, currency, timezone },
      })
      .select()
      .single();

    if (orgErr) throw orgErr;

    const { error: memErr } = await sb.from("planner_org_members").insert({
      org_id: org.id,
      user_id: user.id,
      role: "owner",
      status: "active",
      accepted_at: new Date().toISOString(),
    });

    if (memErr) throw memErr;

    await sb.from("profiles").upsert({
      id: user.id,
      name: sanitizeText(body.name || user.user_metadata?.name, 120),
      onboarding_completed: false,
    });

    await writeAudit(sb, {
      orgId: org.id,
      userId: user.id,
      action: "org.created",
      metadata: { org_name: orgName },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    await createNotification(sb, {
      userId: user.id,
      orgId: org.id,
      type: "welcome",
      title: "Selamat datang di Monefyi Planner",
      message: `Organisasi ${orgName} berhasil dibuat. Lengkapi onboarding untuk memulai.`,
      actionUrl: "/onboarding/owner",
    });

    return jsonResponse({ org });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    if (msg === "EMAIL_NOT_VERIFIED") return jsonResponse({ error: "Email belum diverifikasi" }, 403);
    console.error(e);
    return jsonResponse({ error: msg }, 500);
  }
});
