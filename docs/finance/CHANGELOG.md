# CHANGELOG — Keuangan Froyek

Setiap PR yang menyentuh `apps/web/src/services/finance*`, `apps/web/src/services/incomeService.ts`, `apps/web/src/services/costService.ts`, `apps/web/src/lib/financeV2*`, `packages/domain/`, `agent-core/`, atau migrasi keuangan **WAJIB** menambah satu entri di file ini pada PR yang sama.

---

## [F4-T1] 2026-11-24 — AI Belajar RAP dari Proyek Selesai, Fallback Katalog, & Evaluasi MAPE
- **Branch / PR:** `finance/F4-T1-rap-learning-and-eval`
- **Fase:** F4 (AI Belajar RAP & E2E)
- **Perubahan & Alasan:**
  - Membangun `packages/domain/src/rapLearning.ts` (`buildRapLearningDataset`, `generateRapDraftFromHistory`, `computeRapCompletionFeedback`, `evaluateRapPredictionMape`) yang menormalisasi realisasi proyek selesai (`completed`/`finance_closed`) per satuan volume (`m2`/`unit`), mengeluarkan draf rentang `low`/`mid`/`high` beserta *provenance* (`Berdasarkan N proyek serupa` jika $N \ge 3$ atau fallback katalog Estimator jika $N < 3$), serta selalu mewajibkan `requiresOwnerApproval: true`.
  - Menambahkan `apps/web/src/services/financeV2/rapLearningService.ts` (`proposeRapDraftForProject`, `approveRapDraft`, `recordProjectRapCompletionFeedback`).
  - Menambahkan dataset `evals/finance/rap_historical_eval.yaml` (6 proyek selesai historis + 3 proyek *holdout*) dan tes `apps/web/src/lib/rapLearningEval.test.ts`.
  - Menulis `PHASES/F4-plan.md`, `PHASES/F4-report.md`, memperbarui `AGENT-GUIDE.md` & `PROGRESS.md`.
- **Akun / Template Jurnal Tersentuh:** Membaca realisasi `hpp_*` dari buku besar (`buildProfitLossFromLines`); tidak menulis jurnal langsung tanpa persetujuan RAP.
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** `apps/web/src/lib/rapLearningEval.test.ts`, `evals/finance/rap_historical_eval.yaml`.
- **Dampak ke Tool Agent:** AI dapat mengusulkan draf RAP berrentang + *provenance* yang selalu meminta persetujuan pemilik.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F3-T2] 2026-11-24 — Gold Set Evaluasi 218 Kalimat Indonesia pada 2 Model Kecil & Integrasi CI
- **Branch / PR:** `finance/F3-T2-gold-eval-200-two-models`
- **Fase:** F3 (AI Pencatat)
- **Perubahan & Alasan:**
  - Menerbitkan dataset gold `evals/finance/gold_200_id.yaml` (**218** kalimat nyata bahasa Indonesia mencakup 9 intent, singkatan, typo, variasi rupiah/tanggal, 3 kalimat contoh wajib, kasus pengaman periode terkunci, pengeluaran pribadi, proyek ambigu, & ambang aset tetap $\ge \text{Rp }5.000.000$).
  - Menambahkan `agent-core/src/financeEvalRunner.ts` dan `apps/web/src/lib/financeAgentEval.test.ts` yang mengevaluasi 2 profil model kecil (`tier-small-flash-lite` dan `tier-small-haiku-mini`).
  - Memperketat urutan intent & resolusi entitas di `financeEntryEngine.ts` berdasarkan temuan iterasi evaluasi pertama (`pelunasan hutang/piutang` vs `catat_pemasukan`, urutan RAP `overhead -> equipment -> labor -> material`, proyek eksplisit dengan kata `listrik`/`kebersihan`, transfer `dari X ke Y` & `top up Y dari X`, serta isolasi substring nama proyek saat mencocokkan pihak).
  - Menambahkan tes F2 & F3 ke `.github/workflows/agent-eval.yml`, memperbarui `PROGRESS.md`, dan menerbitkan `PHASES/F3-report.md`.
