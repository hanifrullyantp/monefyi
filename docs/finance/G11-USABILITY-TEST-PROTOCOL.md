# Protokol Uji Kegunaan Nyata Pra-Rilis (G11) — 3–5 Tukang & Mandor

**Tujuan:** Memastikan layar lapangan Froyek benar-benar meringankan kerja tukang dan mandor di ponsel nyata sebelum rilis produksi penuh.  
**Pelaksana:** Pemilik / Manajer Proyek bersama **3–5 orang peserta lapangan** (minimal 2 tukang dan 1–2 mandor) memakai ponsel yang biasa dipakai di proyek.  
**Durasi:** ±15–20 menit per peserta.  
**Status Eksekusi:** Menunggu dijalankan langsung oleh pemilik sebelum rilis produksi.

---

## 1. Aturan Dasar Uji Lapangan

1. **Uji aplikasinya, bukan orangnya:** Sampaikan ke tukang/mandor bahwa kalau mereka bingung atau salah pencet, itu berarti layar kita yang masih perlu diperbaiki.
2. **Jangan langsung dibantu:** Biarkan peserta mencoba dulu. Catat bila peserta ragu lebih dari 5 detik, bertanya "ini pencet mana?", atau menekan tombol lebih dari target ketukan.
3. **Pakai kondisi nyata:** Uji di proyek dengan ponsel berlayar kecil/menengah dan coba 1 skenario dengan mode pesawat / sinyal dimatikan sebentar.
4. **Cek bahasa:** Tanyakan apakah ada kata yang terasa asing atau membingungkan (layar lapangan harus memakai Bahasa Indonesia sehari-hari tanpa istilah akuntansi teknis).

---

## 2. Skenario Uji 5 Tugas

| No | Peran | Skenario Tugas | Target Lulus |
|---|---|---|---|
| **1** | Tukang | **Absen masuk dari jadwal hari ini:** Buka aplikasi → lihat proyek yang sudah terisi dari jadwal → tekan tombol Check-In. | `<= 2` ketukan, **0 ketik angka**, proyek sesuai jadwal. |
| **2** | Tukang | **Absen saat belum ada jadwal:** Buka aplikasi tanpa jadwal hari ini → periksa bahwa proyek tidak ditebak ke proyek acak → pilih proyek sendiri lalu Check-In. | Pilihan proyek eksplisit muncul; tidak memaksa proyek pertama. |
| **3** | Tukang / Mandor | **Lapor progres + foto saat sinyal putus:** Aktifkan mode pesawat → tekan tombol lapor progres + foto → nyalakan lagi sinyal. | Status tersimpan (`antre offline`), lalu otomatis terkirim saat sinyal pulih tanpa kirim ganda. |
| **4** | Tukang | **Cek rincian upah & sisa kasbon:** Buka ringkasan upah → baca baris `hari × tarif − potongan kasbon = terima bersih` dan `sisa kasbon`. | Peserta langsung paham nominal bersih & sisa kasbon tanpa bertanya ke mandor. |
| **5** | Mandor | **Kelola "Tim Hari Ini" & cek privasi:** Buka layar Tim Hari Ini → lihat siapa hadir / belum hadir, setujui hari kerja, cek tombol tambah orang & lapor progres + foto → pastikan tarif/gaji tukang lain **tidak terlihat**. | Semua aksi ada di 1 layar; tombol mudah disentuh (`>= 44px`); 0 kebocoran gaji orang lain. |

---

## 3. Lembar Catat Jumlah Ketukan & Kebingungan

Isi satu baris per tugas untuk tiap peserta (`P1` s.d. `P5`):

| Kode Peserta | Peran | No Tugas (1–5) | Jumlah Ketukan Aktual | Ragu >5 Detik / Bertanya? (Ya/Tidak) | Sinyal Offline Lancar? (Ya/Tidak/NA) | Istilah Membingungkan / Catatan Singkat |
|---|---|---|---|---|---|---|
| `P1` | Tukang | 1 | | | | |
| `P1` | Tukang | 2 | | | | |
| `P1` | Tukang | 3 | | | | |
| `P1` | Tukang | 4 | | | | |
| `P2` | Mandor | 3 | | | | |
| `P2` | Mandor | 5 | | | | |

---

## 4. Pelaporan Temuan via Sistem Umpan Balik G7

Setiap temuan dari lembar catat wajib direkam ke jalur umpan balik terpadu **G7** (`packages/domain/src/feedbackObservability.ts` → `ingestFeedbackSignal` / `apps/web/src/services/financeV2/feedbackObservabilityService.ts`) agar otomatis dianonimkan (bebas PII), digabungkan berdasarkan `fingerprint`, dan masuk antrean perbaikan tanpa mengubah kode/prompt otomatis:

1. **Kebingungan Alur / Kata / Tombol Terlalu Kecil:**
   - `module`: `'ui'` atau `'sdm'` atau `'proyek'`
   - `category`: **`'ui_confused'`**
   - `severity`: `'ringan'` (atau `'sedang'` jika menghambat absen/laporan selesai)
   - `errorOrScreenKey`: mis. `'worker_today_project_picker'` atau `'mandor_team_today'`
   - `context`: jumlah ketukan aktual, bagian yang bikin ragu, ukuran layar ponsel (tanpa nama/no HP asli; `anonymizeFeedbackPayload` akan menyensor PII bila ada).
2. **Gagal Kirim Offline / Layar Error / Salah Proyek / Data Tidak Cocok:**
   - `module`: `'proyek'` / `'sdm'` / `'ui'`
   - `category`: **`'user_bug_report'`**
   - `severity`: `'sedang'` atau `'kritis'` (jika menyangkut angka upah/saldo kasbon salah atau duplikat kirim)
   - `errorOrScreenKey`: mis. `'offline_queue_flush_progress_photo'`
   - `context`: langkah kejadian, status antrean sebelum/sesudah sinyal kembali.

---

## 5. Kriteria Lulus Pra-Rilis

- Minimal **3–5 tukang/mandor** menyelesaikan seluruh 5 skenario uji.
- **Tugas 1 (Absen terjadwal):** rata-rata `<= 2` ketukan dan 0 peserta mengetik angka.
- **Tugas 3 (Offline):** 0 laporan hilang dan 0 pengiriman ganda saat sinyal pulih.
- **Tugas 4 & 5:** 0 peserta melaporkan istilah membingungkan dan 0 kebocoran gaji pekerja lain ke mandor.
- Seluruh temuan berkategori `'kritis'` atau `'sedang'` dari antrean G7 (`ui_confused` / `user_bug_report`) sudah berstatus `'resolved'` sebelum rilis ke seluruh proyek.
