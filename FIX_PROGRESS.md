# FIX PROGRESS — Froyek

Pelacak progres eksekusi perbaikan dari [FIX_PLAN.md](./FIX_PLAN.md).

## Status Per Fase

| Fase | Nama Fase | Status | Catatan / Verifikasi |
|---|---|---|---|
| **Fase 0** | Triase & Rencana Perbaikan Lengkap | `COMPLETED` | Baseline `monefyi_planner` (`tsc` ok, Vitest `57/57` files `391/391` tests) & `PlannerLP2` (`typecheck` ok, `93/93` engine + `Eval Gate 8/8`) lulus. `FIX_PLAN.md`, `FIX_PROGRESS.md`, `OPEN-DECISIONS.md` selesai ditulis. |
| **Fase 1** | Stabilitas P0, Auth Demo, Loops, Input Safety & Offline | `COMPLETED` | `tsc` exit 0, Vitest `61/61` files (`409/409` tests), `vite build` exit 0, Reviewer `APPROVED`, Browser Gate (`1440px` & `375x812`) PASS (`0` `22P02`, `0` Refresh Token `400`, `0` `403 runtime_traces`, `0` crash realtime/loop). |
| **Fase 2** | Kebenaran Data Keuangan, Health Score, Kehadiran & Share WA | `PENDING` | Menunggu eksekusi Track 2A & 2B. |
| **Fase 3** | Manajemen Tugas, Dependensi, CPM & Kolaborasi Realtime | `PENDING` | Menunggu eksekusi Track 3A, 3B & 3C (migrasi SQL ditulis sebagai file lokal saja). |
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
| `F-06` | Fase 2 | `CONFIRMED` | `PENDING` |
| `F-07` | Fase 2 | `CONFIRMED` | `PENDING` |
| `F-08` | Fase 2 | `CONFIRMED` | `PENDING` |
| `F-09` | Fase 1–2 | `CONFIRMED` | `IN_PROGRESS` *(Validasi negatif/tanggal `ProjectEditModal` selesai Fase 1; pisah mapper di Fase 2)* |
| `F-10` | Fase 1–2 | `CONFIRMED` | `SELESAI` *(Demo mode short-circuit di Auth/Shell/Detail/Widgets, `0` `22P02`)* |
| `F-11` | Fase 2 | `CONFIRMED` | `PENDING` |
| `F-12` | Fase 3 | `CONFIRMED` | `PENDING` |
| `F-13` | Fase 3 | `CONFIRMED` | `PENDING` |
| `F-14` | Fase 3 | `CONFIRMED` | `PENDING` |
| `F-15` | Fase 5 | `CONFIRMED` | `PENDING` |
| `F-16` | Fase 5 | `CONFIRMED` | `PENDING` |
| `F-17` | Fase 1 | `CONFIRMED` | `SELESAI` (`WorkerDashboard` tolak bon negatif/`<1000` + batal pending) |
| `F-18` | Fase 1 | `CONFIRMED` | `SELESAI` (`CommandModal` & `WorkerDashboard` kunci Quick Mode untuk Worker) |
| `F-19` | Fase 3 | `CONFIRMED` | `IN_PROGRESS` *(Realtime `useGanttRealtime` selesai Fase 1; `updated_at` conflict di Fase 3)* |
| `F-20` | Fase 5 | `CONFIRMED` | `PENDING` |
| `F-21` | Fase 2 | `CONFIRMED` | `PENDING` |
| `F-22` | Fase 2 | `CONFIRMED` | `PENDING` |
| `F-23` | Fase 2 | `CONFIRMED` | `PENDING` |
| `F-24` | Fase 6 | `CONFIRMED` | `PENDING` |
| `F-25` | Fase 6 | `SUDAH-BENAR` (`[BUKAN-BUG]`) | `PENDING` *(tambah komentar kode saja)* |
| `F-26` | Fase 2 | `CONFIRMED` | `PENDING` |
| `F-27` | Fase 5 | `CONFIRMED` | `PENDING` |
| `F-28` | Fase 3 | `CONFIRMED` | `PENDING` |
| `F-29` | Fase 1 | `CONFIRMED` | `SELESAI` *(Undo/Redo dates & `barColor`, 0px no-op, toolbar & `Ctrl+Z`)* |
| `F-30` | Fase 5 | `CONFIRMED` | `PENDING` |
| `F-31` | Fase 4–5 | `CONFIRMED` | `PENDING` |
| `F-32` | Fase 5 | `CONFIRMED` | `PENDING` |
| `F-33` | Fase 4 | `CONFIRMED` | `PENDING` |
| `F-34` | Fase 2 & 5 | `CONFIRMED` | `PENDING` |
| `F-35` | Fase 6 | `CONFIRMED` | `IN_PROGRESS` *(`runtime_traces` 403 Worker selesai Fase 1; kontak cache di Fase 6)* |
| `F-36` | Fase 5 | `CONFIRMED` | `PENDING` |
| `F-37` | Fase 1–2 | `CONFIRMED` | `SELESAI` (`analyzeService` tangkap offline/FunctionsFetchError & tampilkan pesan jelas) |
| `F-38` | Fase 1 & 5 | `CONFIRMED` | `SELESAI` *(Auto-redirect `/login` + copy pemulihan arsip 30 hari di `ProjectEditModal`)* |
