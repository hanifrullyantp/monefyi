# FINAL-REPORT — Pembangunan & Penguatan Sistem Keuangan Froyek (Program F0–F4 & G0–G6)

**Tanggal Penutupan Program:** 2026-11-24  
**Status Program:** `COMPLETED` (Seluruh gerbang verifikasi lokal F0–F4 & G0–G6 hijau; **13 file migrasi SQL lokal berstatus `BLOCKED remote`** dan menunggu eksekusi operator via `DEPLOY-RUNBOOK.md`)

---

## TINDAKAN PEMILIK (Prioritas Wajib Sebelum Aktivasi Produksi)

1. **Rotate Semua Token `apps/web/.env.local` Secara Manual (`F0-T8`):**  
   `apps/web/.env.local` sempat terlacak di indeks Git pada awal program dan telah dikeluarkan (`git rm --cached` + `.gitignore`). Pemilik **WAJIB** merotasi manual seluruh token yang pernah tersimpan di file tersebut (Supabase key, token Vercel, kunci AI).
2. **Backup Database & Eksekusi 13 Migrasi SQL Lokal via `DEPLOY-RUNBOOK.md`:**  
   Sesuai aturan keras larangan push/deploy otomatis ke produksi, seluruh **13 file migrasi SQL** ditulis lokal di `my-supabase-project/supabase/migrations/` dengan status **`BLOCKED remote`**. Lakukan backup penuh terlebih dahulu, uji paritas offline lokal (`g0-owner-local-parity-check.mjs --input ...`), jalankan Langkah 1–13 berurutan, lalu jalankan `planner_migrate_f1_ledger(..., true)` (dry-run) sebelum `false`.
3. **Isi Profil Pajak Organisasi (`planner_org_tax_configs`) & Tinjau `OPEN-QUESTIONS.md`:**  
   Sesuai `D-G4-01`, aplikasi tidak pernah menebak tarif pajak (`config_required`). Pemilik/konsultan pajak wajib mengisi tarif PPN, rezim/tarif PPh, `regulation_ref`, dan `verified_at` di database sebelum memakai fitur draf pajak.
4. **Aktifkan Awal pada Level `L1` + Mode Bayangan:**  
   Jangan langsung mengaktifkan otonomi `L2` di hari pertama produksi (lihat Rekomendasi Otonomi di Bagian 5).

---

## 1. Ringkasan Capaian Program (F0–F4 & G0–G6)

### A. Fondasi Akuntansi & AI Pencatat (`F0`–`F4`)
| Fase | Nama | Cakupan Utama | Laporan | Status |
|---|---|---|---|---|
| **F0** | Kebenaran Akuntansi (`T0`–`T9`) | Jalur tulis atomik, dividen ekuitas, cegah double-counting tutup proyek vs tutup periode, imutabilitas jurnal + soft-delete, `.env.local` guard, parser deterministik, `gate:docs` | [F0-report.md](./PHASES/F0-report.md) | `DONE` |
| **F1** | Akun Baru & Dimensi Proyek | COA lengkap, 24+ template kejadian tertutup, migrasi + rekonsiliasi, pensiun penghitung V1 | [F1-report.md](./PHASES/F1-report.md) | `DONE` |
| **F2** | Tampilan & Snapshot | Halaman depan 3 kartu, laporan V1 membaca buku besar + PDF/XLSX, dividen 2 mode, `get_finance_snapshot` (~278 token) | [F2-report.md](./PHASES/F2-report.md) | `DONE` |
| **F3** | AI Pencatat | `prepare_entry` & `commit_entry`, klasifikasi 3 lapis, 3 pita keyakinan, memori koreksi, gold set 218 kalimat pada 2 model kecil (218/218) | [F3-report.md](./PHASES/F3-report.md) | `DONE` |
| **F4** | AI Belajar RAP & E2E | Dataset pembelajaran proyek selesai, draf RAP rentang + provenance, evaluasi MAPE (0.34%), uji E2E F0–F4 | [F4-report.md](./PHASES/F4-report.md) | `DONE` |

