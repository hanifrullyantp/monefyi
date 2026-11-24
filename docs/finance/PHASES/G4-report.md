# Laporan Gerbang Fase G4 — CFO Analytics, Laporan Bulanan Direksi, Pajak Konfigurabel, Aset Tetap, Pendanaan, & Skenario Tahunan

**Tanggal Terbit:** 2026-11-24  
**Program:** G0–G6 Keuangan Froyek  
**Status Fase G4:** `DONE` (`G4-1` & `G4-2` selesai; seluruh perhitungan domain deterministik & teruji lokal; migrasi SQL `20261124170000_g4_cfo_tax_config_and_loans.sql` berstatus **`BLOCKED remote`**; seluruh masukan pengujian bersifat **data sintetis** in-memory dan belum tersambung ke UI web terpadu maupun database produksi)

---

## 1. Ringkasan Status `G4-1` sampai `G4-2`

| Tugas | Status | Apa yang Terbukti (Kode & Tes Lokal) | Apa yang Hanya Diuji Sintetis / Mock | Status Remote / Produksi |
|---|---|---|---|---|
| **G4-1** (CFO Anggaran vs Aktual, KPI, Kebijakan Dividen 2 Mode, & Laporan Bulanan Direksi) | `DONE` | Modul `packages/domain/src/cfoAnalytics.ts`: `computeBudgetVsActual` (bulanan/tahunan, pos opex & proyek, ambang varians signifikan `>= 10%` beserta penjelasan), `computeCfoKpis` (`netCash`, `runwayMonths`, margin kotor/bersih, `dsoDays`, `dpoDays`, rasio piutang/pendapatan, konsentrasi klien Top 1/Top 3, utilisasi tim, aman pada `revenue === 0`/`hpp === 0`/`burn === 0`), `simulateDividendPolicyComparison` (per proyek vs per bisnis di bawah kas tersedia, cadangan opex, & laba ditahan), `buildBoardMonthlyReport` (`deterministicHash` SHA-256 + isolasi `lockedPeriodMonth`), dan `renderBoardReportPdfHtml` (1 halaman eksekutif + lampiran, escaping HTML). Terbukti di `cfoAnalytics.test.ts` (**10** tes lulus). | Masukan transaksi buku besar, anggaran, piutang/hutang, margin proyek, dan proyek dividen berupa dataset sintetis in-memory; belum terhubung ke kueri Supabase live atau tombol ekspor PDF di UI web. | Kode domain lokal (tanpa migrasi SQL baru) |
| **G4-2** (Pajak Konfigurabel, Aset Tetap & Penyusutan, Pendanaan/Cicilan, Skenario Tahunan, & SQL Lokal) | `DONE` | Modul `packages/domain/src/cfoTaxAndCapital.ts`: `calculateTaxDraftAndCalendar` (PPN Keluaran/Masukan/Kurang-Lebih Bayar + PPh `pph_final_konstruksi`/`pph_badan`/`pph_final_umkm` + kalender setor/lapor **100% dari `TaxProfileConfig`**, menolak menebak tarif lewat `config_required`, peringatan `"Wajib verifikasi tarif ke regulasi terkini"` saat `verifiedAt` kosong atau `> 180` hari, dan label wajib `"Draf untuk ditinjau konsultan pajak — bukan nasihat hukum/pajak berlisensi"`), `evaluateAssetCapitalization` (ambang dapat diatur, default `5.000.000` sesuai `D-F1-02`, masa manfaat `> 12` bulan), `buildScheduledDepreciationPlan` (garis lurus, batas `residualValue`, template seimbang `depreciationExpense`, menolak tegas `periode_terkunci`), `buildLoanAmortizationSchedule` (`endingBalanceRupiah === 0`), `evaluateWorkingCapitalFundingNeed` (dari forecast 13 minggu vs `minCashBufferRupiah`), dan `buildAnnualScenarioPlan` (12 bulan × 3 skenario `conservative`/`base`/`growth`). Migrasi SQL lokal `20261124170000_g4_cfo_tax_config_and_loans.sql` (`BLOCKED remote`, `planner_org_tax_configs` + `planner_financing_loans`, RLS `is_org_member`, bebas mutasi jurnal). Terbukti di `cfoTaxAndCapital.test.ts` (**9** tes lulus). | Seluruh skenario tarif pajak, aset tetap, jadwal pinjaman, forecast 13 minggu, dan rencana tahunan diuji dengan skenario sintetis in-memory; integrasi CRUD Supabase (`planner_org_tax_configs`, `planner_financing_loans`) belum dipasang ke layanan/UI web. | Migrasi SQL lokal **`BLOCKED remote`** (belum di-push ke produksi) |

---

## 2. Bukti Reproduksibilitas Deterministik Laporan Direksi (`G4-1`)

