# PROGRESS — Papan Kerja Keuangan Froyek (F0–F4)

**Fase Aktif:** `F1` (Akun Baru & Dimensi Proyek)  
**Orkestrator:** Argon (Mode Otonom)  
**Terakhir Diperbarui:** 2026-11-24

---

## Ringkasan Status per Fase

| Fase | Nama | Status | PR Terkait | Catatan |
|---|---|---|---|---|
| **F0** | Kebenaran Akuntansi (`T0`–`T9`) | `DONE` | `F0-T0`, `F0-T8`, `F0-T1`, `F0-T2/T5`, `F0-T3/T4`, `F0-T6/T7`, `F0-T9` | Semua tes invarian & T1–T8 hijau; `F0-report.md` terbit; migrasi SQL lokal `BLOCKED remote`. |
| **F1** | Akun Baru & Dimensi Proyek | `DOING` | `F1-T1` (sedang), `F1-T2` (pending) | COA F1, template kejadian tertutup, migrasi+dry-run+rekonsiliasi, pensiun penghitung `financeV1`. |
| **F2** | Tampilan & Snapshot | `TODO` | `F2-T1`, `F2-T2` | 3 kartu depan, laporan V1-style dari buku besar, layar dividen 2 mode, `get_finance_snapshot`. |
| **F3** | AI Pencatat | `TODO` | `F3-T1`, `F3-T2` | 9 intent, `prepare_entry`/`commit_entry`, memori koreksi, gold set $\ge 200$ kalimat pada $\ge 2$ model kecil. |
| **F4** | AI Belajar RAP & E2E | `TODO` | `F4-T1`, `F4-T2` | Dataset proyek selesai, draf rentang+provenance, MAPE eval, uji E2E siklus penuh, `FINAL-REPORT.md`. |

---

## Daftar Tugas Aktif

### Fase F1
- [x] `F1-0`: Verifikasi F0 (`F0-report.md`, `typecheck`, `vitest`, `gate:docs`, `gate:rebrand` hijau) & buat `PROGRESS.md`.
- [ ] `F1-1`: Perluas COA (`AccountType`), helper sub-akun HPP RAP, validasi dimensi `project_id`/`party_id`, & perluas `packages/domain/src/journal.ts` dengan enum kejadian tertutup + tes per template.
- [ ] `F1-2`: Migrasi SQL lokal F1 (`20261124120000_f1_coa_and_dimensions.sql`, status `BLOCKED remote`), layanan rekonsiliasi + dry-run, pensiun penghitung `financeV1` (`businessReportService.ts` membaca buku besar), keputusan `finance_version` di `DECISIONS.md`, & `F1-report.md`.

### Keputusan Terbaru
- `D-F1-01`: `financeV2` ditetapkan sebagai satu-satunya jalur tulis dan penghitung buku besar; `financeV1` (`businessReportService`) hanya menjadi pembangun tata letak laporan yang membaca dari buku besar `financeV2`.
- `D-F1-02`: Ambang kapitalisasi aset tetap default ditetapkan konservatif pada `Rp 5.000.000` (dapat diubah pemilik di `OPEN-QUESTIONS.md`).

### Langkah Berikutnya
1. Selesaikan PR `F1-1` (`finance/F1-T1-coa-project-party-templates`) dan verifikasi gerbang.
2. Lanjutkan ke PR `F1-2` dan terbitkan `PHASES/F1-report.md`.
