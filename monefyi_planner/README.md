# Monefyi Planner (React)

Frontend Planner — React + Vite + Tailwind. Deploy terpisah dari app Monefyi di root repo dan dari Planner vanilla di `planner/`.

## Deploy ke Vercel

1. Di [Vercel](https://vercel.com): **Add New** → **Project** → import repo **monefyi**.
2. Pastikan **Production Branch** = **`main`**.
3. **Root Directory:** klik **Edit** → pilih **`monefyi_planner`** (bukan root repo).
4. Framework: **Vite** (terdeteksi dari `package.json`).
5. Build: **`npm run build`** · Output: **`dist`** (sudah di `vercel.json`).
6. **Node.js:** **20.x** atau lebih baru (`engines` di `package.json`).
7. Deploy, lalu tambahkan domain (mis. `planner.monefyi.com`) di project Vercel ini.

Push ke `main` memicu deploy otomatis jika project Vercel sudah terhubung ke repo.

### Preview: Deployment Protection (401)

URL preview **`…-git-main-….vercel.app`** kadang dilindungi **Vercel Authentication**. Permintaan tanpa sesi mendapat **401** HTML — bukan bug di app.

**Solusi:** Vercel → project → **Settings** → **Deployment Protection** — nonaktifkan untuk **Preview**, atau uji di domain production.

## Lokal

```bash
cd monefyi_planner
npm install
npm run dev
```

Buka URL yang ditampilkan Vite (port default **5173**).

## Backend

Database, Auth, dan Edge Functions tetap di Supabase (`my-supabase-project/`). Integrasi Supabase ke UI React dapat ditambahkan lewat env Vercel:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
