

# MASTER CONTEXT PROMPT

```
Kamu adalah senior product engineer yang ditugaskan melakukan upgrade besar pada aplikasi Monefyi.

KONTEKS APLIKASI:
- Monefyi adalah PWA keuangan pribadi untuk pasar Indonesia
- Stack: HTML, JavaScript, Supabase, Google Gemini AI, Vercel, IndexedDB (offline-first)
- Referensi dokumen produk: @MONEFYI_MASTER.md
- Bahasa utama: Indonesia

KONTEKS UPGRADE:
Monefyi saat ini berfungsi sebagai aplikasi pencatatan dan budgeting.
Tujuan upgrade: mengubah Monefyi menjadi "Sistem Kendali Keuangan Harian" — 
aplikasi yang membantu user mengambil keputusan uang yang benar setiap hari,
bukan hanya mencatat dan melaporkan.

PRINSIP UTAMA YANG HARUS DIJAGA:
1. Setiap fitur baru harus menjawab pertanyaan: "keputusan apa yang dibantu hari ini?"
2. Output harus terasa seperti teman yang mengingatkan, bukan laporan akuntansi
3. Bahasa selalu Indonesia, informal tapi jelas
4. Mobile-first, offline-capable
5. Jangan break fitur existing yang sudah berjalan
6. Setiap perubahan UI harus backward compatible
7. Gunakan pola kode yang sudah ada di codebase sebelum membuat pola baru

YANG SUDAH ADA DAN JANGAN DIUBAH CARA KERJANYA:
- Sistem notifikasi push (sudah berjalan)
- Email import dari bank/wallet (sudah berjalan)
- Input AI natural language
- OCR struk
- Batch WA import
- Sistem budget 4 pilar
- Monevisor AI chat
- Neraca Aktiva/Pasiva
- Offline sync dengan IndexedDB
- Supabase auth dan RLS

SEBELUM MULAI SETIAP TASK:
1. Baca file yang relevan terlebih dahulu
2. Identifikasi fungsi/komponen yang akan dimodifikasi
3. Tanyakan jika ada ambiguitas sebelum menulis kode
4. Tulis kode secara incremental, jangan rewrite file besar sekaligus
5. Setelah selesai setiap task, ringkas apa yang diubah dan apa yang perlu dicek
```

---

# PHASE 1 — FONDASI PENGALAMAN
## Target: User merasakan perbedaan di 7 hari pertama

---

## TASK 1.1 — Rombak Onboarding

