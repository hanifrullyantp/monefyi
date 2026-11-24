# Laporan Gerbang Fase G10 — Satu Pintu Input, Runtime `prepare`/`commit` Tunggal, Gateway Saluran Pluggable, & Mesin Proaktif Beranggaran Gangguan

**Tanggal Terbit:** 2026-11-24  
**Program:** G7–G11 Keuangan Froyek (Urutan: `G8 → G7 → G9 → G10 → G11`)  
**Branch Penutup Gerbang:** `feat/g10-2-channel-adapters-wa-proactive-budget-sim` (melanjutkan `feat/g10-1-unified-agent-prepare-commit-18-actions`)  
**Status Fase G10:** `DONE` (seluruh modul domain `G10-1` & `G10-2`, simulasi 20 orang × 5 proyek × 7 hari, uji paritas 18 aksi, serta verifikasi lokal lulus; migrasi SQL lokal berstatus **`BLOCKED remote`**)

---

## 1. Ringkasan Implementasi Fase G10 (`G10-1` + `G10-2`)

### A. Satu Pintu Input & Runtime `prepare`/`commit` Tunggal (`G10-1`)
1. **Domain Gateway Terpadu (`packages/domain/src/unifiedAgentGateway.ts`):**
   - `UNIFIED_MANAGER_ACTIONS` & `UNIFIED_MANAGER_ACTION_TYPES`: memetakan seluruh **18 jenis aksi** Manager Agent (`record_cost`, `record_income`, `record_transfer`, `update_progress`, `add_worker_log`, `add_project`, `add_rap_item`, `add_work_item`, `update_project_status`, `review_bon`, `assign_todo`, `complete_todo`, `generate_payroll`, `add_employee`, `record_attendance`, `upsert_pricelist`, `create_estimation`, `convert_estimation`) ke peran terkait (`hrd`, `pm`, `finance`), tingkat risiko (`read`, `low_write`, `high_risk`), dan kebijakan persetujuan wajib manusia + SoD.
   - `routeSingleDoorInput`: menerima input multi-modalitas (`text`, `voice_transcript`, `photo_ocr`), menolak prompt injection, dan mengurai perintah majemuk lintas peran tanpa pengguna memilih modul.
   - `prepareUnifiedAction` & `commitUnifiedAction`: menegakkan `prepareToken` ber-TTL 10 menit (`invalid_or_expired_prepare_token`), `idempotencyKey` (`idempotency_key_mismatch`, `duplicate_commit_prevented`), isolasi lintas-tenant (`cross_tenant_forbidden`), SoD (`self_approval_forbidden`), persetujuan manusia (`approval_required`), kill switch, dan batas harian/kuota token.
2. **Integrasi `apps/web/src/services/managerAgentService.ts`:**
   - Menyelaraskan 18 `ActionType` ke `UNIFIED_MANAGER_ACTION_TYPES` dan menyalurkan eksekusi aksi melalui `prepareManagerAction` & `commitManagerAction` dengan payload terverifikasi dari hasil commit.

### B. Gateway Saluran Pluggable & Adaptor WhatsApp Non-Resmi (`G10-2`)
1. **Gateway Saluran (`packages/domain/src/channelGateway.ts`):**
   - Antarmuka `ChannelAdapter` (`channelType: 'telegram' | 'web_pwa' | 'whatsapp_unofficial' | 'whatsapp_official'`, `parseInbound`, `formatOutbound`, `supportsMedia`, `send` pluggable) memisahkan transportasi pesan dari logika agen sehingga perpindahan `whatsapp_unofficial` $\rightarrow$ `whatsapp_official` cukup menukar adaptor di registry.
   - `createTelegramAdapter` & `createWebPwaAdapter` berjalan 100% mandiri tanpa ketergantungan ke WhatsApp.
   - `createUnofficialWhatsAppAdapter`: melarang broadcast massal (`maxRecipientsPerSend === 1` $\rightarrow$ `mass_broadcast_forbidden`), bebas kredensial/sesi tertanam di kode, serta menyertakan `tosRiskDisclosure` (peringatan risiko ToS Meta/blokir nomor/sesi QR putus dan rekomendasi nomor pilot khusus; `D-G10-01` & `Q-06`).
   - `resolveChannelIdentity`: menautkan `(channelType, externalHandle)` ke `(orgId, memberId, role)` dengan isolasi lintas-tenant ketat (`cross_tenant_forbidden`).
   - `processInboundChannelMessage`: menegakkan deduplikasi `externalMessageId` (`duplicate_inbound_ignored`), batas laju `rateLimitPerMinute` (`rate_limited`), penyimpanan metadata media (`mediaAttachmentHash`, `mimeType`), deteksi prompt injection (`prompt_injection_rejected`), penanganan opt-out `"STOP"`/`"BERHENTI"` (`userOptedOut = true`), dan penerusan pesan sah ke `routeSingleDoorInput` + `prepareUnifiedAction` (**0 tulis data langsung tanpa `prepare`/`commit`**).

