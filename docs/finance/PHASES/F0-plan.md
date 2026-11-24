# Rencana Fase F0 — Kebenaran Akuntansi (Tanpa Fitur Baru)

**Fase:** F0 (Kebenaran)  
**Orkestrator:** Argon  
**Tanggal:** 2026-11-24  
**Status:** `IN_PROGRESS`

---

## 1. Tujuan Fase F0

Memastikan satu buku besar double-entry (`financeV2`) sebagai satu-satunya sumber kebenaran bebas dari bug akuntansi kritis sebelum menambah akun baru (F1), tampilan baru (F2), atau AI pencatat (F3):

1. Tidak ada mutasi keuangan yang melanggar $\sum \text{Debit} = \sum \text{Kredit}$.
2. Jurnal bersifat *append-only* (tidak pernah diubah/dihapus; koreksi wajib melalui jurnal pembalik + posting ulang).
3. Baris sumber (`planner_project_incomes`, `planner_cost_realizations`) memakai *soft-delete* (`status = 'cancelled'` dan `deleted_at`).
4. Nominal selalu bilangan bulat rupiah (`toRupiah` / `bigint`).
5. Tidak ada file `.env*` yang terlacak di repositori Git.

---

## 2. Daftar Tugas & Kepemilikan Agent

| ID | Tugas | Pemilik Agent | Branch PR | Status |
|---|---|---|---|---|
| **T0** | Kerangka `docs/finance/`, `.github/pull_request_template.md`, & gerbang CI `docs-gate` | Agent Dokumen | `finance/F0-T0-docs-framework` | `IN_PROGRESS` |
| **T8** | Keluarkan `apps/web/.env.local` dari git, tambah ke `.gitignore`, catat rotasi token | Agent Dokumen | `finance/F0-T8-remove-env-local` | `PENDING` |
| **T1** | Dividen proyek (`projectDividendService`) ke jurnal ekuitas (`Dr Dividen/Laba Ditahan, Cr Kas`), offset piutang owner dijurnal, cegah masuk `total_spent` & backfill | Agent Ledger + Agent DB | `finance/F0-T1-project-dividend-equity` | `PENDING` |
| **T2** | Cegah laba terhitung dua kali antara `closeProjectFinance` dan `closeFinancePeriod` | Agent Ledger | `finance/F0-T2-T5-profit-loss-single-count` | `PENDING` |
| **T5** | Hapus klasifikasi HPP berbasis teks `"stok"` di `profitLossReport`; gunakan jenis akun/referensi | Agent Ledger | `finance/F0-T2-T5-profit-loss-single-count` | `PENDING` |
| **T3** | Posting atomik (`createProjectIncome`, `createCostRealization`) lewat RPC transaksi + hapus penelan error `console.error` | Agent Ledger + Agent DB | `finance/F0-T3-T4-atomic-posting-and-reversals` | `PENDING` |
| **T4** | `updateCostRealization` = pembalik + posting ulang; hapus baris sumber = soft-delete + pembalik | Agent Ledger + Agent DB | `finance/F0-T3-T4-atomic-posting-and-reversals` | `PENDING` |
| **T6** | Blokir tutup proyek jika piutang/retensi/hutang terbuka tanpa write-off pemilik; tolak jurnal di periode terkunci | Agent Ledger + Agent DB | `finance/F0-T6-T7-guards-and-atomic-investor` | `PENDING` |
| **T7** | `investorService`: `total_invested` atomik/turunan transaksi & batasi dividen $\le$ kas tersedia dan laba ditahan | Agent Ledger + Agent DB | `finance/F0-T6-T7-guards-and-atomic-investor` | `PENDING` |
| **T9** | Gerbang Agent-Ready F0 (`parseTanggal`, guard periode terkunci di `prepare_record_cost`), suite tes invarian buku besar, & `F0-report.md` | Agent AI + Agent QA/Eval + Agent Auditor | `finance/F0-T9-invariants-agent-gate-report` | `PENDING` |

---

## 3. Protokol Eksekusi & Penerimaan Fase

- **Tes-dulu (Test-First):** Setiap temuan `T1`–`T7` wajib direproduksi terlebih dahulu dengan tes yang **GAGAL** sebelum kode diperbaiki.
- **Migrasi Lokal Saja:** Semua perubahan SQL ditulis ke `my-supabase-project/supabase/migrations/20261124100000_f0_accounting_correctness.sql` dan **TIDAK** di-push ke Supabase remote (`BLOCKED remote` di `OPEN-DECISIONS.md`). Kode client wajib menyediakan fallback aman apabila RPC/kolom baru belum tersedia di remote.
- **Gerbang Wajib Sebelum Merge Tiap PR:**
  - `npm --prefix apps/web run typecheck`
  - `npm --prefix apps/web test`
  - `node scripts/docs-gate-check.mjs`
  - `npm run gate:rebrand`
- **Kriteria Terima F0:**
  - Semua tes invarian hijau: $\sum \text{Debit} = \sum \text{Kredit}$; Kas Buku = Kas Operasional; $\sum \text{Laba Proyek} - \text{Opex} = \text{Laba Bisnis}$.
  - Seluruh T1–T8 teruji dan terverifikasi.
  - `docs/finance/PHASES/F0-report.md` terbit, lalu **berhenti menunggu perintah `"lanjut"` dari pemilik**.

---

## 4. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Remote Supabase belum memiliki migrasi F0 (`BLOCKED remote`) | RPC atomik / kolom `deleted_at` belum ada saat runtime remote | Fallback client yang mendeteksi `PGRST202`/`42703`, melakukan kompensasi rollback bila posting jurnal gagal, dan mencatat status di `OPEN-DECISIONS.md`. |
| `planner_post_journal` men-dedup `(org_id, reference_type, reference_id)` | Edit biaya (`updateCostRealization`) mengembalikan ID jurnal lama yang sudah di-reverse | Perbarui `planner_post_journal` di migrasi lokal agar mengabaikan jurnal yang sudah punya `reversal`, serta gunakan reference/penanda yang aman di client fallback. |
| Kebocoran token di `apps/web/.env.local` pada riwayat git lama | Token masih tersimpan di history git | Keluarkan file dari index git di T8, tambah ke `.gitignore`, dan wajibkan pemilik melakukan rotasi manual semua token (termasuk token Vercel). |

