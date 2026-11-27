# INTEGRATION_PLAN.md — Modul "Estimator RAB Rumah" ke Aplikasi Estimator Froyek

Status: **Fase 0 Discovery SELESAI**. Semua berkas kunci modul_7 telah dibaca. Fase 1 (LayoutEditor) diprioritaskan.

---

## 1. Ringkasan temuan Fase 0 (Host)

| Item | Detail |
|---|---|
| Aplikasi host | `apps/web` (froyek-web), SPA Estimator. Diakses publik via `estimator.froyek.com/app` (reverse proxy dari `apps/landing` ke `monefyi-planner.vercel.app`, lihat `apps/landing/next.config.ts`). |
| Stack host | React 19.2.6, TS, Vite 7.3.2, Tailwind 4.1.17, react-router-dom 7, Zustand 5, `@supabase/supabase-js` 2.49, pdfmake/pdfjs-dist/xlsx, vitest 3, tsc 5.9.3 |
| Build / deploy | `npm run build:web` = `vite build` → `dist/`; Vercel (`buildCommand: npm run build`, `outputDirectory: dist`). |
| Auth | Supabase Auth, email konfirmasi wajib, tabel `profiles(role)`, `planner_organizations`, `planner_projects`. |
| Route terlindung | `/app/*` → `ProtectedRoute` (AuthBootstrap). `/admin` → `AdminRoute` (`platformRole === 'admin'` melalui `profiles.role`). |
| Super admin yang sudah ada | `lib/estimatorLaunchPromo.ts`: `isSuperAdminHanif(email)` → cocok exact `hanif.rullyant@gmail.com` (trim + lower-case), atau email mengandung "hanif" dengan role super_admin/platform_admin/admin. Digunakan `EstimatorForm` (`isHanif`). |
| Estimasi/RAB lama | `planner_estimations` + `planner_estimation_payments`, `planner_pricelist_items` (kategori material/upah/alat/jasa/borongan, rupiah integer, `RupiahInput`), `planner_rap_items` per proyek. Konversi estimasi→proyek via RPC `convert_estimation_to_project`. Undo/redo (`draftHistory`), auto-save, draft lokal `localStorage`, PDF (pdfmake), WhatsApp, 3D Intero (sudah ada, dibatasi Hanif). |
| Desain token | `lib/designTokens.ts`: `bgPage #F4F7F5`, `cardBg #FFF`, `border #E5EAE8`, estimator `#157F5F`, purple `#7C3AED` — **sama persis** spesifikasi modul (canvas #F4F7F5, aksen #157F5F, AI #7C3AED). |
| Shell / navigasi | `Layout.tsx` + `AppShell.tsx` + `BottomNav` + `AppHeader`. `PlannerNavModule` = home\|projects\|database\|estimator\|finance\|hr. Modul **tidak buat navbar sendiri** — dipasang sebagai tab/sub-route di shell yang ada. |
| Tabel RAB | Belum ada tabel `rab_*` di host. Migrasi Supabase dikelola di `supabase/migrations/` (kelola via Supabase dashboard; tidak ada file migrasi RAB saat ini). |
| Dexie / Three.js | **Belum terinstal** di host. Modul_7 punya paketnya sendiri (Dexie ^4.4.7, Three ^0.187.0). |
| Uji host | vitest terkonfigurasi di `apps/web` (`src/**/*.test.ts`). Baseline: typecheck lolos, 111 file / 797 tes lolos. |
| Uji modul_7 | Vitest 4, node/jsdom, 178 tes; Playwright 1.65.1 devDep (chromium perlu diinstall). `npm run build` = Vite singlefile. |

## 2. Modul_7 (`modul-estimator-rab-rumah (7)/`) — temuan Fase 0b/c

- Standalone Vite project (package.json sendiri), **belum ada node_modules** (harus `npm install` sebelum typecheck/test/build).
- Stack: React 19.2.6 + TS strict + Vite 7.3.7 + Tailwind 4.1.17 + Dexie ^4.4.7 + Three.js ^0.187.0 + Zod ^4.6.7.
- Skrip: `dev`, `build` (vite build + viteSingleFile), `preview`, `test` (vitest run), `typecheck` (tsc --noEmit), `validate-data` (vitest src/data).
- `<EstimatorModule host={...} />` diekspor (INTEGRATION.md): `currentUser`, `onNavigateBack`, `onProjectCreated`, `onEvent`, `theme` (accent/surface), `initialProjectId`, `engineMode` ("local"\|"remote"), `remoteUrl`. Tanpa navbar sendiri — navigasi internal via chip `< Proyek` + FAB Menu 48px + Ctrl/Cmd+K.
- Route internal modul: home, project, rab, prices, transfer, settings, lessons, backtest, archive, actuals, layout, planner.
- `EngineClient` (LocalEngineAdapter / RemoteEngineAdapter) sebagai satu-satunya jembatan UI↔engine. Local: fungsi murni (computeRab, generateLayouts, validateLayout, optimize, facadeFromText, catalog) tanpa server. Remote (BELUM AKTIF): `POST /v1/*` — AI di server, tidak ada API key di browser.
- `repository.ts`: Dexie `rab-rumah-estimator` IndexedDB, satu baris `app-state` dengan `PersistedState` (projects, catalog, corrections, actuals, calibrations, scenarios, dataset, settings, importHistory). Fase 4: ganti dengan adaptor Supabase, Dexie sebagai cache offline.
- DATA_SPEC: Komponen (kode, uraian, jenis tenaga/bahan/alat, satuan, harga integer rupiah, wilayah, tanggalBerlaku, sumber). Analisis (id, pekerjaanId, komponen[] koefisien+waste, sumber regulasi/halaman, keyakinan terverifikasi/belum). Project, BuildingModel, Room, Level, RabResult (rap, sellingPrice, ppn, total, margin, p10, p90), RapBreakdown, SpecState (11 kelompok), FacadeSpec, Correction, ActualRecord, AhspDataset (sample boolean).
- Banner "DATA CONTOH" tampil bila ada komponen sumber "CONTOH"; hilang jika semua data `sample: false` + `keyakinan: "terverifikasi"`.
- PRICING_SPEC: D + I + C = RAP; RAP + overhead + profit = S (sebelum PPN); S + PPN = total. Margin = S − RAP. PPN 11% simulasi. 6% indirect + 4% contingency = CONTOH. Engine deterministik, integer rupiah, AI tidak boleh usulkan rupiah/volume.

## 3. Peta konsep (Modul ↔ Host)

| Konsep modul | Entitas host | Catatan |
|---|---|---|
| Proyek RAB | `planner_projects` | FK atau standalone dengan org_id (keputusan terbuka, lihat #9). |
| Pelanggan | `planner_projects.client_name` / estimation `customer_name` | Reuse, tidak duplikasi. |
| Lokasi | `planner_projects.location` | Alamat bangunan. |
| Harga/satuan | `planner_pricelist_items` | Katalog AHSP berdampingan; harga belanja tetap input pengguna/HSD. |
| Item RAB / POK | `planner_rap_items` | Struktur RAP cocok untuk baris RAB rumah. |
| Estimasi/penawaran | `planner_estimations` | "Buat penawaran" dari RAB → estimasi lama. |
| PDF | pdfmake, `downloadQuotationPdf` | Template milik host. |
| 3D | `Intero3DLaunchModal` / `intero3dService` | Reuse; modul_7 punya House3D/Three.js sendiri — perlu dedulpenapasi. |

## 4. Tabel baru yang dibutuhkan (migrasi Supabase — Fase 4)

`rab_projects`, `rab_project_versions`, `rab_scenarios`, `rab_catalog_components`, `rab_catalog_analyses`, `rab_catalog_jobs`, `rab_catalog_prices`, `rab_catalog_indices`, `rab_catalog_versions`, `rab_corrections`, `rab_actuals`, `rab_calibrations`, `rab_audit_log`, + `app_super_admins` (opsional). RLS via `is_super_admin()` (`auth.jwt()->>'email'` + `email_verified = 'true'`). Email super admin dienv `RAB_SUPERADMIN_EMAILS`, bukan di kode klien. Katalog lama (CONTOH) tidak dihapus; versi berdampingan.

## 5. Rute baru & integrasi frontend (Fase 4)

Route baru di `apps/web` (`/app/rab/*` atau `/app/estimator/rab/*` — keputusan terbuka), dipasang di `Layout.tsx`/`AppShell.tsx` (tidak buat navbar sendiri). Dari proyek RAB: "Buat penawaran" → estimasi lama. Sebaliknya estimasi lama → "Buka sebagai RAB". AI lewat route server `/api/rab/*` dengan key di env server. Adaptor penyimpanan Supabase (Dexie cache offline). Migrasi Dexie→Supabase sekali jalan dengan konfirmasi. Feature flag `NEXT_PUBLIC_RAB_ENABLED` (default off produksi).

## 6. Akses hanya super admin (Fase 3)

Server: semua `GET/POST/PUT/DELETE /api/rab/*` cek sesi + peran → 403 non-super admin. RLS semua tabel RAB hanya super admin. Front-end: menu/rute RAB hanya super admin; URL langsung → 404/akses ditolak. Uji otomatis 3 kasus: anonim, pengguna biasa, super admin (`hanif.rullyant@gmail.com`).

## 7. Fase 1 — Editor Denah (prioritas) — `src/ui/screens/LayoutEditor.tsx` (1440 baris)

Diagnosis terkonfirmasi terhadap kode asli:
1. **stopPropagation hilang**: `onPointerDown` ruangan (line 753, mode "move") dan handle resize/vertex (line 811-813) tidak memanggil `e.stopPropagation()`; handler wadah kanvas (line 690, mode "pan") menimpa `gesture.current` saat drag. Fix: tambahkan `e.stopPropagation()` di handler ruangan/resize/vertex.
2. **Outline fokus**: `<g role="button" tabIndex={0}>` (line 750-751) → outline browser default. Fix: `outline: none`, ganti penanda terpilih stroke aksen tipis + `:focus-visible`.
3. **Konversi pan sembarang**: line 415-416 `(e.clientX - g.startScreen.x) / (zoom * 20)`. Fix: konversi piksel→meter dari viewBox / ukuran elemen SVG.
4. **pointerup tanpa snap**: line 503-506 pakai `curWorld` (tidak di-snap) sementara ghost pakai `snapped` (line 422-432). Fix: gunakan posisi yang sama dengan ghost di `reflowMoveRoom`.
5. **Keyboard arrows salah**: line 209-232 memanggil `reflowResize` (skala) bukan `reflowMoveRoom` (geser). Fix: panah = geser 0,1 m / Shift 0,5 m; tambahkan `+`/`-` zoom, `R` putar, `Delete` hapus, `Ctrl+Z/Y` undo/redo.
6. **Touch target**: circle invisibel r="0.45" (line 820) sudah besar; verifikasi ≥44 px layar.
7. **Uji**: Playwright (chromium) — seret ruangan, tarik handle skala, geser latar; invarian geometri (tanpa overlap/celah, luas = footprint), 3D dan RAB ikut berubah. Tangkapan layar sebelum/sesudah di `reports/`. Viewport 360×800 dan 1366×900. Uji vitest untuk logika gestur.

## 8. Fase 2 — Data Acuan AHSP resmi (SE 47/SE/Dk/2026)

Sumber: `binakonstruksi.pu.go.id` ...download_id=10892 (Batang Tubuh), 10897 (Lampiran II), 10904 (Lampiran VI — utama rumah), 10906 (Lampiran VII). Simpan `data/sources/se-47-2026/` + `SOURCES.md` (nama, ukuran, SHA256, tanggal, tipe). Pipeline `scripts/ingest/`: PDF/xlsx → staging JSON → validasi → katalog. Validator tolak satuan tidak dikenal, koefisien ≤0/tidak wajar, komponen tanpa master, analisis tanpa tenaga, kode ganda. Impor status "draft", sumber "SE 47/SE/Dk/2026 Lampiran VI hlm. X", versi "SE-47-2026". Super admin meninjau di `AhspImport` (diff + konfirmasi) → "terverifikasi". Tabel pemetaan kode pekerjaan modul ↔ AHSP resmi (file terpisah); tanpa padanan = "belum terpetakan", tidak dihitung. AHSP hanya koefisien (bukan harga); harga belum ada → label CONTOH + peringatan. Perbandingan rumah 45/70/100/120 m², lapor selisih RAB per paket sebagai informasi.

## 9. Keputusan yang perlu konfirmasi (tidak bisa dibalik setelah migrasi)

1. Lokasi route RAB: `/app/rab/*` (baru di shell) vs di bawah `/app/estimator/rab/*`.
2. Tabel RAB: FK ke `planner_projects` (proyek RAB = proyek host) vs tabel mandiri dengan `org_id`.
3. 3D: reuse `Intero3DLaunchModal` host vs pakai `House3D`/Three.js modul_7.
4. Playwright di `apps/web` (hanya ada di `stay/`) — ditambahkan atau uji gestur hanya vitest + manual?
5. Email super admin: `hanif.rullyant@gmail.com` (sudah ada di `isSuperAdminHanif`) ditambah env `RAB_SUPERADMIN_EMAILS`.

## 10. Perintah verifikasi per fase (setiap fase ditutup dengan ini, lapor dengan keluaran nyata)

- `npm run typecheck` (di `apps/web` untuk host; di `modul-estimator-rab-rumah (7)/` untuk modul)
- `npm test` / `vitest run`
- `npm run build:web` (build host) / `npm run build` (build modul)
- Hasil: exit code, ringkasan tes, tangkapan layar. JANGAN menyebut SELESAI tanpa bukti.

**Catatan:** Saya tidak punya akses shell sendiri (bash/background_process diblokir global di environment ini). Perintah verifikasi di-delegasikan ke agen dengan akses shell. Hasil baseline host sudah diverifikasi: typecheck lolos, 797 tes lolos.

## 11. BLOKIR saat ini

Tidak ada. Fase 0 lengkap. Siap mulai Fase 1.
