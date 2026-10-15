import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { generateSetupPasswordUrl } from "./auth-setup-link.ts";
import { sendEmailSafe } from "./email.ts";
import {
  financePurchaseEmailHtml,
  financePurchaseEmailSubject,
  financePurchaseEmailText,
} from "./finance-purchase-email.ts";
import { grantProductEntitlement, PRODUCT_MONEFYI } from "./productEntitlements.ts";
import { unwrapLynkMessageData } from "./plannerLynkPayment.ts";

export type FinanceLynkResult = {
  status: number;
  body: Record<string, unknown>;
};

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

function mapPackageFromItem(item: Record<string, unknown>) {
  const title = String(item?.title ?? "").toLowerCase();
  if (title.includes("lifetime")) {
    return { planType: "lifetime" as const, durationDays: null as number | null, productLabel: "Lifetime" };
  }
  return {
    planType: "monthly" as const,
    durationDays: Number(pickEnv("MONTHLY_DAYS", "30")) || 30,
    productLabel: "Bulanan",
  };
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

async function ensureFinanceUser(
  supa: SupabaseClient,
  email: string,
  name: string,
  phone: string,
): Promise<{ userId: string; isNewUser: boolean }> {
  const existing = await findUserIdByEmail(supa, email);
  if (existing) return { userId: existing, isNewUser: false };

  const pw = crypto.randomUUID().replace(/-/g, "").slice(0, 12) + "A!";
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

function purchaseEmailRequired(): boolean {
  return pickEnv("REQUIRE_PURCHASE_EMAIL", "true").toLowerCase() === "true";
}

/** Finance PWA: Lynk payment → user_plans + entitlement monefyi + email (idempotent + replay-safe). */
export async function processFinanceLynkPurchase(
  supa: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<FinanceLynkResult> {
  try {
    return await processFinanceLynkPurchaseInner(supa, payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("processFinanceLynkPurchase:", msg);
    return { status: 500, body: { error: msg } };
  }
}

async function processFinanceLynkPurchaseInner(
  supa: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<FinanceLynkResult> {
  const data = (payload.data && typeof payload.data === "object")
    ? payload.data as Record<string, unknown>
    : payload;
  const messageId = String(data.message_id || payload.message_id || "");
  const messageData = unwrapLynkMessageData(payload);

  const refId = String(messageData.refId || messageData.ref_id || "");
  const createdAt = String(messageData.createdAt || messageData.created_at || "");

  const customerEmail = String(
    (messageData.customer as Record<string, unknown> | undefined)?.email
      ?? messageData.customer_email
      ?? messageData.email
      ?? "",
  ).trim().toLowerCase();

  const customerName = String(
    (messageData.customer as Record<string, unknown> | undefined)?.name
      ?? messageData.customer_name
      ?? "",
  ).trim();

  const customerPhone = String(
    (messageData.customer as Record<string, unknown> | undefined)?.phone
      ?? messageData.customer_phone
      ?? "",
  ).trim();

  if (!customerEmail.includes("@")) {
    return { status: 400, body: { error: "Missing customer email" } };
  }

  const item = ((messageData.items as unknown[])?.[0] || {}) as Record<string, unknown>;
  const qty = parseQty(item);
  const totals = (messageData.totals || {}) as Record<string, unknown>;
  const amount = Number(totals.customerPay ?? totals.grandTotal ?? totals.totalPrice ?? 0) || 0;

  let alreadyProcessed = false;
  try {
    const { error } = await supa.from("lynk_webhook_events").insert({
      message_id: messageId || null,
      ref_id: refId || null,
      email: customerEmail,
      payload,
      product_line: "finance",
    });
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) alreadyProcessed = true;
    }
  } catch {
    /* non-blocking */
  }

  const appUrl = pickEnv("APP_URL", "https://app.monefyi.com");
  const { userId, isNewUser } = await ensureFinanceUser(supa, customerEmail, customerName, customerPhone);

  const { planType, durationDays, productLabel } = mapPackageFromItem(item);

  let finalPlanType: "monthly" | "lifetime" | "none" = "none";
  let finalExpiresAt: Date | null = null;
  let startDateForEmail: Date | null = null;
  let endDateForEmail: Date | null = null;

  if (!alreadyProcessed) {
    const orderRow = {
      ref_id: refId || null,
      email: customerEmail,
      name: customerName,
      phone: customerPhone,
      item_title: String(item?.title || ""),
      qty,
      amount,
      created_at: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
      raw_payload: payload,
      product_line: "finance",
    };

    try {
      const r1 = await supa.from("orders").insert(orderRow);
      if (r1.error) await supa.from("lynk_orders").insert(orderRow);
    } catch {
      try {
        await supa.from("lynk_orders").insert(orderRow);
      } catch (e) {
        console.warn("lynk_orders insert:", (e as Error).message);
      }
    }

    const { data: currentPlan } = await supa
      .from("user_plans")
      .select("user_id, plan_type, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    const now = new Date();
    const currentType = String(currentPlan?.plan_type || "none");
    const currentExpires = currentPlan?.expires_at ? new Date(String(currentPlan.expires_at)) : null;

    finalPlanType = currentType === "lifetime" || currentType === "monthly" ? (currentType as "monthly" | "lifetime") : "none";
    finalExpiresAt = currentExpires;

    if (planType === "lifetime") {
      if (currentType !== "lifetime") {
        finalPlanType = "lifetime";
        finalExpiresAt = null;
        await supa.from("user_plans").upsert({
          user_id: userId,
          plan_type: "lifetime",
          expires_at: null,
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      if (currentType !== "lifetime") {
        const addDaysCount = (durationDays || 30) * Math.max(1, qty);
        let baseDate = now;
        if (
          (currentType === "monthly" || currentType === "trial") &&
          currentExpires &&
          currentExpires.getTime() > now.getTime()
        ) {
          baseDate = currentType === "trial" ? now : currentExpires;
        }
        const newExpires = addDays(baseDate, addDaysCount);
        finalPlanType = "monthly";
        finalExpiresAt = newExpires;
        await supa.from("user_plans").upsert({
          user_id: userId,
          plan_type: "monthly",
          expires_at: newExpires.toISOString(),
          updated_at: new Date().toISOString(),
        });
        startDateForEmail = baseDate === currentExpires ? baseDate : now;
        endDateForEmail = newExpires;
      } else {
        finalPlanType = "lifetime";
        finalExpiresAt = null;
      }
    }

    try {
      const profileRow: Record<string, unknown> = {
        id: userId,
        plan_type: finalPlanType,
        plan_expires_at: finalExpiresAt ? finalExpiresAt.toISOString() : null,
        status: "active",
        updated_at: new Date().toISOString(),
      };
      if (isNewUser) {
        profileRow.onboarding_completed = false;
        profileRow.onboarding_version = "2";
        if (customerName) profileRow.name = customerName;
      }
      await supa.from("profiles").upsert(profileRow, { onConflict: "id" });
    } catch (syncErr) {
      console.error("profiles sync failed:", (syncErr as Error)?.message || syncErr);
    }

    if (finalPlanType === "monthly" || finalPlanType === "lifetime") {
      try {
        await grantProductEntitlement(supa, userId, PRODUCT_MONEFYI, "purchase", { plan_type: finalPlanType });
      } catch (entErr) {
        console.warn("grant monefyi entitlement:", (entErr as Error)?.message || entErr);
      }
    }

    try {
      await supa.from("acquisition_events").insert({
        event: "payment",
        user_id: userId,
        email: customerEmail,
        meta: { plan_type: finalPlanType, amount, ref_id: refId, product: productLabel },
      });
    } catch {
      /* non-blocking */
    }
  } else {
    const { data: currentPlan } = await supa
      .from("user_plans")
      .select("plan_type, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    finalPlanType = String(currentPlan?.plan_type || "monthly") as "monthly" | "lifetime" | "none";
    if (finalPlanType !== "lifetime" && currentPlan?.expires_at) {
      endDateForEmail = new Date(String(currentPlan.expires_at));
    }
    try {
      await grantProductEntitlement(supa, userId, PRODUCT_MONEFYI, "purchase_replay", { ref_id: refId });
    } catch {
      /* idempotent */
    }
  }

  const emailPlanType: "monthly" | "lifetime" =
    finalPlanType === "lifetime" ? "lifetime" : "monthly";

  let setupPasswordUrl: string | null = null;
  if (isNewUser) {
    setupPasswordUrl = await generateSetupPasswordUrl(supa, customerEmail, appUrl.replace(/\/$/, ""));
  }

  const mailHtml = financePurchaseEmailHtml({
    appUrl,
    name: customerName || "",
    planLabel: productLabel,
    planType: emailPlanType,
    qty,
    amount,
    refId,
    startLabel:
      emailPlanType === "monthly" && startDateForEmail
        ? toDateOnlyISO(startDateForEmail)
        : null,
    endLabel:
      emailPlanType === "monthly" && endDateForEmail
        ? toDateOnlyISO(endDateForEmail)
        : null,
    isNewUser,
    setupPasswordUrl,
  });

  const emailRes = await sendEmailSafe({
    to: customerEmail,
    subject: financePurchaseEmailSubject(),
    html: mailHtml,
    text: financePurchaseEmailText({
      appUrl,
      name: customerName || "",
      planLabel: productLabel,
      planType: emailPlanType,
      qty,
      amount,
      refId,
      startLabel: null,
      endLabel: emailPlanType === "monthly" && endDateForEmail
        ? toDateOnlyISO(endDateForEmail)
        : null,
      isNewUser,
      setupPasswordUrl,
    }),
  });

  if (!emailRes.ok && purchaseEmailRequired() && !emailRes.skipped) {
    console.error("purchase email failed (Lynk will retry):", emailRes.reason);
    return {
      status: 502,
      body: {
        error: "Confirmation email failed",
        reason: emailRes.reason || null,
        retry: true,
        userId,
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
      isNewUser,
      plan: {
        planType: finalPlanType,
        expiresAt: finalExpiresAt ? finalExpiresAt.toISOString() : null,
      },
      email: {
        sent: emailRes.ok,
        skipped: emailRes.skipped || false,
        reason: emailRes.reason || null,
        resendId: emailRes.resendId || null,
      },
    },
  };
}