```
TASK 1.1: Upgrade Onboarding Flow

TUJUAN:
Ubah onboarding dari "setup fitur" menjadi "diagnosa masalah user".
User harus merasa dimengerti sejak menit pertama.

BACA DULU:
- File onboarding yang ada saat ini
- Skema database user preferences di Supabase
- Struktur wizard yang sudah ada

YANG HARUS DIBANGUN:

Step 1 — Diagnosa Masalah Utama
Tampilkan pertanyaan:
"Masalah keuangan utama kamu sekarang apa?"
Pilihan (bisa pilih lebih dari 1):
- Gaji habis sebelum akhir bulan
- Tidak tahu uang pergi ke mana
- Ada utang yang belum lunas
- Belum punya tabungan sama sekali
- Pengeluaran sering tidak terkontrol
- Ingin mulai investasi tapi bingung

Step 2 — Tanggal Gajian
"Kamu biasanya gajian tanggal berapa?"
Input: tanggal (1-31) atau pilihan "tidak tentu" untuk freelancer

Step 3 — Tagihan Wajib Terbesar
"Ada tagihan tetap setiap bulan?"
Contoh: cicilan, kontrakan, listrik
Input: tambah item tagihan (nama + nominal)
Boleh dilewati

Step 4 — Status Utang
"Saat ini ada utang aktif?"
Pilihan: Tidak ada / Ada (minta nominal kasar)

Step 5 — Tujuan Terdekat
"Dalam 6 bulan ke depan, kamu ingin:"
Pilihan:
- Tidak tekor sebelum gajian
- Punya dana darurat minimal 3 bulan pengeluaran
- Lunas utang [nama utang dari step 4]
- Mulai investasi rutin
- Bisa liburan tanpa utang
- [Input manual]

Step 6 — Income Bulanan
(Pindahkan dari step awal ke sini — setelah user sudah engage)
"Pemasukan rutin per bulan kamu sekitar berapa?"
Input nominal + sumber (Gaji / Freelance / Usaha / Campuran)

HASIL ONBOARDING:
Simpan semua data ke tabel user_profile / user_preferences di Supabase.
Generate "Plan 7 Hari Pertama" berdasarkan jawaban user.
Tampilkan plan ini sebelum masuk ke dashboard.

STRUKTUR PLAN 7 HARI:
Sesuaikan task berdasarkan masalah yang dipilih user.
Contoh untuk user yang pilih "gaji habis sebelum akhir bulan":
- Hari 1: Masukkan semua tagihan wajib bulan ini
- Hari 2: Catat semua pengeluaran hari ini (berapapun kecilnya)
- Hari 3: Lihat 3 kategori pengeluaran terbesar
- Hari 4: Set batas pengeluaran harian
- Hari 5: Review — ada yang bisa dikurangi?
- Hari 6: Sisihkan pertama kali (Rp10.000 pun cukup)
- Hari 7: Buka Monevisor, lihat kondisi pertamamu

Simpan plan ke database.
Tampilkan progress plan di beranda sebagai checklist kecil.
Tandai item selesai secara otomatis jika aksi sudah dilakukan.

CATATAN TEKNIS:
- Jangan hapus wizard onboarding lama, buat versi baru sebagai flag
- Tambahkan kolom onboarding_version di user_profile
- Jika user sudah pernah onboarding lama, jangan paksa ulang
- Onboarding baru hanya untuk akun baru atau jika user minta reset
```

---

## TASK 1.2 — Hero Card "Situasi Hari Ini"

```
TASK 1.2: Bangun Hero Card — Situasi Keuangan Hari Ini

TUJUAN:
Tambahkan komponen utama di bagian paling atas beranda
yang menjawab pertanyaan yang selalu ada di kepala user setiap hari:
"Hari ini saya aman pakai uang berapa?"

BACA DULU:
- Komponen beranda / dashboard yang ada
- Logika kalkulasi budget dan transaksi yang sudah ada
- Cara sistem menghitung saldo estimasi saat ini

KALKULASI YANG DIBUTUHKAN:

1. Safe-to-spend hari ini:
Formula:
(Sisa budget fleksibel bulan ini) ÷ (Sisa hari sampai gajian)

Budget fleksibel = Total income - Fixed bills - Target simpan
Sisa hari = tanggal gajian - hari ini

Jika hasil negatif → tampilkan warning, bukan angka negatif

2. Runway — uang aman sampai kapan:
Bandingkan:
- Rata-rata pengeluaran harian 7 hari terakhir
- Sisa uang yang bisa dipakai

Hitung berapa hari uang masih cukup.
Bandingkan dengan sisa hari ke gajian.

3. Prediksi akhir periode:
Proyeksikan pengeluaran sampai tanggal gajian
berdasarkan rata-rata harian saat ini.
Hitung: akan surplus atau defisit, dan nominalnya.

4. Status kondisi:
AMAN → runway > sisa hari ke gajian + surplus diprediksi
WASPADA → runway mendekati sisa hari ke gajian
BAHAYA → runway < sisa hari ke gajian atau prediksi defisit

TAMPILAN HERO CARD:
Kondisi AMAN (hijau):
┌─────────────────────────────────────┐
│ Hari ini aman pakai                 │
│ Rp 85.000                           │
│                                     │
│ 📅 Gajian lagi 14 hari             │
│ 📈 Prediksi akhir bulan: +Rp230rb  │
│                                     │
│ ✅ Kamu on track bulan ini         │
└─────────────────────────────────────┘

Kondisi WASPADA (kuning):
┌─────────────────────────────────────┐
│ Hari ini aman pakai                 │
│ Rp 42.000                           │
│                                     │
│ 📅 Gajian lagi 14 hari             │
│ ⚠️ Pengeluaran minggu ini agak tinggi│
│                                     │
│ Kategori jajan mendekati batas      │
│ → Tahan 3 hari bisa aman           │
└─────────────────────────────────────┘

Kondisi BAHAYA (merah):
┌─────────────────────────────────────┐
│ Perhatian                           │
│ Dengan pola ini, uangmu habis       │
│ tanggal 21 — masih 8 hari lagi     │
│                                     │
│ 📅 Gajian lagi 14 hari             │
│ 🔴 Prediksi defisit: -Rp180rb      │
│                                     │
│ → Lihat apa yang bisa direm        │
└─────────────────────────────────────┘

CATATAN TEKNIS:
- Komponen ini harus update realtime setiap ada transaksi baru
- Hitung di client-side untuk kecepatan, sync ke server untuk history
- Jika data tidak cukup (user baru, belum isi income), tampilkan
  prompt untuk melengkapi data dulu
- Jika tanggal gajian tidak diisi, gunakan logika akhir bulan sebagai default
- Simpan kalkulasi ini sebagai daily_snapshot di database untuk history
```