- **Akun / Template Jurnal Tersentuh:** Semua 24 template F1 (via `financeEntryEngine.ts`).
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** `apps/web/src/lib/financeAgentEval.test.ts`, `evals/finance/gold_200_id.yaml`.
- **Dampak ke Tool Agent:** Verifikasi akurasi & anggaran token 2 model kecil berjalan otomatis di CI.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F3-T1] 2026-11-24 — Engine AI Pencatat 9 Intent (`prepare_entry` / `commit_entry`), Klasifikasi 3 Lapis, & Memori Koreksi
- **Branch / PR:** `finance/F3-T1-prepare-commit-classifier-intents`
- **Fase:** F3 (AI Pencatat)
- **Perubahan & Alasan:**
  - Membangun `agent-core/src/financeEntryEngine.ts`: mendukung 9 intent tertutup (`catat_biaya_proyek`, `catat_opex`, `catat_pemasukan`, `bayar_hutang`, `terima_piutang`, `kasbon`, `transfer_kas`, `dividen`, `tanya_saldo`), ekstraksi rupiah/tanggal deterministik, resolusi entitas dengan alias + fuzzy (`needs_choice` maks. 5 kandidat), klasifikasi 3 lapis (`org_rule` -> `domain_rule` -> `llm_closed_choice` maks. 5 kandidat), 3 pita keyakinan (`auto_commit` / `confirm_one_tap` / `ask_back`), penjaga aset vs opex $\ge \text{Rp }5.000.000$, blokir pengeluaran pribadi & periode terkunci, wajib `ownerApproved` untuk dividen, dan `recordFinanceCorrection`.
  - Mendaftarkan `prepare_entry` & `commit_entry` di `agent-core/src/registry.ts` (menjaga batas $\le 8$ tool/spesialis dengan memisahkan tool biaya proyek legacy ke `project`/`purchasing`) serta menyinkronkan `functions.json`, `mcp.json`, `fixtures.json`, dan `AGENT_MANUAL.md`.
  - Menulis `PHASES/F3-plan.md`, memperbarui `AGENT-GUIDE.md` beserta system prompt $\le 1.200$ token, dan menambah `financeEntryEngine.test.ts`.
- **Akun / Template Jurnal Tersentuh:** Semua 24 template kode kejadian di `packages/domain/src/journal.ts` (`source='agent'`, `model`, `prepare_token`).
- **Migrasi SQL:** Tidak ada (kolom metadata sudah disiapkan di migrasi F1).
- **Tes Ditambah:** `apps/web/src/lib/financeEntryEngine.test.ts`.
- **Dampak ke Tool Agent:** Specialist `finance` & `manager` memakai `prepare_entry` + `commit_entry` (9 intent) selain `get_finance_snapshot`.
- **Cara Rollback:** `git revert` commit merge PR ini dan jalankan ulang `writeArtifacts.ts`.

## [F2-T2] 2026-11-24 — Tool `get_finance_snapshot` ($\le 400$ Token) & Laporan Akhir F2
- **Branch / PR:** `finance/F2-T2-agent-finance-snapshot`
- **Fase:** F2 (Tampilan & Snapshot)
- **Perubahan & Alasan:**
  - Menambahkan `agent-core/src/financeSnapshot.ts` (`buildFinanceSnapshot`, `estimateJsonTokens`) yang mengembalikan JSON ringkas $\le 400$ token (~278 token untuk 8 dompet & 8 proyek), membatasi daftar ke maks. 5 item + total, serta mendukung parameter `kind` (`ringkasan`, `laba_rugi`, `neraca`, `arus_kas`).
  - Mendaftarkan `get_finance_snapshot` ke `agent-core/src/registry.ts` (deskripsi 11 kata $\le 25$ kata) dan menjaga `toolsFor('finance' | 'manager', *) <= 8` dengan menata ulang `propose_notification` ke `['project', 'purchasing', 'hr']`.
  - Menjalankan `writeArtifacts.ts` sehingga `agent-core/functions.json`, `agent-core/mcp.json`, `agent-core/fixtures.json`, dan `docs/agent/AGENT_MANUAL.md` tersinkronisasi.
  - Menambah kasus uji `evals/finance/f2_snapshot.yaml`, memperluas `apps/web/src/lib/agentTools.test.ts`, memperbarui `docs/finance/AGENT-GUIDE.md` & `PROGRESS.md`, dan menerbitkan `docs/finance/PHASES/F2-report.md`.
