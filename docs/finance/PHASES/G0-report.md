# Laporan Gerbang Fase G0 — Penguatan Kebenaran & Eksekusi Nyata

**Tanggal Terbit:** 2026-11-24  
**Program:** G0–G6 Keuangan Froyek  
**Status Fase G0:** `DONE` (Seluruh `G0-1` s.d. `G0-8` selesai; migrasi SQL lokal berstatus **`BLOCKED remote`**; uji paritas data produksi menunggu eksekusi offline pemilik)

---

## 1. Ringkasan Status `G0-1` sampai `G0-8`

| Tugas | Status | Apa yang Terbukti (Kode & Tes Lokal) | Apa yang Hanya Diuji Sintetis / In-Memory | Status Remote / Produksi |
|---|---|---|---|---|
| **G0-1** (Rekonsiliasi Migrasi F1 Nyata) | `DONE` | `reconcileF1Migration` membuat jurnal reklasifikasi `f1_migration` append-only seimbang & idempoten, menghitung `after` secara independen dari saldo buku besar, melempar `matched = false` saat terjadi ketidaksesuaian (`reconciliation.test.ts`). | Eksekusi fungsi PL/pgSQL `planner_migrate_f1_ledger(org_id, dry_run)` di atas engine PostgreSQL nyata. | `BLOCKED remote` (`20261124140000_g0_1_real_f1_migration.sql`) |
| **G0-2** (RPC Atomik ke Akun F1 & Paritas Domain) | `DONE` | Paritas 100% antara SQL (`planner_hpp_account_type_for_rap`, `planner_create_project_income_atomic`, `planner_create_cost_realization_atomic`, `planner_backfill_cost_journals`) dan `packages/domain/src/journal.ts` + `projectJournalBridge.ts` dibuktikan di `rpcDomainParity.test.ts` tanpa menulis ke `'laba'`. | Eksekusi RPC atomik di PostgreSQL remote pada beban data produksi. | `BLOCKED remote` (`20261124143000_g0_2_rpc_f1_accounts.sql`) |
| **G0-3** (Taksonomi 4 Kategori Akun & Neraca) | `DONE` | 4 kategori (`aktiva`, `pasiva`, `pendapatan`, `beban`), saldo normal per kategori (`balanceDelta`), dan `buildBalanceSheetFromBalances` teruji di `balanceSheetTaxonomy.test.ts`: Neraca selalu seimbang, 0 akun `hpp_*`/`beban_*`/`pendapatan_proyek` di `aktiva[]`/`pasiva[]`, dan `Laba Periode Berjalan` tergulung tunggal tanpa double-counting. | Update baris `planner_finance_accounts.category` dan trigger `planner_apply_line_balance()` di PostgreSQL remote. | `BLOCKED remote` (`20261124141000_g0_3_account_taxonomy.sql`) |
| **G0-4** (Jaminan Trigger Imutabilitas Jurnal) | `DONE` | Uji statis seluruh `apps/web/src/services/**` & migrasi `20261124*` bebas `UPDATE`/`DELETE` tabel jurnal, uji struktural trigger pada 3 tabel (`planner_journal_entries`, `planner_journal_lines`, `planner_journal_allocations`) + `ERRCODE = '55000'`, dan uji kontrak `immutabilityGuard.ts` (`journalImmutability.test.ts`). | Penegakan trigger & pembersihan policy RLS langsung di instance PostgreSQL remote. | `BLOCKED remote` (`20261124142000_g0_4_immutability_guard.sql`) |
| **G0-5** (Pengakuan Pendapatan DP Bertahap) | `DONE` | `computeRecognizableRevenue` & `buildScheduledRecognitionPlan` (`packages/domain/src/revenueRecognition.ts`) + `dp_revenue_recognition` (`Dr uang_muka_klien / Cr pendapatan_proyek`) teruji untuk mode `'progress_pct'` & `'termin'` tanpa over-recognition (`revenueRecognition.test.ts`). | Tabel `planner_revenue_recognition_schedules` & RPC idempoten `planner_recognize_project_dp_revenue` di PostgreSQL remote. | `BLOCKED remote` (`20261124144000_g0_5_revenue_recognition.sql`) |
| **G0-6** (`party_id` & Pinjaman Antar Proyek) | `DONE` | Resolusi pihak deterministik berbasis `party_id` (`packages/domain/src/party.ts`), `partyLedger.ts`, & jurnal double-entry 4-baris pinjaman antar proyek (`interprojectLoanDisbursement` / `interprojectLoanRepayment`) dengan dampak L/R = 0 & kas konsolidasi = 0 (`partyAndInterprojectLoan.test.ts`). | Kolom `party_id` pada tabel operasional & RPC `planner_post_interproject_loan` di PostgreSQL remote. | `BLOCKED remote` (`20261124145000_g0_6_party_id_and_interproject_loans.sql`) |
| **G0-7** (Dry-Run Skala Besar Sintetis) | `DONE` | `scripts/g0-staging-migration-dryrun.mjs` & `g0StagingDryRun.test.ts` menguji `reconcileF1Migration` (`dryRun: true` & `false`) + `buildBalanceSheetFromBalances` pada **596 transaksi sintetis** (**25 proyek, 350 biaya 6 tipe RAP, 150 pemasukan, piutang, hutang, modal, dividen**). | Data 100% **sintetis** (seeded PRNG Mulberry32, `seed = 20261124`); bukan eksekusi pada staging PostgreSQL remote. | Simulasi lokal mandiri (tanpa DB remote) |
| **G0-8** (Skrip Paritas Lokal Offline Owner) | `DONE` | `scripts/g0-owner-local-parity-check.mjs` & `g0OwnerParityScript.test.ts` terbukti **100% offline** (bebas modul/API jaringan), mengecualikan `status IN ('dividend','cancelled')` & `deleted_at != null`, serta mendeteksi `missingJournalEntryId`, jurnal tidak seimbang, kebocoran beban ke `aktiva`, dan `needs_review = true`. | Mode `--demo-synthetic` telah diverifikasi lulus; mode `--input <export.json>` pada data nyata menunggu eksekusi lokal oleh pemilik. | Menunggu eksekusi offline pemilik di mesin lokal |

