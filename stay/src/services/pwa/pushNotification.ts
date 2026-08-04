/**
 * Local OS notification manager for STAY (no VAPID / Web Push in v1).
 */

const DEDUP_MS = 5 * 60 * 1000;
const ICON = '/stay/icons/icon-192.png';
const BADGE = '/stay/icons/icon-192.png';
const DEDUP_KEY = 'stay_notif_sent';

export interface OsNotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  urgent?: boolean;
  silent?: boolean;
  requireInteraction?: boolean;
}

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<{
  granted: boolean;
  permission: NotificationPermissionState;
  reason?: string;
  message?: string;
}> {
  if (!isNotificationSupported()) {
    return { granted: false, permission: 'unsupported', reason: 'not_supported' };
  }
  if (Notification.permission === 'granted') {
    return { granted: true, permission: 'granted' };
  }
  if (Notification.permission === 'denied') {
    return {
      granted: false,
      permission: 'denied',
      reason: 'denied',
      message: 'Notifikasi diblokir. Aktifkan di pengaturan browser.',
    };
  }
  const result = await Notification.requestPermission();
  return {
    granted: result === 'granted',
    permission: result as NotificationPermissionState,
  };
}

function isDuplicate(tag: string): boolean {
  if (!tag) return false;
  try {
    const log = JSON.parse(localStorage.getItem(DEDUP_KEY) || '{}') as Record<string, number>;
    const lastSent = log[tag];
    if (!lastSent) return false;
    return Date.now() - lastSent < DEDUP_MS;
  } catch {
    return false;
  }
}

function logSent(tag: string): void {
  try {
    const log = JSON.parse(localStorage.getItem(DEDUP_KEY) || '{}') as Record<string, number>;
    log[tag] = Date.now();
    for (const key of Object.keys(log)) {
      if (Date.now() - log[key] > 24 * 60 * 60 * 1000) delete log[key];
    }
    localStorage.setItem(DEDUP_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
}

export interface ShowOsNotificationResult {
  sent: boolean;
  method?: 'sw' | 'fallback';
  skipped?: string;
  error?: string;
}

/**
 * Show OS notification via service worker (preferred) or Notification API fallback.
 */
export async function showOsNotification(
  options: OsNotificationOptions,
  opts?: { enabled?: boolean; skipDedup?: boolean }
): Promise<ShowOsNotificationResult> {
  const { title, body, icon = ICON, badge = BADGE, tag, data = {}, urgent = false, silent, requireInteraction } =
    options;

  if (!title) return { sent: false, skipped: 'no_title' };

  const enabled = opts?.enabled ?? true;
  if (!enabled) return { sent: false, skipped: 'disabled' };

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return { sent: false, skipped: 'no_permission' };
  }

  const notifTag = tag || `stay-${Date.now()}`;
  if (!opts?.skipDedup && !urgent && isDuplicate(notifTag)) {
    return { sent: false, skipped: 'duplicate' };
  }

  const payload = {
    body,
    icon,
    badge,
    tag: notifTag,
    data: {
      ...data,
      url: (data.url as string) || '/front-desk',
      timestamp: Date.now(),
    },
    silent: silent ?? false,
    requireInteraction: requireInteraction ?? urgent,
    renotify: urgent,
    vibrate: urgent ? [200, 100, 200] : undefined,
  };

  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.active) {
      reg.active.postMessage({ type: 'SHOW_NOTIFICATION', payload: { title, options: payload } });
      logSent(notifTag);
      return { sent: true, method: 'sw' };
    }
    if (reg?.showNotification) {
      await reg.showNotification(title, payload);
      logSent(notifTag);
      return { sent: true, method: 'sw' };
    }

    // Fallback when SW not ready
    // eslint-disable-next-line no-new
    new Notification(title, {
      body,
      icon,
      tag: notifTag,
      data: payload.data,
      silent: payload.silent,
      requireInteraction: payload.requireInteraction,
    });
    logSent(notifTag);
    return { sent: true, method: 'fallback' };
  } catch (e) {
    console.error('[STAY push] showOsNotification failed:', e);
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Register STAY service worker at /stay/sw.js */
export async function registerStayServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register('/stay/sw.js', { scope: '/stay/' });
    return reg;
  } catch (e) {
    console.error('[STAY] Service worker registration failed:', e);
    return null;
  }
}

export function getNotificationStatus(): {
  supported: boolean;
  permission: NotificationPermissionState;
  swRegistered: boolean;
} {
  return {
    supported: isNotificationSupported(),
    permission: getNotificationPermission(),
    swRegistered: Boolean(navigator.serviceWorker?.controller),
  };
}

/** Send a test OS notification (user gesture required). */
export async function sendTestNotification(): Promise<ShowOsNotificationResult> {
  return showOsNotification(
    {
      title: 'STAY — Notifikasi Aktif',
      body: 'Popup sistem berhasil. Anda akan menerima alert booking, pembayaran, dan tugas urgent.',
      tag: 'stay-test-notification',
      data: { url: '/front-desk' },
    },
    { skipDedup: true, enabled: true }
  );
}
