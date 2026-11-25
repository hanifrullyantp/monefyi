import * as webpush from "web-push";
import { getServiceClient } from "@/lib/engine/engineDb";

/**
 * Notifikasi push ke PWA admin di HP. Butuh env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 * Pembuatan kunci: npx web-push generate-vapid-keys
 */

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function sendAdminPush(payload: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}): Promise<{ sent: number; failed: number; fcmSent?: number; skipped?: string }> {
  let fcmSent = 0;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    try {
      const fcmRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/planner-push-notify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          tag: payload.tag,
          url: payload.url || "/admin/marketing",
        }),
      });
      const fcmJson = await fcmRes.json().catch(() => ({}));
      if (fcmRes.ok && typeof fcmJson.sent === "number") {
        fcmSent = fcmJson.sent;
      }
    } catch {
      // Abaikan jika Edge Function FCM belum dideploy
    }
  }

  if (!pushConfigured()) return { sent: 0, failed: 0, fcmSent, skipped: "VAPID belum dikonfigurasi" };
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@froyek.com",
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
  const sb = getServiceClient();
  const { data: subs } = await sb.from("admin_push_subscriptions").select("endpoint, p256dh, auth_key");
  let sent = 0;
  let failed = 0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        JSON.stringify({ ...payload, url: payload.url || "/admin/marketing" })
      );
      sent += 1;
    } catch (err: any) {
      failed += 1;
      // Langganan kedaluwarsa: hapus
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await sb.from("admin_push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }
  return { sent, failed, fcmSent };
}

