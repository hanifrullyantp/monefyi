import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";
import { writeAudit, createNotification } from "../_shared/audit.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const email = user.email?.toLowerCase();
    if (!email || !email.includes("@")) return jsonResponse({ joined: false });

    const domain = email.split("@")[1];

    const { data: orgs } = await sb
      .from("planner_organizations")
      .select("id, name, default_role_for_domain, allowed_email_domains")
      .eq("allow_email_domain_signup", true);

    const org = (orgs || []).find(o =>
      (o.allowed_email_domains || []).some((d: string) => d.toLowerCase() === domain)
    );

    if (!org) return jsonResponse({ joined: false });

    const { data: existing } = await sb
      .from("planner_org_members")
      .select("id")
      .eq("org_id", org.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) return jsonResponse({ joined: true, org_id: org.id });

    const role = org.default_role_for_domain || "worker";
    await sb.from("planner_org_members").insert({
      org_id: org.id,
      user_id: user.id,
      role,
      status: "active",
      accepted_at: new Date().toISOString(),
    });

    await writeAudit(sb, {
      orgId: org.id,
      userId: user.id,
      action: "member.domain_auto_join",
      metadata: { domain },
    });

    await createNotification(sb, {
      userId: user.id,
      orgId: org.id,
      type: "welcome",
      title: `Selamat datang di ${org.name}`,
      message: "Anda bergabung otomatis via domain email perusahaan.",
      actionUrl: "/onboarding/member",
    });

    return jsonResponse({ joined: true, org_id: org.id, org_name: org.name, role });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    return jsonResponse({ error: msg }, 500);
  }
});
