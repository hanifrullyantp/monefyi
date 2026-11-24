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

### Langkah 6 — Migrasi G0-2 (Migrasi RPC Atomik & Backfill ke Akun F1)
File: `my-supabase-project/supabase/migrations/20261124143000_g0_2_rpc_f1_accounts.sql`
- Menambahkan helper `IMMUTABLE` `public.planner_hpp_account_type_for_rap(p_rap_type text)` yang memetakan identik dengan `hppRoleForRapType` di `packages/domain/src/journal.ts`.
- Memperluas constraint status `planner_project_incomes` (`invoiced`, `accrued`) & `planner_cost_realizations` (`accrued`, `unpaid`).
- Mengganti `planner_create_project_income_atomic` (menambah `p_party_id uuid DEFAULT NULL`, membuang overload 10-argumen lama) untuk memposting ke akun F1 (`uang_muka_klien`, `piutang_retensi`, `piutang`, `pendapatan_proyek`, `kas`) tanpa menyentuh `laba`.
- Mengganti `planner_create_cost_realization_atomic` (menambah `p_party_id uuid DEFAULT NULL`, membuang overload 11-argumen lama) untuk memposting `Dr hpp_<type>` (dengan `needs_review = (v_hpp_type = 'hpp_uncategorized')`) dan `Cr hutang_dagang` (akrual) atau `Cr kas` (tunai/transfer).
- Memperbarui `planner_backfill_cost_journals()` agar memakai `planner_hpp_account_type_for_rap` serta mengisi `project_id` dan `needs_review` pada `planner_journal_lines`.

### Langkah 7 — Migrasi G0-5 (Pengakuan Pendapatan DP Berbasis Progres / Termin Terjadwal)
File: `my-supabase-project/supabase/migrations/20261124144000_g0_5_revenue_recognition.sql`
- Menambahkan kolom `revenue_recognition_method` (`'termin'` default konservatif atau `'progress_pct'`) pada `planner_projects`.
- Memperluas constraint `planner_journal_entries_reference_type_check` dengan `'revenue_recognition'`.
- Membuat tabel `planner_revenue_recognition_schedules` (`UNIQUE(project_id, period_month)`) beserta policy RLS `is_org_member`.
- Menambahkan RPC idempoten `public.planner_recognize_project_dp_revenue(p_org_id, p_project_id, p_period_month, p_amount, p_progress_pct, p_actor)` untuk memposting `Dr uang_muka_klien / Cr pendapatan_proyek` secara append-only per `(project_id, period_month)`.

### Langkah 8 — Migrasi G0-6 (Identitas Pihak via `party_id` & Pinjaman Antar Proyek via Jurnal Double-Entry)
File: `my-supabase-project/supabase/migrations/20261124145000_g0_6_party_id_and_interproject_loans.sql`
- Memperluas constraint `planner_journal_entries_reference_type_check` dengan `'interproject_loan'` dan `'interproject_loan_repayment'`.
- Menambahkan kolom & indeks `party_id uuid REFERENCES planner_parties(id) ON DELETE SET NULL` secara idempoten pada `planner_payables`, `planner_receivables`, `planner_project_incomes`, dan `planner_cost_realizations`.
- Membuat RPC append-only `public.planner_post_interproject_loan(p_org_id, p_from_project_id, p_to_project_id, p_amount, p_entry_date, p_description, p_is_repayment, p_actor)` yang memvalidasi `p_from_project_id <> p_to_project_id`, `p_amount > 0`, memastikan dompet kas kedua proyek, dan memposting jurnal 4-baris seimbang melalui `public.planner_post_journal`.

