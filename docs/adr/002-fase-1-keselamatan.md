# ADR 002 — Fase 1: keselamatan parser, peran, dan angka turunan

- Status: diterapkan di kode, belum di-deploy
- Tanggal: 2026-11-04
- Bergantung pada: ADR 001

## Keputusan

### Rupiah

Satu fungsi `parseRupiah` di `packages/domain/src/money.ts`. Titik berkelompok tiga adalah pemisah ribuan (`1.500.000` = 1.500.000). Koma satu atau dua digit adalah desimal hanya jika ada pengali (`1,5 juta` = 1.500.000). Akhiran `k` / `rb` / `ribu` dan `jt` / `juta` hanya menempel pada token angka. Huruf `k` di dalam kata (`sak`, `tukang`, `kaleng`) bukan pengali. Angka yang diikuti satuan diabaikan saat mencari nominal di kalimat. Hasil ambigu (`1.5`, `1,500`) membawa `needsReview`.

Klien React mengimpor fungsi itu. Klien vanilla memuat salinan IIFE `planner/js/money.js` (dan `planner/public/js/money.js`) sebagai `window.PlannerMoney`, karena Vite vanilla tidak mengompilasi TypeScript domain.

### Konfirmasi sebelum tulis

Perintah yang mengubah uang atau progres (`record_cost`, `update_progress`, `add_worker_log`) pada klien vanilla tidak menulis database sampai tombol konfirmasi. Tolak mengosongkan perintah tertunda dan tidak menyisipkan baris. Klien React sudah menahan `executeIntent` di tahap konfirmasi; perilaku itu tidak diubah.

### Peran

Tangga yang hidup tetap `worker` < `manager` < `owner`. Peran `viewer` / `member` / `admin` organisasi tidak dihidupkan kembali. `is_org_member(org_id, min_role)` memakai `planner_role_rank`. Self-insert tetap di-drop.

Penyimpangan sadar dari larangan "worker tidak boleh menulis tabel anak":

- Worker boleh mencatat biaya dan log harian, serta mengubah progres pekerjaan, pada proyek yang boleh ia baca. Itu pekerjaan mandor di lapangan.
- Worker tidak boleh menulis RAP, menambah atau menghapus pekerjaan, atau menulis jurnal dan tabel keuangan.
- Manager boleh menambah dan mengubah anggota hanya dengan peran `worker`, dan tidak boleh menyisipkan dirinya. Owner yang mengatur peran lain.

### Angka turunan proyek

`total_spent`, `total_received`, dan `progress_pct` proyek diisi trigger `BEFORE INSERT OR UPDATE`, `SECURITY DEFINER`, supaya worker yang mencatat biaya tetap menggeser total meski ia tidak boleh mengubah baris proyek. `total_budget` dihitung ulang dari RAP hanya jika ada baris RAP. Jika belum ada RAP, angka yang diketik pengguna dipertahankan. Proyek lama tanpa item pekerjaan tidak direset ke nol saat update: `progress_pct` lama dibiarkan. Kolom tidak di-drop. Klien berhenti menulis ketiga angka turunan itu dan membaca ulang nilainya. `progress_pct` pada item pekerjaan tetap data sumber. Saldo akun keuangan ditunda ke fase 3.

### Tanggal

`orgToday` memakai zona organisasi, bawaan `Asia/Jakarta`. Antara 00:00 dan 07:00 WIB, tanggal UTC kemarin tidak dipakai.

### Kredensial dan edge function

Tidak ada kata sandi di klien, README Planner, atau HTML. Akun `planner-bypass@monefyi.app` diacak oleh migrasi baru. Akun pribadi tidak diubah migrasi ini; kata sandi lamanya tetap ada di riwayat git dan harus dirotasi di Dashboard. Admin platform hanya `profiles.role = 'admin'`.

`planner-parse-command` dan `planner-analyze` memakai JWT pengguna untuk data. Service role hanya setelah keanggotaan terbukti, untuk kuota. Salinan function di `planner/supabase/functions/` mengembalikan HTTP 410 agar deploy yang salah gagal tertutup. Kuota analisis: 30 per hari.

## Risiko yang diterima

- Migrasi `20260524120000_planner_seed_auth_email_users.sql` yang sudah terpasang diubah isinya. `db push` bisa menolak karena checksum. Jangan `migration repair --status reverted`: itu akan menjalankan seed lagi. Perbaikan checksum, jika perlu, dilakukan tanpa mengulang migrasi.
- Anon key publik tetap di `planner/js/config.js` karena skrip klasik tidak punya injeksi env.
- Kebijakan RLS belum diuji terhadap Postgres sungguhan di mesin ini. Yang diuji otomatis adalah parser, gerbang input, dan absennya kata sandi di file yang disebut di tes.
- Trigger turunan belum dijalankan di database lokal.
