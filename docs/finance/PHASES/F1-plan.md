# Rencana Fase F1 — Akun Baru, Dimensi Proyek, & Pensiun Penghitung V1

**Fase:** F1  
**Orkestrator:** Argon  
**Tanggal:** 2026-11-24  
**Status:** `IN_PROGRESS`

---

## 1. Tujuan Fase F1

1. Mengganti akun penampung tunggal `laba` dengan Chart of Accounts (COA) yang utuh: Pendapatan Proyek, Uang Muka Klien (kewajiban), Piutang Usaha, Piutang Retensi, HPP Proyek dengan sub-akun RAP (`material`, `labor`, `equipment`, `overhead`, `other`, `uncategorized`), Beban Operasional per kategori, Hutang (dagang/pajak/lain), Aset Tetap + Akumulasi Penyusutan, Beban Penyusutan, Modal, Dividen/Prive, dan Laba Ditahan. Laba periode dihitung dari akun nominal, bukan akun penampung.
2. Memastikan tiap baris jurnal proyek membawa `project_id`, dan tiap baris hutang/piutang membawa `party_id` (dan `project_id` bila terkait proyek).
3. Menyediakan migrasi SQL lokal F1 dengan mode `dry-run` serta fungsi/skrip rekonsiliasi sebelum vs sesudah (kas, hutang, piutang, dan laba harus cocok).
4. Memensiunkan `financeV1` (`businessReportService.ts`) sebagai penghitung tabel operasional sehingga membaca buku besar `financeV2`, sambil mempertahankan format output laporan untuk F2.
5. Memperluas template jurnal & enum kejadian tertutup di `packages/domain/src/journal.ts` untuk seluruh kejadian bisnis beserta unit test per template.

---

## 2. Pembagian PR & Kepemilikan

| PR / Branch | Tugas | Pemilik |
|---|---|---|
| `finance/F1-T1-coa-project-party-templates` | COA baru (`financeV2.ts`, `accountService.ts`), sub-akun HPP RAP, validasi dimensi `project_id`/`party_id`, enum `FinanceEventCode` & template lengkap di `packages/domain/src/journal.ts` + tes per template | Agent Ledger + Agent AI |
| `finance/F1-T2-migration-reconciliation-retire-v1` | Migrasi SQL lokal `20261124120000_f1_coa_and_dimensions.sql` (`BLOCKED remote`), `reconciliation.ts` (`dryRun`), dukungan F1 COA di `profitLossReport.ts` & `loadReportData.ts`, pensiun penghitung `businessReportService.ts`, `DECISIONS.md`, & `F1-report.md` | Agent DB + Agent Ledger + Agent QA + Agent Dokumen |
