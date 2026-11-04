/**
 * Unified Planner checkout: Lynk redirect URL or Mayar payment create.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { resolvePlannerPaymentProvider } from "../_shared/plannerPaymentProvider.ts";
import {
  createPlannerMayarCheckout,
  resolveMayarCheckoutAmount,
} from "../_shared/plannerMayarPayment.ts";
import type { PlannerLynkProduct } from "../_shared/plannerLynkPayment.ts";

const jsonHeaders = { "Content-Type": "application/json" };

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

function readLynkBaseUrl(product: PlannerLynkProduct): string {
  const keys: Record<PlannerLynkProduct, string> = {
    estimator_standard: "LYNK_ESTIMATOR_STANDARD_URL",
    estimator_pro: "LYNK_ESTIMATOR_PRO_URL",
    planner_pro: "LYNK_PLANNER_PRO_URL",
  };
  return pickEnv(keys[product]);
}

function buildLynkRedirectUrl(
  product: PlannerLynkProduct,
  body: Record<string, unknown>,
): string | null {
  const base = readLynkBaseUrl(product);
  if (!base) return null;

  const url = new URL(base);
  const orgId = String(body.orgId ?? body.org_id ?? "").trim();
  const userId = String(body.userId ?? body.user_id ?? "").trim();
  const email = String(body.email ?? body.customer_email ?? "").trim();
  const returnUrl = String(body.returnUrl ?? body.return_url ?? "").trim();
  const amount = Number(body.checkoutAmount ?? body.amount ?? 0) || resolveMayarCheckoutAmount(product);

  if (orgId) url.searchParams.set("org_id", orgId);
  if (userId) url.searchParams.set("user_id", userId);
  if (email) url.searchParams.set("customer_email", email);
  url.searchParams.set("product", product);
  if (returnUrl) url.searchParams.set("return_url", returnUrl);
  url.searchParams.set("amount", String(amount));

  const upgradeFrom = String(body.upgradeFrom ?? body.upgrade_from ?? "").trim();
  if (upgradeFrom) url.searchParams.set("upgrade_from", upgradeFrom);

  const credit = Number(body.creditAmount ?? body.credit ?? 0);
  if (credit > 0) url.searchParams.set("credit", String(credit));

  return url.toString();
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = {
    ...getCorsHeaders(req),
    "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
  };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const SUPABASE_URL = pickEnv("SUPABASE_URL");
  const SERVICE_ROLE = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const product = String(body.product ?? "estimator_standard").trim() as PlannerLynkProduct;
  const allowed: PlannerLynkProduct[] = ["estimator_standard", "estimator_pro", "planner_pro"];
  if (!allowed.includes(product)) {
    return new Response(JSON.stringify({ error: "Invalid product" }), {
      status: 400,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: appConfig } = await supa.from("app_config").select("platform_settings").eq("id", "global").maybeSingle();
  const platform = (appConfig?.platform_settings as Record<string, unknown>) || {};
  const providerOverride = String(body.provider ?? "").trim().toLowerCase();
  const provider = providerOverride === "lynk" || providerOverride === "mayar"
    ? providerOverride
    : resolvePlannerPaymentProvider(platform);

  const returnUrl = String(
    body.returnUrl ?? body.return_url ?? pickEnv("ESTIMATOR_APP_URL", "https://estimator.monefyi.com/app/estimator"),
  ).trim();

  const checkoutAmount = Number(body.checkoutAmount ?? body.amount ?? 0) || undefined;

  if (provider === "mayar") {
    const result = await createPlannerMayarCheckout(supa, {
      product,
      orgId: String(body.orgId ?? body.org_id ?? "").trim() || undefined,
      userId: String(body.userId ?? body.user_id ?? "").trim() || undefined,
      email: String(body.email ?? body.customer_email ?? "").trim() || undefined,
      customerName: String(body.customerName ?? body.customer_name ?? "").trim() || undefined,
      amount: resolveMayarCheckoutAmount(product, checkoutAmount),
      returnUrl,
      upgradeFrom: String(body.upgradeFrom ?? body.upgrade_from ?? "").trim() === "estimator_standard"
        ? "estimator_standard"
        : undefined,
      creditAmount: Number(body.creditAmount ?? body.credit ?? 0) || undefined,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 502,
        headers: { ...corsHeaders, ...jsonHeaders },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      provider: "mayar",
      redirectUrl: result.redirectUrl,
      paymentId: result.paymentId,
    }), {
      status: 200,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const redirectUrl = buildLynkRedirectUrl(product, body);
  if (!redirectUrl) {
    return new Response(JSON.stringify({
      error: "Checkout Lynk belum dikonfigurasi (LYNK_*_URL di Supabase secrets).",
    }), {
      status: 503,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    provider: "lynk",
    redirectUrl,
  }), {
    status: 200,
    headers: { ...corsHeaders, ...jsonHeaders },
  });
});
