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

---

## D-G4-01 — Modul Pajak Konfigurabel, Disclaimer Konsultan Pajak, & Guardrail Periode Terkunci
- **Tanggal:** 2026-11-24
- **Konteks:** Tarif PPh Final Jasa Konstruksi, PPh Badan, PPh Final UMKM, tarif PPN, serta tenggat setor/lapor dapat berubah mengikuti regulasi atau kualifikasi usaha, dan tidak boleh ditebak maupun di-hardcode di dalam fungsi perhitungan. Selain itu, pelaporan direksi dan penyusutan terjadwal lintas bulan wajib menghormati status periode terkunci (`lockedPeriodMonth` / `lockedPeriods`).
- **Pilihan:**
  1. Seluruh tarif dan tanggal setor/lapor wajib dibaca dari konfigurasi organisasi (`TaxProfileConfig` / tabel `planner_org_tax_configs`). Bila tarif atau konfigurasi wajib belum diisi, `calculateTaxDraftAndCalendar` wajib mengembalikan status & peringatan `config_required` tanpa menebak nilai bawaan.
  2. Setiap keluaran modul pajak wajib memuat label eksplisit `"Draf untuk ditinjau konsultan pajak — bukan nasihat hukum/pajak berlisensi"` (`TAX_DRAFT_DISCLAIMER`) serta memunculkan peringatan `"Wajib verifikasi tarif ke regulasi terkini"` bila `verifiedAt` kosong atau berusia `> 180` hari.
  3. Penjaga periode terkunci ditegakkan ganda: `buildBoardMonthlyReport` mengisolasi transaksi, anggaran, piutang, dan hutang agar periode setelah `lockedPeriodMonth` tidak memengaruhi laporan terkunci, sedangkan `buildScheduledDepreciationPlan` menolak `periodMonth` yang masuk `lockedPeriods` dengan `ok: false`, `reason: 'periode_terkunci'`, `entries: []`.
- **Alasan:** Mencegah kesalahan kepatuhan pajak akibat tarif usang/hardcode, menjaga batas tanggung jawab non-nasihat hukum/pajak berlisensi, dan menjaga integritas angka laporan/jurnal pada periode yang sudah ditutup.

## D-G5-01 — Ambang Promosi Otonomi L2 Berbasis Bukti Shadow Mode, Auto-Demote, & Pemisahan Wewenang (SoD)
- **Tanggal:** 2026-11-24
- **Konteks:** Agen AI keuangan tidak boleh melompat ke eksekusi semi-otonom (`L2`) tanpa bukti kesepakatan nyata di mode bayangan (`shadow mode`), dan aksi berisiko tinggi (dividen, tutup proyek/periode, write-off, pinjaman antar proyek, pembayaran keluar besar) berisiko merusak saldo/ekuitas bila dieksekusi tanpa persetujuan manusia.
- **Pilihan:**
  1. Menetapkan ambang konservatif promosi `L1 -> L2` per kombinasi `(intent, category, amountBand)` (`small <= 1jt`, `medium 1jt..10jt`, `large > 10jt`): **`minSamples = 30`**, **`minAccuracy = 0.98` (98%)**, dan **`maxCriticalErrors = 0`** (`0` salah nominal, salah pihak, duplikat, maupun salah arah).
  2. Melarang keras seluruh aksi berisiko tinggi (`dividen`, `tutup_proyek`, `tutup_periode`, `write_off`, `pinjaman_antar_proyek`, serta `pembayaran_keluar` pada pita `large` / di atas ambang) naik ke `L2` — wajib tetap memerlukan persetujuan manusia.
  3. Menegakkan **auto-demote `L2 -> L1` segera** apabila terjadi `>= 1` kesalahan kritis (`criticalErrorCount > 0`), akurasi kesepakatan turun di bawah `98%`, atau terjadi insiden salah posting (`proposeMispostingReversalAndPostmortem` memicu `autonomyDemotionTriggered: true` dan usulan jurnal pembalik seimbang append-only berstatus `awaiting_approval`).
  4. Menegakkan Segregation of Duties (`approvedBy <> createdBy`), kill switch organisasi, batas nominal harian agen, kuota token/biaya, idempotency key, dan pelarangan total sinyal debit/kredit atau perhitungan angka di memori koreksi (`recordUserCorrectionSignal`).
- **Alasan:** Menjamin otonomi hanya dibuka bertahap berbasis bukti empiris pada transaksi rutin bernilai aman, memutus eskalasi insiden secara instan lewat auto-demote dan kill switch, serta menjaga auditabilitas append-only tanpa pernah melanggar pagar akuntansi deterministik.

---

