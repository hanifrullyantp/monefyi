import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  invitationEmailHtml,
  invitationEmailText,
  joinRequestHtml,
  welcomeMemberHtml,
  welcomeOwnerHtml,
} from "./email-templates.ts";

/** Verified domain on Resend — keep in sync with Dashboard SMTP sender. */
export const RESEND_DEFAULT_FROM = "Monefyi <noreply@monefyi.com>";

export type SendEmailResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
};

export function getResendFrom(): string {
  return Deno.env.get("RESEND_FROM_EMAIL")?.trim() || RESEND_DEFAULT_FROM;
}

export function getAppUrl(): string {
  return (Deno.env.get("APP_URL") || "https://planner.monefyi.com").replace(/\/$/, "");
}

export function isResendConfigured(): boolean {
  return Boolean(Deno.env.get("RESEND_API_KEY")?.trim());
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const from = getResendFrom();

  if (!apiKey) {
    console.warn("RESEND_API_KEY not set, skipping email to", params.to);
    return { ok: false, skipped: true, reason: "RESEND_API_KEY not configured" };
  }

  if (!params.to?.includes("@")) {
    return { ok: false, skipped: true, reason: "Invalid recipient email" };
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
      text: params.text ?? params.subject,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", res.status, err);
    return { ok: false, reason: `Resend ${res.status}: ${err.slice(0, 200)}` };
  }

  return { ok: true };
}

/** Fire-and-forget helper used by edge handlers. */
export async function sendEmailSafe(
  params: Parameters<typeof sendEmail>[0],
): Promise<SendEmailResult> {
  try {
    return await sendEmail(params);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("sendEmailSafe:", msg);
    return { ok: false, reason: msg };
  }
}

export async function userAllowsEmail(
  sb: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await sb
    .from("profiles")
    .select("email_notifications")
    .eq("id", userId)
    .maybeSingle();
  return data?.email_notifications !== false;
}

export async function getUserEmail(
  sb: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await sb.auth.admin.getUserById(userId);
  const email = data?.user?.email?.trim();
  return email && email.includes("@") ? email : null;
}

/** Owner + active managers who opted in to email. */
export async function listOrgLeaderEmails(
  sb: SupabaseClient,
  orgId: string,
): Promise<string[]> {
  const { data: org } = await sb
    .from("planner_organizations")
    .select("owner_id")
    .eq("id", orgId)
    .single();

  const { data: members } = await sb
    .from("planner_org_members")
    .select("user_id, role")
    .eq("org_id", orgId)
    .eq("status", "active")
    .in("role", ["owner", "manager"]);

  const userIds = new Set<string>();
  if (org?.owner_id) userIds.add(org.owner_id);
  for (const m of members || []) userIds.add(m.user_id);

  const emails: string[] = [];
  for (const uid of userIds) {
    if (!(await userAllowsEmail(sb, uid))) continue;
    const email = await getUserEmail(sb, uid);
    if (email) emails.push(email);
  }
  return [...new Set(emails)];
}

export async function sendInvitationEmail(params: {
  to: string;
  orgName: string;
  role: string;
  inviterName: string;
  joinUrl: string;
  personalMessage?: string;
  brandColor?: string;
}): Promise<SendEmailResult> {
  const result = await sendEmail({
    to: params.to,
    subject: `Undangan bergabung — ${params.orgName}`,
    html: invitationEmailHtml(params),
    text: invitationEmailText(params),
  });
  if (!result.ok && !result.skipped) {
    throw new Error(result.reason || "Email send failed");
  }
  if (result.skipped) {
    throw new Error(result.reason || "Resend not configured");
  }
  return result;
}

export async function sendWelcomeOwnerEmail(
  sb: SupabaseClient,
  userId: string,
  orgName: string,
): Promise<SendEmailResult> {
  if (!(await userAllowsEmail(sb, userId))) {
    return { ok: false, skipped: true, reason: "User disabled email notifications" };
  }
  const to = await getUserEmail(sb, userId);
  if (!to) return { ok: false, skipped: true, reason: "No email on account" };
  const appUrl = getAppUrl();
  return sendEmailSafe({
    to,
    subject: `Selamat datang — ${orgName}`,
    html: welcomeOwnerHtml(orgName, appUrl),
    text: `Organisasi ${orgName} siap digunakan. Buka ${appUrl}/onboarding/owner`,
  });
}

export async function sendWelcomeMemberEmail(
  sb: SupabaseClient,
  userId: string,
  orgName: string,
): Promise<SendEmailResult> {
  if (!(await userAllowsEmail(sb, userId))) {
    return { ok: false, skipped: true, reason: "User disabled email notifications" };
  }
  const to = await getUserEmail(sb, userId);
  if (!to) return { ok: false, skipped: true, reason: "No email on account" };
  const appUrl = getAppUrl();
  return sendEmailSafe({
    to,
    subject: `Selamat datang di ${orgName}`,
    html: welcomeMemberHtml(orgName, appUrl),
    text: `Anda bergabung dengan ${orgName}. Login: ${appUrl}/login`,
  });
}

export async function notifyJoinRequestAdmins(params: {
  sb: SupabaseClient;
  orgId: string;
  orgName: string;
  requesterName: string;
  requesterEmail: string;
  message?: string;
}): Promise<SendEmailResult[]> {
  const appUrl = getAppUrl();
  const leaders = await listOrgLeaderEmails(params.sb, params.orgId);
  const html = joinRequestHtml({
    requesterName: params.requesterName,
    requesterEmail: params.requesterEmail,
    orgName: params.orgName,
    message: params.message,
    reviewUrl: `${appUrl}/app?tab=hr`,
  });
  const subject = `Permintaan bergabung — ${params.orgName}`;
  const text = `${params.requesterName} (${params.requesterEmail}) ingin bergabung. Buka ${appUrl}/app?tab=hr`;

  const results: SendEmailResult[] = [];
  for (const to of leaders) {
    results.push(await sendEmailSafe({ to, subject, html, text }));
  }
  return results;
}