### C. Mesin Proaktif Anggaran Gangguan & Ringkasan Harian Pemilik 5 Baris (`G10-2`)
1. **Orkestrator Proaktif (`packages/domain/src/proactiveOrchestrator.ts`):**
   - Mendukung 7 pemicu lintas domain (`absensi_belum_masuk`, `progres_mandek`, `hari_kerja_melebihi_rap`, `tagihan_jatuh_tempo`, `stok_menipis`, `hari_gajian`, `todo_terlambat`) dan lintas saluran.
   - `runProactiveDispatchCycle`: menegakkan `maxQuestionsPerPersonPerDay` (default `3`), jam tenang `quietHours` (`20:00`–`07:00` lokal $\rightarrow$ `deferred_quiet_hours`), bundling pemicu slot sama menjadi 1 ringkasan terpadu, **0 pertanyaan ganda** (`already_answered_or_sent`), penghentian + eskalasi ke atasan (`mandor`/`pm`/`owner`) saat `ignoredStreak >= maxIgnoreCount` (default `2`), tebakan kuat (`"Di proyek <X> hari ini? Jawab: ya / bukan"`), opt-out per orang (`userOptedOut`), kill switch per org (`orgKillSwitch`), serta jejak `OutboundMessageLog` wajib.
   - `buildOwnerDailySummary5Lines`: menghasilkan tepat $\le 5$ baris ringkasan harian pemilik (Kas, Kehadiran, Progres, Keputusan, Risiko) secara deterministik dengan `provenance`.

### D. Migrasi SQL Lokal (`BLOCKED remote`)
- `my-supabase-project/supabase/migrations/20261124200000_g10_channel_gateway_proactive.sql`:
  - `planner_channel_identities` (`UNIQUE(channel_type, external_handle)`).
  - `planner_outbound_message_logs` (tabel append-only dengan trigger `planner_outbound_message_logs_no_mutation` `ERRCODE = '55000'`).
  - `planner_org_proactive_budgets` (`org_id UNIQUE`, `max_questions_per_person_per_day`, `quiet_start_hour`, `quiet_end_hour`, `kill_switch_enabled`).
  - RLS ketat `public.is_org_member(org_id, ...)` pada seluruh tabel baru tanpa menyentuh/memutasi tabel jurnal.
  - Terdokumentasi di [`DEPLOY-RUNBOOK.md`](../DEPLOY-RUNBOOK.md) Langkah 16.

---

## 2. Hasil Simulasi & Pengujian Gerbang G10

