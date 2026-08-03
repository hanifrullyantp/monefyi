import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceKey);

  try {
    const body = await req.json();
    const externalId = body.external_id as string | undefined;
    const status = body.status as string | undefined;

    if (!externalId) {
      return errorResponse(req, "external_id required", 400);
    }

    const paymentStatus = status === "PAID" ? "paid" : "pending";

    const { error } = await supabase
      .from("stay_payments")
      .update({ status: paymentStatus })
      .eq("external_id", externalId);

    if (error) throw error;

    const { data: payment } = await supabase
      .from("stay_payments")
      .select("booking_id, amount")
      .eq("external_id", externalId)
      .single();

    if (payment && paymentStatus === "paid") {
      const { data: booking } = await supabase
        .from("stay_bookings")
        .select("total_amount, paid_amount")
        .eq("id", payment.booking_id)
        .single();

      if (booking) {
        const newPaid = Number(booking.paid_amount) + Number(payment.amount);
        const paymentStatusBooking =
          newPaid >= Number(booking.total_amount) ? "paid" : "partial";

        await supabase
          .from("stay_bookings")
          .update({ paid_amount: newPaid, payment_status: paymentStatusBooking })
          .eq("id", payment.booking_id);
      }
    }

    return jsonResponse(req, { received: true });
  } catch (err) {
    return errorResponse(req, String(err), 500);
  }
});
