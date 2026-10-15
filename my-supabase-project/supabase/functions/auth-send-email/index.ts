import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { getAppUrl, getResendFrom, sendEmail } from "../_shared/email.ts";
import {
  emailParagraph,
  emailPrimaryButton,
  monefyiEmailShell,
  resolveEmailBrand,
  type MonefyiEmailBrand,
} from "../_shared/monefyi-email-layout.ts";

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

function subjectFor(action: EmailActionType, productName: string): string {
  const map: Record<EmailActionType, string> = {
    signup: `Verifikasi email — ${productName}`,
    recovery: `Reset password — ${productName}`,
    invite: `Undangan akun — ${productName}`,
    magiclink: `Link masuk — ${productName}`,
    email_change: `Konfirmasi perubahan email — ${productName}`,
    email_change_new: `Konfirmasi email baru — ${productName}`,
    reauthentication: `Kode verifikasi — ${productName}`,
  };
  return map[action];
}

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
  brand: MonefyiEmailBrand;
}): string {
  const { action, confirmUrl, token, appUrl, brand } = params;

  if (action === "reauthentication") {
    return monefyiEmailShell({
      brand,
      title: "Kode verifikasi",
      bodyHtml: [
        emailParagraph("Gunakan kode berikut untuk melanjutkan (jangan bagikan ke siapa pun):"),
        `<p style="margin:16px 0;font-size:32px;font-weight:800;letter-spacing:6px;color:#0f172a;text-align:center;">${token}</p>`,
      ].join(""),
    });
  }

  const copy: Record<EmailActionType, { title: string; body: string; cta: string }> = {
    signup: {
      title: "Verifikasi email Anda",
      body: "Klik tombol di bawah untuk mengaktifkan akun.",
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
  const link = confirmUrl || `${appUrl.replace(/\/$/, "")}/login`;

  return monefyiEmailShell({
    brand,
    title: c.title,
    preheader: c.body,
    bodyHtml: [
      emailParagraph(c.body),
      emailPrimaryButton(c.cta, link, brand.accent),
    ].join(""),
  });
}

function buildAuthEmailText(params: {
  action: EmailActionType;
  confirmUrl: string | null;
  token: string;
  productName: string;
}): string {
  if (params.action === "reauthentication") {
    return `Kode verifikasi ${params.productName}: ${params.token}`;
  }
  return `${subjectFor(params.action, params.productName)}\n\nBuka link: ${params.confirmUrl || getAppUrl() + "/login"}`;
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
  const brand = resolveEmailBrand(emailData.redirect_to || appUrl);

  const result = await sendEmail({
    to: user.email,
    subject: subjectFor(action, brand.productName),
    html: buildAuthEmailHtml({
      action,
      confirmUrl,
      token: emailData.token,
      appUrl,
      brand,
    }),
    text: buildAuthEmailText({ action, confirmUrl, token: emailData.token, productName: brand.productName }),
  });

  console.log("auth-send-email:", {
    action,
    product: brand.product,
    hasConfirmUrl: !!confirmUrl,
    redirectTo: emailData.redirect_to,
    resendId: result.resendId ?? null,
    ok: result.ok,
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
