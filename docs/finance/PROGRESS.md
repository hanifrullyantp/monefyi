# PROGRESS — Papan Kerja Keuangan Froyek (F0–F4)

**Fase Aktif:** `COMPLETED` (`F0`–`F4` Selesai; siap deploy manual via `DEPLOY-RUNBOOK.md`)  
**Orkestrator:** Argon (Mode Otonom)  
**Terakhir Diperbarui:** 2026-11-24

---

## Ringkasan Status per Fase

| Fase | Nama | Status | PR Terkait | Catatan |
|---|---|---|---|---|
| **F0** | Kebenaran Akuntansi (`T0`–`T9`) | `DONE` | `F0-T0`, `F0-T8`, `F0-T1`, `F0-T2/T5`, `F0-T3/T4`, `F0-T6/T7`, `F0-T9` | Semua tes invarian & T1–T8 hijau; `F0-report.md` terbit; migrasi SQL lokal `BLOCKED remote`. |
| **F1** | Akun Baru & Dimensi Proyek | `DONE` | `F1-T1`, `F1-T2` | COA F1 lengkap, 24 template kejadian tertutup, migrasi+dry-run+rekonsiliasi (`BLOCKED remote`), pensiun penghitung `financeV1`, `F1-report.md`. |
| **F2** | Tampilan & Snapshot | `DONE` | `F2-T1`, `F2-T2` | 3 kartu depan, laporan V1 buku besar, dividen 2 mode (`D-F2-01`), `get_finance_snapshot` (~278 token), `F2-report.md`. |
| **F3** | AI Pencatat | `DONE` | `F3-T1`, `F3-T2` | 9 intent, `prepare_entry`/`commit_entry`, memori koreksi, gold set 218 kalimat pada 2 model kecil (218/218), `F3-report.md`. |
| **F4** | AI Belajar RAP & E2E | `DONE` | `F4-T1`, `F4-T2` | Dataset proyek selesai, draf rentang+provenance, MAPE eval (0.34%), uji E2E siklus penuh, `DEPLOY-RUNBOOK.md`, `FINAL-REPORT.md`. |

---

## Daftar Tugas Aktif

### Fase F1
- [x] `F1-0`: Verifikasi F0 (`F0-report.md`, `typecheck`, `vitest`, `gate:docs`, `gate:rebrand` hijau) & buat `PROGRESS.md`.
- [x] `F1-1`: Perluas COA (`AccountType`), helper sub-akun HPP RAP, validasi dimensi `project_id`/`party_id`, & perluas `packages/domain/src/journal.ts` dengan enum kejadian tertutup + tes per template.
- [x] `F1-2`: Migrasi SQL lokal F1 (`20261124120000_f1_coa_and_dimensions.sql`, status `BLOCKED remote`), layanan rekonsiliasi + dry-run, pensiun penghitung `financeV1` (`businessReportService.ts` membaca buku besar), keputusan `finance_version` di `DECISIONS.md`, & `F1-report.md`.

### Fase F2
- [x] `F2-1`: Halaman depan 3 kartu (`overviewCards.ts`, `FinanceOverviewThreeCards.tsx`), laporan V1-style dari buku besar (`LaporanPage.tsx`), & layar dividen 2 mode (`dividendModes.ts`, `DividendTwoModePanel.tsx`).
- [x] `F2-2`: Tool `get_finance_snapshot` ($\le 400$ token, terukur ~278 token), `AGENT-GUIDE.md`, kasus eval `evals/finance/f2_snapshot.yaml`, & laporan `F2-report.md`.

### Fase F3
- [x] `F3-1`: Engine `prepare_entry` & `commit_entry` (`financeEntryEngine.ts`, 9 intent, 3-tier klasifikasi, 3 pita keyakinan, memori koreksi, token budget `AGENT-GUIDE.md`).
- [x] `F3-2`: Gold set **218 kalimat** (`evals/finance/gold_200_id.yaml`) pada 2 model kecil (`tier-small-flash-lite` & `tier-small-haiku-mini`) + CI + `F3-report.md`.

### Fase F4
- [x] `F4-1`: AI Belajar RAP (`packages/domain/src/rapLearning.ts`, `rapLearningService.ts`, `evals/finance/rap_historical_eval.yaml`, `rapLearningEval.test.ts`, `PHASES/F4-report.md`).
- [x] `F4-2`: Uji E2E siklus bisnis penuh (`fullBusinessCycleE2E.test.ts`), `DEPLOY-RUNBOOK.md`, & `FINAL-REPORT.md`.

### Langkah Berikutnya (Eksekusi Pemilik / Operator)
1. Rotate token yang pernah berada di `apps/web/.env.local`.
2. Tinjau `docs/finance/OPEN-QUESTIONS.md` & `docs/finance/DECISIONS.md`.
3. Jalankan migrasi SQL F0, F1, & G0 (`g0_1`, `g0_3`, `g0_4`, `g0_2`, `g0_5`) sesuai `docs/finance/DEPLOY-RUNBOOK.md`.

