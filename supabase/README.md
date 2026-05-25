# Supabase Edge Functions (Monefyi Admin)

Fungsi yang dipakai **Super Admin Panel** di PWA:

| Function | Peran |
|----------|--------|
| `monefyi-admin-users` | Daftar user Auth + `user_plans` + `profiles` (hanya `profiles.role = admin`). |
| `monefyi-admin-app-config` | Merge + upsert baris `app_config` id `global` (hanya admin). |
| `monefyi-upload-logo` | Upload logo ke Storage + update `logo_url` di `app_config` (hanya admin). |

Sumber kanonik juga ada di `../my-supabase-project/supabase/functions/` (proyek Supabase CLI).

## Deploy (Supabase CLI)

Dari root repo (folder ini):

```bash
cd supabase/functions
# atau gunakan path penuh ke tiap function

supabase functions deploy monefyi-admin-users --project-ref <PROJECT_REF>
supabase functions deploy monefyi-admin-app-config --project-ref <PROJECT_REF>
supabase functions deploy monefyi-upload-logo --project-ref <PROJECT_REF>
```

**Secrets** (Dashboard → Edge Functions → Secrets) minimal:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Opsional: `APP_CORS_ORIGIN` (default `*`), `APP_BRANDING_BUCKET` (default `app-branding` untuk upload logo).

## Migrasi database

Jalankan migrasi di `my-supabase-project/supabase/migrations/` (termasuk `20260525100000_monefyi_app_config.sql`) agar tabel `app_config` ada dan policy baca publik aktif.
