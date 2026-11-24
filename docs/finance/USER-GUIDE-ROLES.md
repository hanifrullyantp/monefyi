# Panduan Pengguna Peran Keuangan Froyek

Panduan ringkas ini ditujukan bagi **Pemilik (Owner)**, **Manajer Keuangan**, dan **Operator** untuk menggunakan tiga peran utama sistem keuangan Froyek secara aman dan terukur.

> **Prinsip Utama:** Semua perhitungan angka dilakukan oleh mesin deterministik buku besar (`financeV2`), bukan oleh AI. Pada tahap awal produksi, sistem berjalan di level **L1 (Asisten Draf + Konfirmasi Manusia)** dengan **Mode Bayangan aktif**.

---

## 1. Peran Asisten Keuangan

Fokus peran ini adalah mencatat transaksi harian secara rapi, menjaga kelengkapan bukti, dan memastikan pembukuan siap tutup bulan.

### A. Mencatat Transaksi (Chat, Nota/Struk, & Mutasi Bank)
1. **Lewat Chat (`prepare_entry` -> `commit_entry`):**
   - Ketik kalimat natural dengan menyebut transaksi, nominal, dan proyek/dompet bila ada (contoh: `"beli semen 5 sak proyek Villa Ubud Rp 350.000 bayar Bank BCA"`).
   - Mesin akan menampilkan ringkasan draf. Jika ada nama proyek/pihak yang mirip (mis. `Ruko 1` vs `Ruko 2`), pilih salah satu kandidat (`needs_choice`) sebelum konfirmasi.
   - Tekan konfirmasi agar jurnal double-entry tersimpan secara append-only.
2. **Lewat Foto/Teks Nota, Struk, atau Invoice (`extractReceiptFields`):**
   - Unggah atau tempel teks OCR nota. Sistem membaca nama pemasok, nomor nota, tanggal, rincian barang, PPN, total rupiah, serta membuat hash SHA-256 bukti.
   - Hasil ekstraksi **selalu berstatus draf (`requiresReview: true`)** untuk Anda periksa sebelum diposting dan diikat permanen ke jurnal (`journal_entry_id`).
3. **Lewat Impor Mutasi Bank CSV (`parseBankStatementCsv`):**
   - Ekspor CSV mutasi dari Internet Banking (**BCA, Mandiri, BRI, BNI, atau format umum**), lalu impor ke rekening/dompet terkait.
   - Baris mutasi yang sudah pernah diimpor otomatis ditolak duplikasinya lewat `rowHash`.

### B. Memeriksa Duplikat & Nominal Janggal
- Sistem secara otomatis memberi peringatan bila menemukan:
  - **Duplikat bukti/nota:** Hash lampiran sama, nomor invoice + pihak sama, atau nominal + proyek/pihak sama dalam jendela tanggal berdekatan.
  - **Nominal janggal:** Salah ketik nol berlebih (mis. `Rp 5.000.000` padahal kebiasaan `Rp 500.000`), melebihi sisa anggaran RAP proyek, atau melewati ambang persetujuan.
- Bila muncul peringatan, tinjau ulang nota fisik sebelum menekan konfirmasi.

### C. Rekonsiliasi Kas vs Rekening Koran
- Jalankan pencocokan otomatis (`matchBankStatementToLedger`) antara mutasi CSV dan baris kas buku besar.
- Baris yang kandidatnya imbang (skor sama) tidak pernah dicocokkan otomatis dan masuk daftar **Perlu Ditinjau (`ambiguousMatches`)** untuk Anda pilih manual.
- Selisih saldo bank vs buku dipisahkan menjadi item penjelas (biaya admin bank, bunga giro, setoran dalam perjalanan, pengeluaran belum cair). Periode berstatus **`reconciled`** hanya jika `unexplainedDifference === 0`.

### D. Draf Penagihan (WhatsApp / Email) & Pemisahan Wewenang (SoD)
- Sistem memantau umur piutang (`current`, `1–30`, `31–60`, `61–90`, `>90` hari) dan skor risiko klien.
- Untuk piutang lewat jatuh tempo, sistem menyusun **draf pesan penagihan WA/Email** (berisi nomor invoice, tanggal jatuh tempo, dan nominal rupiah dari buku besar).
- Pada level **L1**, draf tidak pernah terkirim otomatis: pembuat draf dan penyetuju harus orang berbeda (**Segregation of Duties**), dan pengiriman wajib tercatat bersama `auditLogId`.

### E. Checklist Tutup Bulan (6 Butir Wajib)
Sebelum mengunci periode bulan (`lockedPeriodMonth`), periksa 6 butir checklist:
1. Kelengkapan lampiran bukti/nota untuk transaksi wajib bukti.
2. Seluruh dompet bank berstatus `reconciled` (`unexplainedDifference = 0`).
3. Akrual & pengakuan pendapatan DP berbasis progres/termin telah ditinjau.
4. Penyusutan aset tetap bulan berjalan sudah diposting (hanya pada periode terbuka).
5. Realisasi opex vs rencana anggaran bulanan telah ditinjau.
6. Jumlah baris jurnal bertanda `needs_review` = `0`.

---

## 2. Peran Financial Advisor

Fokus peran ini adalah membantu pemilik mengambil keputusan kas jangka pendek–menengah, profitabilitas proyek, dan penawaran harga baru.

### A. Forecast Arus Kas 13 Minggu (3 Skenario)
- Menampilkan proyeksi saldo kas mingguan selama 13 minggu ke depan dalam 3 skenario: **`best`**, **`base`**, dan **`worst`** (selalu `worst <= base <= best`).
- Perhatikan kolom **`firstNegativeCashDate`** pada skenario **`worst`** untuk mengantisipasi potensi defisit kas sejak dini bila termin klien terlambat atau biaya melonjak.

