# Laporan Gerbang Fase G2 — Keuangan Proaktif, Pengingat Multitenant, Draf Penagihan, & Jejak Audit

**Tanggal Terbit:** 2026-11-24  
**Program:** G0–G6 Keuangan Froyek  
**Status Fase G2:** `DONE` (Seluruh `G2-1` & `G2-2` selesai; migrasi SQL lokal `20261124160000_g2_proactive_reminders_audit.sql` berstatus **`BLOCKED remote`**; pengujian layanan memakai klien Supabase mock dan data uji sintetis)

---

## 1. Ringkasan Status `G2-1` sampai `G2-2`

| Tugas | Status | Apa yang Terbukti (Kode & Tes Lokal) | Apa yang Hanya Diuji Sintetis / Mock | Status Remote / Produksi |
|---|---|---|---|---|
| **G2-1** (Aging, Skor Risiko Klien, Peringatan Proyek/Kas, & Checklist Tutup Bulan) | `DONE` | Modul domain deterministik `packages/domain/src/proactiveFinance.ts`: `computeAgingSchedule` (5 bucket + `byParty`, tolak pencampuran piutang/hutang), `scoreClientCollectionRisk` (`0..100`, 4 pita risiko `low`/`medium`/`high`/`critical`), `evaluateProjectProactiveAlerts` (`project_over_budget`, `project_cash_low`, `dp_received_zero_progress`), dan `evaluateMonthCloseChecklist` (6 butir wajib tutup bulan + `opexVariance`), seluruhnya dengan integer rupiah `toRupiah` dan `provenance` eksplisit (`proactiveFinance.test.ts`: `8` tes lulus). | Dataset proyek, piutang/hutang, dan status wallet yang diuji bersifat skenario sintetis in-memory; belum dijalankan di atas data produksi riil. | Kode domain lokal (tanpa migrasi SQL baru) |
| **G2-2** (Mesin Pengingat Multitenant, Draf Penagihan WA/Email, & Jejak Audit) | `DONE` | Modul domain `packages/domain/src/reminderScheduler.ts` (`buildTenantProactiveReminders` 5 jenis + `dedupeKey` idempoten + filter ketat `orgId` & `crossTenantRejectedCount`, `buildCollectionMessageDraft` L0/L1 selalu `pending_approval` & `autoSendAllowed: false`, `approveAndDispatchCollectionDraft` SoD `approvedBy !== createdBy` + `orgId` + `auditLogId` wajib, `runMultiTenantCronBatch`), layanan `apps/web/src/services/financeV2/proactiveAssistantService.ts`, migrasi SQL `20261124160000_g2_proactive_reminders_audit.sql`, & suite TDD `proactiveMultitenantAudit.test.ts` (`7` tes lulus). | Persisten DB pada `proactiveAssistantService.ts` diuji memakai mock `supabase.from` (`vi.mock`); penegakan RLS, trigger append-only PostgreSQL, dan CHECK constraint SQL belum dijalankan di PostgreSQL remote; belum terhubung ke cron/edge scheduler maupun gateway WA/SMTP nyata. | `BLOCKED remote` (`20261124160000_g2_proactive_reminders_audit.sql`) |

---

## 2. Bukti Uji Isolasi Multi-Tenant, Aturan L0/L1, SoD, & Jejak Audit (`G2-2`)

### 2.1 Isolasi Multi-Tenant & Idempotensi Cron (`proactiveMultitenantAudit.test.ts`)
- **Injeksi Lintas Organisasi pada Batch Cron:** `runMultiTenantCronBatch` dijalankan untuk `org-A` dan `org-B` pada tanggal acuan `2026-11-24`, dengan menyuntikkan **5 item milik `org-B`** ke seluruh 5 kanal input `org-A` (`payables`, `receivables`, `termins`, `expenses`, `journalLines`) dan **1 item milik `org-A`** ke input `org-B`:
  - `org-A`: `crossTenantRejectedCount = 5`, `reminders` hanya berisi `1` item milik `org-A` (`pay-A-1`), `0` kemunculan string/ID milik `org-B`.
  - `org-B`: `crossTenantRejectedCount = 1`, `reminders` hanya berisi `1` item milik `org-B` (`rec-B-OWNED`), `0` kemunculan string/ID milik `org-A`.
- **Cakupan 5 Jenis Pengingat & Idempotensi `dedupeKey`:**
  1. `payable_due` (hutang jatuh tempo `<= 3` hari atau sudah lewat; `4` hari lagi tidak memicu).
  2. `receivable_overdue` (piutang lewat jatuh tempo `> 0` hari; `0` hari tidak memicu).
  3. `termin_ready_to_bill` (`actualProgressPct >= targetProgressPct` dan `!isBilled`; termin sudah ditagih diabaikan).
  4. `missing_receipt_attachment` (biaya `>= Rp 500.000` tanpa lampiran nota; di bawah ambang atau sudah berlampiran diabaikan).
  5. `journal_needs_review` (baris jurnal bertanda `needsReview = true`).
  - Format `dedupeKey`: `${orgId}:${reminderType}:${entityId}:${asOfDate}` terbukti identik saat dijalankan ulang pada hari yang sama dan berbeda pada hari berikutnya (`2026-11-24` vs `2026-11-25`).

