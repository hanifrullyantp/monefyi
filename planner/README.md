# Monefyi Planner

PWA manajemen proyek (Vite + HTML/CSS/JS). Deploy terpisah dari app Monefyi di root repo.

## Deploy ke Vercel

1. Di Vercel: **Add New** → **Project** → import repo **monefyi**.
2. Pastikan **Production Branch** = **`main`** (cabang default repo).
3. **Root Directory:** klik **Edit** → pilih **`planner`** (bukan root repo).
4. Framework: **Vite** atau **Other**; Vercel biasanya mendeteksi dari `planner/package.json`.
5. Build: **`npm run build`** · Output: **`dist`** (sudah di `planner/vercel.json`).
6. **Node.js:** pakai **20.x** atau lebih baru (`engines` di `package.json`).
7. Deploy, lalu tambahkan domain di project Vercel ini.

Supabase Edge Functions khusus planner ada di `planner/supabase/` — deploy function lewat Supabase CLI/Dashboard, bukan lewat Vercel.

## Lokal

```bash
cd planner
npm install
npm run dev
```

Buka URL yang ditampilkan Vite (port default **5174**).