## D-G8-01 — Larangan Status Lunas Palsu, Wajib Konfirmasi Pembayaran Nyata & Jurnal Atomik pada Penggajian
- **Tanggal:** 2026-11-24
- **Konteks:** Sebelumnya `aiHrdPayrollService.ts` menghasilkan referensi palsu `MYR-PAY-...` tanpa memanggil gateway pembayaran, menandai status `'paid'` dan mencetak `"Status: *LUNAS & BERHASIL DITRANSFER ✅*"`, menebak tarif cadangan `Rp 150.000`, menyembunyikan kekurangan kasbon lewat `Math.max(0, ...)`, mengirim `payrollEntryId` non-UUID ke bridge jurnal, serta bersama `payrollService.ts` menelan kegagalan posting jurnal dengan `console.error`/`console.warn`.
- **Pilihan:**
  1. **Agen tidak pernah mengeksekusi transfer uang sendiri** dan **dilarang menandai `'paid'` / `'LUNAS'`** tanpa `PaymentConfirmation` nyata yang terverifikasi (`provider_webhook` dari `PayrollPaymentProvider` atau `manual_owner_confirmation` dengan SoD `confirmedBy !== preparedBy`). Tanpa konfirmasi nyata, status batch wajib `'awaiting_payment_confirmation'` dan slip WhatsApp wajib menulis `"Status: *MENUNGGU KONFIRMASI PEMBAYARAN*"`.
  2. **Tanpa tarif tebakan tersembunyi & tanpa penyembunyian kasbon:** tarif gaji kosong/`<= 0` ditandai `rateStatus: 'missing_rate'` (`requiresRateQuestion: true`, `grossSalary: 0`), parameter kerja/lembur dibaca dari `laborPolicy` yang dapat dikonfigurasi, dan kelebihan kasbon dicatat eksplisit pada `remainingKasbonBalance` serta `kasbonShortfall` (`appliedKasbonDeduction + remainingKasbonBalance === totalKasbon`).
  3. **Jurnal atomik & anti-swallow error:** `payrollEntryId` wajib berupa UUID valid dari `planner_payroll_entries.id`. Setiap kegagalan posting jurnal pada `aiHrdPayrollService.ts` dan `payrollService.ts` (`updatePayrollStatus`, `reviewBonRequest`) wajib melakukan kompensasi rollback status (atau menandai `[JOURNAL_POST_FAILED]` jika rollback gagal) dan melempar error eksplisit sehingga tidak pernah ada status `'paid'` tanpa jurnal di buku besar.
- **Alasan:** Menjaga integritas pembukuan kas/beban gaji, mencegah pekerja/pemilik menerima klaim lunas palsu atau slip dengan angka tebakan, dan memastikan buku besar selalu sinkron dengan status pembayaran payroll dan kasbon.

## D-G7-01 — Sistem Umpan Balik Terpadu, Anonimisasi PII Ketat, Opt-Out Telemetri Perilaku, & Larangan Modifikasi Otomatis
- **Tanggal:** 2026-11-24
- **Konteks:** Laporan bug pengguna, error runtime yang sebelumnya tersembunyi di `console.error`, friksi UI, koreksi diam-diam pengguna, kegagalan invarian akuntansi, dan kegagalan tool/jawaban agent tersebar lintas modul dan berisiko membocorkan data sensitif (email, HP, NIK, rekening bank, token/password) atau mendorong perubahan prompt/kode tanpa validasi.
- **Pilihan:**
  1. Menyatukan seluruh **8 kategori sinyal** (`user_bug_report`, `agent_rating`, `ui_confused`, `runtime_error`, `behavior_friction`, `silent_correction`, `data_invariant_failure`, `agent_unanswered_or_tool_fail`) lintas 5 modul (`keuangan`, `proyek`, `sdm`, `ui`, `agent`) ke satu domain deterministik `packages/domain/src/feedbackObservability.ts` dan tabel `planner_feedback_events`.
  2. Wajib menyapu & menyensor payload secara rekursif (`anonymizeFeedbackPayload`) sebelum item masuk ke antrean maupun kandidat evaluasi (`[REDACTED_EMAIL]`, `[REDACTED_PHONE]`, `[REDACTED_NIK]`, `[REDACTED_BANK_ACCOUNT]`, `[REDACTED_SECRET]`, `[REDACTED_PII]`) dan men-hash `reporterId`.
  3. Menggabungkan laporan serupa secara otomatis memakai `fingerprint` deterministik `(module + category + normalizedErrorOrScreenKey)` dan menaikkan `priorityScore = baseSeverityWeight + Math.min(50, reporterCount * 5)`.
  4. Menegakkan opt-out organisasi (`behaviorTelemetryOptOut: true` di `planner_org_telemetry_settings`) untuk menolak sinyal `behavior_friction` sambil tetap menerima laporan bug/error runtime.
  5. Mengunci batas otonomi perbaikan: `autoModifyCodeOrPromptAllowed: false` (sistem dilarang mengubah kode atau prompt sendiri; semua kasus agent gagal menghasilkan `EvalCaseCandidate` berstatus `'pending_human_review'`, dan `computeQualityDashboard` memicu rekomendasi penurunan `L2 -> L1` bila akurasi turun atau terjadi kesalahan kritis).
- **Alasan:** Menjamin siklus umpan balik produk & AI yang cepat, aman dari kebocoran PII/kredensial, menghormati privasi organisasi, serta menjaga setiap perubahan kode/prompt tetap tunduk pada tinjauan manusia dan eval gate.

