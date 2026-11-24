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

## D-F2-01 — Cadangan Opex Default pada Mode Dividen Per Bisnis
- **Tanggal:** 2026-11-24
- **Konteks:** Dividen mode `per_bisnis` dibagikan dari `Laba Ditahan` dan dibatasi kas tersedia dikurangi cadangan opex bulanan agar biaya usaha periode berjalan tetap aman (`Q-03` di `OPEN-QUESTIONS.md`).
- **Pilihan:** Menetapkan default konservatif `opexReserveMultiplier = 1` ($1\times$ total plan opex bulanan), dapat disesuaikan pemilik bila menginginkan cadangan $2\times$ atau lebih.
- **Alasan:** Mencegah dividen menghabiskan kas operasional rutin sambil tetap menjaga ruang pembagian laba yang realistis.

---

## D-G0-01 — Taksonomi 4 Kategori Akun (`aktiva`, `pasiva`, `pendapatan`, `beban`) & Penggulungan Laba ke Neraca
- **Tanggal:** 2026-11-24
- **Konteks:** Pada migrasi F1 (`20261124120000_f1_coa_and_dimensions.sql`), akun `hpp_*`, `beban_opex`, dan `beban_penyusutan` sebelumnya dikategorikan sebagai `'aktiva'`, sedangkan `pendapatan_proyek` sebagai `'pasiva'`. Akibatnya, laporan Neraca (`balanceSheetReport.ts` dan `balanceSheetService.ts`) membocorkan akun beban ke daftar `aktiva` dan akun pendapatan ke daftar `pasiva`.
- **Pilihan:**
  1. Memperluas kategori akun (`AccountCategory` & `planner_finance_accounts_category_check`) menjadi 4 kategori akuntansi standar: `'aktiva'`, `'pasiva'`, `'pendapatan'`, dan `'beban'`.
  2. Memperbarui saldo normal di `planner_apply_line_balance()`, `balanceDelta()`, dan `balancesFromLines()`: `'aktiva'` & `'beban'` memakai `debit - credit`, sedangkan `'pasiva'` & `'pendapatan'` memakai `credit - debit`.
  3. Mengecualikan akun `'pendapatan'` dan `'beban'` dari daftar `aktiva[]` dan `pasiva[]` pada Neraca (`buildBalanceSheetFromBalances` & `getFinanceV2Snapshot`), lalu menggulung `computedCurrentProfit = SUM(pendapatan) - SUM(beban)` (digabung dengan akun `'laba'` legacy bila ada tanpa double-counting) ke sisi `pasiva[]` sebagai baris ekuitas `"Laba Periode Berjalan (Dari Buku Besar)"` bila nilainya $\neq 0$.
- **Alasan:** Memisahkan akun Laba/Rugi (nominal) dari akun Neraca (riil) sesuai standar akuntansi double-entry sambil menjamin persamaan `Total Aktiva === Total Pasiva` selalu seimbang pada buku besar.

## D-G0-02 — Pengakuan Pendapatan DP Berbasis Progres / Termin Terjadwal
- **Tanggal:** 2026-11-24
- **Konteks:** DP yang masuk dicatat sebagai kewajiban (`uang_muka_klien`), namun diperlukan mekanisme terjadwal dan idempoten untuk mengakui DP menjadi `pendapatan_proyek` seiring penyelesaian proyek tanpa pernah mengakui melebihi DP yang benar-benar diterima.
- **Pilihan:**
  1. Menambahkan konfigurasi per proyek `revenue_recognition_method` pada `planner_projects` dengan dua mode: `'termin'` (default konservatif) dan `'progress_pct'`.
  2. Menempatkan seluruh logika perhitungan deterministik di `packages/domain/src/revenueRecognition.ts` (`computeRecognizableRevenue`, `buildScheduledRecognitionPlan`) serta template `recognizeDownPaymentRevenue` (`Dr uang_muka_klien, Cr pendapatan_proyek`) di `packages/domain/src/journal.ts` (`dp_revenue_recognition`).
  3. Menyimpan jadwal dan keunikan bulanan per proyek pada `planner_revenue_recognition_schedules` (`UNIQUE(project_id, period_month)`) serta memposting jurnal lewat RPC idempoten `planner_recognize_project_dp_revenue` (`reference_type = 'revenue_recognition'`) tanpa melanggar imutabilitas jurnal.
- **Alasan:** Menjamin pengakuan pendapatan akrual sesuai kemajuan proyek, menjaga total pengakuan kumulatif tidak pernah melampaui kewajiban DP yang diterima, serta memastikan eksekusi jadwal bulanan aman dijalankan berulang kali (idempoten).

## D-G0-03 — Identitas Pihak via `party_id` & Pinjaman Antar Proyek via Jurnal Double-Entry 4-Baris
- **Tanggal:** 2026-11-24
- **Konteks:** Sebelumnya ledger pihak (`partyLedger.ts`) mengelompokkan hutang/piutang hanya memakai teks nama ternormalisasi sehingga dua pihak bernama mirip/beda kapitalisasi berisiko tercampur, dan pinjaman antar proyek dicatat di tabel transfer terpisah tanpa entri buku besar double-entry.
- **Pilihan:**
  1. Menjadikan `party_id` (UUID `planner_parties`) sebagai kunci identitas dan agregasi saldo hutang/piutang di `packages/domain/src/party.ts` (`resolvePartyId`, `aggregatePartyBalancesById`, `aggregatePartyBalancesFromJournalLines`), memperluas `planner_payables`, `planner_receivables`, `planner_project_incomes`, dan `planner_cost_realizations` dengan kolom `party_id`, serta menyertakan `partyId` pada baris jurnal di `payableService.ts` dan `receivableService.ts`.
  2. Mencatat dan menghitung pinjaman antar proyek langsung di buku besar melalui jurnal 4-baris seimbang (`interprojectLoanDisbursement` / `interprojectLoanRepayment` dengan `reference_type = 'interproject_loan' | 'interproject_loan_repayment'` dan RPC `planner_post_interproject_loan`), tanpa tabel pinjaman terpisah yang mem-bypass buku besar.
- **Alasan:** Menjamin identitas pihak deterministik bebas salah-gabung nama, serta memastikan setiap pinjaman antar proyek memiliki dampak Laba/Rugi = 0, dampak Kas konsolidasi = 0, dan saldo piutang/hutang tiap proyek terukur langsung dari buku besar.

