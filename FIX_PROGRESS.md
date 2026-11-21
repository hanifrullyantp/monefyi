# FIX PROGRESS — Froyek

Pelacak progres eksekusi perbaikan dari [FIX_PLAN.md](./FIX_PLAN.md).

## Status Per Fase

| Fase | Nama Fase | Status | Catatan / Verifikasi |
|---|---|---|---|
| **Fase 0** | Triase & Rencana Perbaikan Lengkap | `COMPLETED` | Baseline `monefyi_planner` (`tsc` ok, Vitest `57/57` files `391/391` tests) & `PlannerLP2` (`typecheck` ok, `93/93` engine + `Eval Gate 8/8`) lulus. `FIX_PLAN.md`, `FIX_PROGRESS.md`, `OPEN-DECISIONS.md` selesai ditulis. |
| **Fase 1** | Stabilitas P0, Auth Demo, Loops, Input Safety & Offline | `COMPLETED` | `tsc` exit 0, Vitest `61/61` files (`409/409` tests), `vite build` exit 0, Reviewer `APPROVED`, Browser Gate (`1440px` & `375x812`) PASS (`0` `22P02`, `0` Refresh Token `400`, `0` `403 runtime_traces`, `0` crash realtime/loop). |
| **Fase 2** | Kebenaran Data Keuangan, Health Score, Kehadiran & Share WA | `COMPLETED` | `tsc` exit 0, Vitest `65/65` files (`451/451` tests), `vite build` exit 0, `PlannerLP2` `typecheck` + `test:all-engine` PASS (`93/93` + `Eval Gate 8/8`), Reviewer `APPROVED`. Live browser pass 1 PASS `F-06`/`F-07`/`F-08`/`F-09`/`F-11` (`PERHATIAN`)/`F-22`/`F-23`/`F-34`; browser re-verify of follow-ups (`F-26` modal, `1 alert` -> `Projects.tsx`, `F-21` Demo UI) `BLOCKED` by pre-fix native macOS Share Sheet dialog holding Chrome `127.0.0.1:9222`. |
| **Fase 3** | Manajemen Tugas, Dependensi, CPM & Kolaborasi Realtime | `COMPLETED` | `tsc` exit 0, Vitest `69/69` files (`484/484` tests; 41/41 across 5 Phase 3 suites), `vite build` exit 0, `PlannerLP2` `typecheck` + `test:all-engine` exit 0, Reviewer `APPROVED`. Migrasi `20261116120000_work_item_cpm_assignee_priority.sql` ditulis lokal saja (eksekusi remote `BLOCKED`); fallback `42703`/`PGRST204` & Demo persistence aktif. |
| **Fase 4** | Migrasi Brand ke Froyek (`froyek.com`), Estimator Gating & Copy | `COMPLETED` | Migrasi brand **Froyek** / `froyek.com` lintas `monefyi_planner`, `PlannerLP2`, & `supabase/functions`, `/reset-password` route/rewrite, gating `"Estimator"` (`appProductBrand.ts`, `Layout`, `BottomNav`, `AccountMenu`, `Settings`, `LegalPages`, `UpgradeModal`, `PaymentSuccessModal`/`usePaymentReturn`), guard admin `/app/uji-agen` & `Settings` tab dev, fix `"Dividen"`, + fix temuan review (`resendService`, `demo-preview.svg`, `llmRouter`, `pushNotify`, `sanitize`, `activatePurchase`, `apply/route.ts`). Deploy Edge Functions remote `BLOCKED`. |
| **Fase 5** | Perbaikan AI Terukur, HR & Audit Trail, Mobile `375px` & Aksesibilitas | `COMPLETED` | `tsc` exit 0, Vitest `73/73` files (`522/522` tests), `vite build` exit 0; perbaikan AI terukur (`tim` HRD, `add_project` editable & durasi, markdown inline, `CommandParser`/`CommandPipeline` `unknown`), HR quota sync + role/deactivate + `Audit Log` `id-ID` (+ migrasi lokal `planner_audit_logs_insert`, remote push `BLOCKED`), `/join` CTAs, `?tab=` back-sync, hapus duplikat `AIProviderPanel`, validasi nominal `-`, `GanttToolbar`/`TimelineHeader`, mobile `375px` Gantt list-first, & a11y `<label htmlFor>`/`id`/`name`. Full AI WBS/rescheduler ditandai `[BUTUH-KEPUTUSAN]`. |
| **Fase 6** | Keamanan Client Storage, Worker Traces, Komentar Indra & Proxy AI | `COMPLETED` | `F-25` `[BUKAN-BUG]` (`indra` bypass dipertahankan + komentar eksplisit Keputusan #3 & test); `F-24` default `executionMode: 'review'`, keys terisolasi di `sessionStorage`/memori (tidak lagi plaintext di `localStorage`), cleanup saat logout/ganti user, UI mask/Hapus Key, & Edge Function `planner-ai-proxy` siap lokal (deploy remote & `VITE_AI_PROXY_ENABLED` `[BLOCKED]`); `F-35` blokir & scrub cache kontak/token Telegram non-manager + migrasi lokal `20261121130000_phase6_rls_and_secrets_hardening.sql` (remote push `[BLOCKED]`). |
| **Fase 7** | QA Regresi, Audit Grep Akhir & Final Check | `PENDING` | Menunggu Fase 1–6 selesai. |

---

## Pelacak Temuan `F-01` s.d. `F-38`

| ID | Fase | Status Triase | Status Perbaikan |
|---|---|---|---|
| `F-01` | Fase 1 | `CONFIRMED` | `SELESAI` (`NotificationPanel` fallback + `ErrorBoundary`) |
| `F-02` | Fase 1 | `CONFIRMED` | `SELESAI` (`/app/settings`, Logout lintas role, guard tab non-owner) |
| `F-03` | Fase 1 | `CONFIRMED` | `SELESAI` (`CreateProjectRapDraft` & `Projects` Step 3 stabil) |
| `F-04` | Fase 4 | `SUDAH-BENAR` *(Logika)* / `CONFIRMED` *(Copy)* | `SELESAI` *(Copy — `'Froyek'`/`'Froyek Pro'` tanpa `'Estimator'`)* / `BUTUH-KEPUTUSAN` *(Logika kuota Free `0` proyek dipertahankan sesuai Keputusan #4)* |
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
| `F-15` | Fase 5 | `CONFIRMED` | `SELESAI` *(Bug AI terukur: non-`tim` HRD regex, draft `add_project` editable + durasi/kontrak, render `**bold**`, tolak jujur off-topic/reschedule)* / `BUTUH-KEPUTUSAN` *(Full WBS multi-fase AI di luar scope)* |
| `F-16` | Fase 5 | `CONFIRMED` | `SELESAI` (`commandParser` & `commandPipeline` fallback `unknown` + klarifikasi aman `CommandModal`) |
| `F-17` | Fase 1 | `CONFIRMED` | `SELESAI` (`WorkerDashboard` tolak bon negatif/`<1000` + batal pending) |
| `F-18` | Fase 1 | `CONFIRMED` | `SELESAI` (`CommandModal` & `WorkerDashboard` kunci Quick Mode untuk Worker) |
| `F-19` | Fase 3 | `CONFIRMED` | `SELESAI` *(Realtime `useGanttRealtime` Fase 1 + optimistic `expectedUpdatedAt` / `WorkItemConflictError` + `GanttConflictDialog` Fase 3)* |
| `F-20` | Fase 5 | `CONFIRMED` | `SELESAI` (`GanttPlannerView`/`ProjectScheduleGantt` list-first `<768px`, `GanttToolbar` compact mobile, `ManagerWorkspaceModal` `flex-wrap`, `CustomerSupportWidget` sembunyi/offset mobile) |
| `F-21` | Fase 2 | `CONFIRMED` | `SELESAI` (`dashboardService` hadir walau check-out, `attendanceService` WIB boundary, `WorkerDashboard` optimistic history + `Promise.allSettled`) |
| `F-22` | Fase 2 | `CONFIRMED` | `SELESAI` (`TabV2Analisa` `projectAnalysisMetrics` + `Est. Selesai` dinamis + non-konstruksi + `managerAgentService` `localBriefing`) |
| `F-23` | Fase 2 | `CONFIRMED` | `SELESAI` (Hapus chain fallback `contract_value` -> `total_budget` di `adapters.ts`, `ProjectDetailV2.tsx`, `planner-mapper.ts`, `managerAgentService.ts`) |
| `F-24` | Fase 6 | `CONFIRMED` | `SELESAI` *(Client/Lokal: default `'review'`, scrub `localStorage`→`sessionStorage`/memori, clear logout/lintas-user, `planner-ai-proxy` & tabel `planner_user_ai_secrets` lokal)* / `BLOCKED` *(Deploy proxy & aktivasi `VITE_AI_PROXY_ENABLED=true` ke Supabase remote)* |
| `F-25` | Fase 6 | `SUDAH-BENAR` (`[BUKAN-BUG]`) | `BUKAN-BUG` *(`lower.includes('indra')` dipertahankan sesuai Keputusan #3 + komentar & test regresi)* |
| `F-26` | Fase 2 | `CONFIRMED` | `SELESAI` (`TabV2Laporan` modal pratinjau + salin teks + link `wa.me/?text=...` langsung [re-verify browser terblokir dialog Chrome]) |
| `F-27` | Fase 2 & 5 | `CONFIRMED` | `SELESAI` *(Empty-state AI Dashboard, `localBriefing`, & respons reschedule jujur ke `Progress > Gantt`)* / `BUTUH-KEPUTUSAN` *(Auto-reschedule multi-tugas penuh)* |
| `F-28` | Fase 3 | `CONFIRMED` | `SELESAI` (Badge/banner deadline overrun `planned_end > project.end_date` + perpanjang proyek; form Todo lengkap + inline edit + `break-words` + anti-duplikat) |
| `F-29` | Fase 1 | `CONFIRMED` | `SELESAI` *(Undo/Redo dates & `barColor`, 0px no-op, toolbar & `Ctrl+Z`)* |
| `F-30` | Fase 5 | `CONFIRMED` | `SELESAI` (`InviteMemberModal` `activeMemberCount`, role/nonaktifkan di `EmployeeDetailSheet`, cabut undangan & format `Audit Log` `id-ID`, `logAudit` proyek/RAP/biaya/anggota + SQL lokal `planner_audit_logs_insert`) |
| `F-31` | Fase 4–5 | `CONFIRMED` | `SELESAI` (`/join-by-code` `/join`, fallback `/login` `LandingEntry`, sinkronisasi `?tab=` `Layout`/`Dashboard`/`AppShell`/`ProjectDetailV2`) |
| `F-32` | Fase 5 | `CONFIRMED` | `SELESAI` (`GanttTodoModal` Fase 3 + `ProjectTransactionModals` `inputMode="numeric"` & sanitasi `-` real-time) |
| `F-33` | Fase 4–5 | `CONFIRMED` | `SELESAI` *(Brand Froyek, Dividen, Estimator gating, isolasi admin dev tabs Fase 4 + hapus duplikat `AIProviderPanel` tab `profil` `Settings.tsx` Fase 5)* |
| `F-34` | Fase 2 & 5 | `CONFIRMED` | `SELESAI` *(`ProgressBarLg`/`StatCard`/`TabV2Overview` zero-bar & `AGEN` lead Fase 2 + `GanttToolbar` search width, `TimelineHeader` pill, & `CustomerSupportWidget` offset Fase 5)* |
| `F-35` | Fase 1 & 6 | `CONFIRMED` | `SELESAI` *(`runtime_traces` 403 Worker Fase 1 + blokir/scrub `monefyi_field_member_contacts_v1` & `monefyi_telegram_config_v1` non-manager, pembatasan tab `koordinasi`, & SQL lokal RLS `runtime_traces` Fase 6)* |
| `F-36` | Fase 5 | `CONFIRMED` | `SELESAI` (`<label htmlFor>` + `id`/`name`/`autoComplete="off"` pada Auth, Signup, Onboarding, Join, Settings, AI & Edit modals + kontras back link) |
| `F-37` | Fase 1–2 | `CONFIRMED` | `SELESAI` (`analyzeService` tangkap offline/FunctionsFetchError & tampilkan pesan jelas) |
| `F-38` | Fase 1 & 5 | `CONFIRMED` | `SELESAI` *(Auto-redirect `/login` + copy pemulihan arsip 30 hari di `ProjectEditModal`)* |
