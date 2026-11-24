# FINAL-REPORT — Pembangunan & Penguatan Sistem Keuangan Froyek (Program F0–F4, G0–G6, & G7–G11)

**Tanggal Penutupan Program:** 2026-11-24  
**Status Program:** `COMPLETED` (Seluruh gerbang verifikasi otomatis lokal **F0–F4**, **G0–G6**, & **G7–G11** hijau; **16 file migrasi SQL lokal berstatus `BLOCKED remote`** dan menunggu eksekusi operator via `DEPLOY-RUNBOOK.md`; **uji kegunaan lapangan 3–5 tukang/mandor G11 menunggu eksekusi pemilik** via `G11-USABILITY-TEST-PROTOCOL.md`)

---

## TINDAKAN PEMILIK (Prioritas Wajib Sebelum Aktivasi Produksi / Rilis Penuh)

1. **Rotate Semua Token `apps/web/.env.local` Secara Manual (`F0-T8`):**  
   `apps/web/.env.local` sempat terlacak di indeks Git pada awal program dan telah dikeluarkan (`git rm --cached` + `.gitignore`). Pemilik **WAJIB** merotasi manual seluruh token yang pernah tersimpan di file tersebut (Supabase key, token Vercel, kunci AI).
2. **Backup Database & Eksekusi 16 Migrasi SQL Lokal via `DEPLOY-RUNBOOK.md`:**  
   Sesuai aturan keras larangan push/deploy otomatis ke produksi, seluruh **16 file migrasi SQL** ditulis lokal di `my-supabase-project/supabase/migrations/` (`20261124100000` s.d. `20261124200000`) dengan status **`BLOCKED remote`**. Lakukan backup penuh terlebih dahulu, uji paritas offline lokal (`g0-owner-local-parity-check.mjs --input ...`), jalankan Langkah 1–16 berurutan, lalu jalankan `planner_migrate_f1_ledger(..., true)` (dry-run) sebelum `false`.
3. **Isi Profil Pajak, Tarif BPJS/PPh 21, & Tinjau `OPEN-QUESTIONS.md` (`Q-06`):**  
   - Sesuai `D-G4-01` & `G8-2`, aplikasi tidak pernah menebak tarif pajak (`config_required`). Pemilik/konsultan pajak wajib mengisi `planner_org_tax_configs` dan `planner_org_labor_policies.statutory_config_json` (`regulation_ref`, `verified_at`) sebelum memakai draf pajak/BPJS/PPh 21.
   - Tinjau **`Q-06`** di `OPEN-QUESTIONS.md`: putuskan apakah pilot awal memakai adaptor `whatsapp_unofficial` pada nomor khusus (dengan risiko ToS/blokir Meta; `D-G10-01`) atau langsung mengaktifkan WhatsApp Business API resmi (`whatsapp_official`) / Telegram & Web-PWA.
4. **Jalankan Uji Kegunaan Nyata Pra-Rilis Bersama 3–5 Tukang/Mandor (`G11`):**  
   Jalankan skenario 5 tugas pada [`G11-USABILITY-TEST-PROTOCOL.md`](./G11-USABILITY-TEST-PROTOCOL.md) bersama 3–5 pekerja lapangan memakai ponsel sehari-hari (termasuk uji sinyal putus/offline), dan rekam temuan ke jalur umpan balik G7 (`ui_confused` / `user_bug_report`) sebelum rilis ke seluruh proyek.
5. **Aktifkan Awal pada Level `L1` + Mode Bayangan:**  
   Jangan langsung mengaktifkan otonomi `L2` di hari pertama produksi (lihat Rekomendasi Otonomi di Bagian 4).

---

## 1. Ringkasan Capaian Program (F0–F4, G0–G6, & G7–G11)

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

