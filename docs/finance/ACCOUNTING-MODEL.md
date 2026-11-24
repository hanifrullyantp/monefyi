# ACCOUNTING MODEL — Sistem Keuangan Froyek

Dokumen ini adalah spesifikasi hidup (*living specification*) untuk buku besar double-entry Froyek (`financeV2`). Kode di `packages/domain`, `apps/web/src/services/financeV2`, `apps/web/src/lib/financeV2`, dan migrasi SQL **harus selalu selaras** dengan dokumen ini.

---

## 1. Prinsip Dasar & Model Bisnis

1. **Satu Sumber Kebenaran:** Seluruh mutasi keuangan ditulis lewat satu jalur buku besar double-entry (`financeV2` / `planner_journal_entries` + `planner_journal_lines`).
2. **Keuangan Per Proyek:** Tampilan terfilter (`project_id`) atas buku besar yang sama (DP/termin/pelunasan/retensi, RAP vs realisasi, hutang-piutang proyek).
3. **Keuangan Bisnis:** Seluruh buku besar:
   $$\text{Profit Kotor} = \sum \text{Profit Proyek}$$
   $$\text{Profit Bersih} = \text{Profit Kotor} - \text{Biaya Usaha (Opex)} - \text{Beban Lain (Depresiasi/Amortisasi)}$$
4. **Dividen:** Distribusi ekuitas (`Dr Dividen / Laba Ditahan, Cr Kas` atau `Cr Piutang` untuk offset), **BUKAN** biaya proyek (`total_spent`) dan **BUKAN** beban pada laporan laba/rugi. Dibatasi kas tersedia dan cadangan opex / laba ditahan.
5. **Pengeluaran Non-Proyek:** Masuk **Beban Operasional (Opex)** per kategori, atau **Aset Tetap** jika melewati ambang kapitalisasi pemilik.
6. **Satuan Nominal:** Seluruh nominal wajib **bilangan bulat rupiah** (`bigint` di DB, `toRupiah()` di domain).

---

## 2. Invarian Buku Besar (Wajib Terjaga Setiap Saat)

1. **Keseimbangan Jurnal:** Untuk setiap entri jurnal, $\sum \text{Debit} = \sum \text{Kredit} > 0$, tidak ada baris dengan debit dan kredit positif sekaligus, dan tidak ada nilai negatif.
2. **Imutabilitas Jurnal (*Append-Only*):** Baris `planner_journal_entries` dan `planner_journal_lines` tidak boleh di-`UPDATE` atau di-`DELETE` (ditegakkan trigger `planner_reject_journal_mutation`). Koreksi hanya melalui jurnal pembalik (`reference_type = 'reversal'`) + posting jurnal baru.
3. **Saldo Akun Turunan Jurnal:** Kolom `current_balance` pada `planner_finance_accounts` hanya berubah melalui trigger `planner_apply_line_balance`:
   - Kategori saldo normal debit (`aktiva`, `beban`): $\Delta = \text{debit} - \text{kredit}$
   - Kategori saldo normal kredit (`pasiva`, `pendapatan`): $\Delta = \text{kredit} - \text{debit}$
4. **Neraca Seimbang:** $\sum \text{Aktiva} = \sum \text{Pasiva} + (\sum \text{Pendapatan} - \sum \text{Beban})$ setiap saat. Akun berkategori `pendapatan` dan `beban` tidak pernah dimasukkan ke daftar `aktiva[]` maupun `pasiva[]`, melainkan digulung menjadi baris ekuitas `Laba Periode Berjalan (Dari Buku Besar)` pada sisi `pasiva`.
5. **Konsistensi Kas:** Saldo akun `Kas Proyek` di buku besar sama dengan kas operasional proyek (`dana masuk - biaya realisasi - piutang di luar kontrak +/- transfer - dividen kas`).
6. **Laba Tunggal (Anti Double-Count):** Laba periode hanya dipindahkan **satu kali** ke `Laba Ditahan`. Penutupan proyek (`project_close`) tidak dihitung sebagai beban di laporan Laba/Rugi, dan tutup periode (`period_close`) hanya memindahkan sisa laba yang belum ditutup oleh `project_close`.
7. **Periode Terkunci:** Jurnal dengan `entry_date` pada bulan yang sudah ada di `planner_finance_period_snapshots` ditolak (kecuali entri penutup `period_close` saat penutupan berlangsung).

