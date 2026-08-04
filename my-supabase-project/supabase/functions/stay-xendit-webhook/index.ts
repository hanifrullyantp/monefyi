import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import {
  getSupabaseAdmin,
  postXenditPaidJournal,
  verifyCallbackToken,
} from "../_shared/stayJournal.ts";
import { notifyStayTenantPush } from "../_shared/stayWebPush.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  const callbackToken = Deno.env.get("XENDIT_CALLBACK_TOKEN") ?? "";
  if (callbackToken && !verifyCallbackToken(req, callbackToken)) {
    return errorResponse(req, "Invalid callback token", 401);
  }

  const supabase = getSupabaseAdmin();

  try {
    const body = await req.json();
    const externalId = (body.external_id ?? body.data?.reference_id) as string | undefined;
    const status = (body.status ?? body.data?.status) as string | undefined;
    const eventType = (body.event ?? body.event_type ?? "invoice") as string;
    const idempotencyKey = `${eventType}-${externalId}-${status}-${body.id ?? ""}`;

    // Idempotency check
    const { data: existing } = await supabase
      .from("stay_xendit_webhooks_log")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return jsonResponse(req, { received: true, duplicate: true });
    }

    await supabase.from("stay_xendit_webhooks_log").insert({
      event_type: eventType,
      external_id: externalId,
      raw_payload: body,
      idempotency_key: idempotencyKey,
      processed_at: new Date().toISOString(),
    });

    if (!externalId) {
      return jsonResponse(req, { received: true });
    }

    const paymentStatus = status === "PAID" || status === "SUCCEEDED" || status === "COMPLETED" ? "paid" : "pending";

    await supabase
      .from("stay_payments")
      .update({ status: paymentStatus })
      .eq("external_id", externalId);

    const { data: payment } = await supabase
      .from("stay_payments")
      .select("id, booking_id, amount, tenant_id")
      .eq("external_id", externalId)
      .single();

    if (payment && paymentStatus === "paid") {
      const fee = Math.round(Number(payment.amount) * 0.007);
      if (payment.tenant_id) {
        await postXenditPaidJournal(supabase, payment.tenant_id as string, Number(payment.amount), fee, payment.id as string);
      }

      const { data: booking } = await supabase
        .from("stay_bookings")
        .select("total_amount, paid_amount, status")
        .eq("id", payment.booking_id)
        .single();

      if (booking) {
        const newPaid = Number(booking.paid_amount) + Number(payment.amount);
        const paymentStatusBooking = newPaid >= Number(booking.total_amount) ? "paid" : "partial";
        const bookingStatus = booking.status === "pending" ? "confirmed" : booking.status;

        await supabase
          .from("stay_bookings")
          .update({
            paid_amount: newPaid,
            payment_status: paymentStatusBooking,
            status: bookingStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.booking_id);

        if (payment.tenant_id) {
          const pushTitle = "Pembayaran Xendit Diterima";
          const pushBody = `Pembayaran Rp ${Number(payment.amount).toLocaleString("id-ID")} berhasil.`;

          await supabase.from("stay_notifications").insert({
            tenant_id: payment.tenant_id,
            type: "payment",
            title: pushTitle,
            message: pushBody,
          });

          await notifyStayTenantPush(supabase, payment.tenant_id as string, {
            title: pushTitle,
            body: pushBody,
            tag: `payment-${payment.id}`,
            url: "/stay/front-desk",
            type: "payment",
          });
        }
      }

      await supabase.from("stay_xendit_balance_history").insert({
        tenant_id: payment.tenant_id,
        balance_type: "available",
        amount: Number(payment.amount) - fee,
        reference_type: "payment",
        reference_id: payment.id,
      });
    }

    if (eventType.includes("disbursement") && status === "COMPLETED" && payment?.tenant_id) {
      await supabase.from("stay_xendit_disbursements")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("external_id", externalId);
    }

    if (eventType.includes("refund") && status === "SUCCEEDED") {
      await supabase.from("stay_refunds")
        .update({ status: "processed" })
        .eq("xendit_refund_id", externalId);
    }

    return jsonResponse(req, { received: true });
  } catch (err) {
    return errorResponse(req, String(err), 500);
  }
});
