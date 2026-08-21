// Supabase Edge Function: planner-lynk-webhook
// Lynk.id store Planner — Estimator Standard/Pro + Planner Pro monthly

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";
import { purchaseEmailHtml, purchaseEmailSubject, purchaseEmailText } from "../_shared/purchase-email.ts";
import { grantProductEntitlement, PRODUCT_PLANNER } from "../_shared/productEntitlements.ts";
import { sanitizeText, slugify } from "../_shared/sanitize.ts";

const jsonHeaders = { "Content-Type": "application/json" };

type PlannerProduct = "estimator_standard" | "estimator_pro" | "planner_pro";

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toDateOnlyISO(dt: Date) {
  return dt.toISOString().slice(0, 10);
}

function parseQty(item: Record<string, unknown>): number {
  const q = Number(item?.qty ?? 1);
  if (!Number.isFinite(q) || q <= 0) return 1;
  return Math.floor(q);
}

function parseKeyValueBlob(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;

  if (typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v != null && String(v).trim()) out[k.toLowerCase()] = String(v).trim();
    }
    return out;
  }

  if (typeof raw === "string") {
    for (const part of raw.split(/[\n;&]/)) {
      const [k, ...rest] = part.split("=");
      if (!k || rest.length === 0) continue;
      out[k.trim().toLowerCase()] = rest.join("=").trim();
    }
  }
  return out;
}

function extractCustomFields(messageData: Record<string, unknown>): Record<string, string> {
  const merged: Record<string, string> = {};
  const sources = [
    messageData.custom_fields,
    messageData.customFields,
    messageData.metadata,
    messageData.meta,
    messageData.notes,
    messageData.note,
    messageData.additional_data,
    messageData.additionalData,
    messageData.ref_data,
    messageData.refData,
  ];
  for (const src of sources) {
    Object.assign(merged, parseKeyValueBlob(src));
  }
  return merged;
}

function mapProductFromPayload(
  item: Record<string, unknown>,
  custom: Record<string, string>,
  amount: number,
): { product: PlannerProduct; tier: "estimator" | "pro"; variant: "standard" | "pro" | null; label: string } {
  const explicit = (custom.product || custom.plan || "").toLowerCase().replace(/-/g, "_");
  if (explicit === "estimator_standard") {
    return { product: "estimator_standard", tier: "estimator", variant: "standard", label: "Monefyi Estimator Standard" };
  }
  if (explicit === "estimator_pro") {
    return { product: "estimator_pro", tier: "estimator", variant: "pro", label: "Monefyi Estimator Pro" };
  }
  if (explicit === "planner_pro" || explicit === "pro") {
    return { product: "planner_pro", tier: "pro", variant: null, label: "Monefyi Planner Pro Bulanan" };
  }

  const title = String(item?.title ?? custom.item_title ?? "").toLowerCase();
  if (title.includes("planner") && title.includes("pro")) {
    return { product: "planner_pro", tier: "pro", variant: null, label: "Monefyi Planner Pro Bulanan" };
  }
  if (title.includes("estimator") && title.includes("pro")) {
    return { product: "estimator_pro", tier: "estimator", variant: "pro", label: "Monefyi Estimator Pro" };
  }
  if (title.includes("estimator")) {
    return { product: "estimator_standard", tier: "estimator", variant: "standard", label: "Monefyi Estimator Standard" };
  }

  const stdPrice = Number(pickEnv("ESTIMATOR_STANDARD_PRICE", "99000")) || 99000;
  const proPrice = Number(pickEnv("ESTIMATOR_PRO_PRICE", "199000")) || 199000;
  const plannerPrice = Number(pickEnv("PLANNER_PRO_MONTHLY_PRICE", "199000")) || 199000;

  if (amount === stdPrice) {
    return { product: "estimator_standard", tier: "estimator", variant: "standard", label: "Monefyi Estimator Standard" };
  }
  if (amount === plannerPrice && title.includes("planner")) {
    return { product: "planner_pro", tier: "pro", variant: null, label: "Monefyi Planner Pro Bulanan" };
  }
  if (amount === proPrice) {
    return { product: "estimator_pro", tier: "estimator", variant: "pro", label: "Monefyi Estimator Pro" };
  }

  return { product: "estimator_standard", tier: "estimator", variant: "standard", label: "Monefyi Estimator Standard" };
}

async function findUserIdByEmail(
  supa: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const list = await supa.auth.admin.listUsers({ page, perPage });
    if (list.error) break;
    const users = list.data?.users || [];
    const u = users.find((x) => String(x.email || "").toLowerCase() === email);
    if (u?.id) return u.id;
    if (users.length < perPage) break;
  }
  return null;
}