---

## TASK 1.3 — Sederhanakan Beranda

```
TASK 1.3: Restrukturisasi Layout Beranda

TUJUAN:
Beranda harus menjadi "command center" bukan "etalase widget".
User harus tahu apa yang harus dilakukan dalam 3 detik setelah buka aplikasi.

BACA DULU:
- Seluruh komponen beranda mobile yang ada
- CSS/styling yang dipakai
- Urutan render komponen saat ini

URUTAN BARU BERANDA MOBILE (atas ke bawah):

1. Hero Card Situasi Hari Ini (TASK 1.2) ← PALING ATAS
2. Progress Plan 7 Hari (jika masih dalam 7 hari pertama)
3. Target Finansial Utama (progress bar sederhana)
4. Transaksi Hari Ini (bukan "terbaru", tapi HARI INI)
5. Ringkasan Budget (hanya kategori yang mendekati batas)
6. Kartu Akun (pindah ke bawah, bukan prioritas visual)

YANG DIPINDAHKAN / DISEMBUNYIKAN:
- Shortcut Affiliate → pindah ke menu Pengaturan
- Kartu Neraca shortcut → pindah ke halaman Profil
- Quick access yang terlalu banyak → sisakan maksimal 4:
  [Catat] [Budget] [Target] [Advisor]
- Tips harian → pindah ke dalam Hero Card sebagai bagian kecil

CATATAN:
- Jangan hapus komponen lama, gunakan show/hide flag
- Tambahkan user setting untuk kustomisasi urutan (nanti di phase 3)
- Desktop layout menyesuaikan tapi tidak harus sama persis
```

---

# PHASE 2 — INTERVENSI & KEPUTUSAN
## Target: Monefyi aktif membantu keputusan, bukan pasif menampilkan data

---

## TASK 2.1 — Impact Feedback per Transaksi

