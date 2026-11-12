import webpush from "web-push";
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
}): Promise<{ sent: number; failed: number; skipped?: string }> {
  if (!pushConfigured()) return { sent: 0, failed: 0, skipped: "VAPID belum dikonfigurasi" };
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@monefyi.com",
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
  return { sent, failed };
}