### Langkah 9 — Migrasi G1-1 (Lampiran Bukti Nota/Struk/Invoice Terikat ke Jurnal)
File: `my-supabase-project/supabase/migrations/20261124150000_g1_1_journal_attachments.sql`
- Membuat tabel `planner_journal_attachments` dengan FK `journal_entry_id uuid REFERENCES planner_journal_entries(id) ON DELETE RESTRICT` (nullable saat draf, diikat saat `commit_entry`), `sha256_hash`, `ocr_raw_text`, `extracted_json`, dan `confidence_score numeric(4,3)`.
- Menambahkan indeks pada `(org_id, sha256_hash)` untuk deteksi duplikat dan `(journal_entry_id)` untuk lookup bukti per jurnal.
- Mengaktifkan RLS (`is_org_member(org_id, 'worker')` untuk `SELECT`, `is_org_member(org_id, 'manager')` untuk `INSERT`/`UPDATE` pengikatan `journal_entry_id` dari `NULL -> UUID` saja) serta trigger `planner_guard_journal_attachment_binding()` agar bukti yang sudah terikat jurnal tidak dapat dihapus maupun dimodifikasi.

### Langkah 10 — Migrasi G1-2 (Impor Mutasi Bank, Pencocokan Otomatis, & Rekonsiliasi Kas)
File: `my-supabase-project/supabase/migrations/20261124151000_g1_2_bank_reconciliation.sql`
- Membuat tabel `planner_bank_statement_rows` (`org_id`, `wallet_account_id`, `bank_format`, `entry_date`, `description`, `direction`, `amount_rupiah`, `running_balance`, `row_hash`, `match_status`, `matched_journal_id REFERENCES planner_journal_entries(id) ON DELETE RESTRICT`) dengan constraint deduplikasi `UNIQUE(org_id, wallet_account_id, row_hash)` serta indeks dompet/tanggal, status pencocokan, dan jurnal.
- Membuat tabel `planner_bank_reconciliations` (`org_id`, `wallet_account_id`, `period_month`, `book_balance_rupiah`, `bank_balance_rupiah`, `explained_diff_rupiah`, `unexplained_diff_rupiah`, `status` `'reconciled' | 'needs_review'`, `summary_json`) sebagai snapshot rekonsiliasi append-only.
- Mengaktifkan RLS berbasis `is_org_member` pada kedua tabel (`worker` untuk `SELECT`, `manager` untuk `INSERT`/`UPDATE` peninjauan baris mutasi dengan larangan hapus baris terikat jurnal) tanpa memutasi tabel jurnal.

### Langkah 11 — Migrasi G2-2 (Pengingat Proaktif Multitenant, Draf Penagihan, & Jejak Audit)
File: `my-supabase-project/supabase/migrations/20261124160000_g2_proactive_reminders_audit.sql`
- Membuat tabel append-only `planner_proactive_audit_logs` (`org_id`, `actor_id`, `actor_type`, `action`, `target_table`, `target_id`, `payload_json`, `created_at`) beserta trigger `planner_reject_proactive_audit_mutation()` (`ERRCODE = '55000'`) penolak `UPDATE`/`DELETE`.
- Membuat tabel `planner_finance_reminders` (`org_id`, `reminder_type`, `dedupe_key`, `severity`, `entity_id`, `title`, `detail_json`, `status`) dengan constraint deduplikasi idempoten `UNIQUE(org_id, dedupe_key)`.
- Membuat tabel `planner_collection_drafts` (`org_id`, `party_id`, `channel`, `subject`, `body`, `total_amount_rupiah`, `autonomy_level`, `status`, `created_by`, `approved_by`, `audit_log_id`, `dispatched_at`) dengan constraint `CHECK (approved_by IS NULL OR approved_by <> created_by)` (SoD), `CHECK (status <> 'dispatched' OR (approved_by IS NOT NULL AND audit_log_id IS NOT NULL))` (wajib jejak audit), dan trigger integritas `planner_guard_collection_draft_integrity()`.
- Mengaktifkan RLS ketat berbasis `is_org_member(org_id, ...)` pada ketiga tabel tanpa memutasi tabel jurnal.

---

