// Offline-capable service worker — network-first so installed PWA stays online.
const CACHE_VERSION = 'v3-network-first-1';
const STATIC_CACHE = `monefyi-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `monefyi-runtime-${CACHE_VERSION}`;

const shellUrls = [
  new URL('./index.html', self.location).href,
  new URL('./manifest.webmanifest', self.location).href,
  new URL('./css/app.css', self.location).href,
  new URL('./css/home-page.css', self.location).href,
  new URL('./css/receipt-scanner.css', self.location).href,
  new URL('./css/preview-card.css', self.location).href,
  new URL('./css/quick-preview.css', self.location).href,
  new URL('./js/app.js', self.location).href,
  new URL('./js/config.js', self.location).href,
  new URL('./js/monefyi-ui.js', self.location).href,
  new URL('./js/i18n.js', self.location).href,
  new URL('./js/utils/module-loader.js', self.location).href,
  new URL('./js/vendor/dexie.mjs', self.location).href,
  new URL('./js/services/offline-db.js', self.location).href,
  new URL('./js/services/sync-engine.js', self.location).href,
  new URL('./js/services/data-store.js', self.location).href,
  new URL('./js/components/sync-indicator.js', self.location).href,
  new URL('./icons/icon-192.svg', self.location).href,
  new URL('./icons/icon-512.svg', self.location).href,
  new URL('./icons/monefyi-logo.png', self.location).href,
  new URL('./icons/monefyi-mark.svg', self.location).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(shellUrls))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('monefyi-') && !k.includes(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // API & auth — never intercept
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) return;

  const isNavigation =
    event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isNavigation) {
    event.respondWith(networkFirst(event.request, STATIC_CACHE, { fallbackToIndex: true }));
    return;
  }

  if (url.hostname.includes('jsdelivr.net') || url.hostname.includes('unpkg.com')) {
    event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(event.request, STATIC_CACHE));
  }
});

/**
 * Prefer network; fall back to cache when offline.
 * @param {Request} request
 * @param {string} cacheName
 * @param {{ fallbackToIndex?: boolean }} [opts]
 */
async function networkFirst(request, cacheName, opts = {}) {
  try {
    const response = await fetch(request);
    if (response.ok && request.url.startsWith(self.location.origin)) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (opts.fallbackToIndex) {
      const index = await caches.match(new URL('./index.html', self.location).href);
      if (index) return index;
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(notifyClientsToSync());
  }
});

/**
 * Ask open clients to run sync (IndexedDB lives in window context).
 */
async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'MONEYFYI_BG_SYNC', tag: 'sync-transactions' });
  }
}

self.addEventListener('push', (event) => {
  const data = event.data?.json?.() || {};

  event.waitUntil(
    self.registration.showNotification(data.title || 'Monefyi', {
      body: data.body,
      icon: new URL('./icons/icon-192.svg', self.location).href,
      badge: new URL('./icons/icon-192.svg', self.location).href,
      tag: data.tag || 'default',
      data: data.data || {},
      actions: data.actions || [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || new URL('./', self.location).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
