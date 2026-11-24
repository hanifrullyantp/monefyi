# Laporan Gerbang Fase G11 — UX yang Meringankan (Tinjauan GM) & Penutupan Program G7–G11

**Tanggal Terbit:** 2026-11-24  
**Program:** G7–G11 Keuangan Froyek (Urutan: `G8 → G7 → G9 → G10 → G11`)  
**Branch Penutup Gerbang:** `feat/g11-ux-lightening-gm-review`  
**Status Fase G11 / Program G7–G11:** `DONE` / `COMPLETED` (seluruh uji otomatis domain, guard UI `WorkerDashboard.tsx`, & gerbang verifikasi lokal lulus; **uji kegunaan lapangan 3–5 tukang/mandor menunggu eksekusi pemilik** via [`G11-USABILITY-TEST-PROTOCOL.md`](../G11-USABILITY-TEST-PROTOCOL.md))

---

## 1. Ringkasan Implementasi Fase G11

### A. Model UX & Pengukur Beban Deterministik (`packages/domain/src/uxLightening.ts`)
1. **Penjaga Bahasa Sehari-hari (`assertNoAccountingJargon`):**
   - Memblokir **14 istilah akuntansi teknis** (`debit`, `kredit`, `jurnal`, `hpp`, `liabilitas`, `ekuitas`, `akrual`, `aktiva`, `pasiva`, `neraca`, `buku besar`, `posting`, `coa`, `rekonsiliasi`) pada teks layar tukang, mandor, dan keputusan pagi PM/pemilik.
2. **Layar Tukang "Hari Ini" (`buildWorkerTodayView` & `selectInitialWorkerProjectId`):**
   - Menggunakan `resolveAttendanceProjectFromSchedule` (`hrdPayroll.ts`) untuk pre-fill proyek **otomatis dari rencana jadwal PM / penugasan tugas** — tidak pernah menebak proyek aktif pertama bila pekerja belum ditugaskan.
   - Menegakkan `tapsToCheckIn <= 2` (`1` ketukan saat terjadwal, `2` ketukan saat pilih proyek eksplisit), `requiresNumericTyping: false`, target sentuh `minTouchTargetPx >= 44` (`48px`), dan transparansi upah integer rupiah dalam bahasa sehari-hari (`hari × tarif − potongan kasbon = terima bersih` + `Sisa kasbon`).
3. **Antrean Offline Sinyal Lemah (`createOfflineActionQueue`, `enqueueOfflineAction`, `flushOfflineActionQueue`):**
   - Menyimpan check-in / check-out / foto progres secara aman saat sinyal putus (`status: 'queued'`), mempertahankan urutan kronologis `(createdAt, sequence)`, menegakkan idempotensi `idempotencyKey`, dan mengirim ulang otomatis saat sinyal kembali (`status: 'synced'`, 0 duplikat).
4. **Layar Mandor "Tim Hari Ini" (`buildMandorTeamTodayView`):**
   - Satu tampilan terpadu berisi daftar hadir / belum hadir, daftar pekerja yang perlu persetujuan hari kerja (`Setujui Hari Kerja` / `Tolak`), tombol `Tambah Orang ke Proyek`, dan satu tombol `Lapor Progres + Foto`.
   - Menyalurkan data melalui `filterHrdRecordsByRole` (G8) sehingga `dailyRate`, `grossSalary`, `netSalary`, dan `kasbonBalance` pekerja lain selalu `null` (**0 kebocoran gaji/tarif orang lain**).
5. **Layar Pagi PM/Pemilik (`buildMorningDecisionsView`):**
   - Menyaring lintas-tenant dan mengurutkan hanya hal yang butuh keputusan manusia (**maksimal `5` item**: `decisions.length <= 5`) dengan tombol 1-ketukan `Setujui` / `Tolak` + alasan ringkas; hal rutin yang sudah dibereskan asisten diringkas ke `handledByAgentCount`.
6. **Pengukur Pengurangan Beban & Pemeriksa Gerbang (`measureUxBurdenReduction`, `evaluateG11UxChecklist`):**
   - Membandingkan cara lama vs Froyek G11 pada 4 tugas utama (`absen_tukang`, `laporan_progres_mandor`, `persetujuan_pagi_pemilik`, `cek_rincian_upah`) dan memverifikasi **9 butir gerbang UX G11** secara otomatis (`allReduced: true`, penghematan ketukan `> 70%`).