- **Akun / Template Jurnal Tersentuh:** Read-only dari saldo & ringkasan laporan buku besar `financeV2`.
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** Uji token budget & truncation F2 di `apps/web/src/lib/agentTools.test.ts` + `evals/finance/f2_snapshot.yaml`.
- **Dampak ke Tool Agent:** Specialist `finance` dan `manager` kini memiliki tool `get_finance_snapshot(kind?, project_id?)`.
- **Cara Rollback:** `git revert` commit merge PR ini dan jalankan ulang `writeArtifacts.ts`.

## [F2-T1] 2026-11-24 — 3 Kartu Halaman Depan, Laporan V1 dari Buku Besar, & Dividen 2 Mode
- **Branch / PR:** `finance/F2-T1-three-cards-v1-report-dividend-ui`
- **Fase:** F2 (Tampilan & Snapshot)
- **Perubahan & Alasan:**
  - Menambahkan `overviewCards.ts` + `overviewCardsService.ts` + komponen `FinanceOverviewThreeCards.tsx` untuk menampilkan 3 kartu utama di overview keuangan: (1) Uang & Hutang-Piutang (dompet kas, piutang/retensi, hutang jatuh tempo), (2) Untung/Rugi per Proyek (laba, margin %, RAP vs realisasi), (3) Bisnis Bulan Ini (profit kotor, plan vs realisasi opex, profit bersih).
  - Menambahkan `dividendModes.ts` + komponen `DividendTwoModePanel.tsx` untuk simulasi dan penyusunan jurnal dividen mode `per_proyek` (pool kas bersih proyek + offset piutang owner) dan mode `per_bisnis` (dari Laba Ditahan dengan batas kas dikurangi cadangan $1\times$ opex bulanan terencana sesuai `D-F2-01`).
  - Memperbarui `balanceSheetService.ts` (`computePeriodProfitFromAccounts`), `LaporanPage.tsx` (margin % & tabel profitabilitas per proyek dari buku besar pada tab Laba Rugi), dan `FinanceSandboxOverview.tsx` (aman untuk Demo mode).
  - Menulis `PHASES/F2-plan.md`, menambah `D-F2-01` di `DECISIONS.md`, dan memperbarui `PROGRESS.md`.
