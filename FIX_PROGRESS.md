# FIX PROGRESS — Froyek

Pelacak progres eksekusi perbaikan dari [FIX_PLAN.md](./FIX_PLAN.md).

## Status Per Fase

| Fase | Nama Fase | Status | Catatan / Verifikasi |
|---|---|---|---|
| **Fase 0** | Triase & Rencana Perbaikan Lengkap | `COMPLETED` | Baseline `monefyi_planner` (`tsc` ok, Vitest `57/57` files `391/391` tests) & `PlannerLP2` (`typecheck` ok, `93/93` engine + `Eval Gate 8/8`) lulus. `FIX_PLAN.md`, `FIX_PROGRESS.md`, `OPEN-DECISIONS.md` selesai ditulis. |
| **Fase 1** | Stabilitas P0, Auth Demo, Loops, Input Safety & Offline | `COMPLETED` | `tsc` exit 0, Vitest `61/61` files (`409/409` tests), `vite build` exit 0, Reviewer `APPROVED`, Browser Gate (`1440px` & `375x812`) PASS (`0` `22P02`, `0` Refresh Token `400`, `0` `403 runtime_traces`, `0` crash realtime/loop). |
| **Fase 2** | Kebenaran Data Keuangan, Health Score, Kehadiran & Share WA | `COMPLETED` | `tsc` exit 0, Vitest `65/65` files (`451/451` tests), `vite build` exit 0, `PlannerLP2` `typecheck` + `test:all-engine` PASS (`93/93` + `Eval Gate 8/8`), Reviewer `APPROVED`. Live browser pass 1 PASS `F-06`/`F-07`/`F-08`/`F-09`/`F-11` (`PERHATIAN`)/`F-22`/`F-23`/`F-34`; browser re-verify of follow-ups (`F-26` modal, `1 alert` -> `Projects.tsx`, `F-21` Demo UI) `BLOCKED` by pre-fix native macOS Share Sheet dialog holding Chrome `127.0.0.1:9222`. |
| **Fase 3** | Manajemen Tugas, Dependensi, CPM & Kolaborasi Realtime | `COMPLETED` | `tsc` exit 0, Vitest `69/69` files (`484/484` tests; 41/41 across 5 Phase 3 suites), `vite build` exit 0, `PlannerLP2` `typecheck` + `test:all-engine` exit 0, Reviewer `APPROVED`. Migrasi `20261116120000_work_item_cpm_assignee_priority.sql` ditulis lokal saja (eksekusi remote `BLOCKED`); fallback `42703`/`PGRST204` & Demo persistence aktif. |
| **Fase 4** | Migrasi Brand ke Froyek (`froyek.com`), Estimator Gating & Copy | `PENDING` | Menunggu eksekusi Track 4A, 4B & 4C (tanpa mengubah identifier internal / tanpa deploy remote). |
| **Fase 5** | AI Planner Engine, HR & Audit Trail, Mobile `375px` & Aksesibilitas | `PENDING` | Menunggu eksekusi Track 5A, 5B & 5C. |
| **Fase 6** | Keamanan Client Storage, Worker Traces, Komentar Indra & Proxy AI | `PENDING` | Menunggu eksekusi Track 6A (`singleDeviceSessionService.ts` dipertahankan + komentar). |
| **Fase 7** | QA Regresi, Audit Grep Akhir & Final Check | `PENDING` | Menunggu Fase 1–6 selesai. |

---

## Pelacak Temuan `F-01` s.d. `F-38`

