import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { generateSetupPasswordUrl } from "./auth-setup-link.ts";
import { sendEmailSafe } from "./email.ts";
import { purchaseEmailHtml, purchaseEmailSubject, purchaseEmailText } from "./purchase-email.ts";
import { grantProductEntitlement, PRODUCT_PLANNER } from "./productEntitlements.ts";
import { sanitizeText, slugify } from "./sanitize.ts";

export type PlannerLynkProduct = "estimator_standard" | "estimator_pro" | "planner_pro";

export type PlannerLynkResult = {
  status: number;
  body: Record<string, unknown>;
};

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

export { verifyLynkWebhookPayload } from "./lynkSignature.ts";

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

export function extractLynkCustomFields(messageData: Record<string, unknown>): Record<string, string> {
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
  for (const src of sources) Object.assign(merged, parseKeyValueBlob(src));
  return merged;
}

export function unwrapLynkMessageData(payload: Record<string, unknown>): Record<string, unknown> {
  const data = (payload.data && typeof payload.data === "object")
    ? payload.data as Record<string, unknown>
    : payload;
  const messageData = data.message_data ?? data.messageData ?? data;
  return (messageData && typeof messageData === "object")
    ? messageData as Record<string, unknown>
    : {};
}

export function isLynkPaymentSuccess(payload: Record<string, unknown>): boolean {
  const data = (payload.data && typeof payload.data === "object")
    ? payload.data as Record<string, unknown>
    : payload;
  const event = String(payload.event ?? payload.type ?? data.event ?? "").toLowerCase();
  const action = String(data.message_action ?? payload.message_action ?? "").toUpperCase();
  const status = String(
    data.status ?? (unwrapLynkMessageData(payload).status as string) ?? "",
  ).toLowerCase();

  if (action === "FAILED" || action === "CANCELLED" || action === "EXPIRED") return false;
  if (status === "failed" || status === "cancelled") return false;
  if (action === "SUCCESS" || action === "PAID") return true;
  if (status === "success" || status === "paid" || status === "settlement") return true;
  if (event.includes("payment.received") || event.includes("payment_received")) return true;
  return false;
}

const ESTIMATOR_SKU = ["16w36xe7z3v1", "qynky6065k37"];

export function looksLikePlannerLynkPurchase(payload: Record<string, unknown>): boolean {
  const messageData = unwrapLynkMessageData(payload);
  const custom = extractLynkCustomFields(messageData);
  const item = ((messageData.items as unknown[])?.[0] || {}) as Record<string, unknown>;
  const explicit = `${custom.product || ""} ${custom.plan || ""}`.toLowerCase().replace(/-/g, "_");
  if (explicit.includes("estimator") || explicit.includes("planner_pro")) return true;

  const title = String(item.title ?? custom.item_title ?? "").toLowerCase();
  if (title.includes("estimator")) return true;
  if (title.includes("planner") && title.includes("pro")) return true;

  const blob = JSON.stringify(messageData).toLowerCase();
  if (blob.includes("estimator")) return true;
  return ESTIMATOR_SKU.some((sku) => blob.includes(sku));
}

function mapProductFromPayload(
  item: Record<string, unknown>,
  custom: Record<string, string>,
  amount: number,
): {
  product: PlannerLynkProduct;
  tier: "estimator" | "pro";
  variant: "standard" | "pro" | null;
  label: string;
  isUpgrade?: boolean;
} {
  const upgradeDelta = Number(pickEnv("ESTIMATOR_UPGRADE_DELTA", "100000")) || 100000;
  const upgradeFrom = (custom.upgrade_from || custom.upgradeFrom || "").toLowerCase().replace(/-/g, "_");
  const explicit = (custom.product || custom.plan || "").toLowerCase().replace(/-/g, "_");

  if (explicit === "estimator_pro" && upgradeFrom === "estimator_standard") {
    return { product: "estimator_pro", tier: "estimator", variant: "pro", label: "Upgrade Estimator Pro", isUpgrade: true };
  }
  if (amount === upgradeDelta && (explicit === "estimator_pro" || upgradeFrom === "estimator_standard")) {
    return { product: "estimator_pro", tier: "estimator", variant: "pro", label: "Upgrade Estimator Pro", isUpgrade: true };
  }
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
  if (amount === stdPrice) {
    return { product: "estimator_standard", tier: "estimator", variant: "standard", label: "Monefyi Estimator Standard" };
  }
  if (amount === proPrice) {
    return { product: "estimator_pro", tier: "estimator", variant: "pro", label: "Monefyi Estimator Pro" };
  }
  return { product: "estimator_standard", tier: "estimator", variant: "standard", label: "Monefyi Estimator Standard" };
}