---

## Program G0–G6 — Penguatan Kebenaran & Eksekusi Nyata

| Fase / Tugas | Nama | Status | Branch / PR | Catatan |
|---|---|---|---|---|
| **G0-1** | Perbaikan Rekonsiliasi Migrasi F1 Nyata | `DONE` | `feat/g0-1-real-migration-reconciliation` | Jurnal reklasifikasi append-only seimbang & idempoten, perhitungan `after` independen di `reconciliation.ts` + SQL lokal `20261124140000_g0_1_real_f1_migration.sql` (`BLOCKED remote`, dry-run rollback subtransaksi, tanpa mutasi `planner_journal_lines`). |
| **G0-2** | Migrasi RPC Atomik ke Akun F1 & Paritas SQL vs Domain | `DONE` | `feat/g0-2-rpc-f1-parity` | SQL lokal `20261124143000_g0_2_rpc_f1_accounts.sql` (`BLOCKED remote`, helper `planner_hpp_account_type_for_rap`, `planner_create_project_income_atomic`, `planner_create_cost_realization_atomic`, `planner_backfill_cost_journals` bebas `'laba'`), `resolveProjectIncomeTemplate` & `resolveProjectCostTemplate` di `packages/domain/src/journal.ts`, bridge `projectJournalBridge.ts` F1, & tes paritas `rpcDomainParity.test.ts`. |
| **G0-3** | Perbaikan Taksonomi Kategori Akun (`pendapatan`/`beban`) & Neraca | `DONE` | `feat/g0-3-account-taxonomy-neraca` | 4 kategori COA (`aktiva`, `pasiva`, `pendapatan`, `beban`), `buildBalanceSheetFromBalances` bebas akun beban/pendapatan + laba berjalan tergulung ke pasiva, SQL lokal `20261124141000_g0_3_account_taxonomy.sql` (`BLOCKED remote`), & `D-G0-01`. |
| **G0-4** | Jaminan Trigger Imutabilitas Jurnal & Tes Penolakan Mutasi | `DONE` | `feat/g0-4-immutability-guard` | SQL lokal `20261124142000_g0_4_immutability_guard.sql` (`BLOCKED remote`, `ERRCODE = '55000'`, trigger `BEFORE UPDATE OR DELETE` pada `entries`/`lines`/`allocations`, sapu bersih policy mutasi RLS), `immutabilityGuard.ts`, tes statis/struktural/kontrak di `journalImmutability.test.ts`, & koreksi `DEPLOY-RUNBOOK.md`. |
| **G0-5** | Pengakuan Pendapatan DP Berbasis Progres / Termin Terjadwal | `DONE` | `feat/g0-5-revenue-recognition` | `computeRecognizableRevenue` & `buildScheduledRecognitionPlan` di `packages/domain/src/revenueRecognition.ts`, `dp_revenue_recognition` di `journal.ts`, SQL lokal `20261124144000_g0_5_revenue_recognition.sql` (`BLOCKED remote`, jadwal `UNIQUE(project_id, period_month)` + RPC idempoten `planner_recognize_project_dp_revenue`), layanan `revenueRecognitionService.ts`, `D-G0-02`, `Q-05`, & `revenueRecognition.test.ts`. |

### Daftar Tugas Program G0–G6
- [x] `G0-1`: Perbaikan rekonsiliasi migrasi F1 nyata (`reconciliation.ts`, `20261124140000_g0_1_real_f1_migration.sql`, & tes TDD di `reconciliation.test.ts`).
- [x] `G0-2`: Migrasi RPC atomik & backfill ke akun F1 + paritas SQL vs `packages/domain/src/journal.ts` (`20261124143000_g0_2_rpc_f1_accounts.sql`, `projectJournalBridge.ts`, `rpcDomainParity.test.ts`).
- [x] `G0-3`: Perbaikan taksonomi kategori akun (`pendapatan`/`beban`) & Neraca (`20261124141000_g0_3_account_taxonomy.sql`, `balanceSheetReport.ts`, `balanceSheetService.ts`, `balanceSheetTaxonomy.test.ts`, & `D-G0-01`).
- [x] `G0-4`: Jaminan trigger imutabilitas jurnal & tes penolakan mutasi (`20261124142000_g0_4_immutability_guard.sql`, `immutabilityGuard.ts`, `journalImmutability.test.ts`, & koreksi `DEPLOY-RUNBOOK.md`).
- [x] `G0-5`: Pengakuan pendapatan DP berbasis progres/termin terjadwal (`revenueRecognition.ts`, `20261124144000_g0_5_revenue_recognition.sql`, `revenueRecognitionService.ts`, `revenueRecognition.test.ts`, & `D-G0-02` / `Q-05`).
