# Laporan Pembersihan Repo Monefyi / Froyek

**Tanggal:** 2026-11-28  
**Branch:** `chore/repo-cleanup-H`  
**Konteks:** Pembersihan artefak build, file biner, dan audit rahasia pasca-commit `de649d43` (tanpa mengubah kode fitur dan tanpa menulis ulang riwayat git).

---

## 1. Inventaris File Terlacak (Build, Biner, > 1 MB)

Dari `git ls-files` (total **4.792** file terlacak sebelum pembersihan), ditemukan **330** file yang termasuk kategori hasil build (`dist/`, `build/`, `.build/`), file biner, atau berukuran > 1 MB. File berukuran > 1 MB dan artefak build utama:

| Ukuran (bytes) | Kategori | Path |
|---:|---|---|
| 56.624.433 | `>1MB, BIN` | `data/sources/se-47-2026/se-47-2026-10904.pdf` |
| 40.188.115 | `>1MB, BIN` | `data/sources/se-47-2026/se-47-2026-10901.pdf` |
| 21.577.263 | `>1MB, BIN` | `data/sources/se-47-2026/se-47-2026-10903.pdf` |
| 9.461.364 | `BUILD, >1MB` | `apps/web/dist/index.html` |
| 9.323.008 | `>1MB` | `android/app/src/main/assets/public/index.html` |
| 6.288.310 | `>1MB` | `data/staging/se-47-2026/extract-10903.json` |
| 5.246.337 | `>1MB, BIN` | `data/sources/se-47-2026/se-47-2026-10894.pdf` |
| 3.752.154 | `>1MB, BIN` | `data/sources/se-47-2026/se-47-2026-10897.pdf` |
| 3.172.753 | `>1MB` | `data/staging/se-47-2026/extract-10901.json` |
| 2.762.064 | `>1MB` | `data/staging/se-47-2026/extract-10904.json` |
| 2.601.901 | `>1MB` | `data/staging/se-47-2026/analisis-lampiran-vi.json` |
| 1.557.341 | `BUILD, >1MB` | `modul-estimator-rab-rumah (7)/dist/index.html` |
| 1.552.840 | `BUILD, >1MB` | `dist/index.html` |
| 1.501.664 | `>1MB, BIN` | `data/sources/se-47-2026/se-47-2026-10899.pdf` |
| 1.305.832 | `>1MB, BIN` | `data/sources/se-47-2026/se-47-2026-10906.pdf` |
| 1.301.325 | `>1MB, BIN` | `remotion/public/audio.mp3` |
| 1.272.847 | `BUILD, >1MB` | `monefyi-marketing-landing-page/dist/index.html` |
| 1.106.568 | `BUILD, >1MB, BIN` | `MacFyi/.build/release/MacFyi` |
| 1.088.826 | `>1MB, BIN` | `remotion/public/audio-60s.mp3` |
| 1.077.124 | `>1MB, BIN` | `remotion/public/audio-customer-hilang.mp3` |
| 1.051.423 | `>1MB, BIN` | `data/sources/se-47-2026/se-47-2026-10892.pdf` |

Catatan: tidak ada file `*.apk` atau `*.aab` yang terlacak di `HEAD`.

---

## 2. Pemeriksaan Dampak Penghapusan `dist/` (CI, Capacitor, Vercel)

- **Capacitor:**
  - `capacitor.config.json` (root): `"webDir": "apps/web/dist"`
  - `apps/web/capacitor.config.ts`: `webDir: 'dist'`
- **GitHub Actions (`.github/workflows/android-apk-build.yml`):**
  - Menjalankan `npm ci`, `npm run typecheck`, dan `npm run build` di `apps/web` **sebelum** `npx cap sync` dan `./gradlew assembleDebug`.
- **Vercel (`vercel.json` & `apps/web/vercel.json`):**
  - Menggunakan `"buildCommand": "npm run build"` dan `"outputDirectory": "dist"`.

**Kesimpulan:** Build web dijalankan terlebih dahulu di CI dan Vercel sebelum `dist/` dibutuhkan, sehingga mengeluarkan `apps/web/dist/` dan `dist/` dari git tidak merusak pipeline build maupun deploy.

