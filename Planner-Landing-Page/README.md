# Monefyi Planner — Landing Page

Landing page marketing Next.js untuk **planner.monefyi.com**, menggantikan landing lama di `monefyi_planner`.

Aplikasi Planner (SPA React) tetap di `/app`, `/login`, `/signup`, dll. — di-proxy via rewrite ke deployment `monefyi_planner`.

## Lokal

```bash
cd Planner-Landing-Page
cp .env.example .env.local
npm install
npm run dev
```

Buka http://localhost:3000

## Deploy ke Vercel (production)

### 1. Project baru

1. [Vercel](https://vercel.com) → **Add Project** → repo **monefyi**
2. **Root Directory:** `Planner-Landing-Page`
3. Framework: **Next.js** (auto)

### 2. Environment variables

| Variable | Production |
|----------|------------|
| `ADMIN_PASSWORD` | Password admin `/admin` |
| `PLANNER_APP_ORIGIN` | URL deployment SPA Planner (lihat cutover) |
| `NEXT_PUBLIC_PLANNER_APP_URL` | Sama dengan `PLANNER_APP_ORIGIN` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_LYNK_ESTIMATOR_STANDARD` | Lynk checkout Estimator Standard |
| `NEXT_PUBLIC_LYNK_ESTIMATOR_PRO` | Lynk checkout Estimator Pro |
| `NEXT_PUBLIC_LYNK_PLANNER_PRO` | Lynk checkout Planner Pro bulanan |

Setup Lynk + Resend: [`docs/planner/LYNK_RESEND_SETUP.md`](../docs/planner/LYNK_RESEND_SETUP.md)

`DATABASE_URL` opsional (content disimpan di localStorage browser).

### 3. Cutover domain `planner.monefyi.com`

**Sebelum:** `planner.monefyi.com` → project `monefyi-planner` (SPA penuh)

**Sesudah:**

| Domain | Project Vercel | Isi |
|--------|----------------|-----|
| `planner.monefyi.com` | `planner-landing` (folder ini) | Landing Next.js + rewrite ke app |
| `app.planner.monefyi.com` | `monefyi-planner` | SPA Planner (`monefyi_planner/`) |

Langkah:

1. Deploy project ini → dapat URL preview
2. Di project **monefyi-planner**: tambah domain `app.planner.monefyi.com`
3. Set env di **planner-landing**:
   - `PLANNER_APP_ORIGIN=https://app.planner.monefyi.com`
   - `NEXT_PUBLIC_PLANNER_APP_URL=https://app.planner.monefyi.com`
4. Pindahkan `planner.monefyi.com` dari monefyi-planner ke **planner-landing**
5. Supabase Auth → Redirect URLs: tambah `https://app.planner.monefyi.com/**`, pertahankan `https://planner.monefyi.com/**` untuk rewrite

### 4. CLI (opsional)

```bash
cd Planner-Landing-Page
npx vercel link --yes --project planner-landing
npx vercel env add ADMIN_PASSWORD production
npx vercel env add PLANNER_APP_ORIGIN production
npx vercel deploy --prod --yes
```

## Admin CMS

- `/admin` — edit konten landing (localStorage per browser)
- `/admin/login` — password dari `ADMIN_PASSWORD`

## Health

`GET /api/health` — `{ ok: true }` (DB opsional)
