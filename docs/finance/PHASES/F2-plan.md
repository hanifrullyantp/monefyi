# Rencana Fase F2 — Tampilan, Laporan V1 dari Buku Besar, Dividen 2 Mode, & Snapshot Agent

**Tanggal:** 2026-11-24  
**Orkestrator:** Argon  
**Status:** `IN_PROGRESS`

---

## Tujuan Fase F2
1. **Halaman Depan 3 Kartu** (`overviewCards.ts`, `overviewCardsService.ts`, `FinanceOverviewThreeCards.tsx`):
   - **Kartu 1 — Uang & Hutang-Piutang:** kas per dompet, piutang usaha & retensi jatuh tempo, hutang jatuh tempo, likuiditas bersih.
   - **Kartu 2 — Untung/Rugi per Proyek:** omzet, HPP realisasi, profit, margin %, RAP vs realisasi per proyek dari buku besar.
   - **Kartu 3 — Bisnis Bulan Ini:** profit kotor (jumlah profit proyek) $\rightarrow$ biaya usaha (plan vs realisasi opex) $\rightarrow$ profit bersih.
2. **Laporan Tata Letak V1 dari Buku Besar & Ekspor** (`LaporanPage.tsx`, `businessReportService.ts`, `exportPdf.ts`, `exportXlsx.ts`):
   - Memastikan ringkasan V1 (omzet proyek, HPP per tipe RAP, profit kotor, opex per kategori, profit bersih, margin %) + Neraca + Arus Kas + Tutup Periode semuanya konsisten dari buku besar dan ekspor PDF/XLSX tetap berjalan.
3. **Layar Dividen Dua Mode** (`dividendModes.ts`, `DividendTwoModePanel.tsx`):
   - Mode **Per Proyek** (pool proyek setelah realisasi & offset piutang owner, dibatasi kas proyek).
   - Mode **Per Bisnis** (dari `Laba Ditahan`, dibatasi kas tersedia $-$ cadangan opex default $1\times$ opex terencana bulanan per `D-F2-01`).
4. **Agent-Ready (`F2-T2`):**
   - Tool `get_finance_snapshot` ($\le 400$ token) & ringkasan laporan di `agent-core`, entri `AGENT-GUIDE.md`, kasus uji di `evals/finance/`, laporan `F2-report.md`.

