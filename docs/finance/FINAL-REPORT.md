# FINAL-REPORT — Pembangunan Sistem Keuangan Froyek (Fase F0–F4)

**Tanggal Selesai:** 2026-11-24  
**Orkestrator:** Argon (Mode Otonom Lintas Fase F0–F4)  
**Status Program:** `COMPLETED` (Semua gerbang verifikasi lokal hijau; migrasi SQL produksi `BLOCKED remote`)

---

## TINDAKAN PEMILIK (Prioritas Tinggi)

1. **Rotate Semua Token `apps/web/.env.local` Secara Manual:**  
   `apps/web/.env.local` sempat terlacak di indeks Git pada awal program dan telah dikeluarkan (`git rm --cached` + `.gitignore` di PR `F0-T8`). Pemilik **WAJIB** melakukan rotasi manual seluruh token yang pernah tersimpan di file tersebut (Supabase key, token Vercel, kunci AI).
2. **Eksekusi `DEPLOY-RUNBOOK.md` pada Supabase Remote:**  
   Sesuai aturan keras larangan push/deploy otomatis ke produksi, dua file migrasi SQL ditulis secara lokal dan berstatus **`BLOCKED remote`**:
   - `my-supabase-project/supabase/migrations/20261124100000_f0_accounting_correctness.sql`
   - `my-supabase-project/supabase/migrations/20261124120000_f1_coa_and_dimensions.sql`  
   Ikuti urutan backup $\rightarrow$ migrasi F0 $\rightarrow$ migrasi F1 $\rightarrow$ `dry-run` rekonsiliasi pada [DEPLOY-RUNBOOK.md](./DEPLOY-RUNBOOK.md).
3. **Tinjau `OPEN-QUESTIONS.md` & Keputusan Otonom di `DECISIONS.md`:**  
   Selama mode otonom ditetapkan default konservatif yang dapat disesuaikan pemilik:
   - `D-F1-01`: `financeV2` sebagai jalur tulis & penghitung tunggal; `financeV1` dipensiunkan sebagai penghitung dan tata letak laporannya membaca dari buku besar `financeV2`.
   - `D-F1-02`: Ambang kapitalisasi aset tetap default **`Rp 5.000.000`** (`Q-01`).
   - `D-F2-01`: Cadangan opex default mode dividen `per_bisnis` = **`1 × total plan opex bulanan`** (`Q-03`).

---

## 1. Ringkasan Capaian per Fase (F0–F4)

| Fase | Nama | Cakupan Utama | Laporan Fase | Status |
|---|---|---|---|---|
| **F0** | Kebenaran Akuntansi (`T0`–`T9`) | Jalur tulis atomik, dividen ekuitas (bukan biaya), cegah double-counting tutup proyek vs tutup periode, imutabilitas jurnal + soft-delete, keluarkan `.env.local`, parser Rupiah/tanggal deterministik, `gate:docs` + PR template | [F0-report.md](./PHASES/F0-report.md) | `DONE` |
| **F1** | Akun Baru & Dimensi Proyek | COA penuh (Pendapatan Proyek, Uang Muka Klien, Piutang Usaha/Retensi, HPP per tipe RAP + `hpp_uncategorized`, Opex, Akumulasi Penyusutan, Dividen, Laba Ditahan), 24 kode kejadian tertutup, dimensi `project_id`/`party_id`, migrasi lokal + dry-run + rekonsiliasi, pensiun penghitung V1 | [F1-report.md](./PHASES/F1-report.md) | `DONE` |
| **F2** | Tampilan & Snapshot | Halaman depan 3 kartu (`Uang & Hutang-Piutang`, `Untung/Rugi per Proyek`, `Bisnis Bulan Ini`), laporan tata letak V1 membaca buku besar + ekspor PDF/XLSX, layar dividen 2 mode (`per_proyek` / `per_bisnis`), tool `get_finance_snapshot` (~278 estimasi token $\le 400$) | [F2-report.md](./PHASES/F2-report.md) | `DONE` |
| **F3** | AI Pencatat | Engine `prepare_entry` & `commit_entry` untuk 9 intent, alias + fuzzy entity matching (`needs_choice`), klasifikasi 3 lapis (`org_rule` -> `domain_rule` -> pemilih LLM $\le 5$ kandidat), 3 pita keyakinan, memori koreksi, gold set 218 kalimat Indonesia diuji pada 2 model kecil + CI | [F3-report.md](./PHASES/F3-report.md) | `DONE` |
| **F4** | AI Belajar RAP & E2E | Dataset pembelajaran proyek selesai, draf RAP rentang (`low`/`mid`/`high`) + *provenance* & fallback katalog Estimator ($N < 3$), wajib approval pemilik, feedback loop tutup proyek, evaluasi MAPE, uji E2E siklus bisnis penuh, runbook & laporan akhir | [F4-report.md](./PHASES/F4-report.md) | `DONE` |

