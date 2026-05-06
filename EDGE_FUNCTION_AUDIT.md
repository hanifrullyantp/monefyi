# Edge Function Audit

Semua fungsi tetap di Supabase. Frontend Vercel tetap memanggil endpoint `https://<project>.supabase.co/functions/v1/...`.

## Dipanggil frontend saat ini
- `asfin-parse-transaction`
  - Dipanggil dari `js/app.js` (parse input cepat / OCR AI).
  - Auth: `Bearer access_token`.
- `ai-user-coach`
  - Dipanggil dari fitur chat coach di `js/app.js`.
  - Auth: `Bearer access_token`.
- `monefyi-upload-logo`
  - Dipanggil admin saat upload logo (fallback dari direct storage upload).
  - Auth: `Bearer access_token`, admin-only check.

## Ada di Supabase, tetapi tidak terlihat dipanggil frontend saat ini
- `monefyi-admin-users` (UI saat ini hanya menampilkan placeholder)
- `ai-quota-status`
- `monefyi-landing-config`
- `lynk-webhook` (dipicu webhook Lynk, bukan dari frontend)

## Dampak pindah frontend ke Vercel
- Aman: endpoint fungsi tetap di Supabase.
- Perhatian:
  - Pastikan CORS function/bucket tetap menerima origin `https://app.monefyi.com`.
  - `lynk-webhook` memakai env `APP_URL` untuk link email; sebaiknya set ke domain baru.
  - Jangan pernah pindahkan `SUPABASE_SERVICE_ROLE_KEY` ke frontend.
