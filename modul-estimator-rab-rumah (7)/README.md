# Estimator RAB Rumah (Modul Web)

Modul frontend React 19 + TypeScript (strict) + Vite + Tailwind 4 + Dexie + Three.js + Zod.
Dirancang untuk disisipkan ke aplikasi host (Estimator/froyek) **tanpa membuat navbar/topbar/bottom nav global**.

---

## 1. Menjalankan & Verifikasi
```bash
npm install
npm test             # Vitest: 178 tes pada verifikasi Fase 1 (9 berkas Vitest)
npm run typecheck    # tsc --noEmit
npm run validate-data # Validasi katalog seed & skema
npm run build        # Vite singlefile production bundle
```

---

## 2. Arsitektur & Struktur Direktori
- `src/engine/` — **Fungsi Murni**, tanpa React/DOM/IndexedDB:
  - `pricing.ts`: Formulasi deterministik Biaya Langsung, RAP, Harga Jual, PPN, dan Margin.
  - `optimizer.ts`: Algoritma optimasi target modal/harga/margin dengan kendala struktur keras (*hard constraints*) & bobot kenyamanan lunak (*soft constraints*).
  - `rab.ts`: Engine RAB terpadu berbasis analisis AHSP $\times$ harga komponen $\times$ indeks jenis, simulasi Monte Carlo 2.000 iterasi berseed, kurva S dari bobot paket nyata, dan termin proporsional.
  - `formula.ts`: Parser rumus matematis buatan sendiri tanpa `eval()` / `Function()`.
  - `calibration.ts`: Back-test blind-run & usulan kalibrasi dengan penyusutan (*shrinkage*).
  - `checks.ts`: Pemeriksaan kewajaran dan konsistensi non-AI.
- `src/geometry/` — **Geometri Poligon Murni**:
  - `polygon.ts`: Operasi poligon 2D (luas Gauss, keliling, titik-dalam-poligon, irisan Sutherland-Hodgman, overlap cekung, bidang bersama, offset/inset).
  - `rules.ts`: Satu sumber kebenaran aturan ukuran minimum, preferensi, dan bobot fleksibilitas ruangan.
  - `solver.ts`: Generator 3 alternatif denah deterministik (linear, L, U, courtyard, split) tanpa membuang ruangan.
  - `reflow.ts`: Engine tiling kedap air (*watertight reflow*): drag, resize, setRoomSize, swap, add, remove, shared-vertex edit, dan perluasan footprint.
  - `derived.ts`: Menurunkan variabel rumus BOQ dari poligon denah nyata.
  - `validate.ts`: Validasi layout dengan severitas baru (*info* biru, *saran* kuning beraksi solutif, nol pesan kesalahan merah dari aksi editor).
- `src/viz3d/` — **Visualisasi 3D**:
  - `buildingMesh.ts`: Dinding diekstrusi dari poligon dengan lubang bukaan parametrik, atap dekomposisi ortogonal, dan elemen tampak.
  - `House3D.tsx`: Renderer Three.js on-demand, camera preset (`depan`, `samping`, `isometrik`, `atas`), dan kontrol kualitas.
  - `FloorPlanView.tsx`: Viewer denah SVG terukur dengan grid, arah mata angin, dan penanda area basah.
  - `thumbnail.ts`: Offscreen renderer bersama dengan caching per tanda tangan model.
- `src/ai/` — **Asisten & Guard**:
  - `router.ts`: Router intent bahasa Indonesia dengan normalisasi kata angka.
  - `facade.ts`: Penerjemah bahasa alami ke `FacadeSpec` tervalidasi Zod & aksi chat terstruktur.
  - `guard.ts`: Penjaga deterministik yang menolak setiap payload AI yang memuat nilai rupiah atau volume.
- `src/integration/` — **Kontrak Host & Klien**:
  - `engineClient.ts`: Antarmuka `EngineClient` (Local & Remote adapter) sebagai satu-satunya jembatan antara UI dan engine.
  - `repository.ts`: Adaptor penyimpanan persisten Dexie (IndexedDB).
  - `exporters.ts`: Eksportir PDF/A4, Excel/CSV, WhatsApp, dan JSON.
- `src/ui/` — **Komponen & Layar Antarmuka**.

---

## 3. Perhitungan anggaran

`computeRab` menghitung satu BOQ, kemudian menyerahkan jumlah biaya langsung neto ke `computePricing`. Urutannya: biaya langsung + biaya tak langsung + kontingensi = RAP; RAP + overhead + profit = harga jual sebelum PPN; harga jual + PPN = total dibayar pembeli. Margin adalah selisih harga jual sebelum PPN dan RAP. Saklar PPN tidak mengubah margin.

Mode `dalam_harga` hanya mengubah penyajian harga per baris, bukan biaya dasar atau total pembeli. Volume dibulatkan dua desimal, harga satuan dan jumlah baris ke rupiah bulat. Faktor mutu hanya berlaku untuk **bahan**, bukan upah atau sewa alat. Ubah faktor tiap kelompok di **Menu > Pengaturan > Faktor harga bahan**. Faktor contoh tidak menjadi data terkalibrasi hanya karena nilainya diedit.

`buildAutoRooms` memakai ruangan hasil solver pada footprint setiap lantai, tanpa menyalin ruang atas lagi. `totalFloorArea` adalah luas seluruh tingkat; `footprintArea` adalah tapak dasar; `floorAreas` merinci per tingkat. Pelat lantai atas memakai jumlah luas tingkat di atas dasar.

Rincian definisi, basis persentase, pembulatan dan solver target: [PRICING_SPEC.md](./PRICING_SPEC.md).

### Verifikasi Fase 1

- Awal: `npm install && npm run typecheck && npm test && npm run build` berhasil, **159 tes** sebelum penambahan regresi.
- Sebelum perbaikan: **11 tes engine + 1 tes Planner gagal**, meliputi B1 sampai B6.
- Sesudah perbaikan: **178 tes lulus, 0 gagal**, termasuk **19 regresi Fase 1**.
- [Laporan hasil eksekusi, biaya per meter persegi dan berkas yang berubah](./reports/phase-1/REPORT.md).

```bash
node scripts/audit-phase1.mjs                       # 10 pengukuran biaya dari engine lokal
npx vitest run src/engine/phase1.test.ts src/ui/phase1.ui.test.tsx
npx playwright install chromium --with-deps          # sekali untuk verifikasi browser
npm run build && node scripts/check-phase1-browser.mjs
```

Pekerjaan ini berhenti di akhir Fase 1. Pengujian 180 kombinasi wilayah/finishing serta target performa ponsel fisik bukan hasil verifikasi fase ini.

---

## 4. Dokumen Spesifikasi Terkait
- `LAYOUT_SPEC.md` — Spesifikasi model poligon, tiling, reflow, bobot fleksibilitas, dan aturan severitas editor.
- `FACADE_SPEC.md` — Spesifikasi tampak depan parametrik, palet tertutup, dan integrasi item pekerjaan BOQ.
- `OPTIMIZER_SPEC.md` — Algoritma optimizer, kendala struktur minimum, rencana efisiensi, dan formulasi RAP.
- `DATA_SPEC.md` — Spesifikasi katalog komponen, analisis AHSP, dan variabel rumus.
- `INTEGRATION.md` — Panduan integrasi host, event listener, dan kontrak `EngineClient`.