### B. Penguatan Kebenaran, 3 Peran Agen, & Tata Kelola (`G0`–`G6`)
| Fase | Nama | Cakupan Utama | Laporan | Status |
|---|---|---|---|---|
| **G0** | Kebenaran Buku Besar & Migrasi Nyata | Rekonsiliasi F1 append-only (`G0-1`), paritas RPC vs domain (`G0-2`), taksonomi 4 kategori & Neraca bersih (`G0-3`), trigger imutabilitas 3 tabel (`G0-4`), pengakuan DP progres/termin (`G0-5`), `party_id` & pinjaman antar proyek 4-baris (`G0-6`), dry-run sintetis 596 transaksi (`G0-7`), & skrip paritas 100% offline (`G0-8`) | [G0-report.md](./PHASES/G0-report.md) | `DONE` |
| **G1** | Alur Bukti, Mutasi Bank, & Deteksi Anomali | Ekstraksi nota OCR $\rightarrow$ draf + lampiran SHA-256 terikat jurnal (`G1-1`), impor mutasi CSV BCA/Mandiri/BRI/BNI/Generic + rekonsiliasi (`G1-2`), deteksi duplikat/janggal, 4 intent baru, & eval dev/held-out adversarial (`G1-3`) | [G1-report.md](./PHASES/G1-report.md) | `DONE` |
| **G2** | Asisten Keuangan Proaktif & Audit | Aging 5 bucket, skor risiko klien, peringatan proyek/kas, checklist tutup bulan 6 butir (`G2-1`), cron multitenant ber-`dedupeKey`, draf penagihan WA/Email L1 + SoD + jejak audit (`G2-2`) | [G2-report.md](./PHASES/G2-report.md) | `DONE` |
| **G3** | Financial Advisor Deterministik | Forecast 13 minggu 3 skenario, margin + EAC 6 kategori, rekomendasi harga, what-if 3 skenario, prioritas bayar hutang (`G3-1`), penjaga angka narasi, backtest sintetis, & tool `get_advisor_brief` `<= 400` token (`G3-2`) | [G3-report.md](./PHASES/G3-report.md) | `DONE` |
| **G4** | CFO Analytics, Laporan Direksi, Pajak, & Modal | Budget vs actual (`>= 10%`), KPI aman div-0, simulasi dividen 2 mode, laporan direksi PDF SHA-256 + isolasi periode terkunci (`G4-1`), pajak konfigurabel tanpa hardcode, penyusutan tolak `periode_terkunci`, amortisasi & skenario tahunan (`G4-2`) | [G4-report.md](./PHASES/G4-report.md) | `DONE` |
| **G5** | Trust, Otonomi Berbasis Bukti, & Keamanan | Shadow mode, promosi `L2` (`N >= 30`, `>= 98%`, `0` critical), larangan L2 aksi berisiko tinggi, auto-demote `L2 -> L1`, kill switch/SoD/cap/lintas-tenant (`authorizeAgentAction`), prosedur insiden jurnal pembalik seimbang + post-mortem, ekspor audit JSON/CSV, 5 simulasi serangan ditolak 100% | [G5-report.md](./PHASES/G5-report.md) | `DONE` |
| **G6** | Penutupan Program, Hardening G5, & E2E G0–G5 | Hardening `authorizeAgentAction` (cegah `requiresApproval: false` mematikan approval aksi berisiko tinggi), uji E2E terpadu siklus penuh `g6FullProgramE2E.test.ts`, pembaruan runbook, panduan pengguna per peran, & laporan akhir jujur | [G6-report.md](./PHASES/G6-report.md) | `DONE` |

---

## 2. Pemisahan Tegas: Apa yang Terbukti vs Apa yang Hanya Diuji Sintetis / In-Memory

### A. Apa yang Terbukti Secara Deterministik & Lokal
1. **Invarian Double-Entry & Kebenaran Kode Deterministik:**
   - Seluruh angka (nominal Rupiah integer `toRupiah`, template jurnal tertutup `FINANCE_EVENT_CODES`, pengakuan pendapatan DP, pinjaman antar proyek 4-baris, rekonsiliasi bank, aging, forecast 13 minggu, margin/EAC, KPI CFO, pajak konfigurabel, penyusutan, amortisasi, hingga jurnal pembalik insiden) dihitung oleh kode TypeScript deterministik di `packages/domain/src/*` dan `apps/web/src/lib/financeV2/*` — **0 perhitungan oleh LLM**.
   - Imutabilitas jurnal (`SELECT`/`INSERT` saja; `UPDATE`/`DELETE` ditolak dengan `JournalImmutabilityError` / `ERRCODE = '55000'`), isolasi multi-tenant, Segregation of Duties (`approvedBy !== createdBy`), dan penjaga narasi (`verifyNarrativeNumbersMatchSource` menolak 100% angka halusinasi) teruji pada unit test, simulasi serangan, dan E2E terpadu.
