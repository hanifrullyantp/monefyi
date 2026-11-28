# DATA_SPEC — Spesifikasi Data & Variabel Rumus

Spesifikasi skema data, katalog AHSP, aturan turunan geometri, dan variabel rumus engine.

---

## 1. Komponen Dasar (`Komponen`)
```ts
export interface Komponen {
  kode: string;                  // Identifier unik (mis. "B.SMN", "T.PKJ")
  uraian: string;                // Nama bahan / upah / alat
  jenis: "tenaga" | "bahan" | "alat";
  satuan: string;                // "OH", "sak", "m³", "kg", "m²", dll.
  harga: number;                 // Integer Rupiah
  wilayah: string;               // Kota acuan harga
  tanggalBerlaku: string;        // Format YYYY-MM-DD
  sumber: string;                // Sumber kutipan (mis. "Survei toko 2026")
}
```
*Harga basi*: Dinyatakan basi bila `tanggalBerlaku` lebih dari `settings.priceStaleMonths` bulan dari waktu hitung.

---

## 2. Analisis Harga Satuan Pekerjaan (`Analisis`)
```ts
export interface Analisis {
  id: string;                    // Identifier analisis (mis. "A.DND.PSG")
  pekerjaanId: string;
  uraian: string;
  satuan: string;                // "m²", "m³", "m", "titik", dll.
  komponen: {
    komponenId: string;          // Kode komponen
    koefisien: number;           // Kuantitas per satuan pekerjaan
    waste?: number;              // Faktor susut (0..1, mis. 0.05 untuk 5%)
  }[];
  sumber: {
    regulasi: string;
    tahun: number | null;
    halaman: string | null;
  };
  keyakinan: "terverifikasi" | "belum";
}
```
$$\text{Harga Satuan} = \text{round}\left(\sum_{k} \left(\text{koef}_k \times (1 + \text{waste}_k) \times \text{harga}_k \times \text{indeks}_{\text{jenis}_k}\right) \times \text{faktor}_{\text{spesifikasi}} \times \text{uplift}\right)$$

---

## 3. Variabel Rumus Geometri (`formulaVariables`)
Dihitung secara deterministik dari denah poligon dan `BuildingModel`:
| Nama Variabel | Definisi Fisik |
|---|---|
| `luas_lantai` | Total luas lantai seluruh tingkat ($\text{m}^2$) |
| `luas_dasar` | Luas tapak lantai dasar ($\text{m}^2$) |
| `keliling_dasar` | Keliling footprint lantai dasar ($\text{m}$) |
| `keliling_luar` | Total keliling dinding luar seluruh lantai ($\text{m}$) |
| `panjang_dinding_dalam` | Total panjang bidang dinding bersama antar-ruangan ($\text{m}$) |
| `luas_dinding_bersih` | $(\text{dinding luar} + \text{dinding dalam}) \times \text{tinggi} - \text{luas bukaan}$ ($\text{m}^2$) |
| `luas_bukaan` | $\text{pintu} \times 1,9 + \text{jendela} \times 1,2$ ($\text{m}^2$) |
| `luas_basah` | Total luas ruangan dengan penanda `wet: true` ($\text{m}^2$) |
| `keliling_basah` | Total keliling ruangan basah ($\text{m}$) |
| `luas_atap` | Luas proyeksi atap mengikuti overhang $\times \frac{1}{\cos(\text{pitch})}$ ($\text{m}^2$) |
| `keliling_atap` | Total keliling tepi cucuran atap ($\text{m}$) |
| `luas_tanah` | Luas lahan proyek ($\text{m}^2$) |
| `luas_luar` | Sisa lahan di luar tapak bangunan ($\text{m}^2$) |
| `panjang_pondasi` | $\text{keliling dasar} + 0,5 \times \text{dinding dalam dasar}$ ($\text{m}$) |
| `dalam_galian` | $0,85 \text{ m}$ (2 lantai) atau $0,70 \text{ m}$ (1 lantai) |
| `penampang_pondasi` | Luas penampang pondasi batu kali ($0,20 - 0,28 \text{ m}^2$) |
| `jumlah_kolom` | $\max(6, \lceil \text{luas dasar} / 9 \rceil)$ |
| `tinggi_total` | Total tinggi bangunan ($\text{m}$) |
| `lantai` | Jumlah lantai (1 s.d 3) |
| `jumlah_km` | Jumlah kamar mandi |
| `jumlah_pintu` | Jumlah pintu model |
| `jumlah_jendela` | Jumlah jendela model |
| `jumlah_titik_listrik` | Jumlah titik lampu dan stop kontak |
| `jumlah_titik_air` | Jumlah titik kran dan sanitasi |

---

## 4. Status Data & Banner CONTOH
- Selama dataset aktif memiliki komponen dengan sumber berlabel `"CONTOH"`, banner **DATA CONTOH** tetap tampil di bagian atas aplikasi.
- Banner hanya hilang secara otomatis jika seluruh komponen dan analisis yang dipakai berasal dari dataset yang diimpor dengan `sample: false` dan `keyakinan: "terverifikasi"`.

## Kontrak biaya dan luas, revisi Fase 1

- `totalFloorArea`: jumlah luas poligon footprint semua lantai. `floorAreas[]`: luas tiap tingkat. `footprintArea` / `groundArea`: tapak dasar saja.
- `luas_lantai` memakai `totalFloorArea`; `luas_lantai_atas` memakai jumlah luas semua tingkat kecuali dasar. Keramik dan plafon menggunakan luas total. Pelat beton memakai luas lantai atas, urugan memakai luas dasar. Atap pada model sederhana tetap memakai proyeksi tapak dasar dan overhang, bukan jumlah luas tingkat.
- `BoqItem.directUnitPrice`, `directAmount`: biaya neto. `unitPrice`, `amount`: kolom penawaran menurut mode overhead. `AuditKomponen.specFactor` selalu 1 pada tenaga/alat; `directAmount` adalah kontribusi rupiah bulat untuk baris tersebut.
- `settings.materialFactors[group] = { factors, source, calibrated }`: faktor bahan per kelompok dan tingkat. Seed menggunakan faktor contoh yang sudah ada. Pengguna harus memberikan sumber non-contoh sebelum menandai faktor terkalibrasi.
- `RabResult.rap` memuat direct, indirect, contingency, rap, overhead, profit, sellingPrice (sebelum PPN), ppn, total (setelah PPN), margin dan marginPercent. Definisi lengkap di `PRICING_SPEC.md`.