```
TASK 2.1: Tambahkan Impact Feedback Setelah Input Transaksi

TUJUAN:
Setiap kali user mencatat pengeluaran,
tampilkan konteks dampak transaksi itu terhadap kondisi keuangan.
Bukan menghakimi. Tapi membuat masa depan terasa nyata di momen keputusan.

BACA DULU:
- Flow setelah transaksi disimpan (success state)
- Komponen preview transaksi yang ada
- Kalkulasi hero card dari TASK 1.2

LOGIKA IMPACT:
Setelah transaksi disimpan, hitung:

1. Perubahan safe-to-spend hari ini
   "Sisa hari ini: dari Rp85.000 → Rp40.000"

2. Status kategori setelah transaksi ini
   - Masih aman (< 70% budget kategori)
   - Mendekati batas (70–90%)
   - Sudah melewati batas (> 100%)

3. Dampak ke target utama jika ada
   "Target dana darurat: tidak berubah / mundur X hari"

4. Dampak ke runway
   Hanya tampilkan jika berubah signifikan (> 1 hari)

TAMPILAN:
Muncul sebagai bottom sheet kecil setelah simpan transaksi.
Otomatis hilang setelah 4 detik atau user tap dismiss.

Contoh tampilan:
┌────────────────────────────────┐
│ ✅ Tersimpan: Kopi Rp35.000   │
│                                │
│ Sisa hari ini: Rp50.000       │
│ Budget Jajan: 68% ✅ masih aman│
└────────────────────────────────┘

Contoh jika mendekati batas:
┌────────────────────────────────┐
│ ✅ Tersimpan: Makan Rp75.000  │
│                                │
│ Budget Makan: 89% ⚠️           │
│ Sisa bulan ini: Rp45.000      │
│ Ada 12 hari lagi ke gajian    │
└────────────────────────────────┘

CATATAN TEKNIS:
- Kalkulasi harus cepat (< 500ms) — lakukan di client
- Jangan blok user flow — ini informatif bukan konfirmasi
- Untuk pemasukan, tampilkan efek positif:
  "Saldo bertambah. Runway naik jadi X hari ✅"
- Simpan log impact ke database untuk analisis Monevisor
```

---

## TASK 2.2 — Upgrade Monevisor: Dari Laporan ke Keputusan

```
TASK 2.2: Ubah Output Monevisor Menjadi Intervention Engine

TUJUAN:
Monevisor harus menghasilkan output yang langsung bisa dieksekusi,
bukan hanya dibaca dan ditutup.

BACA DULU:
- Prompt dan logika Monevisor yang ada saat ini
- Format output yang dihasilkan AI saat ini
- Komponen UI halaman Monevisor

UBAH STRUKTUR OUTPUT MONEVISOR:

HAPUS atau PERKECIL:
- Narasi panjang diagnosa
- Benchmark 50/30/20 yang terlalu kaku
- Skor angka tanpa konteks aksi

TAMBAHKAN — Format output baru:

Blok 1: KONDISI SEKARANG (max 2 kalimat)
Blok 2: RISIKO KONKRET (1 kalimat dengan angka nyata)
Blok 3: 1 LANGKAH SEKARANG (aksi spesifik + tombol eksekusi)
Blok 4: KALAU DILAKUKAN (dampak jika aksi dijalankan)

Contoh output baru:
---
KONDISI: ⚠️ Waspada

Pengeluaran minggu ini 34% lebih tinggi dari minggu lalu,
terutama di kategori Makan dan Hiburan.

RISIKO:
Jika pola ini lanjut, kamu diprediksi minus Rp180.000 di tanggal 26.

LANGKAH SEKARANG:
Bekukan pengeluaran kategori Hiburan sampai tanggal 20.
[Bekukan Kategori Hiburan] ← tombol langsung

KALAU DILAKUKAN:
Prediksi defisit hilang → surplus Rp120.000 di akhir bulan.
---

TOMBOL AKSI YANG BISA DIEKSEKUSI LANGSUNG DARI MONEVISOR:
- Bekukan kategori (set budget kategori jadi 0 sementara)
- Tambah target simpan
- Lihat transaksi kategori tertentu
- Set reminder pengeluaran
- Hubungkan ke halaman budget langsung

UBAH PROMPT SYSTEM MONEVISOR:
Tambahkan instruksi ke prompt AI:
"Selalu akhiri analisis dengan format:
KONDISI: [satu label]
RISIKO: [satu kalimat dengan angka]
LANGKAH: [satu aksi spesifik yang bisa dilakukan sekarang]
DAMPAK: [satu kalimat jika langkah dilakukan]
Hindari narasi panjang. Prioritaskan kejelasan dan aksi."

STARTER QUESTIONS KONTEKSTUAL:
Ganti pertanyaan starter chat yang statis
dengan pertanyaan yang generate dari kondisi user saat itu.

Logic:
- Jika budget kategori X > 80% → saran: "Kenapa kategori X saya bisa setinggi ini?"
- Jika runway < 7 hari → saran: "Apa yang bisa saya kurangi minggu ini?"
- Jika ada utang → saran: "Kapan utang saya bisa lunas kalau saya bayar X per bulan?"
- Jika saving rate rendah → saran: "Berapa minimal yang harus saya sisihkan bulan ini?"

Generate 3–4 pertanyaan starter yang relevan setiap kali halaman Monevisor dibuka.
```