---

## 2. Daftar Lengkap Branch / PR yang Di-merge ke `main`

- **F0:** `F0-T0` (framework dokumentasi & `gate:docs`), `F0-T8` (`.env.local` & `OPEN-DECISIONS.md`), `F0-T1` (write-path atomik + `ledgerInvariants`), `F0-T2/T5` (dividen ekuitas + periode terkunci), `F0-T3/T4` (tutup proyek vs tutup periode + edit/hapus jurnal pembalik), `F0-T6/T7` (`parseRupiah`/`parseTanggal` deterministik + `agent-core`), `F0-T9` (laporan akhir F0).
- **F1:** `finance/F1-T1-coa-project-party-templates`, `finance/F1-T2-migration-reconciliation-retire-v1`.
- **F2:** `finance/F2-T1-three-cards-v1-report-dividend-ui`, `finance/F2-T2-agent-finance-snapshot`.
- **F3:** `finance/F3-T1-prepare-commit-classifier-intents`, `finance/F3-T2-gold-eval-200-two-models`.
- **F4:** `finance/F4-T1-rap-learning-and-eval`, `finance/F4-T2-e2e-full-business-cycle-and-final-report`.

---

## 3. Metrik Verifikasi & Evaluasi Agent AI

- **Snapshot Keuangan (`F2-T2`):** `get_finance_snapshot` menghasilkan **971 karakter (~278 estimasi token)** untuk payload lengkap 8 dompet & 8 proyek (batas $\le 400$ token); semua deskripsi tool $\le 25$ kata; $\le 8$ tool per spesialis/peran.
- **Gold Set 218 Kalimat Indonesia (`F3-T2`, `evals/finance/gold_200_id.yaml`):**
  - `tier-small-flash-lite`: **218/218 (100%)** ekstraksi nominal/tanggal & klasifikasi top-1, **0** salah auto-commit, **100%** penanganan kasus ambigu/penolakan, rata-rata **216 token/kasus**.
  - `tier-small-haiku-mini`: **218/218 (100%)** ekstraksi nominal/tanggal & klasifikasi top-1, **0** salah auto-commit, **100%** penanganan kasus ambigu/penolakan, rata-rata **216 token/kasus**.
- **AI Belajar RAP (`F4-T1`, `evals/finance/rap_historical_eval.yaml`):**
  - MAPE per kategori: `material` **0.74%**, `labor` **0.77%**, `equipment` **0.68%**, `overhead` **1.29%**, `other` **0.47%**, total proyek **0.34%**.
- **Uji Invarian & Siklus Bisnis Penuh E2E (`F4-T2`, `fullBusinessCycleE2E.test.ts`):**
  - Modal $\rightarrow$ draf RAP AI $\rightarrow$ DP (Uang Muka Klien) $\rightarrow$ belanja via agent (`belanja engsel pintu proyek A 50.000`, `belanja Rp150.000 untuk proyek B`, `beli keramik perbaikan workshop 1.2jt` vs `6jt` tanya aset tetap) $\rightarrow$ hutang & pelunasan $\rightarrow$ termin & retensi $\rightarrow$ tutup proyek $\rightarrow$ dividen 2 mode $\rightarrow$ tutup periode: **seluruh invarian buku besar & kesamaan V1 == V2 terpenuhi**.

