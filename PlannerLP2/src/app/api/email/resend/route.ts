import { NextRequest, NextResponse } from "next/server";
import { sendResendEmail, checkResendEmailStatus, type SendEmailOptions } from "@/lib/services/resendService";
import { getSupabaseClient } from "@/lib/supabase/client";

interface ResendApiPayload extends SendEmailOptions {
  leadId?: string;
  sessionId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ResendApiPayload;
    const { to, name, type, planTier, amount, paymentMethod, password, resetLink, leadId, sessionId } = body;

    if (!to || !to.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Alamat email penerima tidak valid" },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { ok: false, error: "Tipe email wajib ditentukan (payment_confirmation, account_access, password_reset, followup)" },
        { status: 400 }
      );
    }

    const host = req.headers.get("host") || "estimator.monefyi.com";
    const protocol = host.includes("localhost") ? "http" : "https";
    const appUrl = `${protocol}://${host}/app/estimator`;

    const result = await sendResendEmail({
      to: to.trim().toLowerCase(),
      name: name?.trim() || "Pelanggan",
      type,
      planTier,
      amount,
      paymentMethod,
      password,
      resetLink,
      appUrl,
    });

    // Catat log pengiriman email ke Supabase orders table jika ada leadId / sessionId
    if (result.ok) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const emailEntry = {
            id: `em_${Date.now()}`,
            resendId: result.emailId,
            type,
            subject: result.subject,
            to: result.to,
            status: result.status,
            sentAt: result.sentAt,
            error: result.error,
          };

          // Cari order berdasarkan id atau sessionId
          const query = supabase.from("orders").select("id, raw_payload");
          let matchQuery = query;

          if (leadId) {
            matchQuery = matchQuery.eq("id", leadId);
          } else if (sessionId) {
            matchQuery = matchQuery.contains("raw_payload", { sessionId });
          } else {
            matchQuery = matchQuery.eq("email", to.trim().toLowerCase());
          }

          const { data: matched } = await matchQuery.limit(1);

          if (matched && matched.length > 0) {
            const currentRaw = matched[0].raw_payload || {};
            const existingEmails = Array.isArray(currentRaw.emails) ? currentRaw.emails : [];
            await supabase
              .from("orders")
              .update({
                raw_payload: {
                  ...currentRaw,
                  ...(type === "account_access" ? { welcomeEmailSent: true } : {}),
                  emails: [emailEntry, ...existingEmails],
                },
              })
              .eq("id", matched[0].id);
          }
        }
      } catch (logErr) {
        console.warn("Non-fatal: failed to log email to Supabase orders", logErr);
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Cek status pengiriman email dari Resend
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const emailId = searchParams.get("emailId");

    if (!emailId) {
      return NextResponse.json(
        { ok: false, error: "emailId query parameter required" },
        { status: 400 }
      );
    }

    const status = await checkResendEmailStatus(emailId);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

