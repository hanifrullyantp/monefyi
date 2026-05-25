# Supabase (Monefyi) — satu lokasi untuk Edge Functions & migrasi

**Semua Edge Function dan migrasi database untuk project ini berada di folder ini** (`my-supabase-project/supabase/`). Jangan menambahkan salinan function di root repo — hindari duplikat yang bisa tidak sinkron.

## Struktur

| Path | Isi |
|------|-----|
| `supabase/functions/<nama-function>/` | Kode Deno tiap Edge Function (`index.ts`, `deno.json` bila perlu) |
| `supabase/migrations/*.sql` | Skema & perubahan DB (jalankan ke project Supabase) |
| `supabase/config.toml` | Konfigurasi CLI lokal (port, function flags, dll.) |

## Deploy Edge Functions (hosting Supabase)

Dari mesin yang sudah punya [Supabase CLI](https://supabase.com/docs/guides/cli) dan login:

```bash
cd my-supabase-project
```

Ganti `<PROJECT_REF>` dengan ref project Anda (Dashboard → Settings → General).

```bash
supabase functions deploy monefyi-admin-app-config --project-ref <PROJECT_REF>
supabase functions deploy monefyi-admin-users --project-ref <PROJECT_REF>
supabase functions deploy monefyi-upload-logo --project-ref <PROJECT_REF>
```

Function lain yang ada di `supabase/functions/` di-deploy dengan pola yang sama (`asfin-parse-transaction`, `ai-user-coach`, `lynk-webhook`, dll.).

## Secrets (Dashboard → Edge Functions → Secrets)

Minimal untuk function admin / upload logo / app config:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Opsional:

- `APP_CORS_ORIGIN` — origin frontend production (lebih aman daripada `*`)
- `APP_BRANDING_BUCKET` — default bucket logo: `app-branding`

## Migrasi database

File SQL di `supabase/migrations/` (mis. `20260525100000_monefyi_app_config.sql` untuk tabel `app_config`) harus diterapkan ke database Supabase lewat CLI atau SQL Editor, sesuai alur tim Anda (`db push`, pipeline, atau manual).

## Lokal

```bash
cd my-supabase-project
supabase start    # butuh Docker
supabase functions serve <nama-function>
```

Lihat juga [`../README.md`](../README.md) bagian keamanan & env untuk Edge.
