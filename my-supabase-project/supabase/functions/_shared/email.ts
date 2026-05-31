import { invitationEmailHtml, invitationEmailText } from "./email-templates.ts";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL") || "Monefyi <no-reply@monefyi.com>";
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set, skipping email to", params.to);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email send failed: ${err}`);
  }
}

export async function sendInvitationEmail(params: {
  to: string;
  orgName: string;
  role: string;
  inviterName: string;
  joinUrl: string;
  personalMessage?: string;
  brandColor?: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `Undangan bergabung — ${params.orgName}`,
    html: invitationEmailHtml(params),
    text: invitationEmailText(params),
  });
}