2. **Hasil Seluruh Gerbang Verifikasi Lokal Aktual (Pasca-Edit Final G6):**
   - `npm run typecheck:web` (`tsc --noEmit`): **PASS** (exit code `0`).
   - `npm run test:web` (`vitest run`): **PASS** — **102 file uji lulus (102/102), 726 kasus uji lulus (726/726)**, termasuk `g6FullProgramE2E.test.ts` (siklus penuh terpadu G0–G5), `g5TrustAndAttackSim.test.ts` (`12/12`), `journalImmutability.test.ts` (`4/4`), `rpcDomainParity.test.ts`, dan `financeAgentEval.test.ts` (`218/218` pada 2 profil model kecil).
   - `node scripts/g0-staging-migration-dryrun.mjs`: **PASS** (`matched: true`, `balanceSheetBalanced: true`, `expenseInAktiva: 0`).
   - `node scripts/g0-owner-local-parity-check.mjs --demo-synthetic`: **PASS** (`OFFLINE_LOCAL_ONLY`, `matched: true`, `neraca.isBalanced: true`).
   - `npm run gate:docs`: **PASS** (seluruh perubahan file keuangan disertai entri `docs/finance/CHANGELOG.md`).
   - `npm run gate:rebrand`: **PASS** (`Files scanned: 1202`, `Allowlisted legacy occurrences: 1557`, `Unapproved violations: 0`).

### B. Apa yang Hanya Diuji Secara Sintetis / In-Memory / Mock (Belum Produksi Nyata)
1. **13 File Migrasi SQL Lokal (`BLOCKED remote`):**
   - Seluruh migrasi `F0` s.d. `G5` (`20261124100000` s.d. `20261124180000`) baru diverifikasi melalui pemindaian statis & kontrak (`journalImmutability.test.ts`, `rpcDomainParity.test.ts`, dll.), **belum pernah dijalankan di atas instance PostgreSQL Supabase remote/produksi**.
2. **Uji Skala Besar & Paritas Data (`G0-7` & `G0-8`):**
   - `g0-staging-migration-dryrun.mjs` memakai **dataset sintetis** (`seed: 20261124`, 596 transaksi).
   - `g0-owner-local-parity-check.mjs` baru dijalankan pada mode `--demo-synthetic`; pengecekan terhadap **data produksi nyata** via `--input <export.json>` wajib dilakukan langsung oleh pemilik di mesin lokalnya.
3. **Evaluasi AI & Backtest Forecast (`F3-2`, `F4-1`, `G1-3`, `G3-2`):**
   - Gold set F3 (`218` kalimat), dev/held-out adversarial G1 (`20` + `30` kasus), evaluasi MAPE RAP F4 (`0.34%`), dan backtest forecast 13 minggu G3 (`5` jendela: `3` normal `MAPE 4,42%` vs `2` shock `MAPE 216,47%` gagal jujur) seluruhnya memakai **dataset sintetis / kurasi pengembang** dan pemilih kandidat deterministik lokal — belum dievaluasi terhadap nota foto OCR nyata, CSV mutasi bank riil pemilik, atau lalu lintas LLM produksi langsung.
4. **Layanan Persistensi & Integrasi Runtime:**
   - Layanan di `apps/web/src/services/financeV2/*` diuji menggunakan mock klien Supabase (`vi.mock`); adapter cron scheduler produksi, gateway pengiriman WhatsApp/Email nyata, serta layar UI web terpadu untuk modul G1–G5 berada di luar cakupan eksekusi domain lokal F0–G6 ini dan perlu disambungkan sebelum peluncuran fitur antarmuka terkait.

---

## 3. Risiko Tersisa (Sebelum & Sesudah Aktivasi Produksi)