function customerEmailFrom(messageData: Record<string, unknown>, custom: Record<string, string>): string {
  const customer = (messageData.customer && typeof messageData.customer === "object")
    ? messageData.customer as Record<string, unknown>
    : {};
  return String(
    customer.email
      ?? messageData.customer_email
      ?? custom.customer_email
      ?? messageData.email
      ?? messageData.buyer_email
      ?? "",
  ).trim().toLowerCase();
}

async function findUserIdByEmail(supa: SupabaseClient, email: string): Promise<string | null> {
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
  supa: SupabaseClient,
  email: string,
  name: string,
  phone: string,
): Promise<{ userId: string; isNewUser: boolean }> {
  const existing = await findUserIdByEmail(supa, email);
  if (existing) return { userId: existing, isNewUser: false };

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

async function ensureOwnerOrg(supa: SupabaseClient, userId: string, orgName: string): Promise<string> {
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

  await supa.from("profiles").upsert({
    id: userId,
    name: sanitizeText(orgName, 120),
    onboarding_completed: false,
  });

  const { error: memErr } = await supa.from("planner_org_members").insert({
    org_id: org.id,
    user_id: userId,
    role: "owner",
    status: "active",
    accepted_at: new Date().toISOString(),
  });
  if (memErr) throw new Error(memErr.message);

  try {
    await grantProductEntitlement(supa, userId, PRODUCT_PLANNER, "lynk_purchase");
  } catch (e) {
    console.warn("grantProductEntitlement (planner) non-fatal:", (e as Error).message);
  }
  return org.id as string;
}

async function sendPurchaseConfirmation(params: {
  email: string;
  isNewUser: boolean;
  customerName: string;
  mapped: { label: string; product: PlannerLynkProduct; tier: "estimator" | "pro" };
  amount: number;
  refId: string;
  expiresLabel: string | null;
  setupPasswordUrl: string | null;
}): Promise<{ ok: boolean; skipped?: boolean; reason?: string; resendId?: string }> {
  const isEstimator = params.mapped.tier === "estimator";
  const plannerSiteUrl = pickEnv("APP_URL", "https://planner.monefyi.com").replace(/\/$/, "");
  const estimatorSiteUrl = pickEnv("ESTIMATOR_SITE_URL", "https://estimator.monefyi.com").replace(/\/$/, "");
  const plannerAppUrl = pickEnv("PLANNER_APP_URL", `${plannerSiteUrl}/app`).replace(/\/$/, "");
  const estimatorAppUrl = pickEnv("ESTIMATOR_APP_URL", `${estimatorSiteUrl}/app`).replace(/\/$/, "");
  const mailParams = {
    appUrl: isEstimator ? estimatorSiteUrl : plannerSiteUrl,
    appBaseUrl: isEstimator ? estimatorAppUrl : plannerAppUrl,
    name: params.customerName,
    planLabel: params.mapped.label,
    amount: params.amount,
    refId: params.refId,
    expiresLabel: params.expiresLabel,
    isNewUser: params.isNewUser,
    setupPasswordUrl: params.setupPasswordUrl,
  };
  const emailRes = await sendEmailSafe({
    to: params.email,
    subject: purchaseEmailSubject(params.mapped.label),
    html: purchaseEmailHtml(mailParams),
    text: purchaseEmailText(mailParams),
  });
  if (!emailRes.ok) {
    console.error("purchase email failed:", emailRes.reason || emailRes.skipped);
  } else {
    console.log("purchase email sent:", emailRes.resendId || "ok");
  }
  return emailRes;
}

/** Aktifkan paket Estimator/Planner + kirim email konfirmasi (termasuk replay duplicate). */
export async function processPlannerLynkPurchase(
  supa: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<PlannerLynkResult> {
  try {
    return await processPlannerLynkPurchaseInner(supa, payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("processPlannerLynkPurchase:", msg);
    return { status: 500, body: { error: msg } };
  }
}

async function processPlannerLynkPurchaseInner(
  supa: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<PlannerLynkResult> {
  if (!isLynkPaymentSuccess(payload)) {
    return { status: 200, body: { ok: true, ignored: true, reason: "not a successful payment" } };
  }

  const data = (payload.data && typeof payload.data === "object")
    ? payload.data as Record<string, unknown>
    : payload;
  const messageId = String(data.message_id || payload.message_id || "");
  const messageData = unwrapLynkMessageData(payload);
  const custom = extractLynkCustomFields(messageData);
  const customerEmail = customerEmailFrom(messageData, custom);
  const customerName = sanitizeText(
    (messageData.customer as Record<string, unknown> | undefined)?.name
      ?? messageData.customer_name
      ?? custom.customer_name
      ?? "",
    120,
  );
  const customerPhone = sanitizeText(
    String((messageData.customer as Record<string, unknown> | undefined)?.phone
      ?? messageData.customer_phone
      ?? ""),
    40,
  );

  if (!customerEmail.includes("@")) {
    return { status: 400, body: { error: "Missing customer email" } };
  }

  const item = ((messageData.items as unknown[])?.[0] || {}) as Record<string, unknown>;
  const qty = parseQty(item);
  const totals = (messageData.totals || {}) as Record<string, unknown>;
  const amount = Number(totals.customerPay ?? totals.grandTotal ?? totals.totalPrice ?? 0) || 0;
  const mapped = mapProductFromPayload(item, custom, amount);
  const refId = String(messageData.refId || messageData.ref_id || "");
  const isEstimatorPurchase = mapped.tier === "estimator";
  const plannerSiteUrl = pickEnv("APP_URL", "https://planner.monefyi.com").replace(/\/$/, "");
  const estimatorSiteUrl = pickEnv("ESTIMATOR_SITE_URL", "https://estimator.monefyi.com").replace(/\/$/, "");
  const estimatorAppUrl = pickEnv("ESTIMATOR_APP_URL", `${estimatorSiteUrl}/app`).replace(/\/$/, "");
  const plannerAppUrl = pickEnv("PLANNER_APP_URL", `${plannerSiteUrl}/app`).replace(/\/$/, "");
  const appBaseUrl = isEstimatorPurchase ? estimatorAppUrl : plannerAppUrl;

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

  let expiresAt: string | null = null;
  let expiresLabel: string | null = null;

  if (!alreadyProcessed) {
    if (mapped.isUpgrade) {
      const { data: currentSub } = await supa
        .from("planner_org_subscriptions")
        .select("tier, estimator_variant")
        .eq("org_id", orgId)
        .maybeSingle();
      const variant = String(currentSub?.estimator_variant || "");
      if (currentSub?.tier !== "estimator" || (variant && variant !== "standard")) {
        console.warn("Upgrade Estimator Pro ignored: org not on Estimator Standard", orgId);
      }
      mapped.variant = "pro";
    }

    const monthlyDays = Number(pickEnv("MONTHLY_DAYS", "30")) || 30;
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
      ...(mapped.isUpgrade ? { upgrade_from: "estimator_standard" } : {}),
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
      return { status: 500, body: { error: actErr.message } };
    }

    try {
      await supa.from("lynk_orders").insert({
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
      });
    } catch (e) {
      console.warn("lynk_orders insert:", (e as Error).message);
    }
  }

  let setupPasswordUrl: string | null = null;
  if (isNewUser) {
    setupPasswordUrl = await generateSetupPasswordUrl(
      supa,
      customerEmail,
      `${appBaseUrl}/estimator?payment=success`,
    );
  }

  const emailRes = await sendPurchaseConfirmation({
    email: customerEmail,
    isNewUser,
    customerName,
    mapped,
    amount,
    refId: refId || messageId,
    expiresLabel,
    setupPasswordUrl,
  });

  const requireEmail = pickEnv("REQUIRE_PURCHASE_EMAIL", "true").toLowerCase() === "true";
  if (!emailRes.ok && requireEmail && !emailRes.skipped) {
    console.error("purchase email failed (Lynk will retry):", emailRes.reason);
    return {
      status: 502,
      body: {
        error: "Confirmation email failed",
        reason: emailRes.reason || null,
        retry: true,
        userId,
        orgId,
        alreadyProcessed,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      alreadyProcessed,
      userId,
      orgId,
      isNewUser,
      product: mapped.product,
      tier: mapped.tier,
      expiresAt,
      email: {
        sent: emailRes.ok,
        skipped: emailRes.skipped || false,
        reason: emailRes.reason || null,
        resendId: emailRes.resendId || null,
      },
    },
  };
}
