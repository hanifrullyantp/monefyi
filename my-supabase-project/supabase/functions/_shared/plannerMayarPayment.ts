import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  extractMayarPaymentId,
  extractMayarPaymentUrl,
  mayarApiRequest,
} from "./mayarApi.ts";
import {
  processPlannerPurchaseActivation,
  type PlannerLynkProduct,
  type PlannerLynkResult,
} from "./plannerLynkPayment.ts";
import { sanitizeText } from "./sanitize.ts";

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

const MONEFYI_DESC_PREFIX = "monefyi:";

export function buildMonefyiCheckoutDescription(meta: Record<string, string>): string {
  return `${MONEFYI_DESC_PREFIX}${JSON.stringify(meta)}`;
}

export function parseMonefyiCheckoutDescription(raw: unknown): Record<string, string> {
  const text = String(raw ?? "");
  const idx = text.indexOf(MONEFYI_DESC_PREFIX);
  if (idx < 0) return {};
  const jsonPart = text.slice(idx + MONEFYI_DESC_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(jsonPart) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v != null && String(v).trim()) out[k.toLowerCase()] = String(v).trim();
    }
    return out;
  } catch {
    return {};
  }
}

function appendPaymentReturnUrl(returnUrl: string, status: "success" | "failed" | "cancelled"): string {
  const url = new URL(returnUrl);
  url.searchParams.set("payment", status);
  return url.toString();
}

function unwrapMayarData(payload: Record<string, unknown>): Record<string, unknown> {
  const data = (payload.data && typeof payload.data === "object")
    ? payload.data as Record<string, unknown>
    : payload;
  if (data.payment && typeof data.payment === "object") {
    return data.payment as Record<string, unknown>;
  }
  return data;
}

export function isMayarPaymentSuccess(payload: Record<string, unknown>): boolean {
  const data = unwrapMayarData(payload);
  const event = String(payload.event ?? payload.type ?? data.event ?? data.type ?? "").toLowerCase();
  const status = String(data.status ?? payload.status ?? "").toUpperCase();

  if (["FAILED", "CANCELLED", "EXPIRED", "CLOSED"].includes(status)) return false;
  if (status === "PAID" || status === "SUCCESS" || status === "SETTLED" || status === "COMPLETED") {
    return true;
  }
  if (event.includes("paid") || event.includes("success") || event.includes("settlement")) {
    return true;
  }
  return false;
}

export type CreateMayarCheckoutInput = {
  product: PlannerLynkProduct;
  orgId?: string;
  userId?: string;
  email?: string;
  customerName?: string;
  amount: number;
  returnUrl: string;
  upgradeFrom?: "estimator_standard";
  creditAmount?: number;
};

export async function createPlannerMayarCheckout(
  supa: SupabaseClient,
  input: CreateMayarCheckoutInput,
): Promise<{ ok: true; redirectUrl: string; paymentId: string } | { ok: false; error: string }> {
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, error: "Email wajib untuk checkout Mayar" };
  }
  if (!input.amount || input.amount <= 0) {
    return { ok: false, error: "Jumlah checkout tidak valid" };
  }

  const meta: Record<string, string> = {
    product: input.product,
    org_id: input.orgId ?? "",
    user_id: input.userId ?? "",
    customer_email: email,
  };
  if (input.upgradeFrom) meta.upgrade_from = input.upgradeFrom;
  if (input.creditAmount && input.creditAmount > 0) {
    meta.credit = String(input.creditAmount);
  }

  const mobile = pickEnv("MAYAR_CHECKOUT_DEFAULT_MOBILE", "081234567890");
  const expiredAt = new Date(Date.now() + 86400000).toISOString();
  const redirectUrl = appendPaymentReturnUrl(input.returnUrl, "success");

  const body = {
    name: sanitizeText(input.customerName || email.split("@")[0] || "Pelanggan", 120),
    email,
    mobile,
    amount: input.amount,
    redirectUrl,
    description: buildMonefyiCheckoutDescription(meta),
    expiredAt,
  };

  const res = await mayarApiRequest("POST", "/hl/v2/payments/create", body);
  if (!res.ok || !res.body) {
    return { ok: false, error: res.error || "Mayar payment create failed" };
  }

  const paymentId = extractMayarPaymentId(res.body);
  const checkoutUrl = extractMayarPaymentUrl(res.body);
  if (!checkoutUrl) {
    return { ok: false, error: "Mayar tidak mengembalikan URL checkout" };
  }

  const { error: sessionErr } = await supa.from("planner_checkout_sessions").insert({
    provider: "mayar",
    external_id: paymentId || null,
    org_id: input.orgId || null,
    user_id: input.userId || null,
    product: input.product,
    amount: input.amount,
    status: "pending",
    metadata: meta,
  });
  if (sessionErr) {
    console.warn("planner_checkout_sessions insert:", sessionErr.message);
  }

  return { ok: true, redirectUrl: checkoutUrl, paymentId };
}

