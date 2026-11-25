# Inventaris APK Wrap (`chore/apk-wrap`)

Tanggal: 2026-11-25
Branch: `chore/apk-wrap`

## 1. Struktur Aplikasi di Monorepo

Repository ini memiliki dua aplikasi utama untuk domain Froyek:

| Komponen | Lokasi | Framework | Konfigurasi Build | Output Build | SSR / API Routes |
|---|---|---|---|---|---|
| **Froyek Landing & Admin** (`https://froyek.com`) | `apps/landing/` | **Next.js 16.2.6** (React 19.2.6) | `apps/landing/next.config.ts` | `apps/landing/.next` | **Ya** (App Router SSR, `rewrites`/`redirects`, dan `/api/*` routes) |
| **Froyek Web App / Estimator** (`https://estimator.froyek.com` & `/app/*`) | `apps/web/` | **Vite 7.3.2** + React 19.2.6 + React Router 7 | `apps/web/vite.config.ts` | `apps/web/dist` (`vite-plugin-singlefile`) | **Tidak** (Pure client-side SPA) |

*(Catatan: `package.json` di root juga memiliki skrip legacy `vite.app.config.js`, sedangkan aplikasi Froyek aktif berada di `apps/landing` dan `apps/web`.)*

## 2. Manifest & Service Worker

### `apps/landing/public/` (`froyek.com`)
- **Manifest:** `apps/landing/public/manifest.webmanifest` (`name: "Froyek Estimator"`, `start_url: "/?utm_source=pwa"`, `display: "standalone"`) dan `apps/landing/public/admin-manifest.webmanifest`.
- **Service Worker:** `apps/landing/public/sw.js` (`froyek-estimator-v1`, network-first dengan cache fallback, melewati `/admin`) dan `apps/landing/public/admin-sw.js` (scope `/admin/`).
- **Registrasi SW:** Di `apps/landing/src/app/layout.tsx` dan `apps/landing/src/components/admin/AdminLayoutClient.tsx`.

### `apps/web/public/` (`estimator.froyek.com`)
- **Manifest:** `apps/web/public/manifest.webmanifest` (`name: "froyek"`, `start_url: "/"`, `display: "standalone"`) dan `apps/web/public/manifest-estimator.webmanifest`.
- **Service Worker:** `apps/web/public/sw.js` (`froyek-web-v1`, precache shell + stale-while-revalidate).
- **Registrasi SW:** Di `apps/web/src/lib/pwa.ts` (hanya aktif saat `import.meta.env.PROD`).

## 3. Kondisi Push Notification & Backend Saat Ini

- **Admin Web Push (Froyek):** Berada di `apps/landing/src/lib/engine/pushNotify.ts` menggunakan `web-push` (VAPID) dan dipanggil dari API routes Next.js (`/api/engine/push`, `/api/engine/tick`, `/api/engine/supervisor`, `/api/engine/creatives`).
- **Supabase Edge Functions (`my-supabase-project/supabase/functions/`):**
  - Fungsi `planner-*` saat ini menangani auth/invite/checkout/webhook/AI proxy — **belum ada** Edge Function `planner-push-*` untuk FCM.
  - Fungsi push yang sudah ada di repo adalah `stay-push-dispatch`, `stay-push-notify`, dan `stay-push-subscribe` (untuk modul Stay).
- **Kredensial Firebase:** File `google-services.json` dan kredensial Service Account Firebase untuk FCM HTTP v1 belum tersedia di repository.

## 4. Titik Henti (Menunggu Konfirmasi User — Langkah 0)

Sesuai aturan Langkah 0 (*"Jika frameworknya Next.js dengan SSR atau API route, berhenti dan tanyakan saya sebelum lanjut"*):

1. Domain utama `https://froyek.com` (`apps/landing`) menggunakan **Next.js dengan SSR dan API Routes** (`/api/*`).
   - Jika Capacitor memakai `server.url = "https://froyek.com"`, WebView Android akan memuat server produksi langsung (sehingga SSR & API routes tetap berjalan di Vercel, sedangkan `webDir` hanya sebagai fallback lokal).
   - Alternatifnya, aplikasi inti user (`apps/web`) adalah **Vite SPA** (`apps/web/dist`).
2. Sebelum melanjutkan ke **Langkah 1–4**, mohon konfirmasi:
   - Aplikasi mana yang dijadikan target utama `capacitor.config` / `webDir` (`apps/web/dist` atau `apps/landing`, dengan `server.url = "https://froyek.com"`)?
   - Apakah Anda sudah memiliki file **`google-services.json`** (Firebase Android) dan **Firebase Service Account JSON** untuk FCM HTTP v1?

