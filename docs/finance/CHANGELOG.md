# CHANGELOG — Keuangan Froyek

Setiap PR yang menyentuh `apps/web/src/services/finance*`, `apps/web/src/services/incomeService.ts`, `apps/web/src/services/costService.ts`, `apps/web/src/lib/financeV2*`, `packages/domain/`, `agent-core/`, atau migrasi keuangan **WAJIB** menambah satu entri di file ini pada PR yang sama.

---

## [F0-T3/T4] 2026-11-24 — Posting Atomik Pemasukan/Biaya & Edit/Hapus dengan Pembalik + Soft-Delete
- **Branch / PR:** `finance/F0-T3-T4-atomic-posting-and-reversals`
- **Fase:** F0 (Kebenaran — T3 & T4)
- **Perubahan & Alasan:**
  - **T3 (`incomeService.ts`, `costService.ts`, `projectJournalBridge.ts`, SQL RPC):**
    - Menambahkan RPC atomik `planner_create_project_income_atomic` dan `planner_create_cost_realization_atomic` di migrasi lokal (`BLOCKED remote`) sehingga baris sumber + jurnal tersimpan dalam satu transaksi.
    - Menambahkan kompensasi rollback pada fallback client bila RPC belum ada di remote, dan menghapus seluruh `console.error` yang menelan kegagalan posting jurnal.
    - `postProjectIncomeJournal` dan `postProjectExpenseJournal` memanggil `ensureChartOfAccounts` dan melempar error eksplisit bila akun sistem tetap tidak ditemukan.
  - **T4 (`costService.ts`, `incomeService.ts`, SQL `planner_post_journal`):**
    - `updateCostRealization` kini memposting jurnal pembalik (`reverseProjectJournal`) atas jurnal lama, lalu memposting jurnal baru dengan nominal/tanggal terbaru dan memperbarui `journal_entry_id`.
    - Memperbarui `planner_post_journal` di migrasi lokal agar dedup mengabaikan jurnal yang sudah di-reverse sehingga reposting setelah koreksi dapat membuat jurnal baru.
    - `deleteCostRealization`, `deleteCostsByRapItemId`, `deleteAllCosts`, dan `deleteProjectIncome` kini membalik jurnal tanpa menelan error dan melakukan *soft-delete* (`status = 'cancelled'`, `deleted_at`) pada baris sumber.
- **Akun / Template Jurnal Tersentuh:** `Kas Proyek`, `Laba Periode Berjalan` (`project_income`, `project_expense`, `reversal`).
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124100000_f0_accounting_correctness.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** Tes T3 dan T4 di `apps/web/src/services/financeV2/__tests__/f0AccountingCorrectness.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan signature tool; jalur tulis bersama lebih aman.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F0-T2/T5] 2026-11-24 — Laba Tidak Terhitung Dua Kali & Klasifikasi HPP Berbasis Akun/Jenis
- **Branch / PR:** `finance/F0-T2-T5-profit-loss-single-count`
- **Fase:** F0 (Kebenaran — T2 & T5)
- **Perubahan & Alasan:**
  - **T5 (`profitLossReport.ts`):** Menghapus klasifikasi HPP berbasis kata `"stok"` di deskripsi. Semua baris `project_expense` dan `payable_payment` masuk ke `hpp`; `amortize`/`depreciation` ke `otherExpense`; `opex`/`bon_disbursement` ke `opex`; `reversal` membalik kategori jurnal aslinya; dan jurnal penutup/distribusi ekuitas (`project_close`, `period_close`, `dividend`) diabaikan dari laporan Laba/Rugi.
  - **T2 (`periodCloseService.ts` & `kasService.ts`):** `closeFinancePeriod` menghitung selisih `netProfit` dikurangi laba proyek yang sudah ditutup lewat `project_close` pada periode tersebut sehingga laba hanya berpindah satu kali ke `Laba Ditahan` dan saldo `Laba Periode` menjadi `0`. Memperbaiki juga perhitungan `monthEnd` agar tidak bergeser mundur 1 hari di zona waktu UTC+7.
- **Akun / Template Jurnal Tersentuh:** `Laba Periode Berjalan`, `Laba Ditahan` (`project_close`, `period_close`, `project_expense`, `reversal`).
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** Tes T2 dan T5 di `apps/web/src/services/financeV2/__tests__/f0AccountingCorrectness.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F0-T1] 2026-11-24 — Dividen Proyek sebagai Jurnal Ekuitas, Bukan Biaya Proyek
- **Branch / PR:** `finance/F0-T1-project-dividend-equity`
- **Fase:** F0 (Kebenaran — T1)
- **Perubahan & Alasan:**
  - Menghapus penyisipan dividen ke `planner_cost_realizations` pada `projectDividendService.recordDividendPayouts`.
  - Menambahkan `postProjectDividendJournal` di `projectJournalBridge.ts` dan template `projectDividendCash` / `projectDividendReceivableOffset` di `packages/domain/src/journal.ts`:
    - Pembayaran kas dividen: `Dr Laba Ditahan, Cr Kas Proyek` (`reference_type = 'dividend'`).
    - Offset piutang owner: `Dr Laba Ditahan, Cr Piutang Usaha` (`reference_type = 'dividend'`).
  - Mengecualikan baris berstatus `'dividend'` dan `'cancelled'` di `backfillProjectJournalsForOrg` dan `getFinanceIntegrationStatus`.
  - Menulis migrasi SQL lokal `20261124100000_f0_accounting_correctness.sql` (status `BLOCKED remote`) untuk mengecualikan `'dividend'`/`'cancelled'`/`deleted_at` dari trigger `planner_fill_derived_project_totals()` (`total_spent`) dan `planner_backfill_cost_journals()`.
