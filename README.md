# Monefyi

Aplikasi keuangan pribadi (PWA) — HTML + CSS + JavaScript, backend Supabase.

## Cabang Git & produksi

- **`main`** adalah **cabang default** repository (setelah Anda mengaturnya di GitHub). Push ke `main` memicu deploy **production** pada project Vercel yang mengaitkan branch production ke `main` (termasuk domain utama yang Anda pasang di Vercel).
- **Pemilik repo:** cabang `main` sudah didorong ke GitHub. Jika default masih `migration-vercel-prep`, ubah di **Settings → General → Default branch** lalu pilih **`main`** dan konfirmasi.
- **`migration-vercel-prep`** dan cabang `cursor/*` dipakai untuk pekerjaan migrasi atau fitur; gabungkan ke `main` bila siap rilis.

**Monefyi Planner** (app terpisah) berada di folder **`planner/`**. Panduan deploy Vercel khusus Planner: lihat [`planner/README.md`](planner/README.md).

## Struktur

| File / folder | Isi |
|---------------|-----|
| `index.html` | Shell halaman, CDN library + referensi aset |
| `js/config.js` | **Sesuaikan di sini:** URL Supabase, anon key, checkout, admin, `basePath` |
| `js/app.js` | Logika aplikasi |
| `css/app.css` | Gaya antarmuka |
| `scripts/` | Utilitas one-off (`refactor.cjs`, template print) — tidak wajib di production |

## Menjalankan lokal

Buka lewat **HTTP** (bukan `file://`), agar service worker / fetch normal:

```bash
npm install
npm run dev
```

Lalu buka `http://localhost:5173`.

Alternatif tanpa Vite:

```bash
npx --yes serve . -p 5173
```

## Deploy & `basePath`

- `link rel="manifest"` dan ikon kini memakai path relatif (`./manifest.webmanifest`, `./icons/...`) agar lebih aman saat deploy di subfolder.
- Jika deploy di **subfolder** (mis. `https://domain.com/monefyi/`):
  1. Set `basePath: "/monefyi"` di `js/config.js` (tanpa slash di akhir).
  2. Service worker akan terdaftar di `/monefyi/sw.js`.
  3. Jika ada aset lain yang masih absolut (`/...`), ubah ke relatif atau prefiks dengan subfolder.

## Deploy ke Vercel (frontend)

Frontend ini di-build dengan **Vite** menjadi aset statis di `dist/`. Di Vercel, **Node.js hanya dipakai saat build** (`npm run build`).

**Catatan penting:** repo ini juga memiliki **Supabase Edge Functions** di `my-supabase-project/supabase/functions/*`. Fungsi tersebut tetap berjalan di Supabase (bukan Vercel). Panduan deploy (CLI, secrets, migrasi) ada di **[`my-supabase-project/README.md`](my-supabase-project/README.md)** — **satu-satunya lokasi** kode function & migrasi; jangan menaruh salinan di folder lain.

**Catatan stack:** kode UI saat ini adalah HTML + JavaScript (bukan React). Jika nanti migrasi ke React, tetap bisa memakai preset Vite + React di Vercel dengan pola serupa.

### Langkah singkat

1. Push repo ke GitHub/GitLab/Bitbucket (folder root proyek = folder yang memuat `package.json` ini).
2. Di [Vercel](https://vercel.com): **Add New Project** → import repo → deteksi **Vite** (atau set manual: Build `npm run build`, Output `dist`). File `vercel.json` sudah mengisi hal itu.
3. **Environment variables:** tidak wajib untuk build default; URL Supabase dan anon key tetap di `js/config.js` (atau kelola lewat injeksi build jika nanti Anda memindah config).
4. Deploy pertama, lalu uji URL preview `.vercel.app`.
5. **DNS dari Rumahweb:** arahkan domain (A/ALIAS/CNAME sesuai panduan Vercel) ke project; di Vercel tambahkan domain production.
6. **Supabase (Auth / redirect):** di dashboard Supabase → Authentication → URL Configuration, tambahkan URL production (dan preview bila perlu) ke **Redirect URLs** / **Site URL** agar login tidak ditolak setelah pindah host.
7. Backend **Edge Function yang ada di folder `my-supabase-project/` tetap di Supabase**, bukan di Vercel — migrasi hosting frontend tidak memindahkan fungsi tersebut.

### PWA / service worker

`vercel.json` memberi header `Cache-Control` ringan pada `sw.js` agar setelah deploy versi baru lebih cepat terambil klien (kurangi stale SW).

## Keamanan Supabase

- **Anon key** di klien adalah pola normal; yang melindungi data adalah **Row Level Security (RLS)** di setiap tabel.
- Jangan pernah memasukkan **service_role** ke file yang di-serve ke browser.
- Untuk CORS Edge Functions, gunakan env `APP_CORS_ORIGIN` (mis. `https://app.monefyi.com`) agar origin tidak wildcard.

### Env yang direkomendasikan (Edge Functions)

- `APP_CORS_ORIGIN=https://app.monefyi.com`
- `SUPABASE_URL=...`
- `SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

## Smoke Test

Jalankan verifikasi cepat:

```bash
npm run smoke
```

Script ini akan:

1. Build frontend (`npm run build`).
2. Menjalankan static guard checks untuk konfigurasi prioritas (CORS env, admin auth, config function).
3. Cek Docker daemon.
4. Jika Docker aktif, cek startup local serve untuk Edge Function.

Jika Docker belum aktif, script tetap sukses dengan status **skip runtime check** dan menampilkan instruksi lanjut.

## Subresource Integrity (SRI)

Script CDN di `index.html` memakai `integrity="sha384-..."`. Jika jsDelivr memperbarui file di tag versi mengambang (`@2`, `@5`), browser bisa menolak load — **pin versi** di URL atau perbarui hash:

```bash
curl -fsSL 'URL_CDN' | openssl dgst -sha384 -binary | openssl base64 -A
```

## Checkout

URL default checkout memakai **HTTPS** (`https://lynk.id/...`), bisa diubah di `js/config.js`.

## Opsional: bundler (Vite)

Saat ini tidak wajib. Untuk modularisasi lebih lanjut (banyak file + tree-shaking), Anda bisa memindahkan `js/app.js` ke proyek Vite/Rollup; `scripts/refactor.cjs` hanya dipakai sekali saat migrasi awal.

## Mengulangi ekstraksi (jarang perlu)

Jika Anda menyalin `index.html` monolit lama lagi dan ingin menjalankan pipeline yang sama:

```bash
node scripts/refactor.cjs
```

Pastikan isi `index.html` masih memuat pola lama yang skrip ini harapkan (lihat sumber `scripts/refactor.cjs`).
