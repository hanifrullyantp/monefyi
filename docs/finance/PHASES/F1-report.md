# Laporan Akhir Fase F1 — Akun Baru & Dimensi Proyek

**Tanggal Selesai:** 2026-11-24  
**Orkestrator:** Argon  
**Status Fase:** `COMPLETED` (otomatis berlanjut ke Fase F2)

---

## 1. Ringkasan Eksekutif

Fase F1 memperluas buku besar dari akun penampung tunggal `laba` menjadi Chart of Accounts (COA) penuh (`Pendapatan Proyek`, `Uang Muka Klien`, `Piutang Usaha`, `Piutang Retensi`, sub-akun `HPP Proyek` sesuai jenis RAP + `hpp_uncategorized`, `Beban Operasional`, `Akumulasi Penyusutan`, `Beban Penyusutan`, `Modal`, `Dividen/Prive`, `Laba Ditahan`), menegakkan dimensi wajib `project_id` dan `party_id`, menyediakan migrasi lokal + dry-run + rekonsiliasi, serta memensiunkan `financeV1` sebagai penghitung.

---

## 2. Daftar PR Fase F1

| PR / Branch | Cakupan | Status |
|---|---|---|
| `finance/F1-T1-coa-project-party-templates` | COA F1 (`financeV2.ts`, `accountService.ts`), 24 enum kejadian tertutup & template (`packages/domain/src/journal.ts`), validasi dimensi `project_id`/`party_id`, tes per template | Merged (`main`) |
| `finance/F1-T2-migration-reconciliation-retire-v1` | Migrasi SQL lokal `20261124120000_f1_coa_and_dimensions.sql` (`BLOCKED remote`), `reconciliation.ts` (`dryRun`), dukungan F1 di `profitLossReport.ts` & `loadReportData.ts`, pensiun penghitung `businessReportService.ts`, `D-F1-01`/`D-F1-02` | Merged (`main`) |

---

## 3. Verifikasi & Metrik

- **Suite Penuh (`typecheck`, `vitest`, `gate:docs`, `gate:rebrand`):** `79/79` file tes, `568/568` tes lulus tanpa error; 0 pelanggaran rebrand; `docs-gate` lulus.

- **Template & Dimensi (`domainJournal.test.ts`):** 24/24 kode kejadian tertutup di `FINANCE_EVENT_CODES` menghasilkan jurnal seimbang ($\sum \text{Dr} = \sum \text{Cr}$) dalam rupiah bulat.
- **Rekonsiliasi Dry-Run (`reconciliation.test.ts`):** Saldo `kas`, `piutang`, `hutang`, dan `netProfit` sebelum dan sesudah migrasi cocok 100%; biaya tanpa `rap_item_id` otomatis dipetakan ke `hpp_uncategorized` dan ditandai `needsReview: true`.
- **Pensiun `financeV1`:** `buildBusinessFinanceReport` kini membaca langsung dari buku besar `financeV2` (`businessReportFromLedger`) dan mempertahankan tata letak laporan V1 untuk Fase F2.
- **Status Migrasi SQL:** `20261124120000_f1_coa_and_dimensions.sql` ditulis lokal (`BLOCKED remote`).

