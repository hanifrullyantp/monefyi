import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { getAppUrl, getResendFrom, sendEmail } from "../_shared/email.ts";

type EmailActionType =
  | "signup"
  | "recovery"
  | "invite"
  | "magiclink"
  | "email_change"
  | "email_change_new"
  | "reauthentication";

type HookPayload = {
  user: {
    email: string;
    new_email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailActionType;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
    old_email?: string;
  };
};

const SUBJECTS: Record<EmailActionType, string> = {
  signup: "Verifikasi email — Monefyi Planner",
  recovery: "Reset password — Monefyi Planner",
  invite: "Undangan akun — Monefyi Planner",
  magiclink: "Link masuk — Monefyi Planner",
  email_change: "Konfirmasi perubahan email — Monefyi Planner",
  email_change_new: "Konfirmasi email baru — Monefyi Planner",
  reauthentication: "Kode verifikasi — Monefyi Planner",
};

function confirmationUrl(emailData: HookPayload["email_data"]): string | null {
  if (emailData.email_action_type === "reauthentication") return null;
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  if (!supabaseUrl || !emailData.token_hash) return null;
  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type,
    redirect_to: emailData.redirect_to || `${getAppUrl()}/login`,
  });
  return `${supabaseUrl}/auth/v1/verify?${params.toString()}`;
}

function buildAuthEmailHtml(params: {
  action: EmailActionType;
  confirmUrl: string | null;
  token: string;
  appUrl: string;
}): string {
  const { action, confirmUrl, token, appUrl } = params;
  const brand = "#6366f1";

  if (action === "reauthentication") {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
  <h1 style="color:${brand}">Kode verifikasi</h1>
  <p>Gunakan kode berikut untuk melanjutkan:</p>
  <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${token}</p>
</div></body></html>`;
  }

  const copy: Record<EmailActionType, { title: string; body: string; cta: string }> = {
    signup: {
      title: "Verifikasi email Anda",
      body: "Klik tombol di bawah untuk mengaktifkan akun Monefyi Planner.",
      cta: "Verifikasi email",
    },
    recovery: {
      title: "Reset password",
      body: "Kami menerima permintaan reset password. Klik tombol di bawah untuk membuat password baru.",
      cta: "Reset password",
    },
    invite: {
      title: "Anda diundang",
      body: "Klik tombol di bawah untuk menerima undangan dan membuat akun.",
      cta: "Terima undangan",
    },
    magiclink: {
      title: "Link masuk",
      body: "Klik tombol di bawah untuk masuk. Link ini sekali pakai dan kedaluwarsa segera.",
      cta: "Masuk",
    },
    email_change: {
      title: "Konfirmasi perubahan email",
      body: "Klik tombol di bawah untuk mengonfirmasi perubahan alamat email.",
      cta: "Konfirmasi",
    },
    email_change_new: {
      title: "Konfirmasi email baru",
      body: "Klik tombol di bawah untuk mengonfirmasi alamat email baru.",
      cta: "Konfirmasi",
    },
    reauthentication: { title: "", body: "", cta: "" },
  };

  const c = copy[action];
  const link = confirmUrl || `${appUrl}/login`;

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
  <h1 style="color:${brand};margin:0 0 8px">${c.title}</h1>
  <p style="color:#64748b">${c.body}</p>
  <a href="${link}" style="display:inline-block;background:${brand};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">${c.cta}</a>
  <p style="color:#94a3b8;font-size:12px">Jika tombol tidak berfungsi, salin link: ${link}</p>
</div></body></html>`;
}

function buildAuthEmailText(params: {
  action: EmailActionType;
  confirmUrl: string | null;
  token: string;
}): string {
  if (params.action === "reauthentication") {
    return `Kode verifikasi Monefyi: ${params.token}`;
  }
  return `${SUBJECTS[params.action]}\n\nBuka link: ${params.confirmUrl || getAppUrl() + "/login"}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const rawSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!rawSecret) {
    console.error("auth-send-email: SEND_EMAIL_HOOK_SECRET missing");
    return new Response(JSON.stringify({ error: { message: "Hook secret not configured" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hookSecret = rawSecret.replace(/^v1,whsec_/, "");
  const payloadText = await req.text();
  const headers = Object.fromEntries(req.headers);

  let hook: HookPayload;
  try {
    const wh = new Webhook(hookSecret);
    hook = wh.verify(payloadText, headers) as HookPayload;
  } catch (e) {
    console.error("auth-send-email: webhook verify failed", e);
    return new Response(JSON.stringify({ error: { message: "Invalid webhook signature" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user, email_data: emailData } = hook;
  const action = emailData.email_action_type;
  const confirmUrl = confirmationUrl(emailData);
  const appUrl = getAppUrl();

  console.log("auth-send-email:", {
    action,
    hasConfirmUrl: !!confirmUrl,
    redirectTo: emailData.redirect_to,
  });

  const result = await sendEmail({
    to: user.email,
    subject: SUBJECTS[action] || "Monefyi Planner",
    html: buildAuthEmailHtml({
      action,
      confirmUrl,
      token: emailData.token,
      appUrl,
    }),
    text: buildAuthEmailText({ action, confirmUrl, token: emailData.token }),
  });

  if (!result.ok) {
    console.error("auth-send-email: resend failed", result.reason);
    return new Response(JSON.stringify({ error: { message: result.reason || "Email send failed" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