### C. Penguatan Payroll, Observabilitas, PM Agent, Otomasi Operasional, & UX Lapangan (`G7`–`G11`, Urutan: `G8 → G7 → G9 → G10 → G11`)
| Fase | Nama | Cakupan Utama | Laporan | Status |
|---|---|---|---|---|
| **G8** | Kebenaran Payroll, Akrual Upah Proyek, Anti-Kecurangan, & RBAC HRD | Hapus klaim `"LUNAS"` palsu & tarif cadangan `150000`, konfirmasi pembayaran nyata + SoD, rollback error jurnal anti-swallow (`G8-1`), model `day_fraction`, tarif beriwayat `effectiveFrom`, `hutang_gaji` + akrual proyek `Dr hpp_labor / Cr hutang_gaji` & kantor `beban_opex`, BPJS/PPh 21 konfigurabel, kasbon bersaldo (`G8-2`), anti-kecurangan 4 sinyal tanpa penolakan diam-diam & RBAC 4 peran (`G8-3`) | [G8-report.md](./PHASES/G8-report.md) | `DONE` |
| **G7** | Umpan Balik Terpadu, Observabilitas, Anonimisasi PII, & Dasbor Mutu | 5 modul × 8 kategori sinyal (`user_bug_report`, `ui_confused`, `runtime_error`, dll.), anonimisasi PII/rahasia rekursif, opt-out `behavior_friction`, penggabungan `fingerprint` otomatis, kandidat eval wajib `pending_human_review`, `autoModifyCodeOrPromptAllowed: false`, & rekomendasi `L2 -> L1` | [G7-report.md](./PHASES/G7-report.md) | `DONE` |
| **G9** | Agen Project Manager & Guard Foto 100% UI Pekerja | `deriveDailyPlanFromSchedule`, `evaluateProgressUpdateRequest` + guard `validateWorkerProgressUpdate` di `WorkerDashboard.tsx` (pekerja wajib bukti foto/verifikasi supervisor untuk 100%), EAC upah, draf PO stok rendah, laporan klien terredaksi, dampak keterlambatan termin $\rightarrow$ Advisor, todo berbukti, & simulasi 30 hari paritas 3-arah `Rp 13.200.000` | [G9-report.md](./PHASES/G9-report.md) | `DONE` |
| **G10** | Satu Pintu Input, Runtime Tunggal, Gateway Saluran, & Mesin Proaktif | Penyatuan 18 aksi `managerAgentService.ts` ke satu pintu `routeSingleDoorInput` & `prepareUnifiedAction`/`commitUnifiedAction` (`G10-1`), gateway saluran pluggable (`telegram`, `web_pwa`, `whatsapp_unofficial` anti-broadcast & bebas kredensial, `whatsapp_official`), orkestrator proaktif beranggaran gangguan (`<= 3` pertanyaan/orang/hari, jam tenang `20:00–07:00`, stop saat diabaikan + eskalasi), ringkasan pemilik 5 baris, & simulasi 20 orang × 5 proyek × 7 hari (`G10-2`) | [G10-report.md](./PHASES/G10-report.md) | `DONE` |
| **G11** | UX yang Meringankan (Tinjauan GM) & Penutupan Program G7–G11 | `uxLightening.ts`: penjaga 14 jargon akuntansi (`assertNoAccountingJargon`), layar tukang `<= 2` ketukan & 0 ketik angka + transparansi upah, `selectInitialWorkerProjectId` di `WorkerDashboard.tsx` (pre-fill jadwal/tugas bukan proyek aktif pertama + `min-h-11`), antrean offline kronologis idempoten (`OfflineActionQueue`), layar mandor terpadu bebas bocor gaji tim, layar pagi `<= 5` keputusan 1-ketukan, pengukur pengurangan beban, pemeriksa 9 butir gerbang UX, & protokol uji lapangan 3–5 tukang/mandor | [G11-report.md](./PHASES/G11-report.md) | `DONE` |

---

## 2. Pemisahan Tegas: Apa yang Terbukti vs Apa yang Hanya Diuji Sintetis / In-Memory

### A. Apa yang Terbukti Secara Deterministik & Lokal
1. **Invarian Double-Entry, HRD–PM–Buku Besar, & Kode Deterministik:**
   - Seluruh angka (nominal Rupiah integer `toRupiah`, 30 kejadian tertutup `FINANCE_EVENT_CODES`, pengakuan pendapatan DP, pinjaman antar proyek 4-baris, rekonsiliasi bank, aging, forecast 13 minggu, margin/EAC, KPI CFO, pajak & BPJS/PPh 21 konfigurabel, akrual upah proyek `Dr hpp_labor / Cr hutang_gaji`, kasbon bersaldo, serta rincian upah layar tukang) dihitung oleh kode TypeScript deterministik di `packages/domain/src/*` dan `apps/web/src/lib/financeV2/*` — **0 perhitungan oleh LLM**.
   - Imutabilitas jurnal (`SELECT`/`INSERT` saja; `UPDATE`/`DELETE` ditolak dengan `JournalImmutabilityError` / `ERRCODE = '55000'`), isolasi multi-tenant, Segregation of Duties (`approvedBy !== createdBy`), RBAC 4 peran HRD, penjaga foto 100%, satu pintu `prepare`/`commit`, dan penjaga bahasa bebas jargon akuntansi (`assertNoAccountingJargon`) teruji otomatis oleh suite unit, simulasi, dan E2E.
