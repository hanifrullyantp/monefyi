# Risk Analysis - Vercel Frontend Migration

## High
- SPA rewrite terlalu agresif dapat membuat `sw.js`/manifest/assets ter-serve sebagai `index.html`.
  - Mitigasi: rewrite hanya untuk path non-file extension (sudah disesuaikan di `vercel.json`).
  - Uji wajib: akses langsung `/sw.js` dan `/manifest.webmanifest`.

## Medium
- Reset password redirect gagal jika domain baru belum di-allow di Supabase Auth.
  - Mitigasi: update Site URL + Redirect URLs di Supabase.

- Upload logo admin (direct storage path) dapat terpengaruh policy/CORS origin baru.
  - Mitigasi: validasi policy bucket `app-branding`; fallback Edge Function tetap tersedia.

- Link email pasca pembayaran dari `lynk-webhook` masih bisa menunjuk domain lama.
  - Mitigasi: set env `APP_URL=https://app.monefyi.com`.

## Low
- Cache service worker lama menyebabkan user melihat versi stale beberapa saat.
  - Mitigasi: header `sw.js` `must-revalidate`, hard refresh pada verifikasi awal.

## Out of Scope (sesuai keputusan)
- Migrasi Edge Functions dari Supabase ke Vercel.
- Refactor logic bisnis frontend/backend.