---

## 3. File yang Dikeluarkan dari Git & Perubahan `.gitignore`

### Perubahan `.gitignore`
Menambahkan pola berikut di `.gitignore`:
- `!.env.example` dan `!**/.env.example` (mengecualikan template `.env.example` dari aturan `.env*`)
- `dist/`
- `MacFyi/.build/`
- `*.apk`
- `*.aab`

### File yang Dikeluarkan dari Indeks Git (`git rm -r --cached`, file di disk tetap ada)
Total **41 file** artefak build dan biner dikeluarkan dari tracking git:
- `MacFyi/.build/release/MacFyi` (1 file biner Swift release)
- `apps/web/dist/` (25 file hasil build Vite/PWA)
- `dist/` (13 file hasil build root)
- `modul-estimator-rab-rumah (7)/dist/index.html` (1 file)
- `monefyi-marketing-landing-page/dist/index.html` (1 file)

---

## 4. Hasil Pemindaian Rahasia (Tanpa Nilai)

Pemindaian dilakukan terhadap file terlacak (`git ls-files`) dan riwayat git (`git log --all`). Tool `gitleaks` dan `trufflehog` tidak terpasang di lingkungan ini, sehingga pemindaian dilakukan dengan pencocokan nama file sensitif dan pencarian pola (`JWT eyJ...`, `sk-...`, `service_role`, `VERCEL_OIDC_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`).

### A. File Sensitif di `HEAD` (`git ls-files`)
- `android/app/google-services.json` (**TERLACAK** di `HEAD`; berisi konfigurasi Firebase `project_info` dan `client[0].api_key`).
- `apps/web/.env.example`, `my-supabase-project/.env.example`, `my-supabase-project/secrets.local.env.example` (hanya template contoh).

### B. File Sensitif yang Pernah Terlacak di Riwayat Git
1. `monefyi_planner/.env.local` — pertama kali masuk git pada `2026-05-31 21:53:17 +0700` (commit `32df7451acb4340f02a02301753c8e7824bb39b1`), terakhir disentuh `2026-08-31 09:22:25 +0700` (`830f717532a206f4fab3f06b00d68932be2b9284`). Sudah tidak ada di `HEAD`.
2. `apps/web/.env.local` — pertama kali masuk git pada `2026-11-23 11:31:04 +0700` (commit `228818b0372614ae6a978e2a4f6f1be7e02dfd55`), dihapus dari indeks pada `2026-11-24 09:09:50 +0700` (commit `0365a9a192719897d7c77ffa715e7add8e682499`). Sudah tidak ada di `HEAD`.
3. `android/app/google-services.json` — pertama kali masuk git pada `2026-11-26 09:39:44 +0700` (commit `265941a525aebc643e719bfccbe45fd8349c03d9`). Masih terlacak di `HEAD`.

### C. Hasil Pencarian Pola di `HEAD` (Jumlah Temuan)
- **JWT (`eyJ...`)**: 23 temuan di 22 file. Seluruh token JWT aktual yang terdeteksi di `app/js/config.js`, `app/public/js/config.js`, `landing page/*.html`, `monefyi-marketing-landing-page/src/lib/monefyi-config.ts`, `activate.html`, `scripts/refactor.cjs`, dan output Next.js mini-app adalah token Supabase `role=anon` (kunci publik klien). 2 temuan di `apps/web/src/lib/financeV2/__tests__/g7FeedbackObservability.test.ts` adalah fixture unit test.
- **`sk-...`**: 12 temuan di 3 file. 1 temuan di `apps/landing/src/components/admin/marketing/MarketingConfigModal.tsx` (placeholder UI), 2 temuan di `g7FeedbackObservability.test.ts` dan 9 temuan di `aiProviderService.test.ts` (fixture uji redaksi/masking).
- **`service_role`**: 43 temuan di 25 file (referensi teks di migrasi SQL, dokumentasi, dan komentar kode; bukan token aktual).
- **`VERCEL_OIDC_TOKEN`**: 4 temuan di 4 file dokumentasi (`FIX_PLAN.md`, `OPEN-DECISIONS.md`, `PLAN_AGENT_100.md`, `docs/finance/PROGRESS.md`; hanya nama variabel).
- **`SUPABASE_SERVICE_ROLE_KEY`**: 123 temuan di 84 file (referensi `process.env` / `Deno.env.get`, workflow CI, dokumentasi, dan skrip; bukan nilai kunci).

