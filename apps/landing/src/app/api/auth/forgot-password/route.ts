import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendResendEmail } from "@/lib/services/resendService";
import { getSupabaseClient } from "@/lib/supabase/client";

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://zzwqfmdyncxbolestkqp.supabase.co";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  if (!serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = String(body?.email || "").trim().toLowerCase();

    if (!rawEmail || !rawEmail.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Alamat email tidak valid." },
        { status: 400 },
      );
    }

    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "froyek.com";
    const proto =
      req.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;
    const redirectTo = `${origin}/reset-password`;

    const admin = getSupabaseAdmin();
    let recoveryLink: string | null = null;
    let userName: string = rawEmail.split("@")[0];

    // 1. Generate link verifikasi via Supabase Admin API jika tersedia
    if (admin) {
      try {
        const linkRes = await admin.auth.admin.generateLink({
          type: "recovery",
          email: rawEmail,
          options: { redirectTo },
        });

        if (linkRes.error) {
          console.warn(
            "[forgot-password] admin.generateLink warning:",
            linkRes.error.message,
          );
        } else {
          const rawActionLink = linkRes.data?.properties?.action_link;
          const hashedToken = linkRes.data?.properties?.hashed_token;

          // Mask link verifikasi agar 100% menggunakan domain froyek.com (tidak mengekspos supabase.co)
          if (rawActionLink) {
            try {
              const parsedUrl = new URL(rawActionLink);
              recoveryLink = `${origin}/api/auth/verify${parsedUrl.search}`;
            } catch {
              recoveryLink = rawActionLink.replace(
                /^https?:\/\/[^\/]+\/auth\/v1\/verify/,
                `${origin}/api/auth/verify`,
              );
            }
          } else if (hashedToken) {
            recoveryLink = `${origin}/api/auth/verify?token_hash=${encodeURIComponent(
              hashedToken,
            )}&type=recovery&redirect_to=${encodeURIComponent(redirectTo)}`;
          }

          const metaName = linkRes.data?.user?.user_metadata?.name;
          if (metaName) userName = String(metaName);
        }
      } catch (e: any) {
        console.warn("[forgot-password] generateLink error:", e?.message);
      }
    }

    // 2. Kirim email via Resend API (Template Reset Password Froyek Resmi)
    let resendResult: any = null;
    if (recoveryLink) {
      resendResult = await sendResendEmail({
        to: rawEmail,
        name: userName,
        type: "password_reset",
        subject: "[Froyek] Permintaan Reset Password Akun Anda",
        resetLink: recoveryLink,
        appUrl: origin,
      });
    } else {
      // 3. Fallback: jika generateLink gagal / service role belum ada, kirim via standard resetPasswordForEmail
      const client = getSupabaseClient() || admin;
      if (client) {
        try {
          await client.auth.resetPasswordForEmail(rawEmail, { redirectTo });
        } catch (err: any) {
          console.warn(
            "[forgot-password] resetPasswordForEmail warning:",
            err?.message,
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message:
        "Link reset password telah dikirim. Silakan cek inbox atau folder spam email Anda.",
      resendStatus: resendResult?.status || "sent",
      warning: resendResult?.warning,
      ...(host.includes("localhost") && !process.env.RESEND_API_KEY && recoveryLink
        ? { devResetLink: recoveryLink }
        : {}),
    });
  } catch (err: any) {
    console.error("[forgot-password] Unhandled error:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Terjadi kesalahan saat memproses permintaan reset password.",
      },
      { status: 500 },
    );
  }
}