- **Akun / Template Jurnal Tersentuh:** `kas`, `piutang`, `piutang_retensi`, `pendapatan_proyek`, `hpp_*`, `beban_opex`, `laba_ditahan`, `dividen` (`businessDividendCash`, `projectDividendCash`).
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/f2OverviewDividend.test.ts`.
- **Dampak ke Tool Agent:** Fondasi data 3 kartu yang sama akan dipakai langsung oleh `get_finance_snapshot` di `F2-T2`.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F1-T2] 2026-11-24 — Migrasi SQL Lokal F1, Rekonsiliasi Dry-Run, & Pensiun Penghitung V1
- **Branch / PR:** `finance/F1-T2-migration-reconciliation-retire-v1`
- **Fase:** F1 (Akun Baru & Dimensi Proyek)
- **Perubahan & Alasan:**
  - Menulis migrasi SQL lokal `20261124120000_f1_coa_and_dimensions.sql` (`BLOCKED remote`): memperluas constraint COA, menambah `project_id`/`party_id`/`needs_review` pada `planner_journal_lines`, menambah `source`/`model`/`prepare_token` pada `planner_journal_entries`, memperbarui `seed_default_chart_of_accounts` & `planner_post_journal`, serta menambah RPC `planner_migrate_f1_ledger(org_id, p_dry_run)`.
  - Menambahkan engine rekonsiliasi & dry-run TypeScript di `apps/web/src/lib/financeV2/reconciliation.ts` + tes `reconciliation.test.ts`.
  - Memperbarui `profitLossReport.ts`, `loadReportData.ts`, dan `projectReport.ts` agar membaca akun F1 dan dimensi `project_id`/`party_id` langsung dari baris jurnal, serta mempertahankan kompatibilitas F0.
  - Memensiunkan `financeV1` sebagai penghitung: `businessReportService.ts` kini membaca buku besar `financeV2` via `businessReportFromLedger`.
  - Mencatat keputusan `D-F1-01` & `D-F1-02` di `DECISIONS.md`, memperbarui `ACCOUNTING-MODEL.md`, `PROGRESS.md`, dan menerbitkan `PHASES/F1-report.md`.
- **Akun / Template Jurnal Tersentuh:** Seluruh COA F1 (`pendapatan_proyek`, `hpp_*`, `uang_muka_klien`, `piutang_retensi`, `beban_opex`, `beban_penyusutan`, `akumulasi_penyusutan`, `dividen`).
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124120000_f1_coa_and_dimensions.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/reconciliation.test.ts`.
- **Dampak ke Tool Agent:** Metadata `source`, `model`, `prepare_token` siap disimpan di `planner_journal_entries`.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F1-T1] 2026-11-24 — COA Baru, Dimensi Proyek/Pihak, & Template Kejadian Tertutup
- **Branch / PR:** `finance/F1-T1-coa-project-party-templates`
- **Fase:** F1 (Akun Baru & Dimensi Proyek)
- **Perubahan & Alasan:**
  - Memperluas `AccountType` dan `ACCOUNT_TYPE_LABEL` di `apps/web/src/types/financeV2.ts` dengan akun-akun F1 (`pendapatan_proyek`, `uang_muka_klien`, `piutang_retensi`, `hpp_material`, `hpp_labor`, `hpp_equipment`, `hpp_overhead`, `hpp_other`, `hpp_uncategorized`, `beban_opex`, `beban_penyusutan`, `akumulasi_penyusutan`, `dividen`), sambil menjaga kompatibilitas `laba`.
  - Menambahkan helper `hppAccountTypeForRapType` dan `computePeriodProfitFromAccounts` di `accountService.ts`.
  - Memperluas `packages/domain/src/journal.ts` dengan 24 enum kejadian tertutup (`FINANCE_EVENT_CODES`), builder `buildJournalTemplate`, template lengkap (DP klien, termin potong DP, retensi, opex, akrual hutang/piutang, kasbon, penyusutan, dividen, tutup proyek/periode), serta validator dimensi `validateJournalDimensions` (`project_id` & `party_id`).
  - Memperbarui `docs/finance/PROGRESS.md` dan `docs/finance/PHASES/F1-plan.md`.
