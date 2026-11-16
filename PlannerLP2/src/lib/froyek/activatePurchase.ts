import type { SupabaseClient } from "@supabase/supabase-js";

export interface FroyekActivationInput {
  email: string;
  name: string;
  phone: string;
  planId: string;
  amount: number;
  paymentId: string;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "org";
}

function tierFor(planId: string): { tier: "estimator" | "pro"; variant: "standard" | "pro" | null; expires: string | null } {
  if (planId === "estimator_standard") return { tier: "estimator", variant: "standard", expires: null };
  if (planId === "estimator_pro") return { tier: "estimator", variant: "pro", expires: null };
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return { tier: "pro", variant: null, expires };
}

async function findOrCreateUser(
  admin: SupabaseClient,
  email: string,
  name: string,
): Promise<{ userId: string; isNew: boolean }> {
  const password = `${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}Aa1!`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (created.data.user?.id) return { userId: created.data.user.id, isNew: true };

  for (let page = 1; page <= 5; page += 1) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const found = listed.data.users.find((user) => user.email?.toLowerCase() === email);
    if (found?.id) return { userId: found.id, isNew: false };
    if ((listed.data.users || []).length < 200) break;
  }
  throw new Error(created.error?.message || "Akun tidak bisa disiapkan");
}

async function ensureOrg(admin: SupabaseClient, userId: string, name: string): Promise<string> {
  const { data: member } = await admin
    .from("planner_org_members")
    .select("org_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (member?.org_id) return String(member.org_id);

  const { data: org, error } = await admin
    .from("planner_organizations")
    .insert({
      name: name || "Organisasi Saya",
      slug: `${slugify(name)}-${Date.now().toString(36)}`,
      owner_id: userId,
      industry: "construction",
      team_size: "1-10",
      timezone: "Asia/Jakarta",
      brand_color: "#059669",
      onboarding_completed: false,
      settings: { business_type: "construction", currency: "IDR", timezone: "Asia/Jakarta" },
    })
    .select("id")
    .single();
  if (error || !org?.id) throw new Error(error?.message || "Organisasi tidak bisa dibuat");

  await admin.from("profiles").upsert({ id: userId, name, onboarding_completed: false });
  const { error: memberError } = await admin.from("planner_org_members").insert({
    org_id: org.id,
    user_id: userId,
    role: "owner",
    status: "active",
    accepted_at: new Date().toISOString(),
  });
  if (memberError) throw new Error(memberError.message);
  return String(org.id);
}

/**
 * Aktivasi pembelian Froyek lewat service role.
 * Kata sandi acak tidak dikirim. Pengguna baru mendapat tautan atur kata sandi.
 */
export async function activateFroyekPurchase(
  admin: SupabaseClient,
  input: FroyekActivationInput,
): Promise<{ setupUrl: string | null }> {
  const email = input.email.trim().toLowerCase();
  const { userId, isNew } = await findOrCreateUser(admin, email, input.name);
  const orgId = await ensureOrg(admin, userId, input.name);
  const mapped = tierFor(input.planId);

  const { error: grantError } = await admin.rpc("grant_product_entitlement", {
    p_user_id: userId,
    p_product: "planner",
    p_source: "mayar_froyek",
    p_metadata: { plan: input.planId, payment_id: input.paymentId },
  });
  if (grantError) throw new Error(grantError.message);

  const { error: activateError } = await admin.rpc("activate_subscription", {
    p_org_id: orgId,
    p_tier: mapped.tier,
    p_payment_provider: "mayar",
    p_external_payment_id: input.paymentId,
    p_amount: input.amount,
    p_expires_at: mapped.expires,
    p_estimator_variant: mapped.variant,
    p_metadata: { product: input.planId, source: "froyek_landing" },
  });
  if (activateError) throw new Error(activateError.message);

  let setupUrl: string | null = null;
  if (isNew) {
    const link = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: "https://froyek.com/onboarding/owner" },
    });
    setupUrl = link.data.properties?.action_link || null;
  }
  return { setupUrl };
}
