# LAYOUT_SPEC — Spesifikasi Model & Editor Denah

Spesifikasi resmi arsitektur geometri, generator, model tiling, reflow, dan editor interaktif pada modul Estimator RAB Rumah.

---

## 1. Prinsip Utama Denah
1. **Invarian Geometri (A2)**: Denah dijamin selalu konsisten:
   - Nol tumpang-tindih (*zero overlap*)
   - Nol celah (*zero gap*)
   - Seluruh ruangan selalu di dalam footprint bangunan (*100% inside boundary*)
2. **Tidak Ada Pembatalan Drag/Resize (A1)**: Setiap aksi pengguna selalu diterapkan. Pelanggaran aturan minimum atau kenyamanan menghasilkan saran solutif satu-ketuk, bukan penolakan kaku atau pesan kesalahan merah.
3. **Generator Tanpa Menghilangkan Ruangan (A5)**: Semua kebutuhan ruang (ruang tamu, kamar, kamar mandi, dapur, teras, carport) wajib ada pada setiap alternatif denah. Jika lahan terbatas, ukuran ruang disesuaikan proporsional ("denah padat").

---

## 2. Model Data Ruangan & Poligon
```ts
export interface Pt {
  x: number;
  y: number;
}
export type Polygon = Pt[]; // Urutan titik berlawanan jarum jam (CCW), meter

export interface Room {
  id: string;
  name: string;
  fungsi: RoomFunction;
  level: number;
  polygon: Pt[];
  wet: boolean;
  zone?: "depan" | "tengah" | "belakang";
  locked?: boolean;
}

export interface Level {
  index: number;
  height: number;
  footprint: Footprint;
}
```

---

## 3. Model Tiling & Layer Reflow (`src/geometry/reflow.ts`)
Setiap lantai direpresentasikan sebagai struktur pemotongan ortogonal (*slicing tree* / BSP) yang menggaransi kedap air (*watertight tiling*):
- **SlicingNode**:
  - `leaf`: Ruangan tunggal dengan ID dan luas
  - `split`: Pembagian horisontal (`y`) atau vertikal (`x`) dengan rasio pemotongan tertentu
  - `void`: Area takik pada footprint non-persegi (L, U, courtyard)
- **Konservasi Luas**: Luas total ruangan pada satu lantai selalu sama dengan luas poligon footprint ($\pm 0,02 \text{ m}^2$).
- **Dekomposisi Footprint Non-Persegi**: Footprint bentuk L, U, atau courtyard didekomposisi menjadi potongan persegi konveks (*scanline decomposition*), kemudian setiap potongan dipartisi secara kedap air oleh ruangan yang dialokasikan.

---

## 4. Bobot Fleksibilitas & Batas Fisik (`src/geometry/rules.ts`)
Setiap ruangan memiliki:
- `minArea` dan `minSide`: Ukuran kenyamanan standar
- `preferredArea`: Ukuran ideal rekomendasi
- `hardMinArea` & `hardMinSide`: Batas fisik mutlak (misalnya sisi $\ge 0,9 \text{ m}$) agar ruang tidak kolaps
- `flexibility` (0.0 s.d 1.0):
  - **Fleksibel Tinggi (0.8–0.9)**: Teras, carport, ruang keluarga, koridor
  - **Fleksibel Sedang (0.5–0.7)**: Ruang tamu, ruang makan, ruang kerja, cuci, gudang
  - **Fleksibel Rendah (0.35–0.45)**: Kamar tidur, kamar utama
  - **Kaku (0.1–0.15)**: Kamar mandi, tangga

Saat suatu ruangan diperbesar, ruangan tetangga dengan fleksibilitas tertinggi akan menyerap pengurangan terlebih dahulu.

---

