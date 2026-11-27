# Harga proyek: satu ledger

`computePricing` di `src/engine/pricing.ts` adalah sumber angka penawaran. Input utamanya adalah jumlah biaya langsung **neto**, bukan target pengguna dan bukan keluaran AI. Satuan uang adalah rupiah bulat yang dapat direpresentasikan sebagai safe integer.

## Urutan perhitungan

| Langkah | Nilai |
|---|---|
| Biaya langsung D | Jumlah `directAmount` semua baris BOQ, termasuk item manual |
| Biaya tak langsung I | `round(D * indirectPercent / 100)` |
| Kontingensi C | `round((D + I) * contingencyPercent / 100)` |
| RAP | `D + I + C` |
| Overhead dan profit | Masing-masing persentase **biaya langsung D**, dibulatkan sendiri |
| Harga jual sebelum PPN S | `RAP + overhead + profit` |
| PPN | `round(S * ppnPercent / 100)` bila aktif; nol bila nonaktif |
| Total RAB / dibayar pembeli | `S + PPN` |
| Margin komersial | `S - RAP`, ditampilkan juga sebagai persen S; bukan laba bersih setelah overhead |

Persentase 6% biaya tak langsung dan 4% kontingensi merupakan konfigurasi **CONTOH yang sudah ada**, bukan angka regulasi. `rapConfig` dapat menggantinya. Pengaturan tarif PPN juga merupakan parameter simulasi, bukan penetapan kewajiban pajak.

`rab.rap` memuat ledger lengkap. `rab.total`, `rab.ppn`, `rab.overhead`, dan `rab.profit` adalah nilai dari ledger tersebut, bukan hasil perhitungan kedua. Menonaktifkan PPN **tidak** mengubah RAP, S, atau margin; yang berubah adalah PPN dan jumlah yang dibayar pembeli.

## Pembulatan dan penyajian

1. Kontribusi komponen dihitung dari koefisien, waste, harga dasar, indeks jenis, serta faktor yang disetujui. Presisi pecahan hanya digunakan sebagai nilai antara.
2. Spesifikasi hanya mengalikan komponen **bahan**. Upah dan sewa alat tidak mengikuti faktor mutu bahan. Faktor per kelompok tersedia di **Pengaturan > Faktor harga bahan**. Angka bawaan memakai faktor contoh lama, bukan tangga harga baru. Penanda kalibrasi membutuhkan sumber dan persetujuan pengguna.
3. Harga langsung per satuan dibulatkan sekali. Volume dibulatkan dua desimal. `directAmount = round(volume * directUnitPrice)`.
4. Alokasi kontribusi bulat direkonsiliasi ke harga satuan dan jumlah baris; tenaga dan alat dibulatkan independen terlebih dahulu. Sisa rupiah dialokasikan pada bahan. Audit baris, rekap komponen dan simulasi menggunakan kontribusi yang sama. Item manual tanpa rincian komponen tetap masuk BOQ, tetapi tidak dikarang menjadi kuantitas material tertentu.
5. Pada mode `rekap`, `unitPrice` adalah harga langsung. Pada `dalam_harga`, `unitPrice` adalah harga satuan penawaran yang sudah memuat markup. Kolom `directUnitPrice` dan `directAmount` tetap neto pada kedua mode. **Jangan menambahkan markup lagi ke jumlah penawaran.** Pembulatan markup pada harga satuan dapat menghasilkan selisih kecil terhadap markup rekap; ledger total tetap berasal dari nilai neto, identik pada kedua mode.
6. `subtotal` adalah jumlah kolom `amount` BOQ sesuai mode penyajian. Jangan menggunakannya sebagai RAP atau sebagai total pembeli. CSV menyediakan kolom biaya langsung dan kolom penawaran secara terpisah.

Format lokal `rupiah` dan `shortRupiah` tidak mengubah nilai engine. Tampilan ringkas dalam juta tidak dipakai untuk menyimpan atau menghitung ulang angka.

## Target dan kisaran

Input **Target total pembeli** pada Planner sudah termasuk PPN bila aktif. `EngineClient.planTarget` memakai bisection pada biaya langsung integer dan mengevaluasi fungsi maju `computePricing` yang sama. Hasilnya adalah RAP terbesar yang masih muat dalam plafon; plafon yang tidak tepat terwakili karena pembulatan tidak dibulatkan naik. API juga membedakan basis `sellingPrice` sebelum PPN, `rap`, dan `margin`. Penguncian adalah simulasi target, bukan penerapan spesifikasi baru.

Monte Carlo menggunakan 2.000 sampel dan seed tetap pada hitungan normal. Komponen per jenis berasal dari `directAmount` yang sudah memuat faktor spesifikasi. Setiap sampel biaya langsung diteruskan ke `computePricing`, termasuk konfigurasi PPN proyek. P10/P90 dihitung sebagai kuantil empiris; rentang tidak dipaksa mengapit angka tengah dengan penjepitan setelah simulasi.

## Kompatibilitas

`computeRap` lama hanya menormalisasi subtotal agregat yang sudah memuat markup, lalu meneruskan ke `computePricing`. Untuk proyek baru, gunakan biaya langsung neto. `computeTotals` adalah adaptor untuk uji/faktur sederhana tanpa biaya tak langsung maupun kontingensi. Keduanya tidak digunakan sebagai jalur harga proyek kedua.

Snapshot historis tidak ditulis ulang. Skenario lama yang hanya memiliki harga sebelum PPN dibandingkan dengan harga sebelum PPN, bukan total pembeli. Snapshot baru menyimpan basis harga secara eksplisit.

## Bukti

- `src/engine/phase1.test.ts`: geometri, identitas harga, kesetaraan kedua mode, faktor per jenis, pergeseran kuantil, dan inversi target.
- `src/ui/phase1.ui.test.tsx`: target total Rp139.016.400 menghasilkan RAP Rp110.240.000 pada konfigurasi contoh dasar.
- `scripts/audit-phase1.mjs`: pengukuran sepuluh kasus dengan input yang sama.
- `reports/phase-1/`: bukti merah/hijau, biaya sebelum/sesudah, dan pemeriksaan browser produksi.