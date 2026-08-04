/**
 * STAY Web Push sender (VAPID) for Edge Functions.
 */
import webpush from "npm:web-push@3.6.7";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface StayPushPayload {
  title: string;
  body?: string;
  tag?: string;
  url?: string;
  type?: string;
  data?: Record<string, unknown>;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  auth_user_id: string;
}

let vapidConfigured = false;

function ensureVapid(): void {
  if (vapidConfigured) return;
  const publicKey = Deno.env.get("STAY_VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("STAY_VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("STAY_VAPID_SUBJECT") ?? "mailto:hello@monefyi.com";
  if (!publicKey || !privateKey) {
    throw new Error("STAY VAPID keys not configured");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

function buildPushBody(payload: StayPushPayload): string {
  return JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    tag: payload.tag ?? `stay-${Date.now()}`,
    data: {
      url: payload.url ?? "/stay/front-desk",
      type: payload.type ?? "system",
      ...(payload.data ?? {}),
    },
  });
}

/**
 * Send Web Push to all subscriptions for a tenant (or one user when authUserId set).
 */
export async function notifyStayTenantPush(
  supabase: SupabaseClient,
  tenantId: string,
  payload: StayPushPayload,
  opts?: { authUserId?: string },
): Promise<{ sent: number; failed: number; skipped?: string }> {
  try {
    ensureVapid();
  } catch {
    return { sent: 0, failed: 0, skipped: "vapid_not_configured" };
  }

  let query = supabase
    .from("stay_push_subscriptions")
    .select("id, endpoint, p256dh, auth_key, auth_user_id")
    .eq("tenant_id", tenantId);

  if (opts?.authUserId) {
    query = query.eq("auth_user_id", opts.authUserId);
  }

  const { data: rows, error } = await query;
  if (error) throw error;
  if (!rows?.length) {
    return { sent: 0, failed: 0, skipped: "no_subscriptions" };
  }

  const body = buildPushBody(payload);
  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  for (const row of rows as PushSubscriptionRow[]) {
    const subscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth_key },
    };

    try {
      await webpush.sendNotification(subscription, body, { TTL: 86400 });
      sent += 1;
    } catch (e) {
      failed += 1;
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        staleIds.push(row.id);
      }
      console.warn("[stayWebPush] send failed:", status, row.endpoint.slice(0, 48));
    }
  }

  if (staleIds.length) {
    await supabase.from("stay_push_subscriptions").delete().in("id", staleIds);
  }

  return { sent, failed };
}

export function getStayVapidPublicKey(): string | null {
  return Deno.env.get("STAY_VAPID_PUBLIC_KEY") ?? null;
}