### 2.2 Aturan Keras `L0`/`L1`, Pemisahan Wewenang (SoD), & Wajib Jejak Audit
- **L0 & L1 Draft-Only:** `buildCollectionMessageDraft` untuk channel `'whatsapp'` dan `'email'` pada `'L0'` maupun `'L1'` selalu menghasilkan `status: 'pending_approval'`, `autoSendAllowed: false`, `requiresHumanApproval: true`, nilai rupiah integer deterministik (`Rp 20.000.000` untuk total dua invoice), nomor invoice eksplisit, dan `provenance`.
- **Penolakan Wajib pada Domain & Layanan (`approveAndDispatchCollectionDraft` & `approveAndRecordCollectionDispatch`):**
  - Tanpa `auditLogId` (kosong / whitespace / gagal insert audit log) $\rightarrow$ ditolak **`audit_trail_required`**, status tidak berubah ke `'dispatched'` dan DB `.update()` tidak dipanggil.
  - Persetujuan oleh pembuat draf sendiri (`approvedBy === createdBy`) $\rightarrow$ ditolak **`self_approval_forbidden`**.
  - Persetujuan lintas organisasi (`approval.orgId !== draft.orgId`) $\rightarrow$ ditolak **`cross_tenant_forbidden`**.
  - Persetujuan sah oleh manager berbeda + `auditLogId` non-kosong $\rightarrow$ status berubah ke **`'dispatched'`** dengan `approvedBy`, `auditLogId`, dan `dispatchedAt` terisi lengkap.

### 2.3 Verifikasi Struktural Migrasi SQL (`20261124160000_g2_proactive_reminders_audit.sql`)
- Berkomentar eksplisit **`BLOCKED remote`** (lokal saja, tidak di-push ke produksi).
- Membuat 3 tabel baru tanpa menyentuh/memutasi `planner_journal_entries`, `planner_journal_lines`, maupun `planner_journal_allocations`:
  1. `planner_proactive_audit_logs`: append-only dengan fungsi `public.planner_reject_proactive_audit_mutation()` (`ERRCODE = '55000'`) dan trigger `BEFORE UPDATE OR DELETE`, RLS `is_org_member` hanya `SELECT` (`worker`) & `INSERT` (`manager`), tanpa policy `UPDATE`/`DELETE`.
  2. `planner_finance_reminders`: constraint `UNIQUE (org_id, dedupe_key)` dan RLS `is_org_member`.
  3. `planner_collection_drafts`: `CHECK (approved_by IS NULL OR approved_by <> created_by)`, `CHECK (status <> 'dispatched' OR (approved_by IS NOT NULL AND audit_log_id IS NOT NULL))`, trigger integritas `planner_guard_collection_draft_integrity()`, dan RLS `is_org_member`.

---

## 3. Bukti Verifikasi Lokal (`typecheck`, `vitest`, `gate:docs`, `gate:rebrand`)

Hasil eksekusi aktual pada branch `feat/g2-2-cron-reminders-collection-drafts-audit`:

- `npm run typecheck:web` (`tsc --noEmit`): **PASS** (exit code `0`).
- `npm run test:web` (`vitest run`): **PASS** — **96 test files passed (96), 676 tests passed (676)**:
  - `src/lib/financeV2/__tests__/proactiveFinance.test.ts` (**8** tests passed)
  - `src/lib/financeV2/__tests__/proactiveMultitenantAudit.test.ts` (**7** tests passed)
  - `src/lib/financeV2/__tests__/journalImmutability.test.ts` (**4** tests passed — termasuk scan statis layanan & migrasi `20261124*`)
  - Seluruh suite G0, G1, & F0–F4 tetap hijau (`g1AnomalyAndEval.test.ts`, `bankReconciliation.test.ts`, `receiptExtraction.test.ts`, `financeAgentEval.test.ts`, dll.).
- `npm run gate:docs`: **PASS** (perubahan file keuangan terdeteksi bersama pembaruan `docs/finance/CHANGELOG.md`).
- `npm run gate:rebrand`: **PASS** (`Files scanned: 1196`, `Allowlisted legacy occurrences: 1537`, `Unapproved violations: 0`).

---

## 4. Sisa Risiko & Tindak Lanjut Menuju `G3`

1. **Migrasi SQL `F0`–`G2` Masih `BLOCKED remote`:**
   Seluruh migrasi lokal hingga Langkah 11 (`20261124160000_g2_proactive_reminders_audit.sql` di `docs/finance/DEPLOY-RUNBOOK.md`) belum dijalankan ke PostgreSQL produksi. Uji integrasi nyata RLS `is_org_member`, trigger `planner_proactive_audit_logs_no_mutation`, dan constraint SoD perlu diverifikasi ulang saat eksekusi staging/runbook manual oleh operator.
2. **Belum Ada Cron Scheduler & Gateway Pengiriman WA/Email Nyata:**
   `runTenantReminderCron` dan `approveAndRecordCollectionDispatch` baru mengelola kalkulasi deterministik, persistensi mock, dan pencatatan status `'dispatched'` + `audit_log_id`. Integrasi Supabase Edge Function / cron terjadwal serta adapter WA/Email nyata menjadi cakupan fase berikutnya (`G3`).
3. **Antarmuka Review Terpadu (`G3`) & Sampel Data Nyata Pemilik:**
   Tampilan UI terpadu untuk meninjau draf OCR, duplikat/anomali, mutasi bank, daftar pengingat proaktif, persetujuan draf penagihan (SoD), dan checklist tutup bulan belum dibangun di UI web; validasi pada dataset nyata anonim milik pemilik masih tertunda.
