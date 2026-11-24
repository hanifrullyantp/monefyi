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

> **Catatan Asal Trigger Imutabilitas:** Trigger penolak mutasi jurnal `public.planner_reject_journal_mutation()` untuk `planner_journal_entries` dan `planner_journal_lines` berasal dari migrasi fase 3 (`my-supabase-project/supabase/migrations/20261104140000_planner_phase3_ledger.sql`), **bukan** dari migrasi F0. Pada rangkaian di bawah, migrasi **G0-4** (`20261124142000_g0_4_immutability_guard.sql`) memperkuatnya secara idempoten dengan `ERRCODE = '55000'`, menambahkan trigger pada `planner_journal_allocations`, dan memastikan tidak ada policy RLS `UPDATE`/`DELETE`/`ALL` pada ketiga tabel jurnal.

### Langkah 1 — Migrasi F0 (Kebenaran Akuntansi, Atomik RPC, & Soft-Delete)
File: `my-supabase-project/supabase/migrations/20261124100000_f0_accounting_correctness.sql`
- Menambahkan `status` & `deleted_at` untuk soft-delete `planner_project_incomes` & `planner_cost_realizations`.
- Mengecualikan baris `status IN ('dividend', 'cancelled')` dan `deleted_at IS NOT NULL` dari trigger `total_spent`.
- Membuat RPC atomik `planner_create_project_income_atomic` dan `planner_create_cost_realization_atomic`.
- Memperluas constraint `reference_type` & memperbarui `planner_post_journal` (imutabilitas jurnal tetap ditegakkan oleh trigger dari fase 3 dan diperkuat pada Langkah 5).

### Langkah 2 — Migrasi F1 (COA Baru & Dimensi `project_id`/`party_id`)
File: `my-supabase-project/supabase/migrations/20261124120000_f1_coa_and_dimensions.sql`
- Memperluas constraint `planner_finance_accounts.type` dengan sub-akun F1 (`pendapatan_proyek`, `uang_muka_klien`, `piutang_retensi`, `hpp_material..uncategorized`, `beban_opex`, `beban_penyusutan`, `akumulasi_penyusutan`, `dividen`).
- Menambahkan `project_id`, `party_id`, `needs_review` pada `planner_journal_lines` serta `source`, `model`, `prepare_token` pada `planner_journal_entries`.
- Memperbarui `seed_default_chart_of_accounts` & `planner_post_journal`.
- **Penting:** Jangan jalankan `planner_migrate_f1_ledger` sebelum Langkah 3 (G0-1) terpasang.

### Langkah 3 — Migrasi G0-1 (Rekonsiliasi Migrasi F1 Nyata & Append-Only)
File: `my-supabase-project/supabase/migrations/20261124140000_g0_1_real_f1_migration.sql`
- Menambahkan `'f1_migration'` pada `planner_journal_entries_reference_type_check`.
- Mengganti `planner_migrate_f1_ledger(p_org_id, p_dry_run)` agar sepenuhnya **append-only** (tanpa `UPDATE planner_journal_lines`), menghitung ulang saldo `after` secara nyata, melakukan rollback subtransaksi pada `p_dry_run = true`, dan melempar `migrasi_f1_tidak_cocok` bila tidak cocok.

### Langkah 4 — Migrasi G0-3 (Taksonomi 4 Kategori Akun & Saldo Normal)
File: `my-supabase-project/supabase/migrations/20261124141000_g0_3_account_taxonomy.sql`
- Memperluas `planner_finance_accounts.category` menjadi `('aktiva', 'pasiva', 'pendapatan', 'beban')`.
- Memperbarui kategori akun `pendapatan_proyek` $\rightarrow$ `'pendapatan'` dan `hpp_*`/`beban_*` $\rightarrow$ `'beban'`.
- Memperbarui `seed_default_chart_of_accounts` serta trigger `planner_apply_line_balance()` agar akun `'aktiva'` & `'beban'` bersaldo normal debit (`debit - credit`) dan `'pasiva'` & `'pendapatan'` bersaldo normal kredit (`credit - debit`).

### Langkah 5 — Migrasi G0-4 (Jaminan Trigger Imutabilitas Jurnal & RLS Append-Only)
File: `my-supabase-project/supabase/migrations/20261124142000_g0_4_immutability_guard.sql`
- Memperbarui secara idempoten fungsi `public.planner_reject_journal_mutation()` agar melempar `RAISE EXCEPTION 'jurnal_tidak_boleh_diubah' USING ERRCODE = '55000'`.
- Memasang ulang trigger `BEFORE UPDATE OR DELETE` pada ketiga tabel buku besar: `planner_journal_entries` (`planner_journal_entries_no_mutation`), `planner_journal_lines` (`planner_journal_lines_no_mutation`), dan `planner_journal_allocations` (`planner_journal_allocations_no_mutation`).
- Memastikan RLS aktif dan menghapus seluruh policy mutasi (`UPDATE`, `DELETE`, `ALL`) yang mungkin tersisa pada ketiga tabel jurnal.

---

## Verifikasi Dry-Run, Rekonsiliasi Sebelum/Sesudah, & Smoke Check
1. Setelah Langkah 1–5 terpasang pada staging atau jendela pemeliharaan produksi, jalankan mode **dry-run** lebih dahulu untuk setiap `org_id`:
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

