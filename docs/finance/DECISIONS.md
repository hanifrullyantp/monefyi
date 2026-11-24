# DECISIONS — Keputusan Arsitektur Keuangan Froyek

Catatan keputusan teknis dan akuntansi ringkas per fase.

---

## D-F0-01 — Jalur Tulis Tunggal `financeV2` dengan Transaksi Atomik
- **Tanggal:** 2026-11-24
- **Konteks:** Pemasukan (`createProjectIncome`) dan biaya (`createCostRealization`) sebelumnya menulis baris sumber terpisah dari jurnal dan menelan kegagalan dengan `console.error`.
- **Pilihan:** Membungkus penulisan baris sumber + posting jurnal ke RPC PostgreSQL atomik (`planner_create_project_income_atomic`, `planner_create_cost_realization_atomic`), dengan fallback kompensasi (rollback baris sumber jika posting jurnal gagal) dan larangan menelan error.
- **Alasan:** Menjamin 100% baris sumber memiliki jurnal yang sah sehingga kas buku = kas operasional.

## D-F0-02 — Dividen Proyek sebagai Distribusi Ekuitas, Bukan Biaya Proyek
- **Tanggal:** 2026-11-24
- **Konteks:** `projectDividendService` sebelumnya menyisipkan baris ke `planner_cost_realizations` berstatus `'dividend'` tanpa jurnal, berisiko terhitung ke `total_spent` dan tersedot ke `backfillProjectJournalsForOrg` sebagai `project_expense`.
- **Pilihan:** Dividen proyek langsung memposting jurnal ekuitas (`reference_type = 'dividend'`: `Dr Laba Ditahan, Cr Kas Proyek` dan `Dr Laba Ditahan, Cr Piutang` untuk offset piutang owner), tidak menyisipkan baris ke `planner_cost_realizations`, serta mengecualikan status `'dividend'` dan `'cancelled'` dari trigger `total_spent` dan backfill.
- **Alasan:** Memenuhi aturan bisnis bahwa dividen adalah distribusi ekuitas, bukan biaya proyek maupun beban usaha.

## D-F0-03 — Mencegah Penghitungan Ganda Laba pada Tutup Proyek vs Tutup Periode
- **Tanggal:** 2026-11-24
- **Konteks:** `closeProjectFinance` memindahkan laba proyek `Laba Periode -> Laba Ditahan` lewat `reference_type = 'project_close'`, namun `profitLossReport` membaca debit `project_close` sebagai `otherExpense`, lalu `closeFinancePeriod` memindahkan `netProfit` lagi ke `Laba Ditahan`.
- **Pilihan:**
  1. `profitLossReport` mengabaikan jurnal penutup ekuitas (`project_close`, `period_close`, `dividend`) sehingga laporan Laba/Rugi mencerminkan pendapatan dan beban aktual periode.
  2. `closeFinancePeriod` hanya memindahkan **sisa** `netProfit` periode yang belum ditutup oleh `project_close` di periode yang sama.
- **Alasan:** Total laba yang pindah ke `Laba Ditahan` selalu tepat `1 × netProfit`, dan saldo `Laba Periode` setelah tutup periode selalu konsisten menjadi `0`.

## D-F0-04 — Imutabilitas Jurnal & Soft-Delete Baris Sumber
- **Tanggal:** 2026-11-24
- **Konteks:** `updateCostRealization` tidak menyentuh jurnal, sedangkan `deleteCostRealization` dan `deleteProjectIncome` menghapus baris sumber secara fisik (`.delete()`).
- **Pilihan:** Edit biaya wajib memposting jurnal pembalik atas jurnal lama + jurnal baru atas nominal baru. Hapus biaya/pemasukan wajib memposting jurnal pembalik + melakukan soft-delete (`status = 'cancelled'`, `deleted_at`).
- **Alasan:** Menjaga jejak audit akuntansi yang utuh dan selaras dengan trigger imutabilitas jurnal di database.

## D-F0-05 — Migrasi SQL Lokal Saja (`BLOCKED remote`)
- **Tanggal:** 2026-11-24
- **Konteks:** Repositori terhubung ke instance Supabase remote produksi tanpa staging terpisah.
- **Pilihan:** Semua migrasi F0 ditulis sebagai file SQL lokal (`my-supabase-project/supabase/migrations/`), **tidak** di-push ke remote, dan dicatat `BLOCKED remote` di `OPEN-DECISIONS.md`. Kode TypeScript memiliki fallback yang kompatibel jika skema remote belum diperbarui.
- **Alasan:** Mematuhi aturan keras larangan push/deploy ke Supabase remote produksi.

---

## D-F1-01 — Nasib `finance_version` (`v1`/`v2`/`v3`) & Pensiun Penghitung V1
- **Tanggal:** 2026-11-24
- **Konteks:** Sebelumnya `financeV1` (`businessReportService.ts`) menghitung laporan langsung dari tabel operasional (`planner_project_incomes`, `planner_cost_realizations`, `planner_opex_realizations`) sementara `financeV2`/`v3` membaca/menulis buku besar.
- **Pilihan:** `financeV2` ditetapkan sebagai **satu-satunya jalur tulis dan penghitung** buku besar; `financeV1` dipensiunkan sebagai penghitung (`businessReportService.ts` membaca dari `financeV2` via `businessReportFromLedger`), sementara tata letak laporan V1 dipertahankan di F2. `v3` tetap menjadi alias tampilan UI sandbox dari `financeV2`.
- **Alasan:** Menjamin satu sumber kebenaran agar angka laporan pemilik usaha selalu sama persis dengan buku besar.

## D-F1-02 — Ambang Kapitalisasi Aset Tetap Default
- **Tanggal:** 2026-11-24
- **Konteks:** Pengeluaran non-proyek seperti `"beli keramik perbaikan workshop"` masuk Beban Operasional, sedangkan pembelian aset bernilai besar perlu dikapitalisasi sebagai Aset Tetap. Pemilik belum menetapkan angka ambang eksplisit di `OPEN-QUESTIONS.md`.
- **Pilihan:** Menetapkan default konservatif `ambang_kapitalisasi_rupiah = Rp 5.000.000` (dapat diubah pemilik). Di bawah ambang $\rightarrow$ Beban Operasional; di atas/sama dengan ambang untuk kata kunci peralatan/renovasi/aset $\rightarrow$ tanya balik pemilik (Aset Tetap vs Beban Operasional).
- **Alasan:** Tidak ada risiko kehilangan data, mudah diubah lewat konfigurasi organisasi.