---

## TASK 2.3 — Mode Fokus Budget

```
TASK 2.3: Tambahkan Mode Fokus Budget

TUJUAN:
Budget tidak boleh one-size-fits-all.
User dengan kondisi berbeda butuh logika budget yang berbeda.

BACA DULU:
- Sistem budget yang ada saat ini
- Cara auto-budget di-generate
- Skema database budget

TAMBAHKAN MODE FOKUS:
Saat user buat budget baru atau reset budget,
tawarkan pilihan mode:

MODE 1: Survive Sampai Gajian
- Prioritas: pastikan tagihan wajib terbayar
- Otomatis pisahkan fixed bills di atas
- Hitung sisa untuk kebutuhan harian
- Tampilkan safe-to-spend per hari sebagai focus metric

MODE 2: Keluar dari Utang
- Tambahkan kolom khusus: Alokasi Cicilan Utang
- Hitung debt payoff timeline
- Tampilkan: "Lunas perkiraan: [bulan/tahun]"
- Setiap bulan ada target bayar minimum + ekstra

MODE 3: Bangun Dana Darurat
- Target: 3x pengeluaran bulanan
- Progress bar selalu tampil
- Hitung berapa lama sampai target
- Saran: sisihkan berapa per bulan

MODE 4: Income Tidak Tetap (Freelancer)
- Input income per proyek/minggu, bukan bulanan
- Budget berdasarkan rata-rata 3 bulan terakhir
- Alert jika bulan ini income di bawah rata-rata

MODE 5: Keluarga / Pasangan
- Catatan kondisi — siapkan untuk multi-user nantinya
- Untuk sekarang: label kategori bisa ditandai per anggota
- Tampilkan breakdown per label

PISAHKAN FIXED BILLS:
Di semua mode, tambahkan section khusus di atas budget:
"Tagihan Tetap Bulan Ini"
- Item ini otomatis terpotong dari income sebelum dihitung sisa
- Label visual berbeda dari budget fleksibel
- Tampilkan: "Uang yang benar-benar bisa kamu kelola: RpX"

CATATAN TEKNIS:
- Simpan mode di user_preferences
- Mode bisa diubah kapan saja dari halaman budget
- Default mode: Survive Sampai Gajian (paling relevan untuk mayoritas)
```

---

## TASK 2.4 — Target Finansial sebagai Anchor Visual

