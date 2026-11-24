# Laporan Gerbang Fase G3 — Financial Advisor Deterministik, Penjaga Narasi, Backtest Forecast, & Tool `get_advisor_brief`

**Tanggal Terbit:** 2026-11-24  
**Program:** G0–G6 Keuangan Froyek  
**Status Fase G3:** `DONE` (`G3-1` & `G3-2` selesai; murni domain deterministik + tool `agent-core`, tanpa migrasi SQL baru; seluruh data backtest dan skenario uji masih berbasis **data sintetis** in-memory dan belum diuji terhadap riwayat kas nyata pemilik di produksi)

---

## 1. Ringkasan Status `G3-1` sampai `G3-2`

| Tugas | Status | Apa yang Terbukti (Kode & Tes Lokal) | Apa yang Hanya Diuji Sintetis / Mock | Status Remote / Produksi |
|---|---|---|---|---|
| **G3-1** (Mesin Analisis Deterministik Financial Advisor) | `DONE` | Modul domain `packages/domain/src/financialAdvisor.ts`: `forecastCashFlow13Weeks` (3 skenario `base`/`worst`/`best`, 13 minggu, `firstNegativeCashDate`), `analyzeProjectMargin` (6 kategori RAP vs realisasi + EAC `cpi_performance`/`baseline_remaining_rap` + `topVarianceDrivers`), `recommendProjectPricing` (historis `N >= 3` vs fallback katalog `-5%/0%/+5%`), `runAdvisorWhatIf` (3 skenario: `client_delay`, `take_new_project`, `pay_payable_early`), dan `prioritizePayables` (hierarki jatuh tempo > proyek aktif/kritis > pajak/denda dengan alokasi kas utuh), seluruhnya integer rupiah `toRupiah`, `provenance`, dan disclaimer `"Bukan nasihat hukum/pajak berlisensi"` (`financialAdvisor.test.ts`: `12` tes lulus). | Seluruh masukan proyek, piutang, hutang, termin, dan riwayat margin bersifat skenario sintetis; belum terhubung ke UI web terpadu maupun kueri buku besar produksi. | Kode domain lokal (tanpa migrasi SQL baru) |
| **G3-2** (Penjaga Angka & Provenance Narasi, Backtest Forecast, & Tool `get_advisor_brief`) | `DONE` | `packages/domain/src/advisorNarrationGuard.ts` (`formatAdvisorMobileAnswer` 5 bagian `<= 400` token, `extractNumbersFromNarrative`, `verifyNarrativeNumbersMatchSource` menolak angka tanpa sumber, `runCashFlowForecastBacktest` dengan pelaporan kasus gagal jujur), `agent-core/src/advisorTools.ts` (`buildAdvisorBriefTool` `<= 400` token JSON, terukur `358` token untuk ringkasan gabungan), registrasi `get_advisor_brief` pada spesialis `'advisor'` di `agent-core/src/registry.ts` (menjaga `finance/manager` tetap `8` tool), regenerasi `AGENT_MANUAL.md`/`functions.json`/`mcp.json`/`fixtures.json`, serta suite TDD `advisorGuardAndBacktest.test.ts` (`6` tes lulus). | Backtest forecast 13 minggu dijalankan di atas 5 jendela **data sintetis** (`datasetKind: 'synthetic'`); `buildAdvisorBriefTool` diuji di level fungsi deterministik tanpa pemanggilan LLM eksternal atau adaptor layanan Supabase langsung. | Kode domain & `agent-core` lokal (tanpa migrasi SQL baru) |

---

## 2. Hasil Backtest Forecast Arus Kas 13 Minggu (**Data Sintetis**)

> **Catatan Kejujuran Dataset:** Seluruh metrik backtest di bawah ini dihitung menggunakan `runCashFlowForecastBacktest` terhadap **5 jendela historis sintetis** (`3` kasus normal + `2` kasus shock/gagal), **bukan** data riil historis dari basis data produksi pemilik.

