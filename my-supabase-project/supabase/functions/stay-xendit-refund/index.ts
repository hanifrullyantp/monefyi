import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/stayJournal.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { paymentId, amount, reason } = body as {
      paymentId?: string;
      amount?: number;
      reason?: string;
    };

    if (!paymentId || !amount) {
      return errorResponse(req, "paymentId and amount required", 400);
    }

    const supabase = getSupabaseAdmin();
    const externalId = `refund-${paymentId}-${Date.now()}`;

    const key = Deno.env.get("XENDIT_SECRET_KEY");
    if (key) {
      await fetch("https://api.xendit.co/refunds", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${key}:`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_id: paymentId,
          amount,
          reason: reason || "REQUESTED_BY_CUSTOMER",
        }),
      });
    }

    await supabase.from("stay_refunds").update({
      status: "processed",
      xendit_refund_id: externalId,
    }).eq("original_payment_id", paymentId);

    return jsonResponse(req, { refund_id: externalId, status: "processed" });
  } catch (err) {
    return errorResponse(req, String(err), 500);
  }
});
