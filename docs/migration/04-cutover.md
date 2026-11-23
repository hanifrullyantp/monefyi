# Panduan Cutover & Serah Terima Pemisahan Produk Froyek (Tahap 6)

Dokumen ini adalah prosedur operasional standar (SOP) pelaksanaan cutover rilis produksi Froyek (`froyek.com` dan `estimator.froyek.com`), rotasi kredensial keamanan, urutan deployment, rencana rollback (*contingency plan*), serta jadwal depresiasi kompatibilitas legacy.

---

## 1. Prasyarat Wajib Sebelum Deploy (Pre-Deployment Checklist)

> [!CAUTION]
> **ROTASI KREDENSIAL SUPABASE SEBELUM MERGE:**
> Kredensial fallback service role key dan anon key masa lalu yang pernah ter-commit pada riwayat git terdahulu **WAJIB DIROTASI** di dashboard Supabase sebelum merge ke branch `main` atau deployment publik. Jangan pernah menggunakan service role key lama di lingkungan produksi froyek.

### Checklist Kesiapan:
1. [ ] **Rotasi Secret di Supabase Dashboard:**
   - Masuk ke `https://supabase.com/dashboard/project/<PROJECT_ID>/settings/api`.
   - Lakukan **Rotate Service Role Key** dan **Rotate Anon Key**.
   - Simpan kunci baru secara aman di password manager atau vault rahasia tim.
2. [ ] **Update Environment Variables di CI/CD & Vercel:**
   - Update GitHub Secrets repo `hanifrullyantp/monefyi`:
     - `SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `MAYAR_API_KEY` & `MAYAR_WEBHOOK_SECRET`
     - `RESEND_API_KEY`
   - Pastikan tidak ada kredensial yang disalin ke teks atau repositori publik.
3. [ ] **Konfigurasi Supabase Auth Redirect URLs:**
   - Tambahkan URL froyek ke allowlist redirect authentication:
     - `https://froyek.com`
     - `https://froyek.com/auth/callback`
     - `https://froyek.com/app`
     - `https://estimator.froyek.com`
     - `https://*.vercel.app` (untuk branch previews)

---

## 2. Urutan Deployment (Deployment Sequence)

Proses deployment dirancang tanpa gangguan pada sistem produksi Monefyi yang sedang berjalan (*zero-downtime cutover*).

```
[DNS Registrar / Cloudflare]
       ├── froyek.com ----------> Vercel: apps/web (Root: apps/web)
       ├── estimator.froyek.com -> Vercel: apps/landing (Root: apps/landing)
       └── (Legacy 301 Rules) ---> Redirect ke froyek.com (Tetap loloskan /api/*)

[Vercel Projects]
       ├── Project 1: "froyek-web"     (Root Dir: apps/web, Framework: Vite)
       ├── Project 2: "froyek-landing" (Root Dir: apps/landing, Framework: Next.js)
       └── Project 3: "monefyi"        (Tetap utuh melayani monefyi.com)
```

### Langkah 1: Setup Proyek di Vercel
1. **Froyek Web Application (`apps/web`):**
   - **Framework Preset:** Vite
   - **Root Directory:** `apps/web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Production Domain:** `froyek.com`
2. **Froyek Landing & Estimator (`apps/landing`):**
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/landing`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Production Domain:** `estimator.froyek.com` (dan alias landing bila dibutuhkan)

### Langkah 2: Konfigurasi DNS
Arahkan DNS di registrar atau Cloudflare:
- **`froyek.com`**: CNAME atau A record ke Vercel (`cname.vercel-dns.com` / `76.76.21.21`).
- **`estimator.froyek.com`**: CNAME ke Vercel.
- **Legacy Domains (`planner.monefyi.com`, `estimator.monefyi.com`, `monefyi-planner.vercel.app`)**:
  - Tetap dipertahankan dengan konfigurasi redirect 301 di Next.js middleware / edge config.
  - Endpoint webhook payment (`/api/checkout/mayar/webhook` dan `/api/crm/*`) **TIDAK DI-REDIRECT** agar transaksi pihak ketiga lama tetap berhasil masuk.