### 2.1 Ringkasan Agregat MAPE (`advisorGuardAndBacktest.test.ts`)
- **Total Kasus Diuji:** `5` (`3` normal, `2` shock)
- **Kasus Gagal (`failedCase: true`, `mapePct > 20%` atau kas negatif tak terprediksi):** **`2` kasus** (100% dilaporkan terbuka, tidak ada yang disembunyikan)
- **MAPE Kasus Normal (`normalMapePct`):** **`4,42%`**
- **MAPE Kasus Shock / Gagal (`shockMapePct` / `failedMapePct`):** **`216,47%`**
- **MAPE Gabungan (`overallMapePct`):** **`89,24%`**

### 2.2 Rincian Per Kasus (Normal vs Shock/Gagal)

| Case ID | Label Kasus | Kategori | MAPE (%) | Kas Negatif Tak Terprediksi | Status | Penyebab Tercatat |
|---|---|---|---|---|---|---|
| `norm-1` | Proyek Rumah Stabil (Q4) | Normal (`synthetic`) | `2.99%` | Tidak | Lulus | `-` |
| `norm-2` | Proyek Ruko 2 Termin (Q3) | Normal (`synthetic`) | `4.82%` | Tidak | Lulus | `-` |
| `norm-3` | Proyek Renovasi Kecil (Q2) | Normal (`synthetic`) | `5.44%` | Tidak | Lulus | `-` |
| `shock-late-client` | Klien Telat Bayar 30 Hari | Shock (`synthetic`) | `205.94%` | **Ya** | **GAGAL (`failedCase: true`)** | `klien telat tak terduga (+30 hari pencairan termin Rp 60jt)` |
| `shock-material-spike` | Lonjakan Biaya Material Tak Terduga | Shock (`synthetic`) | `226.99%` | **Ya** | **GAGAL (`failedCase: true`)** | `lonjakan biaya material Rp 90jt di luar jadwal payable awal` |

**Pelajaran Model:** Forecast deterministik skenario `base` akurat pada pola proyek stabil (`MAPE 2,99%–5,44%`), namun sangat rentan terhadap shock penundaan termin tunggal maupun belanja material besar di luar jadwal (`MAPE > 200%` dan pembalikan saldo kas menjadi negatif). Karena itu, tampilan produk wajib selalu menyandingkan skenario `worst` bersama `base` dan menampilkan asumsi + risiko secara eksplisit.

---

## 3. Bukti Penjaga Narasi, Provenance, & Tool `get_advisor_brief`

1. **Ekstraksi & Verifikasi Angka (`extractNumbersFromNarrative` & `verifyNarrativeNumbersMatchSource`):**
   - Mengekstrak format rupiah (`Rp 15.000.000`, `-Rp 24.000.000`), singkatan (`15jt`, `500rb`), persentase (`12,5%`), serta angka berdiri sendiri (`42`), sambil mengecualikan nomor urut daftar (`1.`, `2.`), tanggal ISO (`YYYY-MM-DD`), pengenal alfanumerik (`proj-1`, `forecastCashFlow13Weeks`), dan token struktural sah (`allowedLiteralTokens: ['13 minggu']`).
   - **Kasus Sah (`formatAdvisorMobileAnswer`):** Jawaban 5 bagian (Kesimpulan 1 kalimat $\rightarrow$ Angka Kunci + sumber $\rightarrow$ Asumsi $\rightarrow$ Risiko $\rightarrow$ Langkah Disarankan + disclaimer `"Bukan nasihat hukum/pajak berlisensi"`) terjaga `<= 400` estimasi token dan lolos `verifyNarrativeNumbersMatchSource` dengan `ok: true`, `unsourcedNumbers: []`.
   - **Kasus Halusinasi LLM (DITOLAK):**
     - Narasi menyisipkan `"margin naik ke 42%"` $\rightarrow$ ditolak `ok: false`, `reason: 'unsourced_numbers_detected'`, `unsourcedNumbers: [42]`.
     - Narasi menyisipkan `"kas aman Rp 99.000.000 dan dana darurat 15jt"` $\rightarrow$ ditolak `ok: false`, `unsourcedNumbers: [99_000_000, 15_000_000]`.
     - Narasi membalik tanda `-24.000.000` menjadi `Rp 24.000.000` positif $\rightarrow$ ditolak `ok: false`, `unsourcedNumbers: [24_000_000]`.