Pada `apps/web/src/lib/financeV2/__tests__/cfoAnalytics.test.ts`:
1. **Hash Kanonis SHA-256 & HTML PDF 100% Identik:**
   - `buildBoardMonthlyReport` dipanggil dengan `baseReportInput` (`report1`) dan dibandingkan dengan pemanggilan ulang di mana urutan array `ledgerEntries` dibalik (`.reverse()`, `report2`).
   - Hasil terverifikasi: `report1.deterministicHash` berformat SHA-256 64-heksadesimal (`^[a-f0-9]{64}$`), `report1.deterministicHash === report2.deterministicHash`, `expect(report1).toEqual(report2)`, dan `renderBoardReportPdfHtml(report1) === renderBoardReportPdfHtml(report2)` (tanpa `new Date()` maupun ID acak).
2. **Struktur Cetak & Keamanan HTML:**
   - Output HTML memuat bagian `data-section="executive-page-one"` dan `data-section="board-appendix"` (`Lampiran A. Anggaran vs Aktual`, `Lampiran B. Margin & EAC Proyek`, `Lampiran C. Ringkasan Umur Piutang & Hutang`), badge `Periode Terkunci (2026-10-01)`, SHA-256, serta disclaimer `"Bukan nasihat hukum/pajak berlisensi"`.
   - Pengujian injeksi `<script>alert(1)</script>` pada `orgName` ter-escape menjadi `&lt;script&gt;alert(1)&lt;/script&gt;`.

---

## 3. Bukti Uji Lintas-Periode Terkunci (`lockedPeriodMonth` & `lockedPeriods`)

Dua lapis penjaga periode terkunci terverifikasi pada suite tes G4:
1. **Isolasi Laporan Direksi (`buildBoardMonthlyReport` di `cfoAnalytics.test.ts`):**
   - Untuk periode terkunci `lockedPeriodMonth: '2026-10'`, masukan uji disuntikkan gangguan bulan berikutnya (`asOfDate: '2026-11-20'`, pemasukan November `Rp 500.000.000`, opex November `Rp 120.000.000`, item anggaran November `Rp 50.000.000`, piutang terbit November `Rp 300.000.000`, dan hutang terbit November `Rp 200.000.000`).
   - Hasil: `asOfDate` tetap dikunci ke `'2026-10-31'`, `excludedOutOfPeriodCount === 4`, dan seluruh `pageOne` serta `appendix` **100% identik** dengan laporan Oktober tanpa gangguan November.
2. **Penolakan Penyusutan pada Periode Terkunci (`buildScheduledDepreciationPlan` di `cfoTaxAndCapital.test.ts`):**
   - Pemanggilan `buildScheduledDepreciationPlan(assets, '2026-10', ['2026-09', '2026-10-01'])` ditolak tegas dengan `ok: false`, `reason: 'periode_terkunci'`, `entries: []`, dan `totalDepreciationRupiah: 0`.
   - Pada periode terbuka `'2026-11'`, hanya aset aktif yang belum menyentuh `residualValue` yang menghasilkan entri penyusutan (`ast-1` dan `ast-2`, sementara `ast-3` yang sudah mencapai residu dilewati), entri `ast-2` dibatasi dari `500.000` menjadi `300.000` agar `endingBookValueRupiah === 2.000.000` (`>= residualValueRupiah`), dan seluruh template `Dr beban_penyusutan / Cr akumulasi_penyusutan` lulus `linesAreBalanced`.

---

## 4. Bukti Modul Pajak Konfigurabel (Bebas Hardcode), Pendanaan, & Skenario Tahunan (`G4-2`)

1. **Bebas Hardcode Tarif & Tanggal Pajak (`calculateTaxDraftAndCalendar`):**
   - Mengubah `TaxProfileConfig` dari PPh Final Konstruksi `2.65%` + PPN `11%` (setor tgl `15`, lapor tgl `20`) menjadi `1.75%` + PPN `12%` (lebih bayar `Rp 2.000.000`, setor tgl `10`, lapor tgl `30`, periode Desember 2026 $\rightarrow$ jatuh tempo Januari 2027) serta PPh Badan `22%` Non-PKP atas `pkpEstimated` (jatuh tempo lapor tgl `31` di Februari 2026 dibatasi aman ke `2026-02-28`) menghasilkan angka dan kalender yang mengikuti konfigurasi secara deterministik.
   - Saat `taxConfig` kosong (`null`) atau tarif wajib kosong (`ppnRatePct: null`, `incomeTaxRatePct: null`), fungsi mengembalikan `status: 'config_required'` dan `warningCodes` berisi `'config_required'` tanpa menebak tarif.
   - Saat `verifiedAt` kosong atau berusia `> 180` hari terhadap `asOfDate`, peringatan `"Wajib verifikasi tarif ke regulasi terkini"` otomatis muncul.
   - Seluruh keluaran pajak selalu memuat `TAX_DRAFT_DISCLAIMER` (`"Draf untuk ditinjau konsultan pajak — bukan nasihat hukum/pajak berlisensi"`).