### A. Sebelum Aktivasi Produksi
1. **Token `.env.local` Belum Dirotasi:** Kebocoran historis di indeks Git tetap menjadi risiko keamanan hingga seluruh kunci dirotasi manual.
2. **Skema DB Remote Belum Tersinkronisasi:** Selama 13 migrasi SQL berstatus `BLOCKED remote`, aplikasi web tidak boleh diarahkan ke fitur yang mengandalkan tabel/kolom/RPC baru (`planner_journal_attachments`, `planner_bank_statement_rows`, `planner_org_tax_configs`, `planner_autonomy_policies`, dll.).
3. **Paritas Data Historis Pemilik Belum Terverifikasi:** Anomali data lama di DB produksi (mis. baris tanpa `journal_entry_id` atau akun legacy) hanya akan terlihat saat pemilik menjalankan `g0-owner-local-parity-check.mjs --input ...`.

### B. Sesudah Aktivasi Produksi
1. **Kinerja Forecast saat Shock Eksternal:** Backtest G3-2 membuktikan forecast skenario `base` gagal (`MAPE > 200%`) ketika terjadi keterlambatan termin besar atau lonjakan material mendadak; operator wajib selalu membaca skenario `worst` dan `firstNegativeCashDate`.
2. **Ketergantungan Konfigurasi Pajak pada Operator:** Tarif pajak bergantung sepenuhnya pada akurasi input `planner_org_tax_configs` dan review berkala (`<= 180` hari) oleh konsultan pajak.
3. **Kualitas OCR Nota Fisik Lapangan:** Nota tulisan tangan, foto buram, atau format thermal pudar di lapangan berpotensi menurunkan akurasi OCR dibanding teks bersih sintetis; itulah sebabnya alur nota wajib tetap berada di status draf (`requiresReview: true`).

---

## 4. Rekomendasi Tingkat Otonomi yang Boleh Diaktifkan Hari Ini

**Rekomendasi Keras:** Aktifkan sistem di produksi hari ini **HANYA pada level `L1` (Asisten Draf + Konfirmasi Manusia) dengan Mode Bayangan (`Shadow Mode`) aktif**.

### A. Aksi yang SELALU Wajib Persetujuan Manusia + SoD (Dilarang Naik ke `L2` Selamanya)
Sesuai `packages/domain/src/autonomyGovernance.ts` (`isHighRiskAutonomyAction` & hardening G6 yang memastikan `requiresApproval: false` tidak pernah bisa mematikan persetujuan pada aksi berisiko tinggi):
1. **`dividen`** (pembagian dividen / prive)
2. **`tutup_proyek`** & **`tutup_periode`** (penguncian buku besar)
3. **`write_off`** (penghapusan piutang/aset)
4. **`pinjaman_antar_proyek`** (transfer kas lintas proyek)
5. **`pembayaran_keluar` di atas ambang `Rp 10.000.000` (pita `large`)**
6. **Pengiriman penagihan eksternal (`whatsapp`/`email`) & jurnal pembalik / post-mortem insiden** (wajib **Segregation of Duties**: `approvedBy !== createdBy` dan `auditLogId` non-kosong).

### B. Syarat Objektif Kenaikan ke `L2` per Irisan `(intent, category, amountBand)` (`D-G5-01`)
Kenaikan ke `L2` hanya boleh dipertimbangkan secara **bertahap per irisan** (hanya untuk transaksi risiko rendah seperti biaya operasional/material rutin pita `small`/`medium`) apabila bukti Mode Bayangan nyata di produksi memenuhi **seluruh** syarat berikut:
- **`N >= 30`** transaksi nyata pada irisan `(intent, category, amountBand)` tersebut;
- **Tingkat kesepakatan (`agreementRate`) `>= 98%`** antara draf agen dan keputusan akhir manusia;
- **`0` kesalahan kritis** (`wrong_amount`, `wrong_party`, `duplicate_entry`, `wrong_direction`);
- **Auto-Demote Otomatis (`L2 -> L1`):** Begitu muncul **1 kesalahan kritis** atau akurasi turun di bawah **`98%`**, sistem wajib otomatis menurunkan irisan tersebut kembali ke **`L1`**.
