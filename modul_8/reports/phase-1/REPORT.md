# Laporan Fase 1: koreksi engine anggaran

**Lingkup:** B1-B6. Berhenti di akhir fase. Fase 2-5 belum dikerjakan pada putaran ini.

## Bukti eksekusi

| Pemeriksaan | Hasil |
|---|---|
| Perintah awal `npm install && npm run typecheck && npm test && npm run build` | Instalasi up to date, 0 kerentanan pada audit npm; 159 tes lulus, typecheck sukses, build 7,21 detik |
| `npx vitest run src/engine/phase1.test.ts` sebelum memperbaiki engine | 11 gagal, 0 lulus (`red.json`) |
| Tes integrasi UI Planner sebelum perbaikan | 1 gagal: RAP tidak terisi pada target total Rp139.016.400 (`planner-red.json`) |
| Regresi lengkap setelah perbaikan | 19 lulus, 0 gagal (`green.json`) |
| `npm test` | 178 lulus, 0 gagal dalam 9 berkas (`tests.json`) |
| `npm run typecheck` | Lulus, tanpa diagnostik TypeScript |
| `npm run validate-data` | 6 lulus, 0 gagal |
| `npm run build` | Lulus, `dist/index.html` |
| Chromium produksi | 1366x900 dan 360x800, lima layar/panel diuji, overflow horizontal 0 px, tanpa page error (`browser.json`) |

Dua asersi lama disesuaikan secara eksplisit dengan kontrak baru: total termasuk tak langsung dan kontingensi (`engine.test.ts`), dan variabel luas total merujuk `totalFloorArea` (`geometry.test.ts`). Tidak ada tes dihapus atau dinonaktifkan. Golden harga satuan/faktur berdiri sendiri tetap lulus tanpa perubahan ekspektasi.

## Biaya per meter persegi

Hasil eksekusi `node scripts/audit-phase1.mjs`, bukan data realisasi atau harga pasar. Katalog CONTOH, Yogyakarta, finishing menengah, seluruh kelompok spesifikasi menengah, tanpa elemen tampak opsional, tanpa override atau kalibrasi, seed denah 45. Mode rekap: overhead 8%, profit 7%, PPN 11% aktif. Tak langsung 6%, kontingensi 4% berasal dari konfigurasi yang sudah ada. Tanggal evaluasi ketuaan harga dibekukan pada 1 Januari 2026.

Ukuran pada tabel adalah **input nominal**. Template lama membulatkan dimensi tapak sehingga luas model sedikit berbeda (misalnya input 70 m² menjadi 70,2 m² untuk dua lantai). CSV menyimpan luas aktual, jumlah luas ruang per lantai, dinding bersih, biaya langsung, RAP, harga sebelum PPN, pajak, total dan kuantil. Sesudah perbaikan, pembagi Rp/m² menggunakan jumlah luas poligon tingkat.

| Input (m²) | Sebelum 1 lt (Rp/m²) | Sebelum 2 lt | Sesudah 1 lt | Sesudah 2 lt | Rasio 2/1 sesudah |
|---:|---:|---:|---:|---:|---:|
| 45 | 7.470.363 | 11.748.042 | 7.642.712 | 8.322.086 | 1.089x |
| 70 | 6.672.561 | 12.165.210 | 6.802.050 | 7.625.142 | 1.121x |
| 100 | 5.671.772 | 9.154.186 | 5.778.043 | 6.133.364 | 1.061x |
| 120 | 5.237.091 | 8.488.613 | 5.335.873 | 5.699.854 | 1.068x |
| 200 | 4.256.489 | 6.867.300 | 4.339.137 | 4.721.276 | 1.088x |

`geometry-only.csv` memisahkan dampak koreksi geometri dari perubahan pricing dan faktor bahan. Total satu lantai tidak selalu turun: total baru, berbeda dari total lama, memuat biaya tak langsung dan kontingensi. Tidak ada pemotongan biaya untuk memaksakan rasio 1,3x. Batas kewajaran dan harga dasar katalog tidak diubah.

## Checklist