---

## 3. Chart of Accounts (COA)

### Status F1 (COA Lengkap & Dimensi Proyek/Pihak)

| Tipe Akun (`type`) | Kategori (`category`) | Saldo Normal | Nama Default Sistem | Dimensi Wajib |
|---|---|---|---|---|
| `kas` | `aktiva` | Debit | `Kas Bisnis`, `Kas <Proyek>` | `project_id` (kas proyek) |
| `piutang` | `aktiva` | Debit | `Piutang Usaha` | `party_id` (+ `project_id` jika proyek) |
| `piutang_retensi` | `aktiva` | Debit | `Piutang Retensi` | `project_id`, `party_id` |
| `stok` | `aktiva` | Debit | `Persediaan Barang` | — |
| `aset_tetap` | `aktiva` | Debit | `Properti & Peralatan` | — |
| `prabayar` | `aktiva` | Debit | `Biaya Dibayar Dimuka` | — |
| `uang_muka_klien` | `pasiva` | Kredit | `Uang Muka Klien` | `project_id` |
| `hutang_dagang` | `pasiva` | Kredit | `Hutang Dagang` | `party_id` |
| `hutang_pajak` | `pasiva` | Kredit | `Hutang Pajak` | `party_id` |
| `hutang_lain` | `pasiva` | Kredit | `Hutang Lain-lain` | `party_id` |
| `akumulasi_penyusutan` | `pasiva` | Kredit | `Akumulasi Penyusutan` | — |
| `modal_disetor` | `pasiva` | Kredit | `Modal Disetor` | — |
| `dividen` | `pasiva` | Debit (kontra ekuitas) | `Dividen / Prive` | `project_id` (jika dividen proyek) |
| `laba_ditahan` | `pasiva` | Kredit | `Laba Ditahan` | — |
| `pendapatan_proyek` | `pendapatan` | Kredit | `Pendapatan Proyek` | `project_id` |
| `hpp_material` | `beban` | Debit | `HPP Proyek - Material` | `project_id` |
| `hpp_labor` | `beban` | Debit | `HPP Proyek - Tenaga Kerja` | `project_id` |
| `hpp_equipment` | `beban` | Debit | `HPP Proyek - Peralatan` | `project_id` |
| `hpp_overhead` | `beban` | Debit | `HPP Proyek - Overhead` | `project_id` |
| `hpp_other` | `beban` | Debit | `HPP Proyek - Lainnya` | `project_id` |
| `hpp_uncategorized` | `beban` | Debit | `HPP Proyek - Belum Dikategorikan` | `project_id` (`needs_review`) |
| `beban_opex` | `beban` | Debit | `Beban Operasional` | — |
| `beban_penyusutan` | `beban` | Debit | `Beban Penyusutan` | — |
| `laba` | `pasiva` | Kredit | `Laba Periode Berjalan` | Legacy F0 (kompatibilitas mundur) |

*(Laba periode dihitung dari akun: $\text{Pendapatan Proyek} - \sum \text{HPP} - \text{Beban Operasional} - \text{Beban Penyusutan}$.)*

---

## 4. Template Jurnal per Kejadian (F0)