### B. Analisis Margin Proyek & EAC (*Estimate at Completion*)
- Membandingkan anggaran RAP vs realisasi per 6 kategori (`material`, `labor`, `equipment`, `overhead`, `other`, `uncategorized`).
- Menghitung proyeksi biaya akhir proyek (**EAC**) dan kategori pendorong pembengkakan terbesar (`topVarianceDrivers`) sehingga koreksi lapangan bisa dilakukan sebelum proyek selesai.

### C. Rekomendasi Harga Penawaran Proyek Baru
- Menghitung rentang harga penawaran (`lowPrice`, `recommendedPrice`, `highPrice`) berdasarkan margin historis proyek sejenis yang sudah selesai (`N >= 3`), atau memakai margin standar katalog (`-5% / 0% / +5%`) bila data historis belum mencukupi.

### D. Simulasi *What-If* & Prioritas Pembayaran Hutang
- **Simulasi *What-If*:** Uji dampak langsung ke saldo kas 13 minggu untuk 3 skenario:
  1. Klien menunda pembayaran beberapa hari (`client_delay`).
  2. Mengambil proyek baru lengkap dengan DP, biaya mingguan, dan jadwal termin (`take_new_project`).
  3. Mempercepat pembayaran hutang pemasok tertentu (`pay_payable_early`).
- **Prioritas Bayar Hutang (`prioritizePayables`):** Mengurutkan hutang berdasarkan jatuh tempo, keterkaitan dengan proyek aktif kritis, dan kewajiban pajak/denda sesuai kas tersedia saat ini.

### E. Cara Membaca *Provenance* & *Disclaimer*
- Setiap angka pada ringkasan Advisor (`get_advisor_brief` maupun layar ponsel 5 bagian) dilengkapi label **`source`** (sumber modul/skenario) dan **`period`** (rentang tanggal/periode buku besar).
- Penjaga narasi menolak setiap teks yang menyelipkan angka tanpa sumber dari kode deterministik.
- Seluruh analisis Financial Advisor selalu menyertakan penafian wajib: **"Bukan nasihat hukum/pajak berlisensi"**.

---

## 3. Peran CFO (*Chief Financial Officer*)

Fokus peran ini adalah tata kelola keuangan tingkat bisnis/direksi, kebijakan modal, kepatuhan pajak berbasis konfigurasi, dan pengawasan otonomi AI.

### A. Anggaran vs Aktual & KPI Utama
- **Anggaran vs Aktual:** Membandingkan rencana vs realisasi pos opex dan proyek (bulanan maupun tahunan), serta menyorot otomatis setiap pos dengan deviasi signifikan (`>= 10%`).
- **KPI Utama CFO:** Memantau `netCash`, `runwayMonths` (aman meski burn `<= 0`), margin kotor/bersih, DSO (hari penagihan piutang), DPO (hari pembayaran hutang), rasio piutang/pendapatan, konsentrasi klien Top 1 & Top 3, serta utilisasi tim.

### B. Laporan Direksi Bulanan (PDF Deterministik)
- Menghasilkan ringkasan eksekutif 1 halaman beserta lampiran (Anggaran vs Aktual, Margin & EAC Proyek, Aging Piutang/Hutang) dan ekspor PDF/HTML.
- Dilengkapi **isolasi periode terkunci** (transaksi bulan berikutnya tidak pernah mengubah laporan bulan yang sudah dikunci) dan **hash SHA-256 deterministik** sebagai bukti integritas dokumen.

### C. Kebijakan Dividen 2 Mode
- Membandingkan batas pembagian dividen yang aman antara mode **Per Proyek** (dari proyek yang sudah `closed` dan berlebih kas) vs **Per Bisnis** (dari laba ditahan), dengan penjagaan ketat agar tidak pernah memakan **cadangan opex wajib** (default `1×` rencana opex bulanan) maupun kas operasional minimum.

### D. Modul Pajak Konfigurabel (Berlabel Draf Konsultan Pajak)
- Tarif PPN, rezim PPh (`pph_final_konstruksi`, `pph_badan`, `pph_final_umkm`), tanggal jatuh tempo setor/lapor, dan dasar regulasi **tidak pernah di-hardcode** dan diatur di profil pajak organisasi (`planner_org_tax_configs`).
- Jika profil pajak belum diisi, sistem menampilkan status `config_required` (tidak menebak tarif). Jika verifikasi tarif (`verifiedAt`) lebih dari 180 hari, muncul pengingat pembaruan regulasi.
- Semua keluaran pajak berstatus **"Draf untuk ditinjau konsultan pajak — bukan nasihat hukum/pajak berlisensi"**.

### E. Aset Tetap, Penyusutan, Pendanaan, & Skenario Tahunan
- **Aset Tetap & Penyusutan:** Pengeluaran di atas ambang kapitalisasi (default `Rp 5.000.000`, masa manfaat `> 12` bulan) diarahkan ke kapitalisasi aset. Jadwal penyusutan garis lurus menghasilkan jurnal seimbang dan otomatis ditolak bila diarahkan ke periode terkunci (`periode_terkunci`).
- **Pendanaan & Skenario Tahunan:** Menyusun jadwal amortisasi cicilan pinjaman (pokok, bunga, sisa pokok akhir `0`), mendeteksi kapan bisnis membutuhkan tambahan modal kerja terhadap buffer kas, dan memproyeksikan rencana keuangan 12 bulan dalam 3 skenario (`conservative`, `base`, `growth`).
