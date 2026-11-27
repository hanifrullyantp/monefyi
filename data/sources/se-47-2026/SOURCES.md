# DATA_SOURCES.md — Sumber Data Acuan AHSP (SE 47/SE/Dk/2026)

## Sumber resmi

| # | Dokumen | Judul | download_id | URL unduhan | Status | File terunduh | SHA256 | Ukuran | Tipe | Tanggal unduh |
|---|---------|-------|-------------|-------------|--------|---------------|--------|--------|------|---------------|
| 1 | Batang Tubuh | Surat Edaran DJBK No. 47/SE/Dk/2026 — Tata Cara Penyusunan Perkiraan Biaya Pekerjaan Konstruksi Bidang Pekerjaan Umum | 10892 | https://binakonstruksi.pu.go.id/?sdm_process_download=1&download_id=10892 | unduhan selesai | se-47-2026-10892.pdf | cb350d0dc076d1b3064ffa2646cfe4946f8d26aabe19563f39829db36170e48b | 1051423 | pdf | 2026-11-27 |
| 2 | Lampiran I | Teknis pengumpulan data Harga pokok sektor konstruksi di Kementerian PU | 10894 | https://binakonstruksi.pu.go.id/?sdm_process_download=1&download_id=10894 | unduhan selesai | se-47-2026-10894.pdf | e1dcfb6df5038579edd55c91853024389d69b5b96304cd046dcf611d7bc01603 | 5246337 | pdf | 2026-11-27 |
| 3 | Lampiran II | Acuan dalam Penyusunan AHSP | 10897 | https://binakonstruksi.pu.go.id/?sdm_process_download=1&download_id=10897 | unduhan selesai | se-47-2026-10897.pdf | f7d4cd6d28ea9a9e879dbcdd2efae9a0c89a8754f932da7ee6bd6c33a1afbe8f | 3752154 | pdf | 2026-11-27 |
| 4 | Lampiran III | Biaya Penerapan SMKK | 10899 | https://binakonstruksi.pu.go.id/?sdm_process_download=1&download_id=10899 | unduhan selesai | se-47-2026-10899.pdf | 48e6a02a7d2dacd9d837dc91e7843e5c8eac76b718eff9596f91ed6f7f3ab956 | 1501664 | pdf | 2026-11-27 |
| 5 | Lampiran IV | Analisis Harga Satuan Pekerjaan (AHSP) Bidang Sumber Daya Air | 10901 | https://binakonstruksi.pu.go.id/?sdm_process_download=1&download_id=10901 | unduhan selesai | se-47-2026-10901.pdf | bb114230cc7445524125f313aa9abfe5602a5088f84f7b40239fea6e657d01d3 | 40188115 | pdf | 2026-11-27 |
| 6 | Lampiran V | AHSP Bidang Bina Marga | 10903 | https://binakonstruksi.pu.go.id/?sdm_process_download=1&download_id=10903 | unduhan selesai | se-47-2026-10903.pdf | 78e391305aded09a0b156711b7c7f0d7ce1e314317c87744808cadff36b036c0 | 21577263 | pdf | 2026-11-27 |
| 7 | Lampiran VI | AHSP Bidang Cipta Karya (**UTAMA untuk rumah**) | 10904 | https://binakonstruksi.pu.go.id/?sdm_process_download=1&download_id=10904 | unduhan selesai | se-47-2026-10904.pdf | 64dfd7d14751dcd5032c9f2c35c4971fa121afcbbf49180abf7a4bf66c3e9202 | 56624433 | pdf | 2026-11-27 |
| 8 | Lampiran VII | Tata Cara Pengajuan Usulan AHSP | 10906 | https://binakonstruksi.pu.go.id/?sdm_process_download=1&download_id=10906 | unduhan selesai | se-47-2026-10906.pdf | d4663a0211e7f8b705e9db699ffe047790ba48c05ae1838cdd92bb43b7c6c276 | 1305832 | pdf | 2026-11-27 |

Halaman sumber: https://binakonstruksi.pu.go.id/produk/produk-hukum/surat-edaran-direktur-jenderal-bina-konstruksi-nomor-47-se-dk-2026/ (diakses 2026-11-27, status halaman: 200 OK, semua link unduhan terindex)

## Catatan verifikasi unduhan

- Ukuran, SHA256 (`shasum -a 256`), tipe file (`file`), dan tanggal unduh diambil dari berkas asli di `data/sources/se-47-2026/`, tidak diarang.
- Semua 8 berkas adalah PDF teks (bukan hasil scan), versi 1.7, sehingga ekstraksi teks dapat dilakukan tanpa OCR.
- Berkas prioritas untuk modul Rumah: **Lampiran VI (download_id 10904)** — AHSP Bidang Cipta Karya, 1563 halaman PDF (halaman cetak 5096–6656).
- SHA256 diverifikasi kembali saat ingest untuk memastikan integritas berkas sebelum parsing.

## Aturan data (dari DATA_SPEC.md modul_7)

- AHSP hanya menyimpan **koefisien**, bukan harga. Harga dasar bahan/upah tetap dari input pengguna/HSD daerah.
- Komponen/analisis yang belum ada ditandai `needs_review` / "CONTOH", tidak diisi diam-diam.
- Validator tolak: satuan tidak dikenal, koefisien ≤0 / tidak wajar, komponen tanpa master, analisis tanpa tenaga, kode ganda.
- Katalog diimpor dengan status "draft", sumber "SE 47/SE/Dk/2026 Lampiran VI hlm. X", versi katalog "SE-47-2026". Super admin meninjau di layar `AhspImport` (diff + konfirmasi) lalu ubah ke "terverifikasi".
- Katalog lama (CONTOH) tidak dihapus; versi katalog berdampingan.
