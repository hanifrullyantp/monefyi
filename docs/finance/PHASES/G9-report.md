# Laporan Gerbang Fase G9 — Agen Project Manager Deterministik, Guard Bukti Foto 100%, & Simulasi Proyek 30 Hari End-to-End

**Tanggal Terbit:** 2026-11-24  
**Program:** G7–G11 Keuangan Froyek (Urutan: `G8 → G7 → G9 → G10 → G11`)  
**Branch Penutup Gerbang:** `feat/g9-project-manager-agent-30d-sim`  
**Status Fase G9:** `DONE` (seluruh modul domain PM, guard UI karyawan, & simulasi proyek 30 hari terpadu lulus lokal; tidak ada migrasi SQL baru pada Fase G9)

---

## 1. Ringkasan Modul Agen Project Manager (`G9`)

1. **Domain Deterministik Agen Project Manager (`packages/domain/src/projectManagerAgent.ts`):**
   Seluruh perhitungan memakai bilangan bulat rupiah (`toRupiah`), tanggal kalender UTC deterministik (`YYYY-MM-DD`), dan menyertakan `provenance` (`source`, `asOfDate`, `assumptions`):
   - **Jadwal $\rightarrow$ Penugasan Harian & Target Progres (`deriveDailyPlanFromSchedule`):**
     Menurunkan `dailyAssignments` (`DailyAssignmentPlan` yang selaras kontrak `DailyAssignmentSchedule` di `hrdPayroll.ts`) serta `plannedProgressPct` dan `actualProgressPct` tertimbang per tanggal dari daftar tahap Gantt (`workItems`), sambil melewati tahap yang sudah selesai `100%`.
   - **Penjaga Progres Lapangan & Bukti Foto Wajib 100% (`evaluateProgressUpdateRequest`):**
     - Setiap permintaan `requestedProgressPct >= 100` wajib melampirkan `photoAttachmentHash`/`photoUrl` valid **atau** persetujuan supervisor (`mandor` / `pm` / `owner`) dengan Separation of Duties (`approvedBy !== actorId`).
     - Pekerja (`actorRole === 'worker'`) yang mencoba menandai `100%` sendirian tanpa bukti foto maupun persetujuan supervisor ditolak (`ok: false`, `status: 'rejected_requires_proof'`, `reason: 'photo_or_supervisor_approval_required'`).
     - Pekerja yang melampirkan foto tanpa persetujuan supervisor ditempatkan pada status `'pending_supervisor_verification'` (`canMarkCompleted: false`, `effectiveProgressPct < 100`), dan baru disahkan `'approved'` (`100%`) setelah supervisor memverifikasi.
   - **Produktivitas & EAC Upah (`evaluateLaborProductivityAndEac`):**
     Menghitung `eacLaborCostRupiah` (`actualLaborCostRupiah / (actualProgressPct / 100)` saat `actualProgressPct >= 10`), `laborVarianceAtCompletionRupiah`, `costPerProgressPctRupiah`, `costPerManDayRupiah`, serta memicu peringatan `'labor_overrun'` (`eac > rapLaborBudget * 1.1`) dan `'progress_stalled'` (`daysWithoutProgress >= 3` sementara pekerja masih hadir/hari kerja bertambah).
   - **Material, Stok, & Draf Permintaan Beli (`evaluateMaterialAndPurchaseDrafts`):**
     Mendeteksi `'stock_low'` saat `currentStockQty < neededQty` atau `<= minStockThreshold` dan menghasilkan `purchase_request_draft` berstatus **wajib `'pending_human_approval'`** (`autoOrderAllowed: false`) dengan estimasi biaya integer rupiah.
   - **Laporan Harian Proyek Pemilik & Klien (`buildDailyProjectReport`):**
     - Mode `'owner'` menyertakan daftar hadir, tarif harian, biaya upah aktual, EAC upah, kasbon, dan proyeksi margin internal.
     - Mode `'client'` (hanya aktif bila `clientReportEnabled === true`) menyaring total seluruh data internal (`laborCost`, `dailyRate`, `margin`, `eac`, `kasbon`) sehingga hanya memuat progres, jadwal, tim hadir tanpa tarif, catatan lapangan tersanitasi, dan foto bukti.
   - **Risiko Keterlambatan & Dampak ke Tagihan Termin (`evaluateDelayAndTerminImpact`):**
     Menghitung `scheduleSlipDays` dan `projectedCompletionDate`, mengevaluasi termin proyek yang mensyaratkan `requiredProgressPct` minimum, menandai termin jatuh tempo yang terhambat sebagai `'termin_blocked_by_progress_delay'`, menghitung `estimatedCashInDelayDays` serta `blockedTerminAmountRupiah`, dan menghasilkan objek `advisorWhatIfScenario` yang langsung dapat dijalankan ke `runAdvisorWhatIf` (`financialAdvisor.ts`).
   - **Todo Otomatis dari Kendala & Penutupan Berbukti (`createTodoFromIssue`, `closeTodoWithProof`):**
     Membuat todo otomatis dari kendala lapangan/stok ke PIC tahap, dan menolak penutupan todo (`ok: false`, `reason: 'closure_proof_required'`) bila tidak ada `proofAttachmentHash` atau konfirmasi mandor/PM.

