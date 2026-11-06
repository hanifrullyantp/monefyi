import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";
import { sendResendEmail } from "@/lib/services/resendService";
import type { LeadEmailLog } from "@/lib/types/leads";

/**
 * Webhook Handler untuk Notifikasi Pembayaran Mayar.id
 * Endpoint: POST /api/webhook/mayar
 * Event Utama: payment.received
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const event = String(rawBody?.event || rawBody?.action || "").toLowerCase();
    const data = rawBody?.data || rawBody?.payload || rawBody || {};

    const transactionId = data.transactionId || data.id || data.paymentId || "";
    const paymentId = data.paymentId || data.id || "";
    const customerEmail = String(data.customerEmail || data.email || "").trim().toLowerCase();
    const customerMobile = String(data.customerMobile || data.mobile || data.phone || "").replace(/[^0-9]/g, "");
    const customerName = String(data.customerName || data.name || "Pelanggan").trim();
    const amount = Number(data.amount || data.total || 0);

    // Validasi event sukses (Mayar standard: payment.received)
    const isSuccessEvent =
      event.includes("payment.received") ||
      event.includes("payment.paid") ||
      event.includes("invoice.paid") ||
      event.includes("transaction.success") ||
      data.status === true ||
      String(data.status).toLowerCase() === "paid" ||
      String(data.status).toLowerCase() === "settled" ||
      String(data.status).toLowerCase() === "success";

    if (!isSuccessEvent) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        message: `Event '${event || "unknown"}' bukan event pembayaran lunas`,
      });
    }

    const supabase = getSupabaseClient();
    let updatedOrderId: string | null = null;
    let matchedOrder: any = null;

    if (supabase) {
      // 1. Cari berdasarkan paymentId di raw_payload
      if (paymentId) {
        const { data: byPayId } = await supabase
          .from("orders")
          .select("id, email, full_name, phone, product_title, raw_payload")
          .contains("raw_payload", { paymentId })
          .limit(1);

        if (byPayId && byPayId.length > 0) {
          matchedOrder = byPayId[0];
        }
      }

      // 2. Jika belum cocok, cari berdasarkan email pelanggan
      if (!matchedOrder && customerEmail) {
        const { data: byEmail } = await supabase
          .from("orders")
          .select("id, email, full_name, phone, product_title, raw_payload")
          .eq("email", customerEmail)
          .neq("status", "paid")
          .order("created_at", { ascending: false })
          .limit(1);

        if (byEmail && byEmail.length > 0) {
          matchedOrder = byEmail[0];
        }
      }

      // 3. Jika belum cocok, cari berdasarkan nomor telepon
      if (!matchedOrder && customerMobile) {
        const phoneFormatted = customerMobile.startsWith("62")
          ? customerMobile
          : customerMobile.startsWith("0")
          ? `62${customerMobile.slice(1)}`
          : `62${customerMobile}`;

        const { data: byPhone } = await supabase
          .from("orders")
          .select("id, email, full_name, phone, product_title, raw_payload")
          .eq("phone", phoneFormatted)
          .neq("status", "paid")
          .order("created_at", { ascending: false })
          .limit(1);

        if (byPhone && byPhone.length > 0) {
          matchedOrder = byPhone[0];
        }
      }

      // 4. Update status ke paid/won jika pesanan ditemukan
      if (matchedOrder) {
        updatedOrderId = matchedOrder.id;
        const currentRaw = matchedOrder.raw_payload || {};
        const existingEmails: LeadEmailLog[] = Array.isArray(currentRaw.emails) ? currentRaw.emails : [];

        // Kirim Resend email otomatis jika belum pernah terkirim
        const hasSentPaymentEmail = existingEmails.some((e) => e.type === "payment_confirmation");
        const recipientEmail = matchedOrder.email || customerEmail;
        const buyerName = matchedOrder.full_name || customerName;
        const finalAmount = matchedOrder.grand_total || amount || 149000;
        const planName = matchedOrder.product_title || "Monefyi Estimator";

        let newEmailLogs: LeadEmailLog[] = [];

        if (recipientEmail && recipientEmail.includes("@") && !hasSentPaymentEmail) {
          // 1. Email Konfirmasi Pembayaran
          const res1 = await sendResendEmail({
            to: recipientEmail,
            name: buyerName,
            type: "payment_confirmation",
            amount: finalAmount,
            paymentMethod: currentRaw.paymentMethod || "QRIS / Mayar",
          });

          newEmailLogs.push({
            id: `email_${Date.now()}_1`,
            resendId: res1.emailId,
            type: "payment_confirmation",
            subject: "Pembayaran Berhasil - Akun Estimator Anda Telah Aktif!",
            to: recipientEmail,
            status: res1.status,
            sentAt: res1.sentAt,
            error: res1.error,
          });

          // 2. Email Akun & Password
          const res2 = await sendResendEmail({
            to: recipientEmail,
            name: buyerName,
            type: "account_access",
            password: "Estimator2026!",
            appUrl: "https://estimator.monefyi.com/app/estimator?status=activated",
          });

          newEmailLogs.push({
            id: `email_${Date.now()}_2`,
            resendId: res2.emailId,
            type: "account_access",
            subject: "Akses Akun & Password Monefyi Estimator Anda",
            to: recipientEmail,
            status: res2.status,
            sentAt: res2.sentAt,
            error: res2.error,
          });
        }

        await supabase
          .from("orders")
          .update({
            status: "paid",
            raw_payload: {
              ...currentRaw,
              status: "won",
              paidAt: new Date().toISOString(),
              transactionId: transactionId || currentRaw.paymentId,
              emails: [...newEmailLogs, ...existingEmails],
            },
          })
          .eq("id", matchedOrder.id);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Webhook processed successfully",
      matchedOrderId: updatedOrderId,
      event,
    });
  } catch (err: any) {
    console.error("Mayar webhook error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Health check untuk webhook testing di dashboard Mayar
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Mayar Webhook Listener",
    url: "/api/webhook/mayar",
    status: "active",
    supportedEvents: ["payment.received", "invoice.paid"],
  });
}