2. **Hasil Seluruh Gerbang Verifikasi Lokal Aktual (Pasca-Edit Final G11):**
   - `npm run typecheck:web` (`tsc --noEmit`): **PASS** (exit code `0`).
   - `npm run test:web` (`vitest run`): **PASS** — **110 file uji lulus (110/110), 793 kasus uji lulus (793/793)** (termasuk `g11UxLighteningAndGate.test.ts` `7/7`, `g10ChannelsAndProactiveSim.test.ts` `4/4`, `g10UnifiedAgentParity.test.ts` `9/9`, `g9ProjectManager30DaySim.test.ts` `4/4`, `g7FeedbackObservability.test.ts` `9/9`, `g8AntiFraudRbacAndGate.test.ts` `10/10`, `g6FullProgramE2E.test.ts` `1/1`, dan `financeAgentEval.test.ts` `218/218` pada 2 model kecil).
   - `npm run gate:docs`: **PASS** (seluruh perubahan file keuangan disertai entri `docs/finance/CHANGELOG.md`).
   - `npm run gate:rebrand`: **PASS** (`Unapproved violations: 0`).

### B. Apa yang Hanya Diuji Secara Sintetis / In-Memory / Mock (Belum Produksi Nyata)
1. **16 File Migrasi SQL Lokal (`BLOCKED remote`):**
   - Seluruh migrasi `F0` s.d. `G10` (`20261124100000` s.d. `20261124200000`, termasuk Langkah 14 `G8-2`, Langkah 15 `G7`, dan Langkah 16 `G10-2`) baru diverifikasi melalui pemindaian statis & kontrak, **belum pernah dijalankan di atas instance PostgreSQL Supabase remote/produksi**.
2. **Uji Skala Besar, Simulasi 30 Hari, & Simulasi 20 Orang × 7 Hari (`G0-7`, `G0-8`, `G9`, `G10`):**
   - `g0-staging-migration-dryrun.mjs` (`596` transaksi), simulasi PM 30 hari G9, dan simulasi 20 orang × 5 proyek × 7 hari G10 seluruhnya berjalan di atas **dataset sintetis in-memory**.
   - `g0-owner-local-parity-check.mjs` baru dijalankan pada `--demo-synthetic`; pengecekan **data produksi nyata** via `--input <export.json>` wajib dijalankan oleh pemilik di mesin lokalnya.
3. **Evaluasi AI, Backtest Forecast, & Layanan Persistensi (`F3`, `F4`, `G1`, `G3`, `G7`):**
   - Seluruh eval AI (`218` kalimat F3, `20+30` kasus G1, `0.34%` RAP F4) dan backtest forecast G3 (`3` normal `MAPE 4,42%` vs `2` shock `MAPE 216,47%` gagal jujur) memakai dataset sintetis/kurasi lokal.
   - Layanan Supabase (`apps/web/src/services/financeV2/*`, `feedbackObservabilityService.ts`) dan gateway saluran Telegram/WhatsApp diuji dengan adapter mock/in-memory, belum terhubung ke webhook/API produksi langsung.
4. **Uji Kegunaan Lapangan Manusia (`G11`):**
   - Pengukur pengurangan beban (`measureUxBurdenReduction`) dan pemeriksa gerbang (`evaluateG11UxChecklist`) diuji otomatis terhadap model tampilan deterministik; **uji kegunaan nyata bersama 3–5 tukang/mandor di lapangan belum dijalankan** dan menunggu eksekusi pemilik menggunakan [`G11-USABILITY-TEST-PROTOCOL.md`](./G11-USABILITY-TEST-PROTOCOL.md).

---

## 3. Risiko Tersisa (Sebelum & Sesudah Aktivasi Produksi)

