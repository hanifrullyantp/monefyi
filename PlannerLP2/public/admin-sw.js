// Service Worker for Monefyi Admin CRM PWA (Scoped to /admin/)
const CACHE_NAME = 'monefyi-admin-crm-v3';
const PRECACHE_URLS = [
  '/admin',
  '/brand/admin/icon-192.png',
  '/brand/admin/icon-512.png',
  '/brand/admin/icon-maskable-512.png',
  '/brand/admin/apple-touch-icon.png',
  '/admin-manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key.startsWith('monefyi-admin'))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Network first strategy for Admin CRM with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notification event listener (for remote push & background sync)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Monefyi Admin', body: event.data.text() };
    }
  }

  const title = data.title || 'Monefyi Admin Notifikasi';
  const options = {
    body: data.body || 'Pemberitahuan baru dari sistem Monefyi Admin.',
    icon: data.icon || '/brand/admin/icon-192.png',
    badge: '/brand/admin/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'monefyi-admin-alert',
    renotify: true,
    data: {
      url: data.url || '/admin',
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click: bring PWA/tab to focus or navigate to target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.includes('/admin') && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