2. **Perbaikan Guard di UI Karyawan (`apps/web/src/lib/workerProgressGuard.ts` & `apps/web/src/pages/WorkerDashboard.tsx`):**
   - Menyatukan validasi perubahan progres UI karyawan melalui `validateWorkerProgressUpdate` yang memanggil langsung `evaluateProgressUpdateRequest`.
   - Tombol `+25%`, `Selesai 100%`, maupun slider progres pada `WorkerDashboard.tsx` tidak lagi dapat mengubah `progress_pct` menjadi `100` / `status: 'completed'` secara sepihak oleh pekerja tanpa bukti foto; pengajuan dengan foto membuka lampiran bukti dan menahan progres di antrean `"Menunggu Verifikasi Mandor/PM"`.

---

## 2. Hasil Simulasi Proyek 30 Hari Sintetis End-to-End (`g9ProjectManager30DaySim.test.ts`)

Simulasi penuh dijalankan selama **30 hari kalender (`2026-11-01` s.d. `2026-11-30`)** pada proyek sintetis **"Pembangunan Villa Merpati"** (`contractValue: Rp 300.000.000`, `dpReceivedTotal: Rp 90.000.000`, `rapLaborBudgetRupiah: Rp 20.000.000`, 3 tahap Gantt, 3 tukang + 1 mandor + 1 PM):