2. **Tool Agent `get_advisor_brief` (`agent-core/src/advisorTools.ts` & `registry.ts`):**
   - Terdaftar di `TOOLS` pada domain spesialis `'advisor'` (`minRole: 'manager'`, deskripsi 14 kata `<= 25` kata, 2 argumen `<= 6` argumen), sehingga `toolsFor('finance', 'manager').length` dan `toolsFor('manager', 'manager').length` tetap `8 <= 8` dan `assertRegistry()` mengembalikan `[]`.
   - `buildAdvisorBriefTool` untuk ringkasan gabungan (forecast 13 minggu + margin/EAC + prioritas hutang) menghasilkan payload JSON terukur **`358` token** (`<= 400` token) dengan `metrics` ber-provenance (`source`, `period`), `assumptions`, `risks`, `nextSteps`, dan `disclaimer`; seluruh angka dalam field naratifnya lolos `verifyNarrativeNumbersMatchSource` (`100%`).
   - `docs/finance/AGENT-GUIDE.md` diperbarui dan tetap lulus batas `<= 1.500` token di `financeEntryEngine.test.ts`.

---

## 4. Bukti Verifikasi Lokal (`typecheck`, `vitest`, `gate:docs`, `gate:rebrand`)

Hasil eksekusi aktual pada branch `feat/g3-2-advisor-tools-narration-guard-backtest`:

- `npm run typecheck:web` (`tsc --noEmit`): **PASS** (exit code `0`).
- `npm run test:web` (`vitest run`): **PASS** — **98 test files passed (98), 694 tests passed (694)**:
  - `src/lib/financeV2/__tests__/financialAdvisor.test.ts` (**12** tests passed)
  - `src/lib/financeV2/__tests__/advisorGuardAndBacktest.test.ts` (**6** tests passed)
  - `src/lib/agentTools.test.ts` (**8** tests passed)
  - `src/lib/channel.test.ts` (**13** tests passed)
  - `src/lib/financeEntryEngine.test.ts` (**6** tests passed — termasuk anggaran token `AGENT-GUIDE.md <= 1.500`)
  - `src/lib/financeV2/__tests__/journalImmutability.test.ts` (**4** tests passed)
- `npm run gate:docs`: **PASS** (`Touched finance files: 5`, `CHANGELOG updated: true`).
- `npm run gate:rebrand`: **PASS** (`Files scanned: 1198`, `Allowlisted legacy occurrences: 1537`, `Unapproved violations: 0`).

---

## 5. Sisa Risiko & Tindak Lanjut Menuju `G4`

1. **Backtest Masih Menggunakan Data Sintetis:**
   Kalibrasi keterlambatan rata-rata klien dan buffer proyeksi perlu divalidasi ulang pada data historis nyata pemilik setelah migrasi SQL `F0`–`G2` (yang saat ini berstatus `BLOCKED remote`) dijalankan oleh operator.
2. **Integrasi Runtime Layanan & UI Web Terpadu (`G4`):**
   `buildAdvisorBriefTool` dan `formatAdvisorMobileAnswer` baru siap sebagai modul domain + `agent-core`; penghubung ke query Supabase (`financeV2`), UI review terpadu (OCR, mutasi bank, duplikat, approval draf penagihan SoD, tutup bulan, & panel Financial Advisor), serta runtime chat agent menjadi cakupan fase `G4`.
3. **Kewaspadaan Shock Eksternal pada Forecast `base`:**
   Seperti terbukti pada kasus gagal `shock-late-client` (`205,94%`) dan `shock-material-spike` (`226,99%`), advisor harus selalu menyorot tanggal defisit pada skenario `worst` agar pengguna tidak hanya bertumpu pada proyeksi `base`.