| Kejadian | `reference_type` | Debit (Dr) | Kredit (Cr) | Sumber / Catatan |
|---|---|---|---|---|
| **Pemasukan Proyek** | `project_income` | `Kas Proyek` | `Laba Periode` | `createProjectIncome` / `planner_create_project_income_atomic` |
| **Biaya Proyek** | `project_expense` | `Laba Periode` (HPP) | `Kas Proyek` | `createCostRealization` / `planner_create_cost_realization_atomic` |
| **Edit Biaya Proyek** | `reversal` + `project_expense` | (1) `Kas Proyek` (balik)<br>(2) `Laba Periode` (baru) | (1) `Laba Periode` (balik)<br>(2) `Kas Proyek` (baru) | `updateCostRealization` (jurnal lama dibalik, jurnal baru diposting) |
| **Hapus Biaya / Pemasukan** | `reversal` | Kebalikan baris jurnal asli | Kebalikan baris jurnal asli | `deleteCostRealization` / `deleteProjectIncome` + soft-delete baris sumber |
| **Transfer Antar Kas** | `transfer` | `Kas Tujuan` | `Kas Asal` | `transferKas` |
| **Hutang Baru (Akrual)** | `project_expense` | `Laba Periode` | `Hutang Dagang/Pajak/Lain` | `createPayable` |
| **Bayar Hutang** | `payable_payment` / `project_expense` | `Hutang Dagang/Pajak/Lain` | `Kas` | `recordPayablePayment` |
| **Piutang Baru** | `project_income` | `Piutang Usaha` | `Laba Periode` | `createReceivable` |
| **Terima Piutang** | `receivable_receipt` / `project_income` | `Kas` | `Piutang Usaha` | `recordReceivablePayment` |
| **Opex Bisnis** | `opex` | `Laba Periode` | `Kas Bisnis` | `createOpexRealization` |
| **Investasi Modal** | `manual` | `Kas Bisnis` | `Modal Disetor` | `recordInvestorTransaction` (`invest`) |
| **Penarikan Modal** | `manual` | `Modal Disetor` | `Kas Bisnis` | `recordInvestorTransaction` (`withdraw`) |
| **Dividen Proyek (Kas)** | `dividend` | `Laba Ditahan` (Dividen) | `Kas Proyek` | `recordDividendPayouts` (tidak masuk `total_spent`) |
| **Dividen Proyek (Offset Piutang Owner)** | `dividend` | `Laba Ditahan` (Dividen) | `Piutang Usaha` | `recordDividendPayouts` (melunasi piutang owner tanpa kas keluar) |
| **Dividen Bisnis (Investor)** | `manual` / `dividend` | `Laba Ditahan` | `Kas Bisnis` | `recordInvestorTransaction` (`dividend`, dibatasi kas & laba ditahan) |
| **Tutup Proyek** | `project_close` | (1) `Kas Bisnis`<br>(2) `Laba Periode` (jika untung) | (1) `Kas Proyek`<br>(2) `Laba Ditahan` | `closeProjectFinance` (diblokir jika ada piutang/hutang/retensi terbuka tanpa write-off pemilik) |
| **Tutup Periode** | `period_close` | `Laba Periode` (sisa belum ditutup) | `Laba Ditahan` | `closeFinancePeriod` (hanya memindahkan sisa laba periode yang belum dipindah `project_close`) |

---

## 5. Glosarium

- **Buku Besar (*General Ledger*):** Catatan transaksi double-entry di `planner_journal_entries` dan `planner_journal_lines`.
- **Jurnal Pembalik (*Reversal Journal*):** Jurnal baru dengan nominal Debit dan Kredit terbalik dari jurnal asli untuk membatalkan/mengoreksi transaksi tanpa menghapus riwayat.
- **Soft-Delete:** Menandai baris transaksi sumber sebagai dibatalkan (`status = 'cancelled'`, `deleted_at = now()`) agar tidak terhitung lagi tetapi tetap memiliki jejak audit.
- **HPP (Harga Pokok Penjualan / Biaya Langsung Proyek):** Biaya langsung yang terkait pelaksanaan proyek (material, tenaga kerja, peralatan, overhead proyek).
- **Opex (Beban Operasional Usaha):** Biaya rutin menjalankan bisnis di luar proyek tertentu (sewa workshop, listrik kantor, gaji admin, perawatan workshop).
- **Laba Ditahan (*Retained Earnings*):** Akumulasi laba bersih dari periode/proyek yang telah ditutup dan tersedia untuk pembagian dividen atau ditahan sebagai modal kerja.
- **Write-off:** Penghapusan piutang/hutang terbuka secara eksplisit oleh pemilik saat proyek ditutup.