---

## 5. Daftar Rotasi Rahasia

| Nama Variabel / Kunci | File Sumber | Tanggal Commit Pertama | Layanan | Status |
|---|---|---|---|---|
| `VERCEL_OIDC_TOKEN` | `monefyi_planner/.env.local` | `2026-05-31 21:53:17 +0700` | Vercel | **perlu rotasi oleh pemilik** |
| `VERCEL_OIDC_TOKEN` | `apps/web/.env.local` | `2026-11-23 11:31:04 +0700` | Vercel | **perlu rotasi oleh pemilik** |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `monefyi_planner/.env.local`, `apps/web/.env.local` | `2026-05-31 21:53:17 +0700` | Supabase | Evaluasi / rotasi jika diperlukan (kunci `anon` bersifat publik klien) |
| `api_key` (Firebase Android) | `android/app/google-services.json` | `2026-11-26 09:39:44 +0700` | Firebase | **perlu rotasi oleh pemilik** (batasi di Google Cloud Console / putuskan apakah `google-services.json` dikeluarkan dari git) |
| Gemini, Telegram, Mayar, Meta, `SUPABASE_SERVICE_ROLE_KEY` | — | — | Gemini, Telegram, Mayar, Meta, Supabase (`service_role`) | Tidak ditemukan nilai rahasia terlacak di git/riwayat `.env*`; tetap disarankan audit berkala di dashboard masing-masing |

---

## 6. Hasil Verifikasi Build, Typecheck, dan Tes

### `apps/web`
1. `npm ci` (default): **Selesai** (`added 346 packages`), namun melewatkan `devDependencies` (`@tailwindcss/vite`, `typescript`, `vitest`) sehingga `npm run build`, `npx tsc --noEmit`, dan `npm run test` gagal menemukan binary/paket dev.
2. `npm ci --include=dev`: **Berhasil** (`added 346 packages`).
3. `npm run build` (`vite build`): **Lulus** — 3.472 modul ditransformasi, menghasilkan `dist/index.html` (9.461,36 kB) dalam 2m 46s.
4. `npx tsc --noEmit`: **Lulus** (exit code 0).
5. `npm run test` (`vitest run`): **112/113 file lulus, 1 file gagal** (**805/806 tes lulus, 1 tes gagal**):
   - **Gagal:** `src/lib/financeV2/__tests__/g10ChannelsAndProactiveSim.test.ts`  
     `Error: ENOENT: no such file or directory, open '.../apps/web/src/lib/financeV2/__tests__/@domain/channelGateway.ts'` (baris 860).

### `apps/landing`
1. `npx tsc --noEmit`: **Lulus** (exit code 0).
2. `npm run test:froyek`: **Lulus** (10/10 tes lulus).

---

## 7. Usulan Pembersihan Riwayat Git (BELUM DIJALANKAN)

Karena `monefyi_planner/.env.local` dan `apps/web/.env.local` (yang memuat `VERCEL_OIDC_TOKEN`) pernah tercatat di riwayat commit git, menghapusnya dari `HEAD` saja tidak menghapusnya dari objek git lama. **Sesuai aturan keras, penulisan ulang riwayat tidak dijalankan otomatis.**

Jika pemilik menyetujui secara tertulis setelah merotasi token:
1. Lakukan backup mirror repo terlebih dahulu (`git clone --mirror`).
2. Jalankan `git filter-repo` untuk menghapus path tersebut dari seluruh riwayat:
   ```bash
   git filter-repo --invert-paths \
     --path monefyi_planner/.env.local \
     --path apps/web/.env.local
   ```
   (Tambahkan `--path android/app/google-services.json` jika pemilik memutuskan untuk mengeluarkannya juga.)
3. Lakukan `git push --force --all` dan `git push --force --tags` setelah seluruh kontributor diinformasikan untuk re-clone.
