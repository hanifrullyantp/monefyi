// sw.js - Service Worker Minimalis untuk Monefyi Landing

const CACHE_NAME = 'monefyi-landing-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Network only to avoid serving stale landing content
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
