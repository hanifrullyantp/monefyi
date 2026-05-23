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

Supabase (database + Edge Functions) dipakai bersama project Supabase utama repo ini.

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
npx supabase@latest db push
npx supabase@latest functions deploy planner-analyze
npx supabase@latest functions deploy planner-parse-command
```

**Secret function:** di Supabase → **Edge Functions** → **Secrets**, tambahkan `GEMINI_API_KEY` agar `planner-parse-command` bisa memanggil Gemini (opsional; tanpa secret, parser mengembalikan pesan “not configured”).

Kode function yang dipakai deploy ada di `my-supabase-project/supabase/functions/planner-*` (disinkronkan dari `planner/supabase/functions/`).

## Lokal

```bash
cd planner
npm install
npm run dev
```

Buka URL yang ditampilkan Vite (port default **5174**).