async function ensureUser(
  supa: ReturnType<typeof createClient>,
  email: string,
  name: string,
  phone: string,
): Promise<{ userId: string; isNewUser: boolean }> {
  let userId = await findUserIdByEmail(supa, email);
  if (userId) return { userId, isNewUser: false };

  const pw = crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "A1!";
  const createRes = await supa.auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true,
    user_metadata: { name, phone },
  });
  if (createRes.error || !createRes.data?.user?.id) {
    throw new Error(createRes.error?.message || "Failed to create user");
  }
  return { userId: createRes.data.user.id, isNewUser: true };
}

async function ensureOwnerOrg(
  supa: ReturnType<typeof createClient>,
  userId: string,
  orgName: string,
): Promise<string> {
  const { data: member } = await supa
    .from("planner_org_members")
    .select("org_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (member?.org_id) return member.org_id as string;

  const slug = `${slugify(orgName || "org")}-${Date.now().toString(36)}`;
  const { data: org, error: orgErr } = await supa
    .from("planner_organizations")
    .insert({
      name: orgName || "Organisasi Saya",
      slug,
      owner_id: userId,
      industry: "construction",
      team_size: "1-10",
      timezone: "Asia/Jakarta",
      brand_color: "#6366f1",
      onboarding_completed: false,
      settings: { business_type: "construction", currency: "IDR", timezone: "Asia/Jakarta" },
    })
    .select("id")
    .single();

  if (orgErr || !org?.id) throw new Error(orgErr?.message || "Failed to create org");

  const { error: memErr } = await supa.from("planner_org_members").insert({
    org_id: org.id,
    user_id: userId,
    role: "owner",
    status: "active",
    accepted_at: new Date().toISOString(),
  });
  if (memErr) throw new Error(memErr.message);

  await grantProductEntitlement(supa, userId, PRODUCT_PLANNER, "lynk_purchase");

  await supa.from("profiles").upsert({
    id: userId,
    name: sanitizeText(orgName, 120),
    onboarding_completed: false,
  });

  return org.id as string;
}

async function generateSetupPasswordUrl(
  supa: ReturnType<typeof createClient>,
  email: string,
  redirectTo: string,
): Promise<string | null> {
  const { data, error } = await supa.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (error) {
    console.error("generateLink error:", error.message);
    return null;
  }
  return data?.properties?.action_link ?? null;
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = {
    ...getCorsHeaders(req),
    "Access-Control-Allow-Headers":
      "content-type, x-lynk-signature, authorization, x-client-info, apikey",
  };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const expectedSig = pickEnv("PLANNER_LYNK_SIGNATURE_TOKEN", "") || pickEnv("LYNK_SIGNATURE_TOKEN", "");
  const requireSig = pickEnv("REQUIRE_LYNK_SIGNATURE", "false").toLowerCase() === "true";
  if (requireSig && !expectedSig) {
    return new Response(JSON.stringify({ error: "Server misconfigured: signature required" }), {
      status: 500,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }
  if (expectedSig) {
    const got = (req.headers.get("X-Lynk-Signature") || req.headers.get("x-lynk-signature") || "").trim();
    if (!got || got !== expectedSig) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, ...jsonHeaders },
      });
    }
  }

  const SUPABASE_URL = pickEnv("SUPABASE_URL");
  const SERVICE_ROLE = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const payload = await req.json().catch(() => null);
  if (!payload) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const event = payload?.event;
  const data = payload?.data;
  const messageAction = String(data?.message_action || "");
  const messageId = String(data?.message_id || "");
  const messageData = (data?.message_data || {}) as Record<string, unknown>;

  if (event !== "payment.received" || messageAction !== "SUCCESS") {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const refId = String(messageData?.refId || messageData?.ref_id || "");
  const custom = extractCustomFields(messageData);
  const customerEmail = String(
    messageData?.customer?.email ??
      messageData?.customer_email ??
      custom.customer_email ??
      messageData?.email ??
      "",
  ).trim().toLowerCase();
  const customerName = sanitizeText(
    messageData?.customer?.name ?? messageData?.customer_name ?? custom.customer_name ?? "",
    120,
  );
  const customerPhone = sanitizeText(
    messageData?.customer?.phone ?? messageData?.customer_phone ?? "",
    40,
  );

  if (!customerEmail) {
    return new Response(JSON.stringify({ error: "Missing customer email" }), {
      status: 400,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  let alreadyProcessed = false;
  try {
    const { error } = await supa.from("lynk_webhook_events").insert({
      message_id: messageId || null,
      ref_id: refId || null,
      email: customerEmail,
      payload,
      product_line: "planner",
    });
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) alreadyProcessed = true;
    }
  } catch {
    /* non-blocking */
  }

  if (alreadyProcessed) {
    return new Response(JSON.stringify({ ok: true, alreadyProcessed: true }), {
      status: 200,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const item = ((messageData?.items as unknown[])?.[0] || {}) as Record<string, unknown>;
  const qty = parseQty(item);
  const totals = (messageData?.totals || {}) as Record<string, unknown>;
  const amount = Number(totals?.customerPay ?? totals?.grandTotal ?? totals?.totalPrice ?? 0) || 0;

  const mapped = mapProductFromPayload(item, custom, amount);
  const appUrl = pickEnv("APP_URL", "https://planner.monefyi.com").replace(/\/$/, "");
  const plannerAppUrl = pickEnv("PLANNER_APP_URL", `${appUrl}/app`).replace(/\/$/, "");

  let userId = custom.user_id || "";
  let isNewUser = false;

  if (userId) {
    const { data: u } = await supa.auth.admin.getUserById(userId);
    if (!u?.user?.id) userId = "";
  }

  if (!userId) {
    const ensured = await ensureUser(supa, customerEmail, customerName, customerPhone);
    userId = ensured.userId;
    isNewUser = ensured.isNewUser;
  }

  let orgId = custom.org_id || "";
  if (orgId) {
    const { data: orgRow } = await supa.from("planner_organizations").select("id").eq("id", orgId).maybeSingle();
    if (!orgRow?.id) orgId = "";
  }
  if (!orgId) {
    orgId = await ensureOwnerOrg(supa, userId, customerName || "Organisasi Saya");
  }

  const monthlyDays = Number(pickEnv("MONTHLY_DAYS", "30")) || 30;
  let expiresAt: string | null = null;
  let expiresLabel: string | null = null;

  if (mapped.product === "planner_pro") {
    const { data: currentSub } = await supa
      .from("planner_org_subscriptions")
      .select("expires_at, tier")
      .eq("org_id", orgId)
      .maybeSingle();

    const now = new Date();
    let base = now;
    const currentExpires = currentSub?.expires_at ? new Date(String(currentSub.expires_at)) : null;
    if (currentSub?.tier === "pro" && currentExpires && currentExpires.getTime() > now.getTime()) {
      base = currentExpires;
    }
    const newExpires = addDays(base, monthlyDays * Math.max(1, qty));
    expiresAt = newExpires.toISOString();
    expiresLabel = toDateOnlyISO(newExpires);
  }

  const metadata = {
    lynk_ref: refId,
    product: mapped.product,
    item_title: String(item?.title || ""),
    qty,
    ...(mapped.variant ? { estimator_variant: mapped.variant } : {}),
  };

  const { error: actErr } = await supa.rpc("activate_subscription", {
    p_org_id: orgId,
    p_tier: mapped.tier,
    p_payment_provider: "lynk",
    p_external_payment_id: refId || messageId,
    p_amount: amount,
    p_expires_at: expiresAt,
    p_estimator_variant: mapped.variant,
    p_metadata: metadata,
  });

  if (actErr) {
    console.error("activate_subscription failed:", actErr.message);
    return new Response(JSON.stringify({ error: actErr.message }), {
      status: 500,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const orderRow = {
    ref_id: refId || null,
    email: customerEmail,
    name: customerName,
    phone: customerPhone,
    item_title: String(item?.title || mapped.label),
    qty,
    amount,
    raw_payload: payload,
    product_line: "planner",
    org_id: orgId,
    user_id: userId,
    product: mapped.product,
    plan_type: mapped.tier,
  };

  try {
    await supa.from("lynk_orders").insert(orderRow);
  } catch (e) {
    console.warn("lynk_orders insert:", (e as Error).message);
  }

  let setupPasswordUrl: string | null = null;
  if (isNewUser) {
    setupPasswordUrl = await generateSetupPasswordUrl(
      supa,
      customerEmail,
      `${plannerAppUrl}/login?payment=success`,
    );
  }

  const mailParams = {
    appUrl,
    name: customerName,
    planLabel: mapped.label,
    amount,
    refId: refId || messageId,
    expiresLabel,
    isNewUser,
    setupPasswordUrl,
  };

  const emailRes = await sendEmail({
    to: customerEmail,
    subject: purchaseEmailSubject(mapped.label),
    html: purchaseEmailHtml(mailParams),
    text: purchaseEmailText(mailParams),
  });

  return new Response(
    JSON.stringify({
      ok: true,
      userId,
      orgId,
      isNewUser,
      product: mapped.product,
      tier: mapped.tier,
      expiresAt,
      email: { sent: emailRes.ok, skipped: emailRes.skipped || false, reason: emailRes.reason || null },
    }),
    { status: 200, headers: { ...corsHeaders, ...jsonHeaders } },
  );
});