```
TASK 2.4: Bangun Sistem Target Finansial

TUJUAN:
Orang lebih disiplin saat mereka merasa sedang menuju sesuatu.
Target harus selalu terlihat — bukan tersembunyi di dalam budget.

BACA DULU:
- Apakah sudah ada sistem target/goal di database
- Komponen beranda yang ada
- Sistem budget pilar "Simpan"

BANGUN FITUR TARGET:

Data per target:
- Nama target (Dana Darurat / DP Rumah / Liburan / Bebas Utang / dll)
- Nominal target
- Nominal terkumpul saat ini
- Tanggal target (opsional)
- Jumlah yang disisihkan per bulan

Kalkulasi otomatis:
- Persentase progress
- Estimasi tercapai berdasarkan saving rate saat ini
- Estimasi tercapai jika naikkan simpan X per bulan

TAMPILAN DI BERANDA:
Tampilkan target utama (yang dipilih user) sebagai card:

┌──────────────────────────────────────┐
│ 🎯 Dana Darurat                      │
│ ████████░░░░░░░ 52% — Rp5.200.000   │
│ dari Rp10.000.000                    │
│                                      │
│ Estimasi tercapai: Maret 2027        │
│ +Rp200rb/bln → maju ke Nov 2026     │
└──────────────────────────────────────┘

TAMPILAN SETELAH INPUT TRANSAKSI SIMPAN:
"✅ +Rp200.000 ke Dana Darurat
 Progress: 52% → 54%
 Estimasi tercapai maju 12 hari"

INTEGRASI DENGAN MONEVISOR:
Monevisor harus selalu aware dengan target user.
Setiap rekomendasi harus dikaitkan dengan target:
"Jika kamu hemat Rp50rb/hari minggu ini,
target Dana Darurat maju 3 minggu lebih cepat."

CATATAN TEKNIS:
- User bisa punya multiple target, tapi pilih 1 sebagai "primary"
- Primary target yang tampil di beranda dan impact feedback
- Sinkronisasi dengan kategori "Simpan" di budget
```

---

# PHASE 3 — RETENSI & KEBIASAAN
## Target: User tidak bisa berhenti pakai karena sudah merasakan hasilnya

---

## TASK 3.1 — Streak & Mini Win

```
TASK 3.1: Sistem Streak Harian dan Mini Win Celebration

TUJUAN:
Memberikan dopamin positif dari kebiasaan baik,
bukan hanya dari belanja.

BACA DULU:
- Sistem notifikasi yang ada
- Database transaksi untuk cek aktivitas harian
- Komponen UI yang bisa dipakai untuk celebration

STREAK HARIAN:

Definisi streak:
User mencatat minimal 1 transaksi dalam sehari = streak aktif

Tampilkan di beranda:
"🔥 12 hari berturut-turut mencatat"

Jika streak putus (tidak ada transaksi hari kemarin):
Notifikasi jam 8 malam:
"Kamu belum catat hari ini. 5 detik cukup — ketik pengeluaran terakhirmu."

Milestone streak:
- 3 hari → "Kamu mulai membangun kebiasaan baru 💪"
- 7 hari → "Seminggu penuh! Kamu lebih sadar dari kebanyakan orang"
- 14 hari → "2 minggu konsisten. Monefyi mulai kenal pola hidupmu"
- 30 hari → "Satu bulan penuh. Kamu serius soal ini."

MINI WIN DETECTION:
Sistem otomatis deteksi pencapaian dan tampilkan notifikasi:

Trigger dan pesan:

1. Pertama kali tidak tekor sebelum gajian:
   "🎉 Pertama kali bulan ini kamu aman sampai gajian!
   Ini bukan kebetulan — ini hasil dari keputusan yang lebih baik."

2. Budget kategori berhasil dijaga seminggu penuh:
   "✅ Budget [kategori] berhasil dijaga 7 hari berturut-turut."

3. Dana darurat pertama kali terisi:
   "🌱 Dana darurat pertamamu: Rp[nominal].
   Perjalanan seribu mil dimulai dari satu langkah."

4. Utang berkurang bulan ini:
   "📉 Utangmu berkurang Rp[nominal] bulan ini.
   Estimasi lunas: [tanggal]."

5. Saving rate lebih tinggi dari bulan lalu:
   "📈 Saving rate bulan ini [X]% — lebih baik dari bulan lalu ([Y]%).
   Kamu sedang tumbuh."

6. Pertama kali input transaksi:
   "✅ Transaksi pertama tercatat.
   Kesadaran adalah langkah pertama kontrol keuangan."

TAMPILAN:
- Bottom toast notification yang muncul dan hilang sendiri
- Tap untuk buka detail atau dismiss
- Simpan semua achievement ke database untuk riwayat

CATATAN TEKNIS:
- Cek mini win trigger setiap kali:
  - Transaksi disimpan
  - Periode berganti (awal bulan)
  - Sinkronisasi data selesai
- Jangan tampilkan mini win yang sama dalam 7 hari
- Simpan last_shown per achievement type
```

