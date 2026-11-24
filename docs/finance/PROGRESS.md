# PROGRESS — Papan Kerja Keuangan Froyek (F0–F4)

**Fase Aktif:** `F3` (AI Pencatat)  
**Orkestrator:** Argon (Mode Otonom)  
**Terakhir Diperbarui:** 2026-11-24

---

## Ringkasan Status per Fase

| Fase | Nama | Status | PR Terkait | Catatan |
|---|---|---|---|---|
| **F0** | Kebenaran Akuntansi (`T0`–`T9`) | `DONE` | `F0-T0`, `F0-T8`, `F0-T1`, `F0-T2/T5`, `F0-T3/T4`, `F0-T6/T7`, `F0-T9` | Semua tes invarian & T1–T8 hijau; `F0-report.md` terbit; migrasi SQL lokal `BLOCKED remote`. |
| **F1** | Akun Baru & Dimensi Proyek | `DONE` | `F1-T1`, `F1-T2` | COA F1 lengkap, 24 template kejadian tertutup, migrasi+dry-run+rekonsiliasi (`BLOCKED remote`), pensiun penghitung `financeV1`, `F1-report.md`. |
| **F2** | Tampilan & Snapshot | `DONE` | `F2-T1`, `F2-T2` | 3 kartu depan, laporan V1 buku besar, dividen 2 mode (`D-F2-01`), `get_finance_snapshot` (~278 token), `F2-report.md`. |
| **F3** | AI Pencatat | `DOING` | `F3-T1`, `F3-T2` | 9 intent, `prepare_entry`/`commit_entry`, memori koreksi, gold set $\ge 200$ kalimat pada $\ge 2$ model kecil. |
| **F4** | AI Belajar RAP & E2E | `TODO` | `F4-T1`, `F4-T2` | Dataset proyek selesai, draf rentang+provenance, MAPE eval, uji E2E siklus penuh, `FINAL-REPORT.md`. |

---

## Daftar Tugas Aktif

### Fase F1
- [x] `F1-0`: Verifikasi F0 (`F0-report.md`, `typecheck`, `vitest`, `gate:docs`, `gate:rebrand` hijau) & buat `PROGRESS.md`.
- [x] `F1-1`: Perluas COA (`AccountType`), helper sub-akun HPP RAP, validasi dimensi `project_id`/`party_id`, & perluas `packages/domain/src/journal.ts` dengan enum kejadian tertutup + tes per template.
- [x] `F1-2`: Migrasi SQL lokal F1 (`20261124120000_f1_coa_and_dimensions.sql`, status `BLOCKED remote`), layanan rekonsiliasi + dry-run, pensiun penghitung `financeV1` (`businessReportService.ts` membaca buku besar), keputusan `finance_version` di `DECISIONS.md`, & `F1-report.md`.

### Fase F2
- [x] `F2-1`: Halaman depan 3 kartu (`overviewCards.ts`, `FinanceOverviewThreeCards.tsx`), laporan V1-style dari buku besar (`LaporanPage.tsx`), & layar dividen 2 mode (`dividendModes.ts`, `DividendTwoModePanel.tsx`).
- [x] `F2-2`: Tool `get_finance_snapshot` ($\le 400$ token, terukur ~278 token), `AGENT-GUIDE.md`, kasus eval `evals/finance/f2_snapshot.yaml`, & laporan `F2-report.md`.

### Langkah Berikutnya (Fase F3 -> F4)
1. Kerjakan `F3-1`: Engine `prepare_entry` & `commit_entry` untuk 9 intent + 3-tier klasifikasi + memori koreksi.
2. Kerjakan `F3-2`: Gold set $\ge 200$ kalimat Indonesia pada $\ge 2$ model kecil + CI + `F3-report.md`.
