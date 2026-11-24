# Laporan Gerbang Fase G7 — Sistem Umpan Balik Terpadu, Observabilitas Lintas Aplikasi, Anonimisasi PII, Penggabungan Laporan Otomatis, & Dasbor Mutu

**Tanggal Terbit:** 2026-11-24  
**Program:** G7–G11 Keuangan Froyek (Urutan: `G8 → G7 → G9 → G10 → G11`)  
**Branch Penutup Gerbang:** `feat/g7-unified-feedback-observability`  
**Status Fase G7:** `DONE` (seluruh modul domain, layanan klien, & tes gerbang G7 lulus lokal; 1 file migrasi SQL lokal `20261124193000_g7_unified_feedback_events.sql` berstatus **`BLOCKED remote`**)

---

## 1. Ringkasan Sistem Umpan Balik Terpadu (`G7`)

1. **Domain Deterministik Terpadu (`packages/domain/src/feedbackObservability.ts`):**
   - Menyatukan **5 modul** (`'keuangan' | 'proyek' | 'sdm' | 'ui' | 'agent'`), **3 tingkat keparahan** (`'kritis' | 'sedang' | 'ringan'`), dan **seluruh 8 kategori sinyal**:
     1. `'user_bug_report'` (tombol "Laporkan masalah" di setiap layar)
     2. `'agent_rating'` (👍/👎 pada jawaban agent + alasan singkat)
     3. `'ui_confused'` (tombol "Saya bingung")
     4. `'runtime_error'` (crash / request gagal / query lambat di atas ambang)
     5. `'behavior_friction'` (rage click, bolak-balik layar, form ditinggalkan, fitur tak pernah dipakai)
     6. `'silent_correction'` (edit/batal entri agent, jurnal pembalik susulan, `needs_review` diubah, `"bukan ini"` di `needs_choice`)
     7. `'data_invariant_failure'` (invarian gagal / selisih rekonsiliasi)
     8. `'agent_unanswered_or_tool_fail'` (pertanyaan tak terjawab / tool gagal)
   - **Anonimisasi PII & Kredensial Ketat (`anonymizeFeedbackPayload`, `anonymizeString`):** menyapu & menyensor secara rekursif sebelum masuk antrean (`[REDACTED_EMAIL]`, `[REDACTED_PHONE]`, `[REDACTED_NIK]`, `[REDACTED_BANK_ACCOUNT]`, `[REDACTED_SECRET]`, `[REDACTED_PII]`) termasuk pada nested object, array, objek `Error`, serta men-hash `reporterId` menjadi `reporterHash`.
   - **Opt-Out Data Perilaku & Batasan Keamanan (`ingestFeedbackSignal`):** menolak sinyal `'behavior_friction'` dengan `reason: 'behavior_telemetry_opted_out'` apabila `orgConsent.behaviorTelemetryOptOut === true`, sambil tetap menerima kategori bug/error runtime. Seluruh keluaran mengunci `autoModifyCodeOrPromptAllowed: false` (perbaikan kode atau prompt hanya boleh lewat PR + eval gate).
   - **Penggabungan Laporan Otomatis & Prioritas (`aggregateFeedbackQueue`):** menghitung `fingerprint` deterministik berbasis `module + category + normalizedErrorOrScreenKey` untuk menggabungkan laporan serupa menjadi 1 isu terpadu dengan `reporterCount` unik dan `priorityScore = baseSeverityWeight + Math.min(50, reporterCount * 5)` (`kritis = 120`, `sedang = 60`, `ringan = 10`).
   - **Kandidat Evaluasi & Dasbor Mutu (`buildEvalCandidateFromFailedAgent`, `computeQualityDashboard`):** kasus agent gagal/👎 menghasilkan `EvalCaseCandidate` teranonimisasi berstatus **wajib `'pending_human_review'`** (`requiresHumanReview: true`, `autoAddedToEvalSet: false`); dasbor mutu menghitung akurasi per modul & intent, tren salah-posting, peringatan penurunan akurasi, dan memicu rekomendasi `autonomyDemotionRecommended: true` (`recommendedAutonomyTransition: 'L2 -> L1'`) saat melampaui ambang kesalahan kritis atau penurunan akurasi.

2. **Migrasi SQL Lokal (`my-supabase-project/supabase/migrations/20261124193000_g7_unified_feedback_events.sql`, `BLOCKED remote`):**
   - Membuat `planner_feedback_events` beserta indeks `(org_id, fingerprint)` dan `(status, priority_score DESC)`.
   - Membuat `planner_org_telemetry_settings` (`org_id UNIQUE`, `behavior_telemetry_opt_out boolean DEFAULT false`, `updated_by`, `updated_at`).
   - Mengaktifkan RLS ketat berbasis `is_org_member(org_id, ...)` tanpa menyentuh maupun memutasi tabel jurnal buku besar.

3. **Layanan Klien Pelacak Error & Umpan Balik (`apps/web/src/services/feedbackObservabilityService.ts`):**
   - Menyediakan `reportUserFeedback`, `reportRuntimeError` (pengganti `console.error` diam-diam), `reportBehaviorFriction`, `reportSilentCorrection`, `reportDataInvariantFailure`, dan `reportAgentUnansweredOrToolFail`.