---

## TASK 3.2 — Weekly Check-in Monevisor

```
TASK 3.2: Weekly Check-in Otomatis

TUJUAN:
Setiap minggu user mendapat ringkasan singkat yang konkret
dengan 1 fokus untuk minggu depan.

BACA DULU:
- Sistem notifikasi push yang sudah ada
- Logika Monevisor yang ada
- Jadwal notifikasi yang sudah terkonfigurasi

WEEKLY CHECK-IN:

Waktu: Minggu malam, jam 19.00

Format notifikasi push:
"📊 Review minggumu siap — 2 menit"

Isi halaman check-in (buka saat notif di-tap):
Generate otomatis dari data minggu ini:

┌────────────────────────────────────────┐
│ Review Minggu Ini                      │
│ [tanggal] — [tanggal]                  │
├────────────────────────────────────────┤
│ ✅ Yang berjalan baik:                 │
│ Budget makan terjaga di 78%           │
│ Catat transaksi 6 dari 7 hari        │
├────────────────────────────────────────┤
│ ⚠️ Yang perlu perhatian:              │
│ Hiburan over 23% dari budget          │
├────────────────────────────────────────┤
│ 🎯 Fokus minggu depan:               │
│ Kurangi 1 pengeluaran hiburan        │
│ per minggu → hemat Rp80rb/bulan      │
├────────────────────────────────────────┤
│ [Lihat Detail] [Oke, Siap!]           │
└────────────────────────────────────────┘

CATATAN TEKNIS:
- Generate konten check-in menggunakan Gemini AI
- Prompt: konteks data minggu ini + instruksi format singkat
- Cache hasil generate agar tidak re-generate saat dibuka ulang
- Simpan weekly_checkin ke database untuk history
- Jika tidak ada data minggu ini → skip, kirim notif pengingat catat saja
```

---

## TASK 3.3 — Mode Simpel "Hanya Hari Ini"

```
TASK 3.3: Tambahkan Mode Simpel

TUJUAN:
Untuk user yang overwhelmed atau baru mulai,
sediakan tampilan yang sangat sederhana.
Satu angka. Satu tombol.

KAPAN DITAMPILKAN:
- User baru (7 hari pertama) sebagai default view
- User bisa switch manual ke mode ini kapan saja
- Jika terdeteksi jarang buka halaman budget/transaksi

TAMPILAN MODE SIMPEL:

┌──────────────────────────────────┐
│                                  │
│ Hari ini aman pakai:             │
│                                  │
│         Rp 75.000                │
│                                  │
│ Sudah dipakai: Rp 32.000         │
│ Sisa: Rp 43.000                  │
│                                  │
│     [+ Catat Pengeluaran]        │
│                                  │
│ [Lihat selengkapnya ↓]           │
└──────────────────────────────────┘

TOGGLE:
Tambahkan toggle di pojok kanan atas beranda:
[Mode Simpel] ↔ [Mode Lengkap]

Simpan preferensi ke localStorage dan database.

CATATAN TEKNIS:
- Mode simpel adalah layer di atas beranda, bukan halaman baru
- Semua data tetap dihitung sama — hanya tampilan yang berbeda
- Tombol "Lihat selengkapnya" expand ke beranda normal
```

---

# PHASE 4 — POLISH & KOMUNIKASI
## Target: Bahasa dan pengalaman terasa lokal, manusiawi, dan jelas

---

## TASK 4.1 — Audit dan Ganti Bahasa Teknis

