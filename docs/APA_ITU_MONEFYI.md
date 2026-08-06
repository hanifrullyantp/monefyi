# Apa Itu Monefyi?

> **Dokumen penjelasan produk** — untuk memperkenalkan Monefyi secara lengkap namun ringkas.  
> Cocok ditunjukkan saat presentasi, onboarding tim, atau diskusi dengan stakeholder.  
> **Terakhir diperbarui:** Agustus 2026  
> **Dokumen teknis lebih dalam:** [`MONEFYI_MASTER.md`](MONEFYI_MASTER.md) · **Indeks:** [`README.md`](README.md)

> **Cakupan dokumen ini:** hanya aplikasi keuangan pribadi di [monefyi.com/app/](https://monefyi.com/app/).  
> Tidak mencakup Monefyi Planner (`planner.monefyi.com`) atau produk lain di ekosistem.

---

## Definisi singkat

**Monefyi** adalah aplikasi **keuangan pribadi berbasis AI** (Progressive Web App) yang membantu orang Indonesia **mencatat uang semudah mengirim chat**, **menyusun budget bulanan**, dan **memahami kondisi keuangan** lewat asisten AI bernama **Monevisor**.

| | |
|---|---|
| **Tagline** | *Catat transaksi semudah chat. Pahami keuanganmu dengan AI.* |
| **Posisi** | Advisor AI untuk keuangan pribadi |
| **Akses** | [monefyi.com/app/](https://monefyi.com/app/) — bisa di-install seperti aplikasi mobile (PWA) |
| **Bahasa** | Indonesia (utama) + English |

---

## Untuk siapa?

Monefyi ditujukan untuk:

- **Individu dan keluarga** yang ingin kontrol pengeluaran tanpa ribet isi form panjang
- Orang yang sudah **terbiasa WhatsApp** — bisa paste riwayat chat pengeluaran langsung ke aplikasi
- User yang butuh **budget bulanan terstruktur** (bukan sekadar lihat mutasi rekening)
- Siapa pun yang ingin **insight keuangan dalam bahasa manusia**, bukan hanya angka di tabel

Contoh profil: karyawan dengan gaji tetap, freelancer dengan income fluktuatif, atau orang yang baru mulai disiplin catat keuangan.

---

## Masalah yang diselesaikan

| Masalah umum | Solusi Monefyi |
|--------------|----------------|
| Catat transaksi terasa ribet & malas | Input natural language: *"makan siang 50rb gopay"* |
| Banyak pengeluaran tercatat di chat WA | Impor batch dari teks WhatsApp |
| Struk belanja menumpuk | Foto struk → OCR → transaksi siap review |
| Tidak tahu uang habis ke mana | Dashboard + breakdown kategori + laporan |
| Budget Excel/manual sering ditinggal | Budget bulanan per prioritas hidup + pengingat jadwal |
| Aplikasi keuangan cuma tampilkan grafik | Monevisor menjelaskan kondisi + memberi langkah konkret |
| Saldo rekening vs keuangan pribadi bingung | Neraca keuangan (Aktiva & Pasiva) + pelacak ketidakseimbangan |

---

## Navigasi aplikasi

### Di HP (mobile)

Menu bawah dengan lima titik akses:

| Tombol | Fungsi |
|--------|--------|
| **Beranda** | Ringkasan saldo, akses cepat, transaksi terbaru, budget, grafik mini |
| **Transaksi** | Daftar semua mutasi uang |
| **+ (tengah)** | Tambah transaksi: foto struk, input cepat (AI), atau form manual |
| **Budget** | Halaman budgeting penuh |
| **Advisor** | Halaman Monevisor AI |

Header atas: **filter periode**, **cari transaksi**, **lonceng notifikasi**, dan **indikator sinkronisasi** (online/offline).

### Di komputer (desktop)

Sidebar kiri:

- **Dashboard** — tampilan ringkasan lebar dengan grafik dan KPI
- **Semua Transaksi**
- **Budgeting**
- **Neraca** *(hanya di desktop sidebar)*
- **Monevisor (AI)**

Menu bawah sidebar: **Tutorial**, **Affiliate**, **Pengaturan**, **Install App** (jika browser mendukung).

---

## Daftar lengkap fitur

Bagian ini merangkum **seluruh fitur yang ada di `monefyi.com/app/`** — ditulis spesifik dan dalam bahasa non-teknis.

---

### 1. Masuk & pertama kali pakai

**Login & akun**

- Masuk dengan email dan password
- Lupa password (reset via email)
- Splash screen saat aplikasi dibuka
- Pesan bantuan jika akun belum terdaftar (hubungi admin)

**Wizard onboarding (login pertama)**

1. Pilih **tujuan keuangan**: hemat lebih banyak, bayar hutang, mulai investasi, atau sekadar tracking
2. Isi **pendapatan bulan ini** dan sumbernya (Gaji, Freelance, Usaha, dll.)
3. Terima **budget otomatis pola 50/30/20** atau lewati dulu
4. Selesai → langsung ke Dashboard atau tambah transaksi pertama

**Product tour (tur interaktif, sekali jalan)**

Panduan spotlight langkah demi langkah: filter periode → kartu saldo → akses cepat → cara catat transaksi → notifikasi → halaman budget → buat budget pertama.

**Modal selamat datang**

Fallback singkat tiga poin nilai produk — Mulai atau Lewati.

---

### 2. Enam cara mencatat transaksi

Semua metode mengikuti prinsip: **input → preview → simpan** — user selalu bisa cek sebelum data masuk.

#### A. Input cepat dengan teks bebas (AI)

- Ketik seperti chat: *"makan siang 50k di warteg pake gopay"*, *"gaji 8jt masuk bca"*
- Satu baris = satu transaksi; bisa **beberapa transaksi sekaligus**
- Tombol proses (→) menampilkan **preview** hasil baca AI
- **Chip rekomendasi** — saran input berdasarkan kebiasaan user
- Aplikasi **belajar dari koreksi** user (semakin sering dipakai, semakin akurat)
- Toolbar dari sheet yang sama: suara, manual, batch WA, scan struk, bersihkan teks

#### B. Input suara

- Tombol mikrofon di input cepat (HP) dan bar AI (desktop)
- Bicara → otomatis jadi teks → diproses seperti input AI

#### C. Foto struk (OCR)

- Ambil foto kamera atau pilih dari galeri (HP); pilih file di desktop
- **Beberapa foto sekaligus** didukung
- Teks struk dibaca otomatis → transaksi disiapkan untuk review
- Batas jumlah scan tergantung paket langganan

#### D. Impor batch WhatsApp

- Paste chat keluarga/teman/grup yang berisi daftar belanja atau pengeluaran
- **Parse & Preview** — setiap baris bisa diedit sebelum disimpan
- Tombol **Simpan Semua** atau **Simpan yang Valid**
- Paste langsung dari clipboard
- Transaksi yang perlu dicek masuk **antrian review**

#### E. Form manual

Kontrol penuh untuk user yang ingin presisi:

- Tanggal, tipe (pengeluaran / pemasukan / transfer)
- Jumlah + preset cepat (50rb, 100rb, 200rb, 500rb, 1jt) + **numpad**
- Kategori, akun sumber, akun tujuan (untuk transfer)
- Metode bayar, merchant/toko, catatan
- **Saran kategori otomatis** — bisa diterapkan dengan satu ketuk

#### F. Email auto-import *(paket berbayar)*

- Forward email notifikasi bank/e-wallet ke **alamat import unik** milik user
- Transaksi masuk sebagai **draft** → user konfirmasi (atau auto-konfirmasi jika diaktifkan)
- Wizard 3 langkah: salin alamat, pilih provider email, panduan setup
- Kelola antrian import dari Pengaturan → Email Import

#### Bar AI terpadu (desktop)

Di halaman transaksi desktop: input teks + suara + foto struk langsung dari toolbar atas.

---

### 3. Beranda (HP) & Dashboard (desktop)

#### Beranda mobile

| Bagian | Apa yang user bisa lakukan |
|--------|---------------------------|
| **Kartu saldo per akun** | Scroll horizontal; tap untuk detail; sembunyikan/tampilkan nominal (ikon mata) |
| **Akses cepat** | Shortcut ke Transaksi, Budget, Analisa, Tutorial, Profil, Affiliate, Install App, Akun, Pengaturan |
| **Kartu Neraca** | Shortcut langsung ke halaman Neraca Keuangan |
| **Transaksi terbaru** | Tap item → detail; "Lihat semua" → halaman transaksi |
| **Ringkasan budget** | Progres budget bulan ini; tap → buka halaman budget |
| **Grafik mini 7 hari** | Tren pemasukan/pengeluaran; tap → buka Monevisor |
| **Tips harian** | Insight kontekstual dari data riil user + tombol aksi lanjut |

#### Dashboard desktop (tampilan lebar)

| Bagian | Apa yang user bisa lakukan |
|--------|---------------------------|
| **Kartu saldo** | Estimasi saldo, pemasukan, pengeluaran, jumlah transaksi periode aktif |
| **Sembunyikan saldo** | Ikon mata — preferensi tersimpan |
| **Akun** | Tiga akun teratas + "Lihat semua" + shortcut neraca |
| **KPI keuangan** | Pemasukan, pengeluaran, surplus/defisit, saving rate |
| **Ringkasan budget** | Rencana vs realisasi, donut sisa, top kategori, progress bar, tips |
| **Grafik tren** | Income vs expense mengikuti filter periode |
| **Donut kategori** | Tap kategori untuk fokus; tap lagi untuk reset |
| **Bar pengeluaran harian** | Minggu terakhir dalam periode aktif |

**Kustomisasi dashboard** (Pengaturan → Dashboard): nyalakan/matikan kartu KPI, budget, grafik tren, donut kategori, bar mingguan.

---

### 4. Halaman Transaksi

#### Tampilan daftar

- **Kartu** di HP dan **tabel** di desktop
- Kolom desktop: pilih, deskripsi, kategori, akun, tanggal, jumlah, anggaran
- Toggle tampilan list ↔ tabel (desktop)
- **Muat lebih banyak** untuk pagination
- State kosong → ajakan "Tambah Transaksi Pertama"

#### Cari & filter

- Cari merchant, catatan, atau kategori
- Filter tipe, kategori, akun, periode
- Chip cepat: Semua / Pemasukan / Pengeluaran / Transfer
- Preset periode: hari ini, kemarin, minggu ini, bulan ini/lalu, 3/6 bulan, tahun ini, rentang custom
- **Cetak laporan PDF** dari panel filter (Print browser → Save as PDF), mengikuti filter aktif

#### Kelompok & urut

- **Kelompokkan** menurut: tanggal, kategori, akun, atau tanpa kelompok
- **Urutkan** menurut: tanggal, jumlah, deskripsi, kategori, akun (naik/turun)

#### Edit massal

Toolbar edit saat mode edit aktif:

- **Undo / Redo** perubahan
- **Salin / Duplikat / Hapus** transaksi terpilih (checkbox)
- **Simpan semua perubahan** (badge jumlah draft)
- Pilih semua (desktop)
- **Drag** urutan baris (desktop)
- Pilih kolom tabel yang ditampilkan

#### Detail transaksi

- Tap transaksi → sheet detail & edit
- **Insight transaksi** — konteks budget, pola belanja, dll.
- Edit field, simpan, atau hapus
- Konfirmasi sebelum hapus
- Peringatan jika ada perubahan belum disimpan saat keluar

---

### 5. Budgeting (halaman penuh)

#### Ringkasan & pendapatan

- **Hero budget** — total direncanakan, realisasi, sisa, progress keseluruhan
- **Strip alokasi** — sudah dibudgetkan vs sisa vs total income
- **Budget Income** — kelola sumber pendapatan bulan (Gaji, Freelance, Usaha, dll.)
- **Pilih bulan budget** — terpisah dari filter transaksi global

#### Empat prioritas hidup

| Pilar | Contoh |
|-------|--------|
| **Harus (Wajib)** | Cicilan, kontrakan, listrik, sekolah anak |
| **Penting (Kebutuhan)** | Makan, transport, kesehatan |
| **Mau (Keinginan)** | Hiburan, jajan, hobi |
| **Simpan** | Dana darurat, investasi, tabungan |

Daftar bisa ditampilkan **per kelompok prioritas** (dengan strip warna) atau flat.

#### Daftar budget (accordion)

- Expand kategori → lihat & edit **item-item** di dalamnya
- Progress per kategori (% terpakai, sisa/over budget)
- Badge "Selesai" jika semua item done/skipped
- **Drag** urut kategori dan item
- Item budget: nama, slider/nominal, **rincian baris** (qty × satuan × harga)
- Status item: Direncanakan, Berjalan, Selesai, Dilewati
- **Tanggal target realisasi** → pengingat notifikasi H-3, H-1, hari H

#### Toolbar budget

- Undo, Redo, Simpan, Batalkan perubahan
- Duplikat, Hapus terpilih, Tambah kategori
- **Auto Budget** — generate otomatis dari income atau riwayat pengeluaran
- **Template** — muat template bawaan/custom; simpan bulan ini sebagai template
- **Urutkan:** Urgent, Prioritas, Progress, Nominal, Nama, Urutan sendiri

#### Modal & alat tambahan

- **Form budget baru** — buat kategori + prioritas + item
- **Auto Budget modal** — mode pemula atau berdasarkan riwayat spending
- **Template modal** — preview komposisi 50/30/20, pilih & terapkan
- **Detail item modal** — jadwal, status, rincian, transaksi terkait
- **Duplikat budget** antar bulan

#### Onboarding budget

Saat onboarding awal, user ditawari pola **50/30/20**: Wajib 50% · Kebutuhan 30% · Mau+Simpan 20%.

---

### 6. Neraca Keuangan

Halaman khusus untuk melihat **posisi keuangan secara utuh** — bukan hanya cash flow harian.

#### Mode tampilan

- **LIVE** — posisi keuangan saat ini
- **HISTORY** — pilih bulan untuk snapshot historis
- Tombol refresh data

#### Struktur

- **AKTIVA (Aset)** — kategori dengan nilai, bisa di-expand
- **PASIVA (Kewajiban & Modal)** — hutang, modal, simpanan, laba ditahan, dll.
- Total aktiva vs total pasiva

#### Interaksi

- Expand kategori → lihat & **tambah/edit item inline** (aset, hutang, modal, dll.)
- **Indikator timbangan** — seimbang / tidak seimbang + selisih nominal
- **Lacak Penyebab** (jika tidak seimbang):
  - Saran perbaikan
  - Daftar transaksi mencurigakan
  - Quick assign selisih ke kategori (modal, hutang, aset) agar seimbang

Akses dari: sidebar desktop, kartu di Beranda/Dashboard.

---

### 7. Monevisor AI — Sahabat Keuangan

**Monevisor** = laporan keuangan yang bisa dibaca manusia + chat coach.

#### Halaman Monevisor (utama)

| Bagian | Isi |
|--------|-----|
| **Skor kesehatan** | Angka 0–100 + label kondisi + faktor-faktor |
| **Peringatan data** | Jika data kurang lengkap untuk analisa |
| **Metrik** | Income, expense, net, saving rate (%) |
| **Diagnosa** | Kartu masalah spesifik dari kondisi user |
| **Benchmark** | Perbandingan vs aturan 50/30/20 & standar lain |
| **Action plan** | Langkah konkret yang bisa diambil |
| **Proyeksi** | Estimasi ke depan jika pola konsisten |
| **Breakdown pengeluaran** | Top kategori + persentase |
| **Perbandingan bulan lalu** | Tren naik/turun |
| **Chat AI** | Tanya bebas + pertanyaan starter; riwayat chat tersimpan |

#### Preferensi Monevisor (Pengaturan → Monevisor)

- Tujuan utama: hemat lebih, track spending, kurangi hutang, bangun budget, investasi
- Gaya bicara: friendly, professional, direct, encouraging
- Gaya notifikasi: minimal, balanced, detailed
- Toggle tips proaktif

> Monevisor bersifat **edukatif**, bukan nasihat keuangan berlisensi OJK.

---

### 8. Filter global

Dua lapisan filter yang mempengaruhi saldo, KPI, grafik, transaksi, dan Monevisor:

**Filter periode & pencarian** (header)

- Preset: bulan ini/lalu, minggu ini, 3/6 bulan, tahun ini, hari ini, kemarin, custom range
- Pencarian teks, filter tipe, kategori, akun

**Filter global popup** (ikon filter)

- Periode (bulan)
- Prioritas budget (harus / penting / mau / simpan)
- Akun
- Tipe transaksi
- Badge jumlah filter aktif + tombol reset

---

### 9. Notifikasi

#### In-app (lonceng)

- Badge jumlah belum dibaca
- Panel notifikasi dengan aksi langsung (buka budget, transaksi, Monevisor, dll.)

#### Push notification *(paket berbayar)*

Jenis yang bisa di-toggle di Pengaturan → Notifikasi:

| Jenis | Kapan muncul |
|-------|--------------|
| **Morning Briefing** | Ringkasan budget & sisa harian setiap pagi |
| **Bill Reminder** | Pengingat tagihan H-3, H-1, hari H (dari jadwal item budget) |
| **Budget Milestone** | Peringatan saat budget 75%, 90%, 100% |
| **Spending Alert** | Pengeluaran besar (>Rp 500.000) |
| **Weekly Recap** | Ringkasan mingguan Minggu malam |
| **Monthly Report** | Laporan bulanan tanggal 1 |
| **Achievement** | Pencapaian positif (streak, saving rate) |
| **Smart Tips** | Tips kontekstual 2–3x per minggu |
| **Sync Status** | Status sinkronisasi data |

Pengaturan tambahan: **jam tenang** (dari–sampai), **maks 1–3 notifikasi/hari**, suara & getar on/off, minta izin browser.

---

### 10. Pengaturan

| Bagian | Yang bisa user lakukan |
|--------|------------------------|
| **Akun** | Edit nama, lihat email & paket, ganti password, logout; akses Admin Console (admin saja) |
| **Tampilan** | Mode terang/gelap, bahasa Indonesia/English |
| **Dashboard** | Toggle kartu KPI, budget, grafik |
| **Akun keuangan** | Tambah, rename, hapus daftar akun (BCA, GoPay, cash, dll.); lihat saldo per akun |
| **Notifikasi** | Semua preferensi push (lihat §9) |
| **Email Import** | Status, alamat import, buka wizard setup |
| **AI** | Aktifkan BYOK (Bring Your Own Key) — simpan API key Gemini pribadi |
| **Monevisor** | Goal, tone, notifikasi, tips proaktif |
| **Data** | Export Excel (.xlsx), export CSV, import Excel/CSV |

---

### 11. Tutorial & Bantuan

- Pusat bantuan dengan **progress baca** (X/Y artikel selesai)
- **Cari tutorial** by keyword
- Kategori + artikel terstruktur
- Form feedback ke tim
- Deep-link per kategori/artikel (`#tutorial/...`)

---

### 12. Export & arsip data

| Metode | Keterangan |
|--------|------------|
| **Cetak PDF** | Dari panel filter transaksi — Print browser → Save as PDF; mengikuti filter aktif |
| **Export Excel** | Pengaturan → Data |
| **Export CSV** | Pengaturan → Data |
| **Import Excel/CSV** | Restore atau migrasi transaksi dari spreadsheet |

*(Export PDF/CSV terkunci di paket trial)*

---

### 13. Offline, sinkronisasi & undo

#### Mode offline

- Aplikasi tetap bisa dipakai tanpa internet (data tersimpan di perangkat)
- Indikator **Mode Offline** vs **Tersinkron**
- Input AI saat offline → masuk **antrian pending**, diproses saat online
- Sesi login di-cache agar tetap bisa buka app offline

#### Sinkronisasi

- Sinkron otomatis saat online kembali
- **Tap indikator sync** → sinkron manual
- Toast "X perubahan tersinkron"
- Multi-device sync *(paket berbayar)*

#### Undo / Redo & riwayat

- Undo/redo di halaman transaksi (mode edit)
- Undo/redo di halaman budget
- **Activity history** — log 100 aksi terakhir (create, update, delete, sync, undo, redo)
- Badge floating antrian pending: lihat teks mentah, status, retry, hapus

---

### 14. Akun keuangan & saldo

- Daftar akun: BCA, Mandiri, GoPay, OVO, cash, dll.
- **Sheet saldo per akun** — estimasi saldo tiap rekening/dompet
- Rename akun otomatis di seluruh transaksi terkait
- **Sembunyikan nominal** di kartu saldo (preferensi tersimpan)

> Angka **saldo estimasi** dihitung dari transaksi yang user catat — bukan saldo rekening bank real-time.

---

### 15. Program Affiliate

- Modal program affiliate dari sidebar/akses cepat
- Informasi komisi dan CTA eksternal
- Akses affiliate penuh untuk paket **Lifetime**

---

### 16. Install sebagai aplikasi (PWA)

- Install ke home screen HP atau desktop
- Prompt install dari sidebar + shortcut akses cepat
- Bisa dipakai offline setelah pertama kali dibuka
- Tampilan native-feel (safe area, bottom nav)

---

### 17. Admin Console *(hanya admin)*

Panel khusus admin via `#admin/...`:

- Kelola user, paket, revenue
- Konfigurasi aplikasi (URL checkout, batas trial, dll.)
- Kelola konten tutorial

---

## Empat pilar produk (ringkas)

| Pilar | Inti |
|-------|------|
| **1. Input Cerdas** | Teks AI, suara, batch WA, OCR struk, manual, email import |
| **2. Budgeting** | Prioritas hidup, item detail, auto budget, template, jadwal & pengingat |
| **3. Monevisor AI** | Skor, diagnosa, benchmark, action plan, proyeksi, chat |
| **4. Dashboard & Laporan** | Saldo, grafik, neraca, export PDF/Excel/CSV, notifikasi |

---

## Alur pengguna tipikal

```
Daftar / Login
      ↓
Onboarding: tujuan → income → auto-budget 50/30/20 (opsional)
      ↓
Product tour (opsional, sekali)
      ↓
Catat transaksi harian (teks / suara / WA / struk / manual / email)
      ↓
Pantau Beranda/Dashboard & saldo estimasi
      ↓
Kelola budget bulanan + jadwal tagihan
      ↓
Cek Neraca (posisi keuangan utuh)
      ↓
Buka Monevisor → pahami kondisi → tanya AI → terapkan rekomendasi
      ↓
Cetak laporan / terima pengingat / lanjut bulan berikutnya
```

**Akses aplikasi:** User login di `monefyi.com/app/`. Akun diaktifkan setelah proses pendaftaran/pembayaran di situs marketing; kredensial dikirim via email.

---

## Model akses & paket

Monefyi beroperasi sebagai **layanan berlangganan**:

| Paket | Ringkasan | Batas utama |
|-------|-----------|-------------|
| **Trial** | Coba fitur inti ~7 hari | Max 50 transaksi, 2 akun, 3 budget, 5 scan OCR |
| **Monthly** | Akses penuh AI & premium | Unlimited transaksi/akun/budget, 50 scan OCR/bulan |
| **Lifetime** | Sekali bayar, akses permanen | Unlimited semua + OCR unlimited + priority support |

**Fitur premium** (Monthly/Lifetime): AI Coach penuh, AI Insights, Monevisor Advanced, email import bank, export PDF/CSV, push notification, multi-device sync.

**Fitur tetap tersedia di Trial:** input manual, parse teks cepat, budget dasar, dashboard dasar, mode offline.

**Setelah paket habis:**

- Banner peringatan H-3 sebelum expired
- **Grace period** 3 hari (trial) / 7 hari (monthly) — masih full access
- Setelah grace: mode **read-only** (trial) atau **degraded** (monthly — lihat saja, fitur premium terkunci)
- Overlay expired → ajakan perpanjang atau logout

Pembayaran via **Lynk.id**; aktivasi otomatis setelah webhook pembayaran.

---

## Teknologi (ringkas)

Monefyi dibangun sebagai **Progressive Web App** — tidak perlu download dari App Store, tapi bisa di-install ke home screen.

| Lapisan | Teknologi |
|---------|-----------|
| **Frontend** | HTML, JavaScript, PWA (service worker, offline) |
| **Backend** | Supabase (database, auth, serverless functions) |
| **AI** | Google Gemini (parse transaksi, insight, chat coach) |
| **Hosting** | Vercel |
| **Offline** | Data tersimpan lokal (IndexedDB), sync saat online |

Ciri teknis penting: **offline-first**, **data user terisolasi per akun**, **AI dengan fallback lokal** (tetap jalan meski koneksi lemah).

Detail arsitektur: [`MONEFYI_MASTER.md`](MONEFYI_MASTER.md).

---

## Ekosistem Monefyi

```
monefyi.com/              → Landing page marketing
monefyi.com/app/          → ★ Monefyi PWA (keuangan pribadi) — DOKUMEN INI
planner.monefyi.com       → Monefyi Planner (manajemen proyek/bisnis, terpisah)
```

| Produk | Audiens | Fokus |
|--------|---------|-------|
| **Monefyi PWA** | Pribadi / keluarga | Transaksi, budget, neraca, Monevisor |
| **Monefyi Planner** | Bisnis / proyek | RAP, tenaga kerja, budget proyek, multitenant org |

Keduanya **produk terpisah** dengan audiens berbeda. Dokumen ini hanya menjelaskan **Monefyi PWA** (keuangan pribadi).

---

## Apa yang membedakan Monefyi?

| Aspek | Aplikasi keuangan umum | Monefyi |
|-------|------------------------|---------|
| Input transaksi | Form manual dominan | Natural language + WA + OCR + suara + email |
| Budget | Kategori flat | Prioritas hidup (Wajib → Simpan) + item detail + jadwal |
| Insight | Grafik & angka | Monevisor: narasi + skor + action plan + chat |
| Posisi keuangan | Cash flow saja | Neraca Aktiva/Pasiva + pelacak ketidakseimbangan |
| Konteks lokal | Generic | IDR, "50rb/jt", GoPay, warteg, batch WA |
| Platform | Native app store | PWA — install dari browser, offline-capable |
| AI | Optional add-on | Inti produk: parse + coach + rekomendasi |

---

## Batasan & disclaimer

- Monefyi **bukan** aplikasi perbankan, **bukan** payment gateway, dan **bukan** penasihat investasi berlisensi
- Angka **saldo estimasi** dihitung dari transaksi yang user catat — bukan saldo rekening bank real-time
- **Monevisor** memberikan insight edukatif; keputusan finansial tetap di tangan user
- Akurasi parse AI bergantung pada kualitas input; user selalu bisa review sebelum simpan
- **Neraca** adalah alat tracking posisi keuangan pribadi — bukan laporan keuangan resmi/audit

---

## Ringkasan satu paragraf

**Monefyi** adalah aplikasi keuangan pribadi berbasis AI untuk pasar Indonesia. User mencatat pemasukan dan pengeluaran semudah mengetik chat — lewat teks bebas, suara, paste WhatsApp, foto struk, form manual, atau forward email bank — lalu menyusun budget bulanan berdasarkan prioritas hidup (wajib, kebutuhan, keinginan, simpan) dengan item detail, jadwal tagihan, dan pengingat. Beranda dan dashboard menampilkan saldo estimasi, tren, dan tips harian; halaman Neraca memetakan posisi keuangan utuh (Aktiva & Pasiva). **Monevisor** memberikan skor kesehatan, diagnosis, benchmark 50/30/20, action plan, proyeksi, dan chat coach dalam bahasa yang mudah dipahami. Aplikasi berjalan sebagai PWA di `monefyi.com/app`, dapat di-install di HP, tetap usable offline, dan mendukung export PDF/Excel/CSV. Akses via langganan trial, bulanan, atau lifetime.

---

## Dokumen terkait

| Dokumen | Kapan dipakai |
|---------|---------------|
| [`MONEFYI_MASTER.md`](MONEFYI_MASTER.md) | Referensi teknis lengkap (dev & arsitektur) |
| [`MONEFYI_PRODUCT_PROMPT.md`](MONEFYI_PRODUCT_PROMPT.md) | Spec produk + prompt AI developer |
| [`MONEVISOR.md`](MONEVISOR.md) | Detail fitur Monevisor |
| [`README.md`](README.md) | Indeks semua dokumentasi |
| [`../README.md`](../README.md) | Setup development & deploy |

---

*Maintainer: perbarui dokumen ini saat positioning produk atau fitur utama berubah.*
