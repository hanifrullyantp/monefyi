/**
 * STAY PWA service worker — install, OS notifications, notification click routing.
 * Phase 2: push event handler for Web Push (VAPID) when backend is ready.
 */
const SW_VERSION = 'stay-v2-push';

function resolveAppUrl(path) {
  const p = path || '/stay/front-desk';
  if (/^https?:\/\//i.test(p)) return p;
  const base = self.location.origin;
  return p.startsWith('/') ? `${base}${p}` : `${base}/${p}`;
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/** Client-triggered OS notification (preferred path when app is open). */
self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (msg.type === 'SHOW_NOTIFICATION') {
    const { title, options = {} } = msg.payload || {};
    if (!title) return;
    event.waitUntil(
      self.registration.showNotification(title, {
        body: options.body,
        icon: options.icon || new URL('./icons/icon-192.png', self.location).href,
        badge: options.badge || new URL('./icons/icon-192.png', self.location).href,
        tag: options.tag || `stay-${Date.now()}`,
        data: options.data || {},
        silent: options.silent ?? false,
        requireInteraction: options.requireInteraction ?? false,
        renotify: options.renotify ?? false,
        vibrate: options.vibrate,
      })
    );
  }
});

/** Web Push from server (VAPID) — works when app is closed. */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      const text = event.data?.text?.();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
  }

  const title = data.title || 'STAY';
  const body = data.body || '';
  const tag = data.tag || 'stay-push';
  const notifData = data.data || { url: data.url || '/stay/front-desk' };

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: new URL('./icons/icon-192.png', self.location).href,
      badge: new URL('./icons/icon-192.png', self.location).href,
      tag,
      data: notifData,
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = resolveAppUrl(data.url || '/stay/front-desk');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        try {
          client.postMessage({ type: 'NOTIFICATION_CLICKED', data });
        } catch {
          /* ignore */
        }
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
