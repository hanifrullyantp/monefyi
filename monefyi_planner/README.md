# Monefyi Planner (React)

Frontend Planner — React + Vite + Tailwind, terhubung ke Supabase shared dengan Planner vanilla di `planner/`.

## Environment

Salin `.env.example` ke `.env.local`:

```bash
cd monefyi_planner
cp .env.example .env.local
```

| Variable | Deskripsi |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL project Supabase (lokal) |
| `VITE_SUPABASE_ANON_KEY` | Anon key (lokal) |
| `NEXT_PUBLIC_SUPABASE_URL` | Dari integrasi Vercel ↔ Supabase (Production + Preview) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key dari integrasi Vercel ↔ Supabase |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Alias integrasi Supabase (di-map otomatis saat build) |
| `VITE_APP_ENV` | `development` atau `production` (opsional) |
| `VITE_DEV_DEMO_AUTH` | `true` = tampilkan tombol demo role (dev only) |

**Vercel:** jika sudah connect Supabase, env `NEXT_PUBLIC_*` / `SUPABASE_*` cukup — tidak perlu menambah `VITE_*` manual.

**Tidak dipakai di frontend:** `POSTGRES_*`, `SUPABASE_SERVICE_ROLE_KEY` (server-only).

## Multi-role onboarding

Lihat [docs/ONBOARDING.md](docs/ONBOARDING.md) untuk alur Owner/Member, edge functions, migrasi SQL, dan QA checklist.

Ringkas:
- Owner: `/signup/owner` → verifikasi email → `planner-create-owner-org` → wizard
- Member: `/join`, `/join-by-code`, atau `/find-company`
- Tim: tab **Tim** di app (undang, approve request, audit log)

Deploy migrasi `20260531120000_planner_onboarding.sql` dan edge functions di `my-supabase-project/supabase/functions/planner-*` sebelum production.

### Supabase Auth (Dashboard)

- **Site URL:** `https://planner.monefyi.com`
- **Redirect URLs:** `https://planner.monefyi.com/**`, `http://localhost:5173/**`

## Lokal

```bash
cd monefyi_planner
npm install
npm run dev
```

Buka URL Vite (port default **5173**).

## Deploy ke Vercel

1. Di [Vercel](https://vercel.com): **Add New** → **Project** → import repo **monefyi**.
2. **Root Directory:** **`monefyi_planner`**
3. Framework: **Vite** · Build: **`npm run build`** · Output: **`dist`**
4. Tambahkan env vars di atas (Production + Preview).
5. Domain: `planner.monefyi.com`

Push ke `main` memicu deploy otomatis jika project Vercel terhubung.

### Preview: Deployment Protection (401)

URL preview **`…-git-main-….vercel.app`** kadang dilindungi Vercel Authentication. Nonaktifkan di **Settings → Deployment Protection** untuk Preview, atau uji di domain production.

## Backend

Database, Auth, dan Edge Functions di Supabase (`my-supabase-project/`):

- `planner-parse-command` — AI fallback Smart Button
- `planner-analyze` — rekomendasi dashboard
- Edge secret: `GEMINI_API_KEY`

## Smoke test produksi

1. Signup → org terbuat di `planner_organizations`
2. Login → redirect `/app`, session persist setelah refresh
3. Buat proyek → muncul di list
4. Smart Button: `catat semen 10 sak 65000` → row di `planner_cost_realizations`
5. Dashboard KPI dan Finance menampilkan biaya nyata
