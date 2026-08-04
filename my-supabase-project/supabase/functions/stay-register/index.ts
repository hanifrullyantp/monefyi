import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";

const PROPERTY_TYPES = new Set([
  "hotel", "guest_house", "villa", "homestay", "kost", "cottage", "other",
]);
const OPERATING_STATUS = new Set(["operating", "not_yet", "planning"]);
const LEAD_SOURCES = new Set(["landing_page_cta", "direct_register", "login_link"]);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function sanitizeText(value: unknown, max = 200): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const fullName = sanitizeText(body.fullName, 120);
    const email = sanitizeText(body.email, 120).toLowerCase();
    const phone = sanitizeText(body.phone, 20);
    const password = typeof body.password === "string" ? body.password : "";
    const propertyName = sanitizeText(body.propertyName, 120);
    const propertyType = sanitizeText(body.propertyType, 40);
    const city = sanitizeText(body.city, 80);
    const address = sanitizeText(body.address, 500);
    const roomCount = Number(body.roomCount) || 1;
    const operatingStatus = sanitizeText(body.operatingStatus, 20);
    const referralSource = sanitizeText(body.referralSource, 80);
    const marketingOptIn = Boolean(body.marketingOptIn);
    const leadSource = LEAD_SOURCES.has(body.leadSource)
      ? body.leadSource
      : "direct_register";
    const acceptTerms = Boolean(body.acceptTerms);

    if (!fullName || fullName.length < 3) {
      return errorResponse(req, "Nama lengkap minimal 3 karakter", 400);
    }
    if (!email || !email.includes("@")) {
      return errorResponse(req, "Email tidak valid", 400);
    }
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return errorResponse(req, "Nomor HP minimal 10 digit", 400);
    }
    if (password.length < 8 || !/\d/.test(password)) {
      return errorResponse(req, "Password min 8 karakter dan harus ada angka", 400);
    }
    if (!propertyName) {
      return errorResponse(req, "Nama penginapan wajib diisi", 400);
    }
    if (!acceptTerms) {
      return errorResponse(req, "Anda harus menyetujui Syarat & Ketentuan", 400);
    }
    if (propertyType && !PROPERTY_TYPES.has(propertyType)) {
      return errorResponse(req, "Jenis penginapan tidak valid", 400);
    }
    if (operatingStatus && !OPERATING_STATUS.has(operatingStatus)) {
      return errorResponse(req, "Status operasional tidak valid", 400);
    }

    const sb = getServiceClient();

    const { data: existingUser } = await sb
      .from("stay_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return errorResponse(req, "Email sudah terdaftar. Silakan masuk.", 409);
    }

    const slug = `${slugify(propertyName)}-${Date.now().toString(36)}`;
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 14);

    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: fullName, phone },
    });

    if (authErr || !authData.user) {
      console.error("stay-register auth:", authErr);
      return errorResponse(req, authErr?.message ?? "Gagal membuat akun", 400);
    }

    const authUserId = authData.user.id;

    const { data: tenant, error: tenantErr } = await sb
      .from("stay_tenants")
      .insert({
        name: propertyName,
        slug,
        email,
        phone,
        address: address || null,
        city: city || null,
        property_type: propertyType || null,
        operating_status: operatingStatus || null,
        subscription_plan: "starter",
        subscription_expiry: trialExpiry.toISOString().split("T")[0],
        setup_completed: false,
        primary_color: "#00A86B",
      })
      .select()
      .single();

    if (tenantErr || !tenant) {
      await sb.auth.admin.deleteUser(authUserId);
      console.error("stay-register tenant:", tenantErr);
      return errorResponse(req, "Gagal membuat penginapan", 500);
    }

    const { data: stayUser, error: userErr } = await sb
      .from("stay_users")
      .insert({
        auth_user_id: authUserId,
        tenant_id: tenant.id,
        name: fullName,
        email,
        phone,
        role: "owner",
        onboarding_completed: false,
        onboarding_status: "started",
        marketing_opt_in: marketingOptIn,
      })
      .select()
      .single();

    if (userErr || !stayUser) {
      await sb.from("stay_tenants").delete().eq("id", tenant.id);
      await sb.auth.admin.deleteUser(authUserId);
      console.error("stay-register stay_user:", userErr);
      return errorResponse(req, "Gagal membuat profil pengguna", 500);
    }

    await sb.from("stay_leads").insert({
      lead_source: leadSource,
      email,
      phone,
      full_name: fullName,
      property_name: propertyName,
      property_type: propertyType || null,
      city: city || null,
      address: address || null,
      room_count: Math.min(Math.max(roomCount, 1), 500),
      operating_status: operatingStatus || null,
      referral_source: referralSource || null,
      marketing_opt_in: marketingOptIn,
      user_id: stayUser.id,
      tenant_id: tenant.id,
      onboarding_status: "started",
      raw_payload: body,
    });

    // Seed default COA if finance migration applied
    try {
      await sb.rpc("stay_seed_finance_for_tenant", { p_tenant_id: tenant.id });
    } catch {
      /* optional RPC */
    }

    return jsonResponse(req, {
      success: true,
      tenantId: tenant.id,
      userId: stayUser.id,
      email,
    });
  } catch (err) {
    console.error("stay-register:", err);
    return errorResponse(req, err instanceof Error ? err.message : "Registrasi gagal", 500);
  }
});