2. **Pinjaman, Modal Kerja, & Rencana Tahunan:**
   - `buildLoanAmortizationSchedule` menghasilkan jadwal 12 bulan (bunga `12%/tahun`) dan 3 bulan (bunga `0%`) dengan `endingBalanceRupiah === 0` dan `totalPrincipalRupiah === principalRupiah`.
   - `evaluateWorkingCapitalFundingNeed` atas output `forecastCashFlow13Weeks` mendeteksi kebutuhan modal kerja tepat saat `baseMinEndingCashRupiah < minCashBufferRupiah` sehingga `baseMinEndingCashRupiah + recommendedFundingRupiah === minCashBufferRupiah`.
   - `buildAnnualScenarioPlan` menghasilkan proyeksi 12 bulan × 3 skenario (`conservative <= base <= growth`) yang deterministik 100%.

---

## 5. Status Migrasi SQL Lokal (`BLOCKED remote`)

File migrasi baru pada Fase G4:
- [`my-supabase-project/supabase/migrations/20261124170000_g4_cfo_tax_config_and_loans.sql`](file:///Users/user/Documents/GitHub/monefyi/my-supabase-project/supabase/migrations/20261124170000_g4_cfo_tax_config_and_loans.sql) — **Status: `BLOCKED remote`** (lokal saja, belum dijalankan ke Supabase remote produksi).
  - Membuat tabel `planner_org_tax_configs` (`UNIQUE(org_id)`, menyimpan tarif/rezim pajak konfigurabel, `verified_at`, tanggal setor/lapor, dan `capitalization_threshold_rupiah` default `5000000`) dan `planner_financing_loans`.
  - Mengaktifkan RLS ketat `public.is_org_member(org_id, 'worker' | 'manager')` pada kedua tabel dan tidak melakukan mutasi terhadap `planner_journal_entries`, `planner_journal_lines`, maupun `planner_journal_allocations` (terverifikasi juga oleh `journalImmutability.test.ts`).

---

## 6. Bukti Verifikasi Lokal (`typecheck`, `vitest`, `gate:docs`, `gate:rebrand`)

Hasil eksekusi aktual pada branch `feat/g4-2-cfo-tax-assets-financing-annual-plan`:

- `npm run typecheck:web` (`tsc --noEmit`): **PASS** (exit code `0`).
- `npm run test:web` (`vitest run`): **PASS** — **100 test files passed (100), 713 tests passed (713)**:
  - `src/lib/financeV2/__tests__/cfoAnalytics.test.ts` (**10** tests passed)
  - `src/lib/financeV2/__tests__/cfoTaxAndCapital.test.ts` (**9** tests passed)
  - `src/lib/financeV2/__tests__/journalImmutability.test.ts` (**4** tests passed)
  - `src/lib/financeAgentEval.test.ts` (**3** tests passed — gold set F3 218/218 pada 2 model kecil)
- `npm run gate:docs`: **PASS** (`Changed files inspected: 8`, `Touched finance files: 2`, `CHANGELOG updated: true`).
- `npm run gate:rebrand`: **PASS** (`Files scanned: 1200`, `Allowlisted legacy occurrences: 1542`, `Unapproved violations: 0`).

---

## 7. Sisa Risiko & Tindak Lanjut Menuju `G5`–`G6`

1. **Migrasi SQL `F0`–`G4` Masih `BLOCKED remote`:**
   Seluruh skema baru (termasuk `planner_org_tax_configs` dan `planner_financing_loans` pada Langkah 12 `DEPLOY-RUNBOOK.md`) belum dijalankan di Supabase remote produksi dan menunggu eksekusi operator.
2. **Integrasi Antarmuka Web Terpadu & Layanan DB (`G5`):**
   Modul domain G4 (`cfoAnalytics.ts` & `cfoTaxAndCapital.ts`) baru terverifikasi di level unit/domain dengan dataset sintetis; penghubungan ke halaman web CFO/Direksi, form konfigurasi pajak organisasi, ekspor PDF di browser, review OCR/mutasi bank/duplikat, persetujuan SoD draf WA/Email, serta runtime adapter kanal nyata ber-`audit_log_id` menjadi cakupan Fase `G5`.
3. **Verifikasi Tarif Pajak oleh Konsultan / Pemilik Usaha:**
   Sesuai keputusan `D-G4-01`, aplikasi tidak pernah menetapkan tarif pajak bawaan; sebelum profil pajak dipakai di produksi, pemilik/konsultan pajak wajib mengisi `TaxProfileConfig` beserta `regulation_ref` dan `verified_at` terkini.
