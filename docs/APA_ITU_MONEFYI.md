# Apa Itu Monefyi?

> **Dokumen penjelasan produk** — untuk memperkenalkan Monefyi secara lengkap namun ringkas.  
> Cocok ditunjukkan saat presentasi, onboarding tim, atau diskusi dengan stakeholder.  
> **Terakhir diperbarui:** Juli 2026  
> **Dokumen teknis lebih dalam:** [`MONEFYI_MASTER.md`](MONEFYI_MASTER.md) · **Indeks:** [`README.md`](README.md)

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

---

## Empat pilar produk

### 1. Input Cerdas

Cara mencatat pemasukan dan pengeluaran:

| Metode | Contoh |
|--------|--------|
| **Teks bebas (AI)** | *"beli beras 150rb indomaret debit"* |
| **Suara** | Bicara → otomatis jadi teks → parse |
| **Batch WhatsApp** | Paste chat keluarga/teman berisi daftar belanja |
| **Foto struk** | Scan kamera/galeri → OCR |
| **Form manual** | Kontrol penuh: tanggal, kategori, akun, merchant |
| **Email import** *(premium)* | Notifikasi bank/e-wallet masuk email → draft transaksi |

Prinsip UX: **input → preview → simpan** — seminimal mungkin langkah setelah user mengetik atau foto.

### 2. Budgeting

Sistem budget bulanan yang selaras dengan cara berpikir keuangan pribadi:

**Empat prioritas (pilar hidup):**

| Pilar | Contoh |
|-------|--------|
| **Wajib (harus)** | Cicilan, kontrakan, listrik, sekolah anak |
| **Kebutuhan (penting)** | Makan, transport, kesehatan |
| **Keinginan (mau)** | Hiburan, jajan, hobi |
| **Simpan** | Dana darurat, investasi, tabungan |

**Cara kerja (user view):**

1. Set **income bulanan** (gaji, freelance, usaha)
2. Buat **kategori budget** per pilar — manual, template, atau **Auto Budget**
3. Setiap kategori bisa punya **item detail** + **rincian pengeluaran** (qty, satuan, jumlah)
4. Lihat **realisasi vs rencana** per kategori (progress bar, sisa/over)
5. Atur **jadwal realisasi** per item → masuk **pengingat notifikasi** (H-3, H-1, hari H)
6. Onboarding awal menawarkan pola **50/30/20** (Wajib 50% · Kebutuhan 30% · Mau+Simpan 20%)

### 3. Monevisor AI

**Monevisor** = *Sahabat Keuangan AI* — bukan sekadar chatbot, tapi laporan keuangan yang bisa dibaca manusia.

Yang user dapatkan:

- **Skor kesehatan keuangan** (0–100) + tren
- **Diagnosa** kondisi: income, expense, saving rate, net
- **Benchmark** posisi user vs standar (termasuk aturan 50/30/20)
- **Action plan** — langkah konkret yang bisa diambil
- **Proyeksi** jika pola konsisten
- **Chat AI** untuk tanya lanjut: *"Kategori mana yang perlu dikurangi?"*

> Monevisor bersifat **edukatif**, bukan nasihat keuangan berlisensi OJK.

### 4. Dashboard & Laporan

- **Saldo estimasi** per periode (income − expense)
- **Kartu akun** (BCA, GoPay, cash, dll.)
- **Grafik tren** 7 hari / periode
- **Daftar transaksi** dengan filter, pencarian, edit cepat
- **Cetak laporan PDF** untuk arsip atau review bulanan
- **Notifikasi in-app & push**: alert budget, tagihan, insight Monevisor

---

## Alur pengguna tipikal

```
Daftar / Login
      ↓
Onboarding (opsional): tujuan → income → auto-budget 50/30/20
      ↓
Catat transaksi harian (teks / WA / struk / manual)
      ↓
Pantau dashboard & saldo estimasi
      ↓
Kelola budget bulanan + jadwal tagihan
      ↓
Buka Monevisor → pahami kondisi → tanya AI → terapkan rekomendasi
      ↓
Cetak laporan / terima pengingat / lanjut bulan berikutnya
```

**Akses aplikasi:** User login di `monefyi.com/app/`. Akun diaktifkan setelah proses pendaftaran/pembayaran di situs marketing; kredensial dikirim via email.

---

## Layar utama aplikasi

