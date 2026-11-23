# Laporan Verifikasi Pemisahan Produk Froyek (Tahap 5)

Dokumen ini mencatat seluruh hasil verifikasi kualitas kode, kompilasi, pengujian unit, skenario engine, gerbang evaluasi, dan gerbang rebrand pada branch `chore/froyek-split`.

---

## 1. Ringkasan Eksekutif

| Area Verifikasi | Target | Hasil | Status |
|---|---|---|---|
| **Kompilasi Web (`apps/web`)** | `tsc --noEmit` | 0 error | **LULUS** |
| **Unit Tests Web (`apps/web`)** | `vitest run` | 75/75 file passed (537 tests) | **LULUS** |
| **Production Build Web (`apps/web`)** | `vite build` | `dist/index.html` (9,239.91 kB) | **LULUS** |
| **Kompilasi Landing (`apps/landing`)** | `tsc --noEmit` | 0 error | **LULUS** |
| **Engine Tests Landing (`apps/landing`)** | `test:all-engine` | 93 skenario passed (0 failed) | **LULUS** |
| **Eval Gate Landing (`apps/landing`)** | `evalHarness.ts` | 8/8 skenario passed (normalRate: 100%, critical: 0) | **LULUS** |
| **Pricing & Host Tests (`apps/landing`)** | `test:froyek` | 10/10 passed | **LULUS** |
| **Gerbang Rebrand (`gate:rebrand`)** | `scripts/rebrand-gate-check.mjs` | 1,158 file dipindai, 0 pelanggaran | **LULUS** |
| **Pembersihan Kredensial Tertanam** | Audit seluruh repo | 0 fallback service role key di kode / workflows | **LULUS** |

---

## 2. Detail Pengujian `apps/web`

### 2.1 Typecheck (`tsc --noEmit`)
- Command: `npm --prefix apps/web run typecheck`
- Hasil: 0 eror. Seluruh path alias (`@domain`, `@agent-core`, `@/*`) teresolusi dengan tepat dari folder `apps/web/`.

### 2.2 Pengujian Unit Vitest (`vitest run`)
- 75 file suite pengujian dijalankan.
- 537 pengujian lolos tanpa kegagalan:
  - `src/lib/domainMoney.test.ts` (21 tests) — Lulus
  - `src/lib/domainPhase2.test.ts` (6 tests) — Lulus
  - `src/lib/plannerMayarDescription.test.ts` (2 tests: format baru `froyek:` dan format legacy `monefyi:`) — Lulus
  - `src/lib/channel.test.ts` (13 tests) — Lulus
  - `src/lib/flowEngine.test.ts` (103 tests) — Lulus
  - `src/lib/pdf/contractPdf.test.ts` (8 tests) — Lulus
  - `src/services/telegramService.test.ts` (2 tests) — Lulus
  - `src/services/aiProviderService.test.ts` (22 tests) — Lulus
  - Dan seluruh suite pengujian lainnya.

### 2.3 Single-File Production Build (`vite build`)
- Command: `npm --prefix apps/web run build`
- Output: `dist/index.html` ukuran 9,239.91 kB (gzip: 2,980.92 kB).
- Bundle singlefile terkompilasi mandiri untuk deploy SPA Vercel.

---

## 3. Detail Pengujian `apps/landing`

### 3.1 Typecheck (`tsc --noEmit`)
- Command: `npm --prefix apps/landing run typecheck`
- Hasil: 0 eror.

### 3.2 Skenario Winning Engine & Sub-Engine (`test:all-engine`)
Menjalankan seluruh rangkaian skenario otomasi iklan dan evaluasi:
1. `winningEngine.scenarios.ts`: 33 lulus, 0 gagal.
2. `expert.scenarios.ts`: 16 lulus, 0 gagal.
3. `supervisor.scenarios.ts`: 12 lulus, 0 gagal.
4. `creativeAnalyzer.scenarios.ts`: 19 lulus, 0 gagal.
5. `creativeCritic.scenarios.ts`: 6 lulus, 0 gagal.
6. `phase3_4.scenarios.ts`: 7 lulus, 0 gagal.
7. `evalHarness.ts`: 8 skenario (normalRate=100%, critical=0) — **LULUS GERBANG EVALUASI**.

### 3.3 Pricing & Public Host Rules (`test:froyek`)
- Command: `npm --prefix apps/landing run test:froyek`
- 10/10 test lulus:
  - Canonical host `froyek.com` dan `estimator.froyek.com`.
  - Redirect 301 legacy hosts (`planner.monefyi.com`, `estimator.monefyi.com`, `monefyi-planner.vercel.app`) dengan preservasi rute webhook `/api/*`.
  - Schema default landing content froyek.
  - Rekomendasi paket dan kalkulasi promo froyek.

---

## 4. Gerbang Rebrand (`gate:rebrand`)

Script otomatis `scripts/rebrand-gate-check.mjs` dijalankan dengan konfigurasi `config/rebrand-allowlist.txt`.
- Target: Seluruh file sumber dan manifes di `apps/web/src`, `apps/landing/src`, `apps/web/public`, `apps/landing/public`.
- Total file dipindai: **1,158 file**.
- Total temuan identifier legacy yang diizinkan (allowlisted): **1,330 kemunculan**.
- Total pelanggaran tak terdaftar: **0 pelanggaran**.
- Kesimpulan: Tidak ada teks merek lama yang bocor di luar lapisan kompatibilitas yang disetujui.

---

## 5. Pembersihan Kredensial Tertanam

Dilakukan pemindaian terhadap seluruh secret dan fallback service role key:
1. `apps/landing/src/lib/engine/engineDb.ts`: Fallback hardcoded service role key dihapus; sekarang melempar error konfigurasi jika env var belum diset.
2. `apps/landing/src/app/api/crm/customer/route.ts`: Fallback hardcoded key dihapus.
3. `apps/landing/src/app/api/crm/provision/route.ts`: Fallback hardcoded key dihapus.
4. `.github/workflows/planner-spa-deploy.yml`: Anon key dan Supabase URL diganti menggunakan `${{ secrets.* }}`.
5. `.github/workflows/planner-lp2-deploy.yml`: Service role key, anon key, dan Supabase URL diganti menggunakan `${{ secrets.* }}`.
6. `.github/workflows/estimator-lp-deploy.yml`: Service role key, anon key, dan Supabase URL diganti menggunakan `${{ secrets.* }}`.
7. Verifikasi grep: Nilai service role key tidak lagi ditemukan pada direktori mana pun di luar git commit history masa lalu (kredensial lama wajib dirotasi di dashboard Supabase sebelum rilis).

