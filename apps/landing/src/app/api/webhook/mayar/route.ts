import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import { sendResendEmail } from "@/lib/services/resendService";
import { activateFroyekPurchase } from "@/lib/froyek/activatePurchase";
import { sendPurchaseCapiToAllConfiguredPixels } from "@/lib/services/metaCapiService";
import type { LeadEmailLog } from "@/lib/types/leads";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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
          .select("id, email, full_name, phone, product_title, grand_total, plan_tier, raw_payload")
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
          .select("id, email, full_name, phone, product_title, grand_total, plan_tier, raw_payload")
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
          .select("id, email, full_name, phone, product_title, grand_total, plan_tier, raw_payload")
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
        const isFroyekOrder = currentRaw.brand === "froyek";
        const existingEmails: LeadEmailLog[] = Array.isArray(currentRaw.emails) ? currentRaw.emails : [];

        // Kirim Resend email otomatis jika belum pernah terkirim
        const hasSentPaymentEmail = existingEmails.some((e) => e.type === "payment_confirmation");
        const hasSentWelcomeEmail =
          Boolean(currentRaw.welcomeEmailSent) ||
          existingEmails.some((e) => e.type === "account_access");
        const recipientEmail = matchedOrder.email || customerEmail;
        const buyerName = matchedOrder.full_name || customerName;
        const finalAmount = matchedOrder.grand_total || amount || 93000;
        const resolvedPlanTier: "free" | "standard" | "pro" =
          matchedOrder.plan_tier ||
          currentRaw.planTier ||
          (matchedOrder.product_title?.toLowerCase().includes("pro") ? "pro" : "standard");

        // Provisioning akun pembeli di Supabase Auth dengan password acak internal & link aktivasi Supabase
        let estimatorSetupUrl: string | undefined;
        if (!isFroyekOrder && recipientEmail && recipientEmail.includes("@")) {
          const supabaseAdmin = getSupabaseAdminClient();
          if (supabaseAdmin) {
            const internalRandomPassword = `${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}Aa1!`;
            try {
              await supabaseAdmin.auth.admin.createUser({
                email: recipientEmail,
                password: internalRandomPassword,
                email_confirm: true,
                user_metadata: {
                  full_name: buyerName,
                  plan_tier: resolvedPlanTier,
                },
              });
            } catch (authErr) {
              console.warn("Non-fatal: Supabase Auth user already exists or could not be created", authErr);
            }
            try {
              const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
                type: "recovery",
                email: recipientEmail,
                options: { redirectTo: "https://estimator.froyek.com/app/estimator?status=activated" },
              });
              estimatorSetupUrl = linkData?.properties?.action_link || undefined;
            } catch (linkErr) {
              console.warn("Non-fatal: could not generate Supabase activation link", linkErr);
            }
          }
        }

        const newEmailLogs: LeadEmailLog[] = [];

        if (isFroyekOrder && recipientEmail && !currentRaw.froyekActivated) {
          const supabaseAdmin = getSupabaseAdminClient();
          if (supabaseAdmin) {
            try {
              const activated = await activateFroyekPurchase(supabaseAdmin, {
                email: recipientEmail,
                name: buyerName,
                phone: String(matchedOrder.phone || customerMobile || ""),
                planId: String(currentRaw.froyekPlan || "pro"),
                amount: Number(finalAmount) || 0,
                paymentId: String(transactionId || currentRaw.paymentId || paymentId || updatedOrderId),
              });
              currentRaw.froyekActivated = true;
              currentRaw.setupUrl = activated.setupUrl;
              if (activated.setupUrl) {
                const accessMail = await sendResendEmail({
                  to: recipientEmail,
                  name: buyerName,
                  type: "froyek_access",
                  resetLink: activated.setupUrl,
                  amount: finalAmount,
                });
                newEmailLogs.push({
                  id: `email_${Date.now()}_froyek`,
                  resendId: accessMail.emailId,
                  type: "account_access",
                  subject: "Akses froyek",
                  to: recipientEmail,
                  status: accessMail.status,
                  sentAt: accessMail.sentAt,
                  error: accessMail.error,
                });
              }
            } catch (activateErr) {
              console.error("froyek activation", activateErr);
            }
          }
        }

        if (!isFroyekOrder && recipientEmail && recipientEmail.includes("@") && !hasSentPaymentEmail) {
          // 1. Email Konfirmasi Pembayaran
          const res1 = await sendResendEmail({
            to: recipientEmail,
            name: buyerName,
            type: "payment_confirmation",
            planTier: resolvedPlanTier,
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
        }

        if (!isFroyekOrder && recipientEmail && recipientEmail.includes("@") && !hasSentWelcomeEmail) {
          // 2. Email Link Aktivasi Akun (tanpa password)
          const res2 = await sendResendEmail({
            to: recipientEmail,
            name: buyerName,
            type: "account_access",
            planTier: resolvedPlanTier,
            resetLink: estimatorSetupUrl,
            appUrl: "https://estimator.froyek.com/app/estimator?status=activated",
          });

          newEmailLogs.push({
            id: `email_${Date.now()}_2`,
            resendId: res2.emailId,
            type: "account_access",
            subject: "Aktivasi Akun Froyek Estimator Anda",
            to: recipientEmail,
            status: res2.status,
            sentAt: res2.sentAt,
            error: res2.error,
          });
        }

        let capiSent = Boolean(currentRaw.capiPurchaseSent);
        if (!capiSent && Number(finalAmount) > 0) {
          const eventOrderId = String(
            currentRaw.paymentId || paymentId || transactionId || matchedOrder.id
          );
          const capiRes = await sendPurchaseCapiToAllConfiguredPixels(supabase, {
            orderId: eventOrderId,
            amount: Number(finalAmount),
            email: recipientEmail,
            phone: String(matchedOrder.phone || customerMobile || ""),
            contentName: isFroyekOrder
              ? `Froyek ${String(currentRaw.froyekPlan || "pro")}`
              : `Estimator ${resolvedPlanTier.toUpperCase()}`,
            contentIds: [isFroyekOrder ? String(currentRaw.froyekPlan || "froyek") : resolvedPlanTier],
            eventSourceUrl: isFroyekOrder ? "https://froyek.com/pilih" : "https://froyek.com/checkout",
          });
          if (capiRes.sent > 0) capiSent = true;
        }

        const { accountPassword: _removedPassword, ...safeCurrentRaw } = currentRaw;
        await supabase
          .from("orders")
          .update({
            status: "paid",
            raw_payload: {
              ...safeCurrentRaw,
              status: "won",
              paidAt: currentRaw.paidAt || new Date().toISOString(),
              transactionId: transactionId || currentRaw.paymentId,
              welcomeEmailSent: true,
              capiPurchaseSent: capiSent,
              emails: [...newEmailLogs, ...existingEmails],
            },
          })
          .eq("id", matchedOrder.id);
      } else if (amount > 0) {
        // Pembayaran masuk langsung dari Mayar tanpa record order sebelumnya: tetap kirim CAPI Purchase
        const fallbackOrderId = String(paymentId || transactionId || `mayar_${Date.now()}`);
        await sendPurchaseCapiToAllConfiguredPixels(supabase, {
          orderId: fallbackOrderId,
          amount,
          email: customerEmail,
          phone: customerMobile,
          contentName: "Froyek Estimator",
          contentIds: ["estimator"],
          eventSourceUrl: "https://froyek.com/checkout",
        });
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