| ID | Fase | Status Triase | Status Perbaikan |
|---|---|---|---|
| `F-01` | Fase 1 | `CONFIRMED` | `SELESAI` (`NotificationPanel` fallback + `ErrorBoundary`) |
| `F-02` | Fase 1 | `CONFIRMED` | `SELESAI` (`/app/settings`, Logout lintas role, guard tab non-owner) |
| `F-03` | Fase 1 | `CONFIRMED` | `SELESAI` (`CreateProjectRapDraft` & `Projects` Step 3 stabil) |
| `F-04` | Fase 4 | `SUDAH-BENAR` *(Logika)* / `CONFIRMED` *(Copy)* | `PENDING` |
| `F-05` | Fase 1 | `CONFIRMED` | `SELESAI` (`TabV2Rap` memo/ref sig guard) |
| `F-06` | Fase 2 | `CONFIRMED` | `SELESAI` (Hapus clamp `Math.max(0, ...)` `estLaba` + styling rose merah lintas V2) |
| `F-07` | Fase 2 | `CONFIRMED` | `SELESAI` (`computeAnalisaHealthScore` monotonik + guard EVM budget/AC `0`) |
| `F-08` | Fase 2 | `CONFIRMED` | `SELESAI` (`normalizeAnalyzeResult`, `loadLatestAnalysisSnapshot` + `description \|\| message`) |
| `F-09` | Fase 1–2 | `CONFIRMED` | `SELESAI` (Validasi `ProjectEditModal` Fase 1 + pisah mapper `contract_value` & label `Aktiva`/`Pasiva` Fase 2) |
| `F-10` | Fase 1–2 | `CONFIRMED` | `SELESAI` *(Demo mode short-circuit di Auth/Shell/Detail/Widgets, `0` `22P02`)* |
| `F-11` | Fase 2 | `CONFIRMED` | `SELESAI` (Filter `'attention'` `at_risk \|\| behind` + fix grid non-`'all'` `Projects.tsx` [re-verify browser terblokir dialog Chrome]) |
| `F-12` | Fase 3 | `CONFIRMED` | `SELESAI` (`+ Tambah Sub Tugas`, `Tampilkan Panel`, tab `Catatan` & `Dokumen` aktif dengan URL XSS allowlist + server `updated_at`) |
| `F-13` | Fase 3 | `CONFIRMED` | `SELESAI` (Hapus + konfirmasi & Duplikasi `work_item` di `TaskListPanel`, `GanttEditModal`, `GanttDetailPanel`, `TabV2Progress`, `workItemService`) |
| `F-14` | Fase 3 | `CONFIRMED` | `SELESAI` (Predecessor + `wouldCreateDependencyCycle`, FS auto-cascade, CPM `criticalPath.ts`, Assignee + `WorkerDashboard` `Tugas Saya`, Priority `Kritis`) |
| `F-15` | Fase 5 | `CONFIRMED` | `PENDING` |
| `F-16` | Fase 5 | `CONFIRMED` | `PENDING` |
| `F-17` | Fase 1 | `CONFIRMED` | `SELESAI` (`WorkerDashboard` tolak bon negatif/`<1000` + batal pending) |
| `F-18` | Fase 1 | `CONFIRMED` | `SELESAI` (`CommandModal` & `WorkerDashboard` kunci Quick Mode untuk Worker) |
| `F-19` | Fase 3 | `CONFIRMED` | `SELESAI` *(Realtime `useGanttRealtime` Fase 1 + optimistic `expectedUpdatedAt` / `WorkItemConflictError` + `GanttConflictDialog` Fase 3)* |
| `F-20` | Fase 5 | `CONFIRMED` | `PENDING` |
| `F-21` | Fase 2 | `CONFIRMED` | `SELESAI` (`dashboardService` hadir walau check-out, `attendanceService` WIB boundary, `WorkerDashboard` optimistic history + `Promise.allSettled`) |
| `F-22` | Fase 2 | `CONFIRMED` | `SELESAI` (`TabV2Analisa` `projectAnalysisMetrics` + `Est. Selesai` dinamis + non-konstruksi + `managerAgentService` `localBriefing`) |
| `F-23` | Fase 2 | `CONFIRMED` | `SELESAI` (Hapus chain fallback `contract_value` -> `total_budget` di `adapters.ts`, `ProjectDetailV2.tsx`, `planner-mapper.ts`, `managerAgentService.ts`) |
| `F-24` | Fase 6 | `CONFIRMED` | `PENDING` |
| `F-25` | Fase 6 | `SUDAH-BENAR` (`[BUKAN-BUG]`) | `PENDING` *(tambah komentar kode saja)* |
| `F-26` | Fase 2 | `CONFIRMED` | `SELESAI` (`TabV2Laporan` modal pratinjau + salin teks + link `wa.me/?text=...` langsung [re-verify browser terblokir dialog Chrome]) |
| `F-27` | Fase 5 | `CONFIRMED` | `IN_PROGRESS` *(Empty-state AI Dashboard & `localBriefing` selesai Fase 2; penjadwalan ulang / Gantt di Fase 3 & 5)* |
| `F-28` | Fase 3 | `CONFIRMED` | `SELESAI` (Badge/banner deadline overrun `planned_end > project.end_date` + perpanjang proyek; form Todo lengkap + inline edit + `break-words` + anti-duplikat) |
| `F-29` | Fase 1 | `CONFIRMED` | `SELESAI` *(Undo/Redo dates & `barColor`, 0px no-op, toolbar & `Ctrl+Z`)* |
| `F-30` | Fase 5 | `CONFIRMED` | `PENDING` |
| `F-31` | Fase 4–5 | `CONFIRMED` | `PENDING` |
| `F-32` | Fase 5 | `CONFIRMED` | `IN_PROGRESS` *(`GanttTodoModal` anti-overflow `280+` & duplikat selesai Fase 3; validasi `-` nominal `ProjectTransactionModals` di Fase 5)* |
| `F-33` | Fase 4 | `CONFIRMED` | `PENDING` |
| `F-34` | Fase 2 & 5 | `CONFIRMED` | `IN_PROGRESS` *(`ProgressBarLg`/`StatCard`/`TabV2Overview` zero-bar & `AGEN HARI INI` lead selesai Fase 2; toolbar Gantt & CS widget di Fase 5)* |
| `F-35` | Fase 6 | `CONFIRMED` | `IN_PROGRESS` *(`runtime_traces` 403 Worker selesai Fase 1; kontak cache di Fase 6)* |
| `F-36` | Fase 5 | `CONFIRMED` | `PENDING` |
| `F-37` | Fase 1–2 | `CONFIRMED` | `SELESAI` (`analyzeService` tangkap offline/FunctionsFetchError & tampilkan pesan jelas) |
| `F-38` | Fase 1 & 5 | `CONFIRMED` | `SELESAI` *(Auto-redirect `/login` + copy pemulihan arsip 30 hari di `ProjectEditModal`)* |
