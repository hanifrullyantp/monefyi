# Dependency Map

## Build-time
- `vite` (devDependency)
- Node runtime `>=20.x`

## Frontend runtime (CDN)
- `@tailwindcss/browser`
- `chart.js`
- `tesseract.js`
- `@supabase/supabase-js` (UMD)

## External services
- Supabase:
  - Auth (`signInWithPassword`, reset password redirect)
  - PostgREST (`profiles`, `transactions`, `app_config`, dll)
  - Storage (`app-branding`)
  - Edge Functions (`functions/v1/*`)
- Lynk checkout URLs (konfigurasi di `js/config.js` / `app_config`)
- Affiliate URL (`affiliator.monefyi.com`)

## PWA
- `manifest.webmanifest`
- `sw.js` (offline fallback + runtime caching same-origin GET)

## Deployment dependencies
- Vercel static hosting (`dist`)
- Domain DNS untuk `app.monefyi.com`
