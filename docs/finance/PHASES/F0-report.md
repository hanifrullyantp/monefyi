# Laporan Akhir Fase F0 — Kebenaran Akuntansi

**Tanggal Selesai:** 2026-11-24  
**Orkestrator:** Argon  
**Status Fase:** `COMPLETED` (menunggu konfirmasi `"lanjut"` dari pemilik untuk masuk Fase F1)

---

## 1. Ringkasan Eksekutif

Fase F0 menuntaskan seluruh perbaikan kebenaran akuntansi double-entry (`T1`–`T8`) serta gerbang dokumentasi, gerbang keamanan, tes invarian buku besar, dan fondasi deterministik agent (`T0` & `T9`) **tanpa menambah fitur baru** dan **tanpa melakukan push/deploy ke Supabase remote produksi**.

Semua temuan `T1`–`T7` direproduksi lebih dulu dengan unit test Vitest yang gagal (*test-first*), lalu diperbaiki hingga seluruh tes hijau.

---

## 2. Daftar PR Fase F0

| PR / Branch | Cakupan | Status |
|---|---|---|
| `finance/F0-T0-docs-framework` | Kerangka `docs/finance/`, `.github/pull_request_template.md`, `scripts/docs-gate-check.mjs`, `.github/workflows/docs-gate.yml` | Merged (`main`) |
| `finance/F0-T8-remove-env-local` | Keluarkan `apps/web/.env.local` dari Git (`git rm --cached`), tambah ke `.gitignore`, catat kewajiban rotasi token | Merged (`main`) |
| `finance/F0-T1-project-dividend-equity` | Dividen proyek sebagai jurnal ekuitas (`Dr Laba Ditahan, Cr Kas Proyek` & offset `Cr Piutang`), cegah masuk `total_spent` & backfill | Merged (`main`) |
| `finance/F0-T2-T5-profit-loss-single-count` | Hapus double-count laba (`closeProjectFinance` vs `closeFinancePeriod`), hapus klasifikasi HPP berbasis kata `"stok"`, dukung `reversal` & `monthEnd` WIB | Merged (`main`) |
| `finance/F0-T3-T4-atomic-posting-and-reversals` | Posting atomik pemasukan/biaya via RPC + kompensasi rollback (hapus penelan error `console.error`), edit = pembalik + baru, hapus = soft-delete + pembalik | Merged (`main`) |
| `finance/F0-T6-T7-guards-and-atomic-investor` | Blokir tutup proyek jika ada piutang/retensi/hutang terbuka tanpa `ownerWriteOff` pemilik; tolak jurnal periode terkunci; atomisitas `total_invested` & batas dividen investor | Merged (`main`) |
| `finance/F0-T9-invariants-agent-gate-report` | Parser deterministik `parseTanggal`, guard periode terkunci di `prepareRecordCost`, `evals/finance/f0_guardrails.yaml`, tes invarian buku besar, & laporan F0 | Ready to merge |

---

## 3. Verifikasi & Bukti Tes (T1–T8 & Invarian)