### B. Perbaikan Pre-Fill Proyek & Target Sentuh di UI Tukang
- **`apps/web/src/pages/WorkerDashboard.tsx`:**
  - Menghapus fallback diam-diam ke proyek aktif pertama (`projects.find(p => p.status === 'active') || projects[0]`) dan menghubungkannya ke helper deterministik `selectInitialWorkerProjectId` berdasarkan `workItems` / penugasan pekerja hari ini.
  - Saat pekerja belum memiliki jadwal tugas, UI menampilkan opsi eksplisit `"-- Pilih Proyek Hari Ini --"` dan mencegah check-in nyasar ke proyek acak.
  - Memastikan tombol utama dan pemilih proyek di `WorkerDashboard.tsx` serta tombol Check-In / Check-Out di `apps/web/src/components/worker/WorkerWorkTimer.tsx` mempertahankan **`min-h-11` (`>= 44px`)**.

### C. Protokol Uji Kegunaan Nyata (`docs/finance/G11-USABILITY-TEST-PROTOCOL.md`)
- Menerbitkan protokol ringkas Bahasa Indonesia untuk dijalankan pemilik bersama **3–5 tukang/mandor** sebelum rilis (5 skenario uji, lembar catat ketukan/kebingungan, serta alur pelaporan temuan lewat sistem umpan balik G7 kategori `ui_confused` dan `user_bug_report`).

---

## 2. Pemisahan Jujur: Bukti Otomatis vs Uji Lapangan Manusia

| Lapisan Verifikasi | Status Aktual | Detail Jujur |
|---|---|---|
| **Uji Otomatis Domain, Antrean Offline, RBAC, & Guard UI (`g11UxLighteningAndGate.test.ts`)** | **PASS (7/7)** | Menguji `assertNoAccountingJargon`, `buildWorkerTodayView`, `OfflineActionQueue` (offline $\rightarrow$ pulih $\rightarrow$ idempoten & kronologis), `buildMandorTeamTodayView` (0 kebocoran gaji), `buildMorningDecisionsView` (12 item $\rightarrow$ maks 5 keputusan), `measureUxBurdenReduction` + `evaluateG11UxChecklist` (9/9 butir lulus), serta `selectInitialWorkerProjectId` + inspeksi `WorkerDashboard.tsx` & `WorkerWorkTimer.tsx`. |
| **Uji Kegunaan Nyata Bersama 3–5 Tukang/Mandor di Lapangan** | **MENUNGGU EKSEKUSI PEMILIK** | Belum dijalankan dengan manusia/ponsel lapangan nyata di proyek. Wajib dijalankan pemilik memakai [`G11-USABILITY-TEST-PROTOCOL.md`](../G11-USABILITY-TEST-PROTOCOL.md) sebelum rilis penuh. |

---

## 3. Bukti Output Verifikasi Lokal Aktual (Pasca-Edit Final)

| Perintah Verifikasi | Hasil | Detail Output Aktual |
|---|---|---|
| `npm run typecheck:web` | **PASS** | Exit code `0` (`tsc --noEmit` bersih tanpa error) |
| `npm run test:web` | **PASS** | `Test Files  110 passed (110)`, `Tests  793 passed (793)` (termasuk `g11UxLighteningAndGate.test.ts` `7/7` & `g9ProjectManager30DaySim.test.ts` `4/4`) |
| `npm run gate:docs` | **PASS** | Terverifikasi pembaruan `docs/finance/CHANGELOG.md` bersama seluruh file domain/tes keuangan |
| `npm run gate:rebrand` | **PASS** | `Files scanned: 1212`, `Allowlisted legacy occurrences: 1597`, `Unapproved violations: 0` |

---

## 4. Penutupan Program G7–G11 & Catatan Rilis

- Seluruh fase **F0–F4**, **G0–G6**, dan **G7–G11** (`G8 → G7 → G9 → G10 → G11`) selesai pada level implementasi dan verifikasi otomatis lokal.
- **16 file migrasi SQL lokal** (`20261124100000` s.d. `20261124200000`) tetap berstatus **`BLOCKED remote`** sesuai aturan larangan push/migrasi remote otomatis, siap dijalankan manual mengikuti [`DEPLOY-RUNBOOK.md`](../DEPLOY-RUNBOOK.md).
- Sebelum peluncuran ke seluruh tukang/mandor, pemilik wajib mengeksekusi daftar tindakan pada [`FINAL-REPORT.md`](../FINAL-REPORT.md), termasuk **uji kegunaan lapangan 3–5 tukang/mandor**.