### Langkah 3: Verifikasi Smoke Test Pasca Deploy
Jalankan verifikasi fungsionalitas langsung di produksi:
1. Akses `https://froyek.com` → pastikan logo froyek origami, tema warna `#0A3A2E`, dan favicon tampil sempurna.
2. Akses `https://estimator.froyek.com` → periksa kalkulasi estimasi proyek dan simulasi paket penawaran.
3. Login & Autentikasi Supabase → verifikasi sesi token berhasil dibuat dan disimpan.
4. Simulasi Pembayaran Mayar / Webhook → pastikan parser menangani baik prefix baru `froyek:` maupun legacy `monefyi:`.
5. Uji Akses Legacy URL `https://planner.monefyi.com` → pastikan diarahkan via HTTP 301 ke `https://froyek.com`.

---

## 3. Rencana Rollback (Contingency & Rollback Plan)

Jika ditemukan masalah kritis (misalnya kegagalan auth fatal pada domain baru atau anomali jaringan):

### Level 1: Rollback DNS (Paling Cepat — < 5 Menit)
- Kembalikan DNS record domain target atau alihkan trafik kembali ke endpoint preview yang stabil.
- Karena database Supabase tidak diubah skemanya (`planner_*` tetap utuh), tidak ada inkonsistensi data state yang terjadi.

### Level 2: Rollback Vercel Deployment
- Di dashboard Vercel pada project terkait, buka tab **Deployments**.
- Pilih deployment stabil sebelumnya dan klik **Instant Rollback**.

### Level 3: Rollback Git (Bila Diperlukan)
- Karena pekerjaan dilakukan di branch terisolasi `chore/froyek-split`, branch `main` produksi Monefyi sama sekali belum tersentuh.
- Jika branch sudah di-merge ke `main`, rollback dapat dilakukan via:
  ```bash
  git revert -m 1 <MERGE_COMMIT_HASH>
  git push origin main
  ```

---

## 4. Jadwal Depresiasi Lapisan Kompatibilitas (Deprecation Schedule)

Lapisan kompatibilitas ganda (*dual-read/write*) dirancang untuk melindungi pengguna aktif dari kehilangan sesi atau data lokal.

| Komponen Legacy | Mekanisme Saat Ini | Target Akhir Grace Period | Tindakan Akhir |
|---|---|---|---|
| **Storage Browser (`monefyi_*`)** | Membaca fallback key lama dan otomatis memigrasikan nilai ke `froyek_*` saat dibuka. | **180 Hari** pasca cutover | Hapus pengecekan fallback legacy di helper storage. |
| **Domain Redirect 301** | `planner.monefyi.com` & `estimator.monefyi.com` dialihkan ke `froyek.com`. | **365 Hari** pasca cutover | Nonaktifkan subdomain lama setelah seluruh backlink diperbarui. |
| **Prefix Deskripsi Mayar** | Parser menerima format `froyek:` dan `monefyi:`. | **Permanen** (Legacy Safe) | Tetap dipertahankan untuk menjamin riwayat audit transaksi lama tetap terbaca. |
| **Custom Event Bus** | Dual dispatch `froyek:entitlement-invalidate` & `monefyi:entitlement-invalidate`. | **90 Hari** pasca cutover | Hapus listener event legacy `monefyi:*`. |
| **PWA Cache (`monefyi-v*`)** | Service worker `sw.js` otomatis menghapus cache lama ber-prefix `monefyi-` saat event `activate`. | **Permanen** | Tetap aktif di `sw.js` untuk membersihkan cache browser pengguna lama. |

---

## 5. Ringkasan Status Rilis

- **Branch Rilis:** `chore/froyek-split`
- **Status PR:** PR #16 (`https://github.com/hanifrullyantp/monefyi/pull/16`)
- **Status Gate Build & Typecheck:** LULUS (0 eror pada `apps/web` dan `apps/landing`)
- **Status Suite Pengujian:** LULUS (75 test file web + 93 engine scenarios landing + 10 host/pricing tests)
- **Status Gate Rebrand:** LULUS (1,158 file dipindai, 0 pelanggaran unlisted)
- **Kondisi Produksi Monefyi:** Tidak tersentuh, beroperasi 100% normal.