- **Akun / Template Jurnal Tersentuh:** `Laba Ditahan`, `Kas Proyek`, `Piutang Usaha`; template `projectDividendCash`, `projectDividendReceivableOffset`.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124100000_f0_accounting_correctness.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/services/financeV2/__tests__/f0AccountingCorrectness.test.ts` (T1) & update `apps/web/src/lib/domainJournal.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan tool agent; `packages/domain/src/journal.ts` bertambah 2 template ekuitas.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F0-T8] 2026-11-24 — Keluarkan `apps/web/.env.local` dari Git & Tambah ke `.gitignore`
- **Branch / PR:** `finance/F0-T8-remove-env-local`
- **Fase:** F0 (Kebenaran — T8)
- **Perubahan & Alasan:**
  - Menghapus `apps/web/.env.local` dari indeks Git (`git rm --cached apps/web/.env.local`) sambil mempertahankan file lokal di disk.
  - Menambahkan `apps/web/.env.local` dan `apps/*/.env.local` secara eksplisit ke `.gitignore`.
  - Mencatat kewajiban rotasi manual semua token pada file tersebut (termasuk token Vercel) di `OPEN-DECISIONS.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak ada.
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** Verifikasi `git ls-files apps/web/.env.local` kosong dan `git check-ignore apps/web/.env.local` berhasil.
- **Dampak ke Tool Agent:** Tidak ada.
- **Cara Rollback:** `git revert` commit merge PR ini (tidak disarankan karena menyangkut keamanan kredensial).

## [F0-T0] 2026-11-24 — Kerangka Dokumentasi Keuangan, Template PR, & Gerbang CI `docs-gate`
- **Branch / PR:** `finance/F0-T0-docs-framework`
- **Fase:** F0 (Kebenaran)
- **Perubahan & Alasan:**
  - Membentuk seluruh kerangka dokumen wajib di `docs/finance/` (`ACCOUNTING-MODEL.md`, `CHANGELOG.md`, `DECISIONS.md`, `AGENT-GUIDE.md`, `OPEN-QUESTIONS.md`, `PHASES/F0-plan.md`).
  - Menambahkan `.github/pull_request_template.md` dengan checklist verifikasi akuntansi, dokumen, migrasi, dan dampak ke tool agent.
  - Menambahkan skrip gerbang CI `scripts/docs-gate-check.mjs`, script `npm run gate:docs`, workflow `.github/workflows/docs-gate.yml`, serta tes unit `apps/web/src/lib/docsGateCheck.test.ts` untuk menggagalkan PR bila file keuangan berubah tanpa pembaruan `docs/finance/CHANGELOG.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak ada perubahan kode akuntansi; mendokumentasikan baseline COA & template F0.
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** `apps/web/src/lib/docsGateCheck.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan runtime tool; mendefinisikan kontrak di `docs/finance/AGENT-GUIDE.md`.
- **Cara Rollback:** `git revert` commit merge PR ini.