export async function processPlannerMayarPurchase(
  supa: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<PlannerLynkResult> {
  try {
    if (!isMayarPaymentSuccess(payload)) {
      return { status: 200, body: { ok: true, ignored: true, reason: "not a successful payment" } };
    }

    const data = unwrapMayarData(payload);
    const paymentId = String(data.id ?? data.paymentId ?? payload.id ?? "").trim();
    const messageId = String(payload.id ?? data.transactionId ?? paymentId ?? "");
    const refId = paymentId || messageId;

    let custom = parseMonefyiCheckoutDescription(data.description ?? payload.description);
    const customerEmail = String(
      data.email ?? data.customerEmail ?? custom.customer_email ?? "",
    ).trim().toLowerCase();

    if (paymentId) {
      const { data: session } = await supa
        .from("planner_checkout_sessions")
        .select("org_id, user_id, product, amount, metadata")
        .eq("provider", "mayar")
        .eq("external_id", paymentId)
        .maybeSingle();
      if (session) {
        const md = (session.metadata && typeof session.metadata === "object")
          ? session.metadata as Record<string, unknown>
          : {};
        for (const [k, v] of Object.entries(md)) {
          if (v != null && String(v).trim()) custom[k.toLowerCase()] = String(v).trim();
        }
        if (session.org_id) custom.org_id = String(session.org_id);
        if (session.user_id) custom.user_id = String(session.user_id);
        if (session.product) custom.product = String(session.product);
      }
    }

    if (!customerEmail.includes("@")) {
      return { status: 400, body: { error: "Missing customer email" } };
    }

    const amount = Number(data.amount ?? data.total ?? data.grandTotal ?? 0) || 0;
    const item = {
      title: String(data.name ?? data.productName ?? custom.product ?? ""),
    } as Record<string, unknown>;

    const customerName = sanitizeText(String(data.name ?? data.customerName ?? ""), 120);
    const customerPhone = sanitizeText(String(data.mobile ?? data.phone ?? ""), 40);

    return processPlannerPurchaseActivation(supa, {
      paymentProvider: "mayar",
      payload,
      messageId,
      refId,
      customerEmail,
      customerName,
      customerPhone,
      custom,
      item,
      qty: 1,
      amount,
      idempotencyTable: "mayar_webhook_events",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("processPlannerMayarPurchase:", msg);
    return { status: 500, body: { error: msg } };
  }
}

/** Resolve amount labels for Mayar checkout (mirrors Lynk product mapping). */
export function resolveMayarCheckoutAmount(
  product: PlannerLynkProduct,
  amountOverride?: number,
): number {
  if (amountOverride != null && amountOverride > 0) return amountOverride;
  const std = Number(pickEnv("ESTIMATOR_STANDARD_PRICE", "99000")) || 99000;
  const pro = Number(pickEnv("ESTIMATOR_PRO_PRICE", "199000")) || 199000;
  const planner = Number(pickEnv("PLANNER_PRO_MONTHLY_PRICE", "199000")) || 199000;
  if (product === "estimator_standard") return std;
  if (product === "estimator_pro") return pro;
  return planner;
}