### A. Simulasi 20 Orang × 5 Proyek × 7 Hari (`g10ChannelsAndProactiveSim.test.ts` — 4/4 lulus)
| Invarian / Skenario Uji | Cakupan Simulasi | Hasil Aktual |
|---|---|---|
| **Anggaran Gangguan Harian (`maxQuestionsPerPersonPerDay <= 3`)** | 20 orang (14 tukang, 3 mandor, 2 PM, 1 pemilik), 5 proyek, 7 hari penuh (`2026-11-24`..`2026-11-30`) | **PASS** — untuk seluruh 20 orang di seluruh 7 hari, `messagesSentToPersonThatDay <= 3` tanpa pengecualian. |
| **0 Pertanyaan Ganda** | Pengiriman ulang `questionKey` yang sudah dijawab (`answeredQuestionKeys`) atau sudah ditanyakan hari itu (`sentQuestionKeys`) | **PASS** — 100% dilewati dengan `already_answered_or_sent` (`0` duplikat terkirim). |
| **Jam Tenang (`20:00`–`07:00`)** | Slot malam `21:30` WIB & subuh `05:30` WIB selama 7 hari (14 slot) | **PASS** — `0` pesan terkirim (`sentMessages = 0`, `escalations = 0`), seluruh pemicu ditunda ke `07:00` (`deferred_quiet_hours`). |
| **Opt-Out `"STOP"` & Kill Switch Org** | Tukang-3 mengirim `"STOP"` di hari ke-2; simulasi kill switch org di akhir periode | **PASS** — pesan ke Tukang-3 berhenti total pasca opt-out (`blocked_opt_out`); kill switch memblokir 100% pengiriman org (`blocked_org_kill_switch`). |
| **Stop Bila Diabaikan + Eskalasi** | Tukang-5 mengabaikan 2 ronde berturut-turut (`maxIgnoreCount = 2`) | **PASS** — pengiriman langsung dihentikan (`paused_after_ignored`) & 1 ringkasan dieskalasikan ke atasan (tunduk pada anggaran atasan). |
| **Prompt Injection & Lintas-Tenant** | Injeksi WA/TG & pesan dari nomor `org-B` masuk ke kebijakan `org-A` | **PASS** — ditolak (`prompt_injection_rejected`, `cross_tenant_forbidden`), `writeExecuted = false`. |
| **0 Tulis Tanpa `prepare`/`commit`** | Pesan masuk sah + media metadata di WA/TG/Web-PWA | **PASS** — hanya sampai `prepareUnifiedAction` (`status: 'prepared'`, `written: false`) hingga di-commit sah dengan SoD. |
| **Ringkasan Pemilik 5 Baris & Adaptor WA Non-Resmi** | Ringkasan harian 7 hari; broadcast >1 penerima di WA non-resmi; swap ke `whatsapp_official`; Telegram & Web/PWA tanpa WhatsApp | **PASS** — ringkasan selalu `<= 5` baris ber-provenance; broadcast ditolak `mass_broadcast_forbidden`; Telegram & Web/PWA berjalan penuh mandiri. |

### B. Paritas 18 Aksi & Satu Pintu (`g10UnifiedAgentParity.test.ts` — 9/9 lulus)
- Memverifikasi 100% paritas 18 aksi `managerAgentService.ts` dengan `UNIFIED_MANAGER_ACTIONS`, input 3 modalitas (`text`, `voice_transcript`, `photo_ocr`), SoD, idempotensi, batas harian, dan kill switch.

---

## 3. Bukti Output Verifikasi Lokal Aktual

| Perintah Verifikasi | Hasil | Detail Output Aktual |
|---|---|---|
| `npm run typecheck:web` | **PASS** | Exit code `0` (`tsc --noEmit` bersih tanpa error) |
| `npm run test:web` | **PASS** | `Test Files  109 passed (109)`, `Tests  786 passed (786)` dalam `42.08s` (termasuk `g10ChannelsAndProactiveSim.test.ts` 4/4 & `g10UnifiedAgentParity.test.ts` 9/9) |
| `npm run gate:docs` | **PASS** | Terverifikasi pembaruan `docs/finance/CHANGELOG.md` beserta file domain/tes keuangan |
| `npm run gate:rebrand` | **PASS** | `Files scanned: 1211`, `Allowlisted legacy occurrences: 1597`, `Unapproved violations: 0` |

---

## 4. Catatan Kejujuran & Sisa Risiko Menuju Fase G11 / Produksi

1. **Sifat Pengujian:**
   Gateway saluran, adaptor Telegram/Web-PWA/WhatsApp, dan orkestrator proaktif diuji secara deterministik in-memory dengan data sintetis (20 orang × 5 proyek × 7 hari), tanpa koneksi ke API Telegram/WhatsApp eksternal maupun database Supabase remote.
2. **Keputusan Terbuka Pemilik (`Q-06`):**
   Sebelum produksi memakai adaptor `whatsapp_unofficial` untuk pilot, pemilik perlu menyetujui risiko ToS/pemblokiran nomor dengan nomor pilot terdedikasi atau langsung mengaktifkan WhatsApp Business API resmi (`whatsapp_official`).
3. **Migrasi SQL Lokal (`BLOCKED remote`):**
   Migrasi `20261124200000_g10_channel_gateway_proactive.sql` (bersama migrasi `F0`–`G8` & `G7`) belum dijalankan ke remote Supabase produksi dan siap dieksekusi manual sesuai [`DEPLOY-RUNBOOK.md`](../DEPLOY-RUNBOOK.md).