```
TASK 4.1: Language Audit — Ganti Bahasa Akuntansi ke Bahasa Manusia

TUJUAN:
Pastikan tidak ada bahasa yang membuat user awam merasa bodoh atau takut.

SCAN SELURUH UI DAN GANTI:

Terminologi yang harus diganti:

NERACA:
- "Aktiva" → "Yang Saya Miliki"
- "Pasiva" → "Yang Saya Hutangi & Modal"
- "Laba Ditahan" → "Sisa Surplus yang Belum Dialokasikan"
- "Modal" → "Nilai Bersih Saya"
- "Neraca Keuangan" → "Posisi Keuangan Saya"

BUDGET:
- "Pilar Harus (Wajib)" → "Tagihan & Kewajiban"
- "Pilar Penting (Kebutuhan)" → "Kebutuhan Hidup"
- "Pilar Mau (Keinginan)" → "Pengeluaran Pribadi"
- "Pilar Simpan" → "Tabungan & Masa Depan"
- "Realisasi" → "Yang sudah dipakai"
- "Alokasi" → "Rencana"

UMUM:
- "Saldo Estimasi" → "Perkiraan Uang Tersisa"
- "Net" → "Selisih Masuk - Keluar"
- "Saving Rate" → "% yang berhasil disisihkan"
- Error messages harus dalam bahasa yang tidak menyalahkan user

CATATAN:
- Buat file constants/language.js untuk semua string UI
- Jangan hardcode teks langsung di komponen
- Ini memudahkan update bahasa di masa depan
```

---

## TASK 4.2 — Upgrade Notifikasi: Kontekstual per Kondisi

```
TASK 4.2: Notifikasi Kontekstual Berdasarkan Kondisi User

TUJUAN:
Notifikasi harus terasa personal dan relevan,
bukan blast yang sama untuk semua user.

BACA DULU:
- Sistem notifikasi push yang sudah ada dan berjalan
- Cara notifikasi di-schedule saat ini
- Data kondisi user yang tersedia

LOGIKA NOTIFIKASI BARU:

Morning Briefing (jam 07.00) — bedakan berdasarkan kondisi:

Kondisi AMAN:
"☀️ Pagi! Hari ini kamu aman pakai Rp85.000.
Target dana darurat: 52%. Terus jaga ya!"

Kondisi WASPADA:
"☀️ Pagi! Hari ini maksimal Rp42.000 ya.
Budget [kategori] sudah 78% — hati-hati."

Kondisi BAHAYA:
"⚠️ Pagi! Keuangan bulan ini butuh perhatian.
Prediksi minus Rp180rb di tanggal 26. Cek sekarang."

Kondisi user baru (< 7 hari):
"☀️ Hari ke-[X] bersama Monefyi!
Task hari ini: [task dari plan 7 hari]"

Bill Reminder — lebih personal:
Bukan: "Tagihan jatuh tempo besok"
Tapi: "⏰ Cicilan motor Rp850.000 jatuh tempo besok.
Saldo estimasi kamu cukup ✅" 
atau "⚠️ Pastikan dana sudah siap ya."

Budget Milestone — bedakan tone:
75%: "Budget [kategori] sudah 75%. Masih aman, tapi mulai jaga."
90%: "⚠️ Budget [kategori] hampir habis — sisa Rp[nominal]."
100%: "🔴 Budget [kategori] sudah habis bulan ini."

NONAKTIFKAN DEFAULT:
Notifikasi berikut jangan aktif by default:
- Achievement badge (opt-in)
- Smart tips generik (opt-in)
- Sync status (hanya jika ada error)

CATATAN TEKNIS:
- Tambahkan kolom user_financial_condition di database
- Update kondisi setiap ada transaksi baru atau setiap pagi
- Gunakan kondisi ini sebagai parameter notifikasi
- Pastikan integrasi dengan sistem notifikasi yang sudah ada
```

---
