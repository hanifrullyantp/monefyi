# FACADE_SPEC — Spesifikasi Tampak Depan & 3D Prosedural

Spesifikasi resmi arsitektur tampak depan parametrik, integrasi AI bahasa alami, palet material tertutup, dan sinkronisasi BOQ RAB.

---

## 1. Filosofi & Batasan AI
1. **AI Tidak Menggambar Gambar/Foto**: AI hanya menerjemahkan deskripsi pengguna menjadi parameter terstruktur `FacadeSpec` tervalidasi skema Zod.
2. **Model 3D Prosedural**: Geometri 3D dibangun secara prosedural oleh engine Three.js dari parameter `FacadeSpec`, posisi bukaan dari denah, dan poligon footprint lantai.
3. **Sinkronisasi Otomatis ke RAB**: Setiap elemen tampak yang memiliki konsekuensi biaya (kanopi, balkon, secondary skin, kolom, pagar, planter, dsb.) secara otomatis masuk ke paket *"Elemen tampak depan"* di engine BOQ.

---

## 2. Skema Spesifikasi (`FacadeSpec`)
```ts
export interface FacadeSpec {
  style: "minimalis" | "tropis" | "skandinavia" | "klasik_modern" | "industrial";
  cantilever: number;       // tonjolan lantai atas (meter, 0..2)
  splitLevel: boolean;      // perbedaan level massa
  roofType: "pelana" | "perisai" | "limasan" | "datar";
  roofPitch: number;        // kemiringan atap (derajat, 0..50)
  overhang: number;         // tritisan / cucuran atap (meter, 0..2)
  canopy: boolean;          // kanopi teras depan
  windows: "standar" | "panjang" | "kaca_mati";
  louvre: boolean;          // roster / kisi-kisi angin
  columns: number;          // jumlah kolom dekoratif depan
  secondarySkin: boolean;   // kulit kedua pelindung matahari
  balcony: boolean;         // balkon lantai 2
  carport: "tidak" | "terbuka" | "tertutup";
  fence: boolean;           // pagar depan
  accentWall: boolean;      // dinding aksen (batu/bata ekspos)
  planter: boolean;         // planter box tanaman
  frontStairs: boolean;     // undakan tangga depan
  palette: string;          // ID dari daftar palet material tertutup
}
```

---

## 3. Palet Material Tertutup (`FACADE_PALETTES`)
Pilihan material dibatasi pada daftar tertutup teruji untuk memastikan konsistensi visual dan ketersediaan analisis harga:
1. `putih-kayu`: Putih bersih, aksen kayu hangat, atap abu gelap (minimalis, skandinavia, tropis)
2. `abu-beton`: Abu semen ekspos, trim hitam pekat (industrial, minimalis)
3. `krem-terakota`: Dinding krem lembut, atap genteng terakota (tropis, klasik modern)
4. `hijau-tropis`: Dinding sage/zaitun, aksen batu alam (tropis, skandinavia)
5. `putih-klasik`: Putih gading, profil emas elegan (klasik modern)
6. `gelap-modern`: Dinding arang gelap, aksen tembaga (industrial, minimalis)

---

## 4. Pemetaan Elemen Tampak ke Item Pekerjaan BOQ
Fungsi `facadeCostElements(facade)` memetakan elemen aktif ke kuantitas nyata yang dihitung dengan analisis AHSP:
| Elemen | Kunci Pekerjaan | Analisis AHSP | Kuantitas Bawaan |
|---|---|---|---|
| Kanopi | `tampak.kanopi` | `A.TMP.KANOPI` | $4,5 \text{ m}^2$ |
| Balkon + Railing | `tampak.balkon` | `A.TMP.BALKON` | $5,2 \text{ m}^2$ |
| Secondary Skin | `tampak.skin` | `A.TMP.SKIN` | $12,0 \text{ m}^2$ |
| Kolom Dekoratif | `tampak.kolom` | `A.TMP.KOLOM` | Sesuai jumlah kolom (unit) |
| Pagar Depan | `tampak.pagar` | `A.TMP.PAGAR` | $9,0 \text{ m}$ |
| Dinding Aksen | `tampak.aksen` | `A.TMP.AKSEN` | $7,0 \text{ m}^2$ |
| Planter Box | `tampak.planter` | `A.TMP.PLANTER` | $3 \text{ unit}$ |
| Carport Tertutup | `tampak.carport` | `A.TMP.CARPORT` | $18,0 \text{ m}^2$ ($12 \text{ m}^2$ terbuka) |
| Tangga Depan | `tampak.tangga` | `A.TMP.TANGGA` | $2,4 \text{ m}^2$ |
| Roster / Louvre | `tampak.louvre` | `A.TMP.LOUVRE` | $4,0 \text{ m}^2$ |

---

## 5. Fitur Renderer 3D (`src/viz3d`)
- **Dinding Poligon Berlubang**: Dinding diekstrusi dari tepi denah nyata dengan kotak pier, ambang atas (*header*), dan ambang bawah (*sill*), dilengkapi kusen, kaca, dan daun pintu.
- **Atap Footprint Non-Persegi**: Footprint L/U/courtyard didekomposisi menjadi strip ortogonal, masing-masing diberikan atap pelana/limasan dengan nok dan lisplang. Jika geometri terlalu kompleks, fallback otomatis ke atap datar dengan peringatan ramah.
- **Preset Kamera**: 4 sudut kamera siap pakai: `depan`, `samping`, `isometrik`, `atas`.
- **Ekspor Gambar**: Tombol unduh PNG langsung dari buffer WebGL kanvas pada sudut kamera aktif.
- **Kinerja**: Render on-demand (hanya me-render saat interaksi atau perubahan data), target $\ge 30 \text{ fps}$ di perangkat ponsel menengah.
