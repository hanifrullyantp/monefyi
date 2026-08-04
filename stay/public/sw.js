/**
 * STAY PWA service worker — install, OS notifications, notification click routing.
 * Phase 2: push event handler for Web Push (VAPID) when backend is ready.
 */
const SW_VERSION = 'stay-v1';

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

/** Stub for future Web Push (phase 2). */
self.addEventListener('push', (event) => {
  const data = event.data?.json?.() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'STAY', {
      body: data.body,
      icon: new URL('./icons/icon-192.png', self.location).href,
      badge: new URL('./icons/icon-192.png', self.location).href,
      tag: data.tag || 'stay-push',
      data: data.data || {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/stay/front-desk';

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
