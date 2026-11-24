# Laporan Gerbang Fase G8 — Kebenaran Payroll, Akrual Upah Proyek, Anti-Kecurangan Kehadiran, & RBAC 4 Peran HRD

**Tanggal Terbit:** 2026-11-24  
**Program:** G7–G11 Keuangan Froyek (Urutan: `G8 → G7 → G9 → G10 → G11`)  
**Branch Penutup Gerbang:** `feat/g8-3-antifraud-rbac-g8-report`  
**Status Fase G8:** `DONE` (seluruh modul domain & layanan G8-1, G8-2, G8-3 teruji lokal; 1 file migrasi SQL G8 lokal `20261124190000_g8_hrd_project_labor_accrual.sql` berstatus **`BLOCKED remote`**)

---

## 1. Ringkasan Cakupan Fase G8 (`G8-1` s.d. `G8-3`)

### A. G8-1 — Kebenaran Payroll, Tanpa Klaim Lunas Palsu, & Anti-Swallow Error Jurnal (`D-G8-01`)
- **Branch:** `feat/g8-1-remove-fake-disbursement-fix-payroll-errors`
- **Cakupan Aktual:**
  1. **Larangan Klaim `"LUNAS"` / Transfer Palsu (`apps/web/src/services/aiHrdPayrollService.ts`, `apps/web/src/components/hr/AiHrdPayrollModal.tsx`):**
     - Memperkenalkan kontrak `PayrollPaymentProvider` dan `PaymentConfirmation` (`provider_webhook` | `manual_owner_confirmation` dengan SoD `confirmedBy !== preparedBy`).
     - Tahap persiapan (`preparePayrollDisbursementBatch`) hanya menghasilkan status `'awaiting_payment_confirmation'`; slip WhatsApp (`formatWhatsAppSlip`) menulis `"Status: *MENUNGGU KONFIRMASI PEMBAYARAN*"` dan hanya menulis `"Status: *LUNAS (TERKONFIRMASI)*"` setelah `confirmPayrollDisbursementBatch` memverifikasi konfirmasi nyata serta sukses memposting jurnal.
  2. **Hapus Tarif Cadangan `150000` & Penyembunyian Kasbon:**
     - Pekerja tanpa tarif resmi atau bertarif `<= 0` ditandai `rateStatus: 'missing_rate'`, `requiresRateQuestion: true`, `baseRate: 0`, dan dikumpulkan ke `missingRateQuestions`.
     - Sisa kasbon dicatat eksplisit pada `remainingKasbonBalance` dan `kasbonShortfall` (`appliedKasbonDeduction + remainingKasbonBalance === totalKasbon`).
  3. **Anti-Swallow Error Posting Jurnal & UUID Ketat (`apps/web/src/services/payrollService.ts`, `apps/web/src/services/financeV2/payrollJournalBridge.ts`, `apps/web/src/pages/HrEmployees.tsx`):**
     - `payrollEntryId` wajib berupa UUID valid dari `planner_payroll_entries.id`.
     - Kegagalan posting jurnal pada `updatePayrollStatus`, `reviewBonRequest`, dan `confirmPayrollDisbursementBatch` melakukan kompensasi rollback status dan melempar error (`PayrollJournalPostError` / error bridge eksplisit) tanpa pernah menandai `'paid'`.

### B. G8-2 — Kehadiran `day_fraction`, Tarif Beriwayat `effectiveFrom`, Akrual Upah Proyek, Gaji Kantor Opex, BPJS/PPh 21 Konfigurabel, & Kasbon Bersaldo
- **Branch:** `feat/g8-2-project-labor-accrual-day-fraction-kasbon`
- **Cakupan Aktual:**
  1. **COA & Template Jurnal Seimbang (`packages/domain/src/journal.ts`, `apps/web/src/types/financeV2.ts`, `apps/web/src/lib/financeV2Calc.ts`):**
     - Menambahkan akun `'hutang_gaji'` (wajib dimensi `party_id` melalui `PARTY_DIMENSION_ROLES`) dan 3 kode kejadian tertutup pada `FINANCE_EVENT_CODES`: `'project_labor_accrual'` (`Dr hpp_labor / Cr hutang_gaji`), `'office_payroll_accrual'` (`Dr beban_opex / Cr hutang_gaji`), dan `'payroll_liability_settlement'` (`Dr hutang_gaji / Cr kas + Cr piutang`).
  2. **Domain Deterministik HRD–Keuangan (`packages/domain/src/hrdPayroll.ts`):**
     - `validateDailyAttendanceSplits`: mendukung pembagian 1 hari kerja ke 2+ proyek (mis. `0.5 + 0.5 <= 1.0`) dan menolak jumlah `> 1.0`.
     - `resolveAttendanceProjectFromSchedule`: mencocokkan kehadiran dengan jadwal harian PM (`needsConfirmation: false` saat sesuai jadwal).
     - `resolveEffectiveCompensationRate`: memilih tarif `daily | borongan | monthly` dengan `effectiveFrom <= workDate` terbaru (prioritas per pekerja lalu per peran), mengembalikan `status: 'missing_rate'` jika kosong/non-positif.
     - `buildDailyProjectLaborAccruals`: menghitung akrual harian upah proyek dengan invarian **total upah per proyek === total debit `hpp_labor` proyek di buku besar**.
     - `buildOfficeMonthlyPayrollAccrual` & `calculatePayrollStatutoryDrafts`: membukukan gaji kantor ke `beban_opex` (bukan `hpp_labor`), menghitung draf BPJS & PPh 21 100% dari `statutoryConfig` (`config_required` bila kosong) berlabel `"Draf untuk ditinjau konsultan pajak — bukan nasihat hukum/pajak berlisensi"`.
     - `computeKasbonSettlement`: membatasi potongan sesuai `maxDeductionPct` dan membawa `remainingKasbonBalance`.
  3. **Migrasi SQL Lokal (`my-supabase-project/supabase/migrations/20261124190000_g8_hrd_project_labor_accrual.sql`, `BLOCKED remote`):**
     - Menambah `'hutang_gaji'` ke COA default + membuat `planner_attendance_project_splits`, `planner_compensation_rate_history`, `planner_daily_assignments`, dan `planner_org_labor_policies` dengan RLS `is_org_member` dan tanpa mutasi tabel jurnal.