| Layar | Fungsi |
|-------|--------|
| **Beranda / Dashboard** | Ringkasan saldo, akun, transaksi terbaru, mini chart, tips |
| **Transaksi** | Semua mutasi: cari, filter, edit, hapus, cetak PDF |
| **Budgeting** | Rencana bulanan per kategori & item, alokasi income, evaluasi |
| **Neraca** | Struktur Aktiva & Pasiva (double-entry) + status keseimbangan |
| **Monevisor (AI)** | Laporan kesehatan keuangan + chat coach |
| **Pengaturan** | Akun, notifikasi, tema, bahasa, email import |
| **Tutorial** | Panduan fitur in-app |

Aplikasi **mobile-first** (navigasi bawah + FAB) dan **desktop-friendly** (sidebar + panel lebar).

---

## Model akses & paket

Monefyi beroperasi sebagai **layanan berlangganan** (bukan free tier permanen):

| Paket | Ringkasan |
|-------|-----------|
| **Trial** | Coba fitur inti (~7 hari) dengan batas transaksi, akun, budget |
| **Monthly** | Akses penuh AI, export, email import, OCR lebih banyak |
| **Lifetime** | Sama seperti monthly + OCR unlimited & benefit jangka panjang |

Fitur premium (contoh): AI Coach penuh, email import bank, export advanced, push notification, Monevisor advanced.

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

Ciri teknis penting: **offline-first** (bisa catat & lihat data tanpa internet), **RLS** (data user terisolasi per akun), **AI dengan fallback** (tetap jalan meski koneksi lemah).

Detail arsitektur: [`MONEFYI_MASTER.md`](MONEFYI_MASTER.md).

---

## Ekosistem Monefyi

Monefyi bukan hanya satu produk — ada beberapa front-end dalam satu organisasi:

```
monefyi.com/              → Landing page marketing
monefyi.com/app/          → ★ Monefyi PWA (keuangan pribadi) — DOKUMEN INI
planner.monefyi.com       → Monefyi Planner (manajemen proyek/bisnis, terpisah)
```

| Produk | Audiens | Fokus |
|--------|---------|-------|
| **Monefyi PWA** | Pribadi / keluarga | Transaksi, budget, Monevisor |
| **Monefyi Planner** | Bisnis / proyek | RAP, tenaga kerja, budget proyek, multitenant org |

Keduanya **produk terpisah** dengan audiens berbeda. Dokumen ini hanya menjelaskan **Monefyi PWA** (keuangan pribadi).

---

## Apa yang membedakan Monefyi?

| Aspek | Aplikasi keuangan umum | Monefyi |
|-------|------------------------|---------|
| Input transaksi | Form manual dominan | Natural language + WA + OCR + suara |
| Budget | Kategori flat | Prioritas hidup (Wajib → Simpan) + item detail |
| Insight | Grafik & angka | Monevisor: narasi + skor + action plan |
| Konteks lokal | Generic | IDR, "50rb/jt", GoPay, warteg, batch WA |
| Platform | Native app store | PWA — install dari browser, offline-capable |
| AI | Optional add-on | Inti produk: parse + coach + rekomendasi |

---

## Batasan & disclaimer

- Monefyi **bukan** aplikasi perbankan, **bukan** payment gateway, dan **bukan** penasihat investasi berlisensi
- Angka **saldo estimasi** dihitung dari transaksi yang user catat — bukan saldo rekening bank real-time
- **Monevisor** memberikan insight edukatif; keputusan finansial tetap di tangan user
- Akurasi parse AI bergantung pada kualitas input; user selalu bisa review sebelum simpan

---

## Ringkasan satu paragraf

**Monefyi** adalah aplikasi keuangan pribadi berbasis AI untuk pasar Indonesia. User mencatat pemasukan dan pengeluaran semudah mengetik chat — termasuk paste dari WhatsApp dan foto struk — lalu menyusun budget bulanan berdasarkan prioritas hidup (wajib, kebutuhan, keinginan, simpan). Dashboard menampilkan saldo estimasi dan tren, sementara **Monevisor** memberikan diagnosis keuangan, skor kesehatan, dan rekomendasi langkah konkret dalam bahasa yang mudah dipahami. Aplikasi berjalan sebagai PWA di `monefyi.com/app`, dapat di-install di HP, dan tetap usable offline. Akses via langganan trial, bulanan, atau lifetime.

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