| Item | Reproduksi Gagal (Test-First) | Perbaikan & Hasil Uji Akhir |
|---|---|---|
| **T1 (Dividen Proyek)** | Terbukti gagal (2/2): `recordDividendPayouts` menyisipkan ke `planner_cost_realizations` tanpa jurnal; `backfill` & status membaca baris `dividend` | **LULUS**: Jurnal ekuitas `reference_type = 'dividend'` (kas & offset piutang), 0 baris biaya, `backfill` & trigger SQL mengecualikan `'dividend'`/`'cancelled'` |
| **T2 (Laba Terhitung Dua Kali)** | Terbukti gagal: `project_close` terhitung sebagai `otherExpense`, laporan menjadi Rp 0 | **LULUS**: `profitLossReport` mengabaikan `project_close`/`period_close`/`dividend`, `closeFinancePeriod` hanya memindahkan sisa laba yang belum ditutup -> `Laba Ditahan = 40jt`, `Laba Periode = 0` |
| **T3 (Posting Atomik)** | Terbukti gagal (2/2): `createProjectIncome` & `createCostRealization` menelan error `console.error` dan meninggalkan baris yatim tanpa jurnal | **LULUS**: RPC atomik + kompensasi rollback melempar error dan membatalkan baris sumber jika posting jurnal gagal |
| **T4 (Edit & Soft-Delete)** | Terbukti gagal (2/2): `updateCostRealization` tidak membuat jurnal pembalik/baru; `delete` melakukan hard-delete | **LULUS**: Edit memposting `reversal` + jurnal baru; hapus melakukan `reversal` + soft-delete (`status = 'cancelled'`, `deleted_at`) |
| **T5 (HPP Berbasis Teks)** | Terbukti gagal: biaya proyek tanpa kata `"stok"` masuk `otherExpense`, `hpp = 0` | **LULUS**: Semua `project_expense` dan `payable_payment` masuk `hpp` berbasis `reference_type` |
| **T6 (Tutup Proyek & Periode)** | Terbukti gagal (2/2): proyek tutup meski ada hutang/retensi; `createJournalEntry` menerima tanggal periode tertutup | **LULUS**: Diblokir tanpa `ownerWriteOff` pemilik; `createJournalEntry` & `planner_post_journal` menolak `periode_terkunci` |
| **T7 (`investorService`)** | Terbukti gagal: dividen melebihi kas/laba ditahan lolos; `total_invested` pakai baca-ubah-tulis | **LULUS**: Validasi saldo kas & laba ditahan sebelum insert; `total_invested` diturunkan dari transaksi (+ trigger SQL) |
| **T8 (`.env.local`)** | File `apps/web/.env.local` terlacak di Git | **LULUS**: Dikeluarkan via `git rm --cached`, masuk `.gitignore`. **Pemilik wajib rotate manual semua token (termasuk token Vercel).** |
| **Invarian Buku Besar** | Suite `ledgerInvariants.test.ts` | **LULUS**: $\sum \text{Dr} = \sum \text{Cr}$, $\text{Aktiva} = \text{Pasiva}$, $\text{Kas Buku} = \text{Kas Operasional}$, $\sum \text{Laba Proyek} - \text{Opex} = \text{Laba Bisnis}$ |

---

## 4. Metrik Agent-Ready F0

- **Parser deterministik:** `parseRupiah`, `firstRupiah`, `parseCostCommand` (`packages/domain/src/money.ts`) dan `parseTanggal`, `orgToday` (`packages/domain/src/dates.ts`) — **100% deterministik tanpa LLM**.
- **Anggaran token tool (`agentTools.test.ts`):** Seluruh 8 tool aktif di `agent-core/src/registry.ts` memiliki deskripsi **$\le 25$ kata** dan maksimum **$\le 6$ argumen**.
- **Gerbang Agent (`agentEval.test.ts`):** Lulus ambang `normalRate >= 95%`, `critical = 0`, `costIdr = 0`.
- **Guard periode terkunci:** `prepareRecordCost` di `agent-core/src/prepare.ts` menolak tanggal pada periode tertutup (`periode_terkunci`) dan menyematkan metadata `source = 'agent'` serta `model`.

---

## 5. Status Migrasi SQL & Sisa Risiko

- **Migrasi SQL Lokal (`BLOCKED remote`):** `my-supabase-project/supabase/migrations/20261124100000_f0_accounting_correctness.sql` berisi perbaikan constraint `'dividend'`, kolom `deleted_at`, trigger `planner_fill_derived_project_totals` & `planner_sync_investor_total_invested`, guard `periode_terkunci` dan dedup `planner_post_journal`, serta RPC atomik `planner_create_project_income_atomic` & `planner_create_cost_realization_atomic`. **Belum dijalankan ke Supabase remote produksi** sesuai aturan keras (`BLOCKED remote` di `OPEN-DECISIONS.md`).
- **Sisa Risiko Menuju F1:**
  1. Sebelum migrasi SQL diterapkan ke staging/produksi, lingkungan runtime remote tetap memakai fallback kompensasi sisi client pada `incomeService.ts` dan `costService.ts`.
  2. Akun `Laba Periode Berjalan` (`type = 'laba'`) pada F0 masih menampung pendapatan dan HPP/Opex secara gabungan (baru dipisah menjadi COA lengkap dengan sub-akun RAP di Fase F1).
  3. **Rotasi Token Wajib:** Pemilik harus me-rotate secara manual seluruh token yang pernah tersimpan di `apps/web/.env.local` (termasuk token Vercel) karena riwayat git sebelumnya masih mencatat file tersebut.