### C. G8-3 — Anti-Kecurangan Kehadiran, RBAC 4 Peran HRD, & Uji Gerbang Penuh G8
- **Branch:** `feat/g8-3-antifraud-rbac-g8-report`
- **Cakupan Aktual:**
  1. **Anti-Kecurangan Kehadiran (`packages/domain/src/hrdGovernance.ts` — `evaluateAttendanceFraudSignals`):**
     - Mendeteksi 4 sinyal secara deterministik:
       1. `buddy_punch_suspected`: `deviceId` sama dipakai `>= 2` pekerja berbeda dalam `<= 15` menit tanpa otorisasi `isSharedMandorDevice` yang sah.
       2. `impossible_location_jump`: jarak Haversine (`calculateHaversineDistanceMeters`) antar check-in pekerja yang sama menghasilkan kecepatan `> 120 km/jam` atau titik check-in berada di luar `radiusMeters` geofence proyek.
       3. `abnormal_work_hours`: check-in pada rentang `00:00–04:30` tanpa izin shift malam, durasi kerja `> 16` jam dalam 1 hari, atau `checkOut <= checkIn`.
       4. `reused_photo_hash`: `photoSha256` identik sudah pernah dipakai sebelumnya.
     - **Aturan keras tanpa penolakan diam-diam:** setiap catatan berflag tetap diterima dengan `verificationStatus: 'flagged_for_review'`, `silentlyRejected: false`, `acceptedForReview: true`, `flags`, `reasons`, dan `requiresMandorOrOwnerReview: true`. Catatan normal berstatus `'verified'` dengan `0` flag.
  2. **RBAC 4 Peran HRD (`packages/domain/src/hrdGovernance.ts` — `filterHrdRecordsByRole`):**
     - **`worker`**: hanya melihat baris miliknya sendiri (hari kerja, proyek, tarif, upah, dan kasbon sendiri).
     - **`mandor`**: melihat dirinya sendiri (lengkap) + anggota timnya (`teamWorkerIds`), dengan redaksi wajib (`null`) pada `dailyRate`, `grossSalary`, `netSalary`, dan `kasbonBalance` milik orang lain.
     - **`pm`**: melihat hari kerja (`dayFraction`, `regularHours`, `overtimeHours`, `projectId`) seluruh pekerja pada proyeknya (`projectIds`), dengan seluruh field tarif & nominal gaji/kasbon wajib di-redact (`null`).
     - **`owner` | `finance`**: melihat seluruh data & nominal lengkap dalam organisasinya.
     - **Isolasi Multi-Tenant:** seluruh peran menolak keras baris lintas `orgId` (`crossOrgRejectedCount`).

---

## 2. Bukti Hasil Verifikasi Lokal Aktual

| Perintah Verifikasi | Hasil | Detail Output Aktual |
|---|---|---|
| `npm run typecheck:web` | **PASS** | Exit code `0` (`tsc --noEmit` bersih tanpa error) |
| `npm run test:web` | **PASS** | **105 test files passed (105), 760 tests passed (760)** dalam `40.10s` |
| Suite Khusus Gerbang G8 (`g8PayrollTruthAndNoFakePaid.test.ts`, `aiHrdPayrollService.test.ts`, `g8ProjectLaborAccrual.test.ts`, `g8AntiFraudRbacAndGate.test.ts`) | **PASS** | **4 test files passed (4), 37 tests passed (37)** (`12 + 3 + 12 + 10`) |
| `npm run gate:rebrand` | **PASS** | `Files scanned: 1205`, `Allowlisted legacy occurrences: 1578`, `Unapproved violations: 0` |
| `npm run gate:docs` | **PASS** | Terverifikasi setelah commit bahwa seluruh perubahan file keuangan disertai pembaruan `docs/finance/CHANGELOG.md` |

---

## 3. Catatan Kejujuran, Status Migrasi, & Langkah Berikutnya (`G7`)

1. **Status Migrasi SQL Lokal:**
   File migrasi G8 (`my-supabase-project/supabase/migrations/20261124190000_g8_hrd_project_labor_accrual.sql`) masih berada di lokal dan berstatus **`BLOCKED remote`** — tidak pernah di-push ke Supabase produksi.
2. **Sifat Pengujian:**
   Seluruh uji G8-1, G8-2, G8-3, dan uji integrasi gerbang penuh G8 dijalankan secara deterministik dan in-memory/terisolasi tanpa koneksi database remote maupun transfer bank/gateway nyata.
3. **Kesiapan Fase Berikutnya (`G7`):**
   Sesuai urutan program **`G8 → G7 → G9 → G10 → G11`**, Fase **G8** ditutup dengan status **`DONE`** dan papan kerja [`docs/finance/PROGRESS.md`](../PROGRESS.md) disiapkan untuk memulai Fase **G7 (Integrasi UI & Runtime Keuangan Terpadu)**.
