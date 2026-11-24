# DEPLOY-RUNBOOK — Migrasi & Aktivasi Produksi Keuangan Froyek

**Lingkungan Target:** Supabase Remote (`https://zzwqfmdyncxbolestkqp.supabase.co`)  
**Status Saat Ini:** `BLOCKED remote` (sesuai aturan keras, tidak ada push otomatis ke produksi selama pengembangan).

---

## Prasyarat Wajib Sebelum Eksekusi
1. **Rotasi Token Keamanan (`F0-T8`):** Rotate seluruh token & secret yang pernah tersimpan di `apps/web/.env.local` (Supabase anon/service role, token Vercel, kunci AI) sebelum merilis ke produksi.
2. **Backup Database:** Ambil snapshot/pg_dump penuh database Supabase produksi sebelum menjalankan migrasi SQL apa pun.
3. **Konfirmasi `OPEN-QUESTIONS.md`:** Pastikan pemilik telah menyetujui atau menyesuaikan nilai default (`ambang_kapitalisasi_rupiah = Rp 5.000.000`, mode dividen, cadangan opex default `1× plan`, pensiun jalur tulis V1).

---

## Urutan Eksekusi Migrasi SQL (Harus Berurutan)

### Langkah 1 — Migrasi F0 (Kebenaran Akuntansi, Atomik RPC, Soft-Delete, & Trigger)
File: `my-supabase-project/supabase/migrations/20261124100000_f0_accounting_correctness.sql`
- Menambahkan `status` & `deleted_at` untuk soft-delete `planner_project_incomes` & `planner_cost_realizations`.
- Mengecualikan baris `status IN ('dividend', 'cancelled')` dan `deleted_at IS NOT NULL` dari trigger `total_spent`.
- Membuat RPC atomik `planner_create_project_income_atomic` dan `planner_create_cost_realization_atomic`.
- Mengaktifkan trigger imutabilitas jurnal (menolak `UPDATE`/`DELETE` langsung pada `planner_journal_entries` & `planner_journal_lines`).

### Langkah 2 — Migrasi F1 (COA Baru, Dimensi `project_id`/`party_id`, & Migrasi Dry-Run)
File: `my-supabase-project/supabase/migrations/20261124120000_f1_coa_and_dimensions.sql`
- Memperluas constraint `planner_finance_accounts.type` dengan sub-akun F1 (`pendapatan_proyek`, `uang_muka_klien`, `piutang_retensi`, `hpp_material..uncategorized`, `beban_opex`, `beban_penyusutan`, `akumulasi_penyusutan`, `dividen`).
- Menambahkan `project_id`, `party_id`, `needs_review` pada `planner_journal_lines` serta `source`, `model`, `prepare_token` pada `planner_journal_entries`.
- Memperbarui `seed_default_chart_of_accounts` & `planner_post_journal`.

---

## Verifikasi Dry-Run, Rekonsiliasi Sebelum/Sesudah, & Smoke Check
1. Setelah Step 1 & Step 2 terpasang pada staging atau jendela pemeliharaan produksi, jalankan mode **dry-run** lebih dahulu untuk setiap `org_id`:
   ```sql
   SELECT public.planner_migrate_f1_ledger('<ORG_UUID>'::uuid, true);
   ```
2. Periksa hasil JSON dry-run: pastikan `before` vs `after` (`kas`, `piutang`, `hutang`, `netProfit`) cocok 100%, serta catat jumlah item `uncategorized` yang bertanda `needs_review = true`.
3. Jika cocok 100%, jalankan migrasi aktual (`p_dry_run = false`):
   ```sql
   SELECT public.planner_migrate_f1_ledger('<ORG_UUID>'::uuid, false);
   ```
4. Verifikasi ulang di UI `/app/finance-v2` (3 kartu ringkasan) & `/app/finance-v2/laporan` (tab Laba Rugi V1-layout, Neraca berstatus **Seimbang**, Arus Kas).

---

## Prosedur Rollback Darurat
- **Rollback Kode Aplikasi:** `git revert` commit merge PR bermasalah dan re-deploy aplikasi web.
- **Rollback Skema DB:** Kembalikan snapshot database pra-migrasi yang diambil pada tahap Prasyarat (jurnal tidak boleh dihapus/diedit manual; gunakan backup penuh jika perlu membatalkan migrasi skema).