---

## 2. Bukti Uji Gerbang G7 (`apps/web/src/lib/financeV2/__tests__/g7FeedbackObservability.test.ts`)

| Gerbang | Skenario Teruji | Hasil Aktual |
|---|---|---|
| **Gerbang 1 (Penggabungan 20 Laporan)** | Simulasi 20 laporan serupa (`financeV2/cost_realization_submit_timeout`, `user-1..user-20`) melalui `ingestFeedbackSignal` + `aggregateFeedbackQueue` | **PASS** — tergabung menjadi tepat **1 isu** (`issues.length === 1`), `reporterCount === 20`, `occurrenceCount === 20`, `priorityScore` naik (`110 > 65`), urutan `kritis > sedang > ringan` terjaga. |
| **Gerbang 2 (0 Kebocoran PII & Rahasia)** | Penyuntikan email, nomor HP `0812...`/`+628...`/`0811-...`, NIK 16 digit, rekening bank (`BCA 1234567890123`, nested `bankAccount.number`), `Bearer eyJ...`, `sk-live-...`, `sb_secret_...`, `apikey=...`, `password=...`, & `cookie` di nested object | **PASS** — **0 string mentah lolos** pada `JSON.stringify(queueItem)` maupun `EvalCaseCandidate`; seluruhnya diganti token redaksi `[REDACTED_*]`, sedangkan UUID & tanggal ISO tetap utuh. |
| **Gerbang 3 (Seluruh 8 Kategori Sinyal)** | Uji end-to-end melalui layanan klien (`feedbackObservabilityService.ts`) untuk `user_bug_report`, `agent_rating`, `ui_confused`, `runtime_error`, `behavior_friction`, `silent_correction`, `data_invariant_failure`, & `agent_unanswered_or_tool_fail` | **PASS** — seluruh **8/8 kategori** diterima, teranonimisasi, dan teragregasi dengan benar. |
| **Gerbang 4 (Opt-Out, Eval Gate, L2→L1, & SQL)** | Uji `behaviorTelemetryOptOut: true` menolak `behavior_friction` sambil menerima `user_bug_report` & `runtime_error`; `autoModifyCodeOrPromptAllowed === false`; `EvalCaseCandidate` berstatus `'pending_human_review'`; `computeQualityDashboard` memicu `'L2 -> L1'`; inspeksi statis SQL G7 | **PASS** — semua guard & struktur migrasi SQL (`BLOCKED remote`, indeks, RLS `is_org_member`, bebas mutasi jurnal) terverifikasi. |

---

## 3. Bukti Output Verifikasi Lokal Aktual

| Perintah Verifikasi | Hasil | Output Aktual |
|---|---|---|
| `npm --prefix apps/web exec vitest run src/lib/financeV2/__tests__/g7FeedbackObservability.test.ts` | **PASS** | `Test Files  1 passed (1)`, `Tests  9 passed (9)` dalam `950ms` |
| `npm run typecheck:web` | **PASS** | `tsc --noEmit` exit code `0` (bersih tanpa error) |
| `npm run test:web` | **PASS** | `Test Files  106 passed (106)`, `Tests  769 passed (769)` dalam `40.28s` |
| `npm run gate:rebrand` | **PASS** | `Files scanned: 1207`, `Allowlisted legacy occurrences: 1586`, `Unapproved violations: 0` |
| `npm run gate:docs` | **PASS** | Diverifikasi pasca-commit pada diff `main...HEAD` (`CHANGELOG.md` terdeteksi ikut diperbarui bersama seluruh file keuangan) |

---

## 4. Catatan Kejujuran, Status Migrasi, & Sisa Risiko

1. **Status Migrasi SQL Lokal:**
   File `my-supabase-project/supabase/migrations/20261124193000_g7_unified_feedback_events.sql` masih berada di lokal dan berstatus **`BLOCKED remote`** — belum dijalankan di Supabase produksi (Langkah 15 pada [`DEPLOY-RUNBOOK.md`](../DEPLOY-RUNBOOK.md)).
2. **Sifat Pengujian:**
   Seluruh pengujian G7 berjalan secara deterministik dan in-memory dengan adapter persistensi uji; penulisan ke tabel `planner_feedback_events` pada database remote nyata belum dijalankan.
3. **Sisa Risiko Menuju Produksi & Fase Berikutnya (`G9`):**
   - Layar UI aplikasi web masih perlu menambatkan komponen tombol "Laporkan masalah", "Saya bingung", serta widget 👍/👎 ke fungsi `feedbackObservabilityService.ts` dan menggantikan sisa `console.error` lama di seluruh modul secara bertahap.
   - Regex penyensoran PII tidak dapat menebak nama orang bebas di dalam teks narasi tanpa label kunci (`namaLengkap` / `fullName`); tinjauan manusia tetap wajib sebelum `EvalCaseCandidate` berstatus `'pending_human_review'` dipromosikan ke eval set.
   - Pengaturan `planner_org_telemetry_settings` dan alur notifikasi `notify_reporters_on_resolve` memerlukan eksekusi migrasi Langkah 15 serta adapter notifikasi di fase integrasi operasional.
