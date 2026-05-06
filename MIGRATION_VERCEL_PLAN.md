# Monefyi -> Vercel Migration Plan (Root Domain)

Target: deploy frontend ke `https://app.monefyi.com` dengan perubahan minimal.

## Scope
- Frontend static build (Vite) di Vercel.
- Backend tetap di Supabase (DB/Auth/Storage/Edge Functions).
- Tidak memindahkan logic Edge Function ke frontend/Vercel.

## Arsitektur
- Frontend source: `index.html`, `js/`, `css/`, `sw.js`, `manifest.webmanifest`.
- Build output: `dist/`.
- Supabase functions: `my-supabase-project/supabase/functions/*`.

## Konfigurasi Deploy Vercel
- Root project: `monefyi/`
- Build command: `npm run build`
- Output directory: `dist`
- Node: `>=20.x` (lihat `package.json`)
- SPA rewrite: fallback ke `index.html` untuk route non-asset.

## Minimal Change Set
1. `vercel.json`:
   - Build + output config.
   - Rewrite SPA yang tidak menangkap static asset.
   - Header cache untuk `sw.js` agar update lebih cepat terambil.
2. Dokumentasi deployment/checklist.

## Tidak Diubah
- Logic bisnis di `js/app.js`.
- Isi Edge Functions Supabase.
- Alur DB/Auth/Storage.

## Deploy Checklist
1. Import repo ke Vercel (root `monefyi/`).
2. Set domain production: `app.monefyi.com`.
3. Verifikasi:
   - `https://app.monefyi.com/sw.js` -> JavaScript (bukan HTML).
   - `https://app.monefyi.com/manifest.webmanifest` -> JSON.
4. Update Supabase Auth URL configuration:
   - Site URL: `https://app.monefyi.com`
   - Redirect URLs: minimal `https://app.monefyi.com/*`
5. (Opsional tapi penting) update env `APP_URL` di function `lynk-webhook` ke `https://app.monefyi.com`.
