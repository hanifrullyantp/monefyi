/**
 * Web Push subscription management for STAY (VAPID phase 2).
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { STAY_VAPID_PUBLIC_KEY, getStayPushSubscribeUrl } from '../../config/pwa';
import { registerStayServiceWorker } from './pushNotification';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    Boolean(STAY_VAPID_PUBLIC_KEY)
  );
}

/**
 * Subscribe browser to Web Push and persist endpoint on server.
 */
export async function subscribeWebPush(): Promise<{ success: boolean; error?: string }> {
  if (!isWebPushSupported()) {
    return { success: false, error: 'Web Push tidak didukung di browser ini' };
  }

  const fnUrl = getStayPushSubscribeUrl();
  if (!fnUrl) {
    return { success: false, error: 'Supabase URL tidak dikonfigurasi' };
  }

  const headers = await getAuthHeaders();
  if (!headers) {
    return { success: false, error: 'Sesi login tidak ditemukan' };
  }

  try {
    const reg = (await registerStayServiceWorker()) ?? (await navigator.serviceWorker.ready);
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(STAY_VAPID_PUBLIC_KEY),
      });
    }

    const res = await fetch(fnUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'subscribe',
        subscription: subscription.toJSON(),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: (err as { error?: string }).error ?? res.statusText };
    }

    return { success: true };
  } catch (e) {
    console.error('[STAY] subscribeWebPush failed:', e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Unsubscribe Web Push locally and remove from server.
 */
export async function unsubscribeWebPush(): Promise<{ success: boolean; error?: string }> {
  if (!isWebPushSupported()) return { success: true };

  const fnUrl = getStayPushSubscribeUrl();
  const headers = await getAuthHeaders();

  try {
    const reg = await navigator.serviceWorker.getRegistration('/stay/');
    const subscription = await reg?.pushManager.getSubscription();

    if (subscription && fnUrl && headers) {
      await fetch(fnUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'unsubscribe',
          endpoint: subscription.endpoint,
        }),
      });
      await subscription.unsubscribe();
    } else if (subscription) {
      await subscription.unsubscribe();
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Send server-side test push to current user's devices.
 */
export async function sendServerPushTest(): Promise<{ success: boolean; error?: string; detail?: string }> {
  const fnUrl = getStayPushSubscribeUrl();
  const headers = await getAuthHeaders();
  if (!fnUrl || !headers) {
    return { success: false, error: 'Tidak terhubung ke Supabase' };
  }

  const res = await fetch(fnUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'test' }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, error: (data as { error?: string }).error ?? res.statusText };
  }

  const result = data as { sent?: number; skipped?: string };
  if (result.skipped === 'vapid_not_configured') {
    return { success: false, error: 'VAPID belum dikonfigurasi di server' };
  }
  if (result.skipped === 'no_subscriptions') {
    return { success: false, error: 'Belum ada subscription — aktifkan notifikasi dulu' };
  }

  return {
    success: (result.sent ?? 0) > 0,
    detail: `Server push terkirim ke ${result.sent ?? 0} perangkat`,
    error: (result.sent ?? 0) > 0 ? undefined : 'Push server gagal',
  };
}

export async function hasActivePushSubscription(): Promise<boolean> {
  if (!isWebPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/stay/');
    const sub = await reg?.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}