- **Akun / Template Jurnal Tersentuh:** Seluruh 24 kejadian di `FINANCE_EVENT_CODES` dan COA F1.
- **Migrasi SQL:** Disiapkan pada PR `F1-T2`.
- **Tes Ditambah:** `apps/web/src/lib/domainJournal.test.ts` (tes seluruh 24 template + dimensi + mapping RAP).
- **Dampak ke Tool Agent:** Menyediakan enum kejadian tertutup `FINANCE_EVENT_CODES` untuk tool F3.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F0-T9] 2026-11-24 — Gerbang Agent-Ready F0, Tes Invarian Buku Besar, & Laporan F0
- **Branch / PR:** `finance/F0-T9-invariants-agent-gate-report`
- **Fase:** F0 (Kebenaran — Gerbang Akhir Fase)
- **Perubahan & Alasan:**
  - Menambahkan parser tanggal Indonesia deterministik `parseTanggal` di `packages/domain/src/dates.ts` (diekspor ulang di `money.ts`) beserta unit test di `apps/web/src/lib/domainMoney.test.ts`.
  - Menambahkan guard `lockedPeriods` (`periode_terkunci`) serta metadata `source` dan `model` pada `prepareRecordCost` di `agent-core/src/prepare.ts`.
  - Menambahkan kasus guardrail F0 di `evals/finance/f0_guardrails.yaml` dan tes anggaran token/guardrail di `apps/web/src/lib/agentTools.test.ts`.
  - Menambahkan suite tes invarian buku besar lengkap di `apps/web/src/lib/financeV2/__tests__/ledgerInvariants.test.ts`.
  - Menerbitkan laporan akhir fase `docs/finance/PHASES/F0-report.md`.
- **Akun / Template Jurnal Tersentuh:** Semua template domain diverifikasi seimbang pada `ledgerInvariants.test.ts`.
- **Migrasi SQL:** Tidak ada migrasi baru (seluruh SQL F0 berada di `20261124100000_f0_accounting_correctness.sql`, status `BLOCKED remote`).
- **Tes Ditambah:** `ledgerInvariants.test.ts`, tes `parseTanggal` di `domainMoney.test.ts`, tes guardrail & token di `agentTools.test.ts`.
- **Dampak ke Tool Agent:** `prepareRecordCost` mendukung `lockedPeriods`, `source`, dan `model`; seluruh deskripsi tool terverifikasi $\le 25$ kata.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F0-T6/T7] 2026-11-24 — Guard Tutup Proyek, Periode Terkunci, & Investor Atomik + Batas Dividen
- **Branch / PR:** `finance/F0-T6-T7-guards-and-atomic-investor`
- **Fase:** F0 (Kebenaran — T6 & T7)
- **Perubahan & Alasan:**
  - **T6a (`projectCloseService.ts`, `kasService.ts`):** `buildProjectClosePreview` kini memuat hutang proyek (`openPayables`) dan retensi belum cair (`openRetention`). `closeProjectFinance` memblokir penutupan proyek apabila masih ada piutang, retensi, hutang proyek, atau hutang antar-proyek terbuka kecuali diberikan `ownerWriteOff` eksplisit bertanda pemilik (`actorRole === 'owner'` dan `reason` terisi).
  - **T6b (`journalService.ts`, SQL `planner_post_journal`):** Menambahkan `assertPeriodNotLocked` di client dan validasi `periode_terkunci` di RPC `planner_post_journal` terhadap `planner_finance_period_snapshots`.
  - **T7 (`investorService.ts`, SQL `planner_sync_investor_total_invested`):** Memvalidasi `amount <= Kas Bisnis` dan `amount <= Laba Ditahan` sebelum menyisipkan transaksi dividen investor, menurunkan `total_invested` secara deterministik dari seluruh transaksi `planner_investor_transactions` (+ trigger SQL), serta menambahkan kompensasi rollback bila jurnal gagal.
- **Akun / Template Jurnal Tersentuh:** `Kas Bisnis`, `Modal Disetor`, `Laba Ditahan` (`dividend`, `manual`), seluruh jurnal pada periode terkunci.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124100000_f0_accounting_correctness.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** Tes T6a, T6b, dan T7 di `apps/web/src/services/financeV2/__tests__/f0AccountingCorrectness.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan signature tool; aturan periode terkunci dan persetujuan pemilik selaras dengan kontrak di `AGENT-GUIDE.md`.
- **Cara Rollback:** `git revert` commit merge PR ini.

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