| Area Terpadu | Skenario Uji dalam Simulasi 30 Hari | Hasil Aktual |
|---|---|---|
| **PM $\rightarrow$ HRD (G8)** | `deriveDailyPlanFromSchedule` untuk Hari 1..30 dirangkai ke `resolveAttendanceProjectFromSchedule` & `buildDailyProjectLaborAccruals` (`72` man-days: 10×2 + 12×3 + 8×2) | **PASS** — seluruh 30 hari terpecahkan sebagai `source: 'pm_schedule'` (`needsConfirmation: false`), seluruh entri jurnal `Dr hpp_labor / Cr hutang_gaji` seimbang & valid dimensi. |
| **Guard Bukti Foto 100% (Domain & UI)** | Hari 10: pekerja klik `100%` tanpa foto $\rightarrow$ unggah foto tanpa supervisor $\rightarrow$ verifikasi mandor + foto; juga uji `validateWorkerProgressUpdate` untuk `+25%` dan SoD self-approval | **PASS** — ditolak (`rejected_requires_proof`), tertahan (`pending_supervisor_verification`), lalu sah `approved` `100%` setelah verifikasi supervisor. |
| **Produktivitas, Stok, & Todo** | Hari 15–17 stagnan 3 hari (`progress_stalled`); Hari 18 stok semen `8 < 30` sak (`stock_low` + draf PO `22 sak = Rp 1.430.000`, `pending_human_approval`, `autoOrderAllowed: false`); todo PIC `tukang-2` gagal tutup tanpa bukti (`closure_proof_required`), lalu sukses tutup dengan `proofAttachmentHash` | **PASS** — seluruh peringatan, status draf PO, dan guard penutupan todo bekerja deterministik. |
| **Risiko Termin $\rightarrow$ Advisor (G3)** | Hari 20 (jatuh tempo Termin 2 `Rp 100.000.000`, syarat `>= 60%`) progres baru `46%` | **PASS** — berstatus `'termin_blocked_by_progress_delay'`, `blockedTerminAmountRupiah === 100.000.000`, `scheduleSlipDays > 0`, dan `advisorWhatIfScenario` teruji langsung di `runAdvisorWhatIf` (`profitImpact === 0`). |
| **Laporan Owner vs Klien** | Hari 25 menerbitkan laporan `'owner'`, `'client'` (`clientReportEnabled: true`), dan `'client'` (`clientReportEnabled: false`) | **PASS** — mode `'owner'` memuat margin/EAC/kasbon; mode `'client'` non-aktif ditolak (`client_report_disabled`); mode `'client'` aktif memiliki **0 kebocoran** `laborCost`, `dailyRate`, `margin`, `eac`, `kasbon`, maupun nominal tarif/margin/kasbon. |
| **Paritas 3-Arah HRD–Buku Besar–PM & Pengakuan DP (G0)** | Rekonsiliasi akumulasi 30 hari & pengakuan pendapatan DP bertahap (`30%` $\rightarrow$ `46%` $\rightarrow$ `100%`) via `computeRecognizableRevenue` | **PASS** — **Total upah HRD 30 hari (`Rp 13.200.000`) === Total debit `hpp_labor` Buku Besar (`Rp 13.200.000`) === Total kredit `hutang_gaji` (`Rp 13.200.000`) === `actualLaborCostRupiah` PM EAC (`Rp 13.200.000`)**; total pengakuan DP `Rp 27.000.000 + Rp 14.400.000 + Rp 48.600.000 = Rp 90.000.000` (`remainingDpLiability === 0`). |

---

## 3. Bukti Output Verifikasi Lokal Aktual

| Perintah Verifikasi | Hasil | Detail Output Aktual |
|---|---|---|
| `npm run typecheck:web` | **PASS** | Exit code `0` (`tsc --noEmit` bersih tanpa error) |
| `npm --prefix apps/web exec vitest run src/lib/financeV2/__tests__/g9ProjectManager30DaySim.test.ts` | **PASS** | `Test Files  1 passed (1)`, `Tests  4 passed (4)` dalam `1.08s` |
| `npm run test:web` | **PASS** | `Test Files  107 passed (107)`, `Tests  773 passed (773)` dalam `50.62s` |
| `npm run gate:rebrand` | **PASS** | `Files scanned: 1209`, `Allowlisted legacy occurrences: 1586`, `Unapproved violations: 0` |
| `npm run gate:docs` | **PASS** | Terverifikasi bahwa seluruh perubahan file domain/keuangan disertai pembaruan `docs/finance/CHANGELOG.md` |

---

## 4. Catatan Kejujuran & Sisa Risiko Menuju Produksi (`G10`)

1. **Sifat Pengujian:**
   Simulasi 30 hari dan seluruh pengujian unit/integrasi G9 berjalan di atas data sintetis secara deterministik in-memory, tanpa koneksi ke instance Supabase remote maupun unggah berkas foto ke bucket storage produksi.
2. **Integrasi Persistensi UI & Adapter Operasional (`G10`):**
   - `WorkerDashboard.tsx` telah menegakkan guard `validateWorkerProgressUpdate` dan penyimpanan lampiran/catatan verifikasi pada `WorkItem`, namun alur persetujuan mandor/PM atas status `pending_supervisor_verification`, sinkronisasi `planner_daily_assignments` ke UI Gantt/HRD secara live, serta pengiriman notifikasi laporan harian klien/PO ke adapter produksi (WhatsApp/Email) masih menjadi ruang lingkup Fase **G10**.
   - Migrasi SQL lokal sebelumnya (`F0`–`G8` & `G7`) tetap berstatus **`BLOCKED remote`** dan perlu dieksekusi manual sesuai [`DEPLOY-RUNBOOK.md`](../DEPLOY-RUNBOOK.md).
