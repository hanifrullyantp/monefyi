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

### Preview: `manifest.webmanifest` 401 + “Syntax error” di Console

URL bertipe **`…-git-main-….vercel.app`** (preview) sering memakai **Deployment Protection** (Vercel Authentication). Permintaan tanpa sesi mendapat **401** berupa halaman HTML; browser lalu mencoba mem-parse itu sebagai manifest → **Syntax error baris 1**.

**Solusi:** di Vercel → project Planner → **Settings** → **Deployment Protection** — nonaktifkan proteksi untuk **Preview**, atau uji di **domain production** yang tidak dilindungi. Bukan bug di file manifest itu sendiri.

Repo ini **tidak lagi memakai rewrite** `/(.*) → /index.html` di `vercel.json` (app satu halaman; tidak perlu fallback SPA), agar aset statis tidak pernah tertukar dengan `index.html`.

**Login langsung setelah Daftar:** aplikasi mencoba **Masuk otomatis** setelah `signUp` jika Supabase mengizinkan (biasanya **Confirm email** dimatikan: Supabase → **Authentication** → **Providers** → **Email** → nonaktifkan *Confirm email*).

**Admin panel:** email di `js/config.js` → `adminEmails` mendapat akses panel admin. Untuk akun nyata, setelah seed SQL sebaiknya **ganti password** di Supabase Dashboard.

Supabase (database + Edge Functions) dipakai bersama project Supabase utama repo ini.

### Seed akun login (perbaiki error 400 `/auth/v1/token`)

File migrasi:

`my-supabase-project/supabase/migrations/20260524120000_planner_seed_auth_email_users.sql`

- Membuat / memperbaiki **`planner-bypass@monefyi.app`** (password `PlannerBypass2026!`) — sama dengan tombol **Masuk cepat** di app.
- Membuat / memperbaiki **`hanif.rullyant@gmail.com`** (password awal `88888888`) + baris **`auth.identities`** (sering penyebab **HTTP 400** pada `/auth/v1/token` jika identitas email hilang).
- **Wajib** `supabase db push` (atau jalankan isi file di SQL Editor) **setelah** migrasi schema Planner (`20260523120000_...`).

**Keamanan:** ganti password di Supabase Dashboard setelah login pertama; set `bypassLoginEnabled: false` di `planner/js/config.js` untuk production.

### Migrasi SQL (Planner)

File sumber skema: `planner/supabase/migrations/001_planner_core_schema.sql` (dokumentasi / rujukan).  
**Yang dijalankan CLI** adalah salinan berversi di:

`my-supabase-project/supabase/migrations/20260523120000_planner_core_schema.sql`

Dari root repo, set token lalu push migrasi + deploy function:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."   # Dashboard Supabase → Account → Access Tokens
export SUPABASE_PROJECT_REF="..."        # Settings → General → Reference ID (wajib jika belum pernah `supabase link`)
./scripts/deploy-planner-supabase.sh
```

Atau manual:

```bash
cd my-supabase-project
npx supabase@latest link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase@latest migration repair --status reverted --linked 20260507151500 20260507162500 || true
npx supabase@latest db push --yes
npx supabase@latest functions deploy planner-analyze
npx supabase@latest functions deploy planner-parse-command
```

**Jika `db push` gagal:** (1) Nama file di `my-supabase-project/supabase/migrations/` harus pola **`YYYYMMDDHHMMSS_nama.sql`** — file lain di-skip CLI. (2) Pesan **Remote migration versions not found in local** artinya tabel riwayat di project remote punya versi yang **tidak ada file-nya** di repo (mis. migrasi lama dari mesin lain). Jalankan `migration repair --status reverted --linked <versi...>` untuk versi yang disebut log, lalu `db push` lagi. Workflow GitHub **Supabase Planner migrate & deploy** sudah mencoba repair untuk `20260507151500` dan `20260507162500` sebelum push; jika log Anda menyebut versi lain, tambahkan ke perintah repair atau ke step workflow.

**Setelah push:** di SQL Editor, `select to_regclass('public.planner_organizations');` harus **bukan** `null`.

**Secret function:** di Supabase → **Edge Functions** → **Secrets**, tambahkan `GEMINI_API_KEY` agar `planner-parse-command` bisa memanggil Gemini (opsional; tanpa secret, parser mengembalikan pesan “not configured”).

Kode function yang dipakai deploy ada di `my-supabase-project/supabase/functions/planner-*` (disinkronkan dari `planner/supabase/functions/`).

## Lokal

```bash
cd planner
npm install
npm run dev
```

Buka URL yang ditampilkan Vite (port default **5174**).