---

## 2. Hasil Simulasi Skala Besar `G0-7` (**DATA SINTETIS**)

> **Peringatan Kejujuran Data:** Seluruh angka pada tabel di bawah ini berasal dari dataset **SINTETIS** (`"dataset": "SYNTHETIC"`, `seed: 20261124`) melalui perintah `node scripts/g0-staging-migration-dryrun.mjs`, **bukan** data produksi maupun eksekusi database staging PostgreSQL.

- **Skala Dataset Sintetis:** `25` proyek, `350` realisasi biaya (`58` tanpa RAP / `uncategorized` senilai `Rp 473.220.000`, sisanya tersebar di `material`, `labor`, `equipment`, `overhead`, `other`), `150` pemasukan (`135` `received` mencakup `dp`/`termin`/`pelunasan`/`retensi`, `15` `pending` diabaikan), `20` piutang, `70` hutang dagang, `1` setoran modal, `5` dividen $\rightarrow$ total **`596` transaksi**, menghasilkan **`485` jurnal reklasifikasi `f1_migration`** (seluruhnya seimbang `debit === credit > 0`).

### Tabel Sebelum vs Sesudah Migrasi F1 (Dataset Sintetis)

| Metrik Buku Besar | Sebelum Migrasi F0 (`before`) | Sesudah Migrasi F1 (`after`) | Selisih / Rekonsiliasi | Status |
|---|---|---|---|---|
| **Kas (`kas`)** | `Rp 4.407.310.000` | `Rp 4.407.310.000` | `0` (`before === after`) | Cocok |
| **Piutang (`piutang`)** | `Rp 100.440.000` | `Rp 100.440.000` | `0` (`before === after`) | Cocok |
| **Hutang (`hutang_dagang`)** | `Rp 499.440.000` | `Rp 499.440.000` | `0` (`before === after`) | Cocok |
| **Uang Muka Klien (`uang_muka_klien`)** | `Rp 0` | `Rp 861.520.000` | `+Rp 861.520.000` (`=== dpReclassified`) | Cocok |
| **Laba Bersih (`netProfit`)** | `Rp 649.200.000` | `-Rp 212.320.000` | `after.netProfit + dpReclassified = Rp 649.200.000` (`=== before.netProfit`) | Cocok |
| **Total Aktiva Neraca (`after`)** | — | `Rp 4.507.750.000` | `rowsAktivaCount = 2` | Seimbang |
| **Total Pasiva Neraca (`after`)** | — | `Rp 4.507.750.000` | `rowsPasivaCount = 5`, `balanceSheetBalanced = true` | Seimbang |
| **Kebocoran Beban / Pendapatan di Aktiva** | — | `0` (`expenseInAktiva = 0`, `revenueInAktiva = 0`) | `expenseInPasiva = 0` | Bersih |

---

## 3. Daftar Migrasi SQL Lokal & Urutan Eksekusi (`BLOCKED remote`)

Seluruh file migrasi tersimpan lokal di `my-supabase-project/supabase/migrations/` dengan komentar **`BLOCKED remote`** dan **belum pernah dijalankan ke database remote produksi**. Urutan eksekusi wajib mengikuti `docs/finance/DEPLOY-RUNBOOK.md`:

| Urutan | Kode | File Migrasi SQL Lokal | Ringkasan Perubahan Skema & RPC |
|---|---|---|---|
| 1 | `F0` | `20261124100000_f0_accounting_correctness.sql` | Soft-delete `deleted_at`, status `'dividend'`/`'cancelled'`, trigger `total_spent`/`total_invested`, guard `periode_terkunci`, RPC atomik awal. |
| 2 | `F1` | `20261124120000_f1_coa_and_dimensions.sql` | COA F1 (`pendapatan_proyek`, `uang_muka_klien`, `piutang_retensi`, `hpp_*`, `beban_*`, `dividen`), kolom dimensi `project_id`/`party_id`/`needs_review`. |
| 3 | `G0-1` | `20261124140000_g0_1_real_f1_migration.sql` | Menambah `'f1_migration'` dan mengganti `planner_migrate_f1_ledger(p_org_id, p_dry_run)` agar append-only, menghitung `after` nyata, & rollback subtransaksi saat `dry_run = true`. |
| 4 | `G0-3` | `20261124141000_g0_3_account_taxonomy.sql` | 4 kategori COA (`aktiva`, `pasiva`, `pendapatan`, `beban`), update baris akun existing, & saldo normal per kategori pada `planner_apply_line_balance()`. |
| 5 | `G0-4` | `20261124142000_g0_4_immutability_guard.sql` | Memperkuat `planner_reject_journal_mutation()` (`ERRCODE = '55000'`), trigger `BEFORE UPDATE OR DELETE` pada 3 tabel jurnal, dan menghapus policy mutasi RLS. |
| 6 | `G0-2` | `20261124143000_g0_2_rpc_f1_accounts.sql` | `planner_hpp_account_type_for_rap`, migrasi `planner_create_project_income_atomic`, `planner_create_cost_realization_atomic`, & `planner_backfill_cost_journals` ke akun F1. |
| 7 | `G0-5` | `20261124144000_g0_5_revenue_recognition.sql` | Kolom `revenue_recognition_method`, tabel `planner_revenue_recognition_schedules`, & RPC idempoten `planner_recognize_project_dp_revenue`. |
| 8 | `G0-6` | `20261124145000_g0_6_party_id_and_interproject_loans.sql` | Kolom + indeks `party_id` di 4 tabel operasional & RPC append-only 4-baris `planner_post_interproject_loan`. |

---

## 4. Bukti Verifikasi Lokal (`typecheck`, `test:web`, `gate:docs`, `gate:rebrand`, & Skrip CLI)

Hasil eksekusi langsung pada branch `feat/g0-7-8-staging-parity-report`:

- `npm run typecheck:web` (`tsc --noEmit`): **PASS** (exit code `0`).
- `npm run test:web` (`vitest run`): **PASS** — **91 test files passed (91), 627 tests passed (627)**, mencakup seluruh suite G0 (`reconciliation.test.ts`, `rpcDomainParity.test.ts`, `balanceSheetTaxonomy.test.ts`, `journalImmutability.test.ts`, `revenueRecognition.test.ts`, `partyAndInterprojectLoan.test.ts`, `g0StagingDryRun.test.ts`, `g0OwnerParityScript.test.ts`) serta suite F0–F4.
- `node scripts/g0-staging-migration-dryrun.mjs`: **PASS** (exit code `0`, `"dataset": "SYNTHETIC"`, `"status": "PASS"`, `matched: true`, `balanceSheetBalanced: true`, `expenseInAktiva: 0`).
- `node scripts/g0-owner-local-parity-check.mjs --demo-synthetic`: **PASS** (exit code `0`, `"mode": "OFFLINE_LOCAL_ONLY"`, `"status": "PASS"`, seluruh metrik `matched: true`, `neraca.isBalanced: true`, `expenseInAktiva: 0`, `missingJournalEntryIdCount: 0`, `unbalancedJournalsCount: 0`, `needsReviewCount: 1`).
- `npm run gate:docs`: **PASS** (`docs/finance/CHANGELOG.md` memuat entri `[G0-7/G0-8]` bersama perubahan file keuangan pada branch).
- `npm run gate:rebrand`: **PASS** (exit code `0`, `Unapproved violations: 0` dari `1185` file yang dipindai).

---

## 5. Sisa Risiko & Tindak Lanjut Sebelum Masuk `G1`

1. **Migrasi SQL Belum Diterapkan ke PostgreSQL Remote (`BLOCKED remote`):**
   Seluruh 8 file migrasi SQL (`F0`, `F1`, `G0-1`..`G0-6`) baru diverifikasi melalui uji struktural & paritas statis/in-memory di TypeScript, belum dieksekusi di atas mesin PostgreSQL nyata (staging maupun produksi). Eksekusi wajib mengikuti `docs/finance/DEPLOY-RUNBOOK.md` setelah snapshot/backup penuh diambil.
2. **Uji Paritas Data Produksi Menunggu Eksekusi Offline Pemilik:**
   Data produksi tidak dapat diakses oleh agen dan belum pernah diuji secara langsung. Pemilik perlu mengekspor 6 tabel ke file JSON lokal (tanpa di-commit ke Git) lalu menjalankan `node scripts/g0-owner-local-parity-check.mjs --input <path-ke-export.json>` di mesin lokal sesuai panduan `docs/finance/DEPLOY-RUNBOOK.md`.
3. **Prasyarat Keamanan & Keputusan Pemilik:**
   Rotasi manual seluruh token yang pernah tersimpan di `apps/web/.env.local` dan konfirmasi nilai default di `docs/finance/OPEN-QUESTIONS.md` / `docs/finance/DECISIONS.md` tetap wajib diselesaikan sebelum rilis produksi.
