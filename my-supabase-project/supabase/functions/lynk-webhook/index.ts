// Supabase Edge Function: lynk-webhook
// Lynk.id payment.received → Finance (monefyi) or Estimator/Planner (routed automatically).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { processFinanceLynkPurchase } from "../_shared/financeLynkPayment.ts";
import {
  isLynkPaymentSuccess,
  looksLikePlannerLynkPurchase,
  processPlannerLynkPurchase,
} from "../_shared/plannerLynkPayment.ts";
import { verifyLynkWebhookPayload } from "../_shared/lynkSignature.ts";

const jsonHeaders = { "Content-Type": "application/json" };

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
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

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const sig = await verifyLynkWebhookPayload(payload as Record<string, unknown>, req);
  if (!sig.ok) {
    return new Response(JSON.stringify({ error: sig.error }), {
      status: sig.status || 401,
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

  if (!isLynkPaymentSuccess(payload as Record<string, unknown>)) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  const result = looksLikePlannerLynkPurchase(payload as Record<string, unknown>)
    ? await processPlannerLynkPurchase(supa, payload as Record<string, unknown>)
    : await processFinanceLynkPurchase(supa, payload as Record<string, unknown>);

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { ...corsHeaders, ...jsonHeaders },
  });
});