## 5. Daftar Operasi Editor (`src/geometry/layout.ts` & `reflow.ts`)
| Operasi | Perilaku & Respons Tetangga |
|---|---|
| `reflowMoveRoom` | Seret ruangan ke ruangan lain. Lepas di tengah $\rightarrow$ tukar posisi (*swap*). Lepas di tepi $\rightarrow$ sisipkan di samping, tetangga reflow. Lepas di luar $\rightarrow$ kembali ke slot sah terdekat tanpa pembatalan. |
| `reflowResize` | Tarik sisi/sudut ruangan. Garis pembatas bergerak, tetangga di sisi itu berkompensasi. Jika mencapai tepi luar footprint, opsi perluasan bangunan ditawarkan. |
| `reflowSetRoomSize` | Ubah ukuran via popover (mis. 2×2 $\rightarrow$ 3×4). Ruangan membesar di arah yang leluasa; tombol Ubah tidak pernah dinonaktifkan. |
| `reflowSwapRooms` | Menukar posisi dua ruangan sambil mempertahankan luas/rasio masing-masing via reflow. |
| `reflowAddRoom` | Mengambil porsi dari ruangan paling fleksibel (ruang keluarga/teras) tanpa membuat celah. |
| `reflowRemoveRoom` | Ruangan dihapus; tetangga di sekitarnya mengisi kekosongan secara proporsional. |
| `reflowMoveSharedVertex` | Menggeser titik sudut poligon bersama; semua ruangan yang berbagi titik tersebut bergerak serempak sehingga tidak ada celah/tumpang tindih. |
| `reflowExpandFootprint` | Memperbesar footprint bangunan; pertambahan didistribusikan ke seluruh ruangan dengan pratinjau luas dan perkiraan biaya RAB. |

---

## 6. Aturan Severitas Baru (U7 & Severitas)
Validator `validateLayout` mengelompokkan temuan menjadi:
1. **Info (Biru)**: Informasi bahwa denah lama berhasil dirapikan otomatis (`legacy-repaired`).
2. **Saran (Kuning)**:
   - `room-too-small`: Ruangan di bawah rekomendasi $\rightarrow$ Tombol *Perbesar ruangan*
   - `room-too-narrow`: Rasio ruangan terlalu sempit $\rightarrow$ Tombol *Sesuaikan rasio*
   - `no-access`: Sirkulasi terhalang $\rightarrow$ Tombol *Hubungkan ruang*
   - `plumbing-far`: Titik basah berjauhan $\rightarrow$ Tombol *Dekatkan titik basah*
   - `no-exterior`: Minim jendela luar $\rightarrow$ Tombol *Pindahkan ke luar*
   - `area-mismatch`: Selisih luas ruangan vs luas bangunan $\rightarrow$ Tombol *Perluas bangunan*
   - `openings-exceed`: Bukaan pintu/jendela melebihi keliling $\rightarrow$ Tombol *Abaikan*
3. **Maksimal 3 Peringatan Tampil**: Peringatan diurutkan menurut prioritas; sisanya dapat dibuka lewat tombol *"N saran lainnya"*. Tombol *Terapkan ke Proyek* tidak pernah diblokir oleh peringatan lunak.

---

## 7. Interaksi Kanvas (U1–U6, U9)
- **Transformasi Koordinat**: Menggunakan `svg.getScreenCTM().inverse()` dengan fallback matriks viewport untuk akurasi sentuh di layar 390px mobile maupun desktop lebar.
- **Gesture Tracker**: Ambang batas gerak 4 px sebelum drag dimulai (membedakan tap untuk memilih vs seret).
- **Handle Resize**: Target sentuh visual kecil tetapi hit area $\ge 44 \text{ px}$ di layar.
- **Snap Magnetik**: Snap ke grid 0,1 m dan magnetis ke tepi/sudut tetangga dalam radius 0,15 m dengan garis bantu hijau.
- **Aksesibilitas**: Navigasi keyboard penuh (Tab untuk memilih ruangan, panah untuk menggeser 0,1 m / Shift: 0,5 m, Delete untuk menghapus).

## Pemakaian ruang oleh engine (Fase 1)

Solver menerima footprint aktual per lantai saat membuat ruang otomatis. Ruang lantai atas sudah dikeluarkan solver dan tidak disalin ulang oleh `buildAutoRooms`. Regresi B1 memeriksa jumlah luas ruang (toleransi 0,05 m²), nama, overlap dan containment untuk 45/70/100/120/200 m², satu dan dua lantai. Lihat `reports/phase-1/before.csv` dan `after.csv` untuk ukuran aktual, dinding bersih dan biaya.