## Verifikasi Dry-Run, Rekonsiliasi Sebelum/Sesudah, & Smoke Check
1. Setelah Langkah 1–6 terpasang pada staging atau jendela pemeliharaan produksi, jalankan mode **dry-run** lebih dahulu untuk setiap `org_id`:
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

## Uji Simulasi Skala Besar & Uji Paritas Offline Lokal Pemilik (`G0-7` & `G0-8`)

### A. Simulasi Migrasi Sintetis Skala Besar (`G0-7`)
Untuk memverifikasi logika reklasifikasi F1 & Neraca secara lokal pada dataset sintetis besar (25 proyek, 350 biaya, 150 pemasukan, total 596 transaksi) tanpa menyentuh DB remote:
```bash
node scripts/g0-staging-migration-dryrun.mjs
```
Skrip keluar dengan exit code `0` hanya jika `matched === true && balanceSheetBalanced === true && expenseInAktiva === 0`.

### B. Uji Paritas Data Nyata Secara 100% Offline (`G0-8`)
Skrip `scripts/g0-owner-local-parity-check.mjs` berjalan **100% offline** (hanya membaca file JSON lokal, tanpa modul jaringan apa pun; data produksi tidak pernah meninggalkan mesin pemilik).

1. **Uji cepat dengan data sintetis bawaan:**
   ```bash
   node scripts/g0-owner-local-parity-check.mjs --demo-synthetic
   ```
2. **Ekspor data lokal dari DB produksi (dilakukan manual oleh pemilik melalui SQL Editor / `psql` / ekspor JSON privat di mesin lokal, jangan di-commit ke Git):**
   Jalankan query berikut di Supabase SQL Editor atau koneksi `psql` privat untuk membentuk satu objek JSON berisi 6 tabel:
   ```sql
   SELECT jsonb_build_object(
     'project_incomes', COALESCE((SELECT jsonb_agg(t) FROM planner_project_incomes t), '[]'::jsonb),
     'cost_realizations', COALESCE((SELECT jsonb_agg(t) FROM planner_cost_realizations t), '[]'::jsonb),
     'opex_realizations', COALESCE((SELECT jsonb_agg(t) FROM planner_opex_realizations t), '[]'::jsonb),
     'journal_entries', COALESCE((SELECT jsonb_agg(t) FROM planner_journal_entries t), '[]'::jsonb),
     'journal_lines', COALESCE((SELECT jsonb_agg(t) FROM planner_journal_lines t), '[]'::jsonb),
     'finance_accounts', COALESCE((SELECT jsonb_agg(t) FROM planner_finance_accounts t), '[]'::jsonb)
   ) AS owner_export;
   ```
   Simpan hasil JSON tersebut ke file lokal di luar repo (mis. `~/Downloads/froyek-owner-export.json`).
3. **Jalankan pengecekan paritas offline:**
   ```bash
   node scripts/g0-owner-local-parity-check.mjs --input ~/Downloads/froyek-owner-export.json
   ```
4. **Periksa hasil laporan JSON:**
   - Pastikan seluruh angka `comparison` (`totalPendapatan`, `totalHpp`, `totalOpex`, `labaBersih`, `totalKas`) berstatus `"matched": true` dan `neraca.isBalanced === true` dengan `expenseInAktiva === 0`.
   - Tinjau bagian `anomalies`: pastikan `missingJournalEntryIdCount === 0`, `unbalancedJournalsCount === 0`, serta tindak lanjuti item `needsReviewLines` (jika ada biaya tanpa item RAP).
   - Hapus file ekspor lokal setelah selesai jika tidak diperlukan lagi; **jangan pernah meng-commit file ekspor data produksi ke Git**.

---

## Prosedur Rollback Darurat
- **Rollback Kode Aplikasi:** `git revert` commit merge PR bermasalah dan re-deploy aplikasi web.
- **Rollback Skema DB:** Kembalikan snapshot database pra-migrasi yang diambil pada tahap Prasyarat (jurnal tidak boleh dihapus/diedit manual; gunakan backup penuh jika perlu membatalkan migrasi skema).