### A. Sebelum Aktivasi Produksi
1. **Token `.env.local` Belum Dirotasi:** Kebocoran historis di indeks Git tetap menjadi risiko keamanan hingga seluruh kunci dirotasi manual.
2. **Skema DB Remote Belum Tersinkronisasi:** Selama **16 migrasi SQL** berstatus `BLOCKED remote`, aplikasi web tidak boleh diarahkan ke fitur yang mengandalkan tabel/kolom/RPC baru.
3. **Paritas Data Historis & Uji Kegunaan Lapangan Belum Dijalankan:** Anomali data produksi lama hanya terlihat lewat `g0-owner-local-parity-check.mjs --input ...`, dan friksi ponsel lapangan nyata hanya terlihat lewat uji 3–5 tukang/mandor (`G11-USABILITY-TEST-PROTOCOL.md`).
4. **Risiko ToS Adaptor WhatsApp Non-Resmi (`Q-06`):** Jika pemilik memilih pilot `whatsapp_unofficial`, terdapat risiko pemblokiran nomor atau putus sesi QR sehingga hanya disarankan memakai nomor pilot terdedikasi sambil menyiapkan `whatsapp_official` / Telegram / Web-PWA.

### B. Sesudah Aktivasi Produksi
1. **Kinerja Forecast saat Shock Eksternal:** Backtest G3-2 membuktikan forecast `base` gagal (`MAPE > 200%`) saat shock termin/material; operator wajib selalu membaca skenario `worst` dan `firstNegativeCashDate`.
2. **Ketergantungan Konfigurasi Pajak & BPJS pada Operator:** Tarif pajak dan BPJS/PPh 21 bergantung pada keakuratan `planner_org_tax_configs` dan `planner_org_labor_policies.statutory_config_json`.
3. **Kualitas OCR Nota Fisik & Sinyal Lapangan:** Nota tulisan tangan/buram tetap wajib melalui status draf (`requiresReview: true`), dan layar lapangan perlu dipantau melalui antrean umpan balik G7 (`ui_confused`, `user_bug_report`, `runtime_error`).

---

## 4. Rekomendasi Tingkat Otonomi yang Boleh Diaktifkan Hari Ini

**Rekomendasi Keras:** Aktifkan sistem di produksi hari ini **HANYA pada level `L1` (Asisten Draf + Konfirmasi Manusia) dengan Mode Bayangan (`Shadow Mode`) aktif**.

### A. Aksi yang SELALU Wajib Persetujuan Manusia + SoD (Dilarang Naik ke `L2` Selamanya)
Sesuai `packages/domain/src/autonomyGovernance.ts` (`isHighRiskAutonomyAction`) dan `packages/domain/src/unifiedAgentGateway.ts`:
1. **`dividen`** (pembagian dividen / prive)
2. **`tutup_proyek`** & **`tutup_periode`** (penguncian buku besar)
3. **`write_off`** (penghapusan piutang/aset)
4. **`pinjaman_antar_proyek`** (transfer kas lintas proyek)
5. **`pembayaran_keluar` / `record_cost` / `record_income` di atas ambang `Rp 10.000.000` (pita `large`)**
6. **Pengiriman penagihan eksternal (`whatsapp`/`email`), persetujuan payroll/bon (`generate_payroll`, `review_bon`), pembelian stok PO (`pending_human_approval`), serta jurnal pembalik / post-mortem insiden** (wajib **Segregation of Duties**: `approvedBy !== createdBy` dan `auditLogId` non-kosong).

### B. Syarat Objektif Kenaikan ke `L2` per Irisan `(intent, category, amountBand)` (`D-G5-01`)
Kenaikan ke `L2` hanya boleh dipertimbangkan secara **bertahap per irisan** (hanya untuk transaksi risiko rendah seperti biaya operasional/material rutin pita `small`/`medium`) apabila bukti Mode Bayangan nyata di produksi memenuhi **seluruh** syarat berikut:
- **`N >= 30`** transaksi nyata pada irisan `(intent, category, amountBand)` tersebut;
- **Tingkat kesepakatan (`agreementRate`) `>= 98%`** antara draf agen dan keputusan akhir manusia;
- **`0` kesalahan kritis** (`wrong_amount`, `wrong_party`, `duplicate_entry`, `wrong_direction`);
- **Auto-Demote Otomatis (`L2 -> L1`):** Begitu muncul **1 kesalahan kritis** atau akurasi turun di bawah **`98%`** (termasuk dari pantauan G7 `computeQualityDashboard`), sistem wajib otomatis menurunkan irisan tersebut kembali ke **`L1`**.