| Bug | Status | Bukti |
|---|---|---|
| B1: ruang ganda | SELESAI | Input 70 m²/2 lantai: luas ruang atas 82,15 menjadi 35,10 m², dinding bersih 658,37 menjadi 273,83 m². Lima pasangan kasus lolos toleransi luas, nama unik, containment, tanpa overlap, dan rasio biaya/m². |
| B2: satu ledger | SELESAI | `computePricing` menangani biaya langsung neto hingga total pembeli, di kedua mode overhead. Test kesetaraan nominal, PPN aktif/nonaktif, termin, JSON, CSV dan WhatsApp lulus. Snapshot skenario menyimpan harga sebelum dan sesudah pajak dengan basis jelas. |
| B3: Monte Carlo | SELESAI | Sebelum: P10 tetap Rp358.444.775 lintas tingkat. Sesudah: kedua kuantil bergerak pada empat tingkat. Test bahan tunggal dengan faktor 2 menggeser kedua kuantil secara proporsional dalam toleransi pembulatan. |
| B4: target Planner | SELESAI | Bisection integer menggunakan fungsi maju yang sama. Target total Rp139.016.400 menghasilkan modal Rp110.240.000 pada konfigurasi contoh. Teruji di komponen React dan Chromium produksi. |
| B5: faktor mutu | SELESAI | Faktor bahan per kelompok dapat diedit di Pengaturan, dengan sumber dan persetujuan kalibrasi. Biaya dan kuantitas tenaga/alat identik pada perubahan mutu; kelompok lain tidak ikut berubah. Rekap komponen persis sama dengan biaya langsung untuk BOQ berkatalog. |
| B6: semantik luas | SELESAI | Kasus lantai dasar 60 m² + lantai atas 40 m²: total lantai 100, tapak 60, pelat 40, urugan 9 m³. Rumus mapping bawaan lama diperbarui tanpa menimpa rumus kustom. README memuat hasil uji nyata. |

## Pemeriksaan antarmuka

Workspace menampilkan ikhtisar dari ledger proyek aktif. Tombol rekap membuka rincian per proyek; tautan harga, impor dan pelajaran tetap berfungsi tanpa navbar global. Renderer thumbnail menggunakan model proyek, dan sketsa di hero adalah ilustrasi arsitektur, bukan data pengukuran. Latar lanskap thumbnail hanya konteks presentasi, tidak menambah BOQ.

`node scripts/check-phase1-browser.mjs` memeriksa filter, pencarian, rekap, identitas harga, saklar PPN, inverse Planner, penyimpanan faktor dan perubahan total aktual. Screenshot desktop dan mobile tersimpan dalam folder ini. jsdom tidak menyediakan WebGL; uji visual memakai Chromium terpisah. Hasil ini bukan benchmark FPS ponsel fisik.

## Berkas implementasi dan dokumentasi

- `DATA_SPEC.md`
- `INTEGRATION.md`
- `LAYOUT_SPEC.md`
- `OPTIMIZER_SPEC.md`
- `PRICING_SPEC.md`
- `README.md`
- `scripts/audit-phase1.mjs`
- `scripts/check-phase1-browser.mjs`
- `src/assets/INTER-LICENSE.txt`
- `src/assets/inter-latin.woff2`
- `src/data/catalog.ts`
- `src/data/schema.ts`
- `src/data/spec.ts`
- `src/data/types.ts`
- `src/engine/engine.test.ts`
- `src/engine/phase1.test.ts`
- `src/engine/pricing.ts`
- `src/engine/rab.ts`
- `src/geometry/derived.ts`
- `src/geometry/geometry.test.ts`
- `src/geometry/layout.ts`
- `src/geometry/solver.ts`
- `src/geometry/variables.ts`
- `src/index.css`
- `src/integration/engineClient.ts`
- `src/integration/exporters.ts`
- `src/integration/pricePresentation.ts`
- `src/ui/ArchitectureBlueprint.tsx`
- `src/ui/MaterialFactors.tsx`
- `src/ui/Shell.tsx`
- `src/ui/WorkspaceSummary.tsx`
- `src/ui/components.tsx`
- `src/ui/context.tsx`
- `src/ui/phase1.ui.test.tsx`
- `src/ui/screens/Home.tsx`
- `src/ui/screens/Planner.tsx`
- `src/ui/screens/Project.tsx`
- `src/ui/screens/RabDetail.tsx`
- `src/ui/screens/Settings.tsx`
- `src/ui/workspace.css`
- `src/viz3d/buildingMesh.ts`
- `src/viz3d/previewStudio.ts`
- `src/viz3d/thumbnail.ts`

## Batas penggunaan

Harga, koefisien, indeks wilayah dan faktor yang belum dikalibrasi tetap CONTOH. Tidak ada tambahan harga resmi atau data realisasi rekaan. Adaptor server memerlukan layanan host yang sesuai kontrak; server AI, optimizer dua arah, editor geometri baru dan audit 180 kombinasi dijadwalkan pada fase berikutnya. Aplikasi tetap dapat digunakan tanpa backend pada mode lokal.
