# CHANGELOG — Keuangan Froyek

Setiap PR yang menyentuh `apps/web/src/services/finance*`, `apps/web/src/services/incomeService.ts`, `apps/web/src/services/costService.ts`, `apps/web/src/lib/financeV2*`, `packages/domain/`, `agent-core/`, atau migrasi keuangan **WAJIB** menambah satu entri di file ini pada PR yang sama.

---

## [DEPLOY-GATE-3-FIX] 2026-11-25 — Resolusi Benturan Nama Tabel Migrasi #16 (`planner_channel_gateway_identities`)
- **Branch / PR:** `fix/deploy-gate3-g10-channel-table-name`
- **Fase:** Gerbang 3 Migrasi SQL
- **Perubahan & Alasan:**
  - Migrasi lama Fase 9 (`20261105090000_planner_phase9_channel.sql`) sudah lebih dulu membuat tabel `planner_channel_identities` (Telegram) sehingga migrasi #16 (`20261124200000_g10_channel_gateway_proactive.sql`) gagal pada indeks `member_id` dan di-rollback otomatis oleh `--single-transaction`.
  - Mengganti nama tabel baru G10-2 pada migrasi #16 menjadi `planner_channel_gateway_identities` beserta indeks, policy RLS, allowlist `config/rebrand-allowlist.txt`, tes struktural `g10ChannelsAndProactiveSim.test.ts`, dan `G10-report.md` tanpa menyentuh tabel Telegram Fase 9.
- **Akun / Template Jurnal Tersentuh:** Tidak ada.
- **Migrasi SQL:** Memperbarui `my-supabase-project/supabase/migrations/20261124200000_g10_channel_gateway_proactive.sql` (`BLOCKED remote` hingga dikonfirmasi ulang oleh pemilik).
- **Tes Ditambah / Diperbarui:** `apps/web/src/lib/financeV2/__tests__/g10ChannelsAndProactiveSim.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada.
- **Cara Rollback:** `git revert` commit PR ini.

## [DEPLOY-GATE-1] 2026-11-25 — Feature Flag Produksi Default-OFF untuk 6 Fitur Uang & Otonomi L2+
- **Branch / PR:** `feat/deploy-gate1-money-feature-flags`
- **Fase:** Gerbang 1 Pra-Deploy Produksi
- **Perubahan & Alasan:**
  - Menambahkan modul deterministik `packages/domain/src/productionFeatureFlags.ts` dan adapter Vite `apps/web/src/lib/productionFeatureFlags.ts` untuk 6 flag produksi yang **WAJIB ber-default `false` (MATI)** pada deploy produksi pertama:
    - `money_payroll` (`VITE_ENABLE_MONEY_PAYROLL=false`)
    - `money_disbursement` (`VITE_ENABLE_MONEY_DISBURSEMENT=false`)
    - `money_dividend` (`VITE_ENABLE_MONEY_DIVIDEND=false`)
    - `money_bon` (`VITE_ENABLE_MONEY_BON=false`)
    - `channel_whatsapp` (`VITE_ENABLE_CHANNEL_WHATSAPP=false`)
    - `agent_autonomy_l2_plus` (`VITE_ENABLE_AGENT_AUTONOMY_L2_PLUS=false`)
  - Memasang guard `isMoneyFeatureEnabled` pada `AiHrdPayrollModal.tsx` agar fitur penggajian/pencairan tidak dapat dijalankan saat flag nonaktif.
  - Mendokumentasikan seluruh 6 flag dengan nilai `false` di `apps/web/.env.example`.
- **Akun / Template Jurnal Tersentuh:** Tidak ada.
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/productionMoneyFeatureFlags.test.ts` (4/4 kasus uji memverifikasi default `false` di produksi, `MoneyFeatureDisabledError`, aktivasi selektif, dan paritas `.env.example`).
- **Dampak ke Tool Agent:** Mengunci otonomi L2+ dan saluran WhatsApp tetap nonaktif secara default pada deploy produksi pertama.
- **Cara Rollback:** `git revert` commit PR ini.

## [G11] 2026-11-24 — UX yang Meringankan (Tinjauan GM), Pre-Fill Proyek Terjadwal Tukang, Antrean Offline Idempoten, & Penutupan Program G7–G11
- **Branch / PR:** `feat/g11-ux-lightening-gm-review`
- **Fase:** G11 (UX yang Meringankan & Penutupan Program `G7`–`G11`)
- **Perubahan & Alasan:**
  - **Model UX & Pengukur Beban Deterministik (`packages/domain/src/uxLightening.ts`):**
    - `assertNoAccountingJargon`: menolak 14 istilah akuntansi teknis (`debit`, `kredit`, `jurnal`, `hpp`, `liabilitas`, `ekuitas`, `akrual`, `aktiva`, `pasiva`, `neraca`, `buku besar`, `posting`, `coa`, `rekonsiliasi`) dari seluruh teks layar tukang, mandor, dan keputusan pagi PM/pemilik.
    - `selectInitialWorkerProjectId` & `buildWorkerTodayView`: memakai `resolveAttendanceProjectFromSchedule` (`hrdPayroll.ts`) untuk pre-fill proyek otomatis dari jadwal PM / penugasan hari ini (tidak pernah menebak proyek aktif pertama bila belum ditugaskan), menegakkan `tapsToCheckIn <= 2`, `requiresNumericTyping: false`, target sentuh `minTouchTargetPx >= 44`, dan transparansi upah integer rupiah (`hari × tarif − potongan kasbon = terima bersih` + `Sisa kasbon`) dalam Bahasa Indonesia sehari-hari.
    - `createOfflineActionQueue`, `enqueueOfflineAction`, & `flushOfflineActionQueue`: antrean sinyal lemah untuk check-in/check-out/foto progres dengan `idempotencyKey`, tetap aman berstatus `'queued'` saat offline, otomatis terkirim dalam urutan kronologis menjadi `'synced'` saat sinyal pulih, dan 0 pengiriman ganda.
    - `buildMandorTeamTodayView`: satu tampilan terpadu siapa hadir / belum hadir, persetujuan hari kerja, tombol tambah orang ke proyek, dan satu tombol lapor progres + foto dengan redaksi gaji/tarif/kasbon pekerja lain melalui `filterHrdRecordsByRole` (G8).
    - `buildMorningDecisionsView`: menyaring lintas-tenant dan mengurutkan hanya hal yang butuh keputusan manusia (maksimal `5` item) dengan tombol 1-ketukan `Setujui` / `Tolak` + alasan ringkas, serta merangkum hal rutin agen ke `handledByAgentCount`.
    - `measureUxBurdenReduction` & `evaluateG11UxChecklist`: membandingkan cara lama vs Froyek G11 pada 4 tugas lapangan utama dan memverifikasi otomatis seluruh 9 butir standar gerbang UX G11.
  - **Perbaikan Pre-Fill Proyek & Target Sentuh di UI Tukang (`apps/web/src/pages/WorkerDashboard.tsx`, `apps/web/src/components/worker/WorkerWorkTimer.tsx`):**
    - Menghubungkan `WorkerDashboard.tsx` ke `selectInitialWorkerProjectId` agar memilih proyek dari penugasan/work item pekerja hari ini terlebih dahulu dan menampilkan pilihan eksplisit `"-- Pilih Proyek Hari Ini --"` tanpa fallback diam-diam ke proyek aktif pertama bila pekerja tidak ditugaskan.
    - Menegakkan `min-h-11` (`>= 44px`) pada tombol utama dan kontrol pilih proyek di `WorkerDashboard.tsx` maupun tombol Check-In/Check-Out di `WorkerWorkTimer.tsx`.
  - **Protokol Uji Kegunaan Nyata & Dokumentasi Penutup:**
    - Menerbitkan [`docs/finance/G11-USABILITY-TEST-PROTOCOL.md`](./G11-USABILITY-TEST-PROTOCOL.md) untuk uji lapangan 3–5 tukang/mandor sebelum rilis dengan integrasi pelaporan ke sistem umpan balik G7 (`ui_confused` / `user_bug_report`).
    - Menerbitkan [`docs/finance/PHASES/G11-report.md`](./PHASES/G11-report.md), memperbarui [`docs/finance/FINAL-REPORT.md`](./FINAL-REPORT.md) (ringkasan Program F0–F4, G0–G6, G7–G11, status 16 migrasi SQL `BLOCKED remote`, & daftar tindakan pemilik), dan menandai seluruh Program **F0–F4, G0–G6, G7–G11** `DONE` / `COMPLETED` di [`docs/finance/PROGRESS.md`](./PROGRESS.md).
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template baru; seluruh perhitungan rincian upah menggunakan `toRupiah` dan `computeKasbonSettlement`.
- **Migrasi SQL:** Tidak ada migrasi SQL baru pada G11 (total 16 migrasi lokal F0–G10 tetap berstatus `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/g11UxLighteningAndGate.test.ts` (7/7 kasus uji lulus).
- **Dampak ke Tool Agent:** Melengkapi lapisan UX lapangan ringan di atas runtime satu pintu G10 dan HRD/PM G8–G9 tanpa mengubah jalur posting akuntansi.
- **Cara Rollback:** `git revert` commit PR ini.

## [G10-2] 2026-11-24 — Gateway Saluran Pluggable (`telegram`, `web_pwa`, `whatsapp`), Mesin Proaktif Beranggaran Gangguan, Ringkasan Pemilik 5 Baris, & Simulasi 20 Orang × 5 Proyek × 7 Hari
- **Branch / PR:** `feat/g10-2-channel-adapters-wa-proactive-budget-sim`
- **Fase:** G10 (`G10-2` — Gateway Saluran, Adaptor WA Non-Resmi, Orkestrator Proaktif, & Penutupan Gerbang G10)
- **Perubahan & Alasan:**
  - **Gateway Saluran & Adaptor Pluggable (`packages/domain/src/channelGateway.ts`):**
    - Mendefinisikan antarmuka `ChannelAdapter` (`channelType: 'telegram' | 'web_pwa' | 'whatsapp_unofficial' | 'whatsapp_official'`, `parseInbound`, `formatOutbound`, `supportsMedia`, `send` pluggable) beserta implementasi `createTelegramAdapter`, `createWebPwaAdapter`, `createUnofficialWhatsAppAdapter`, dan `createOfficialWhatsAppAdapter` sehingga perpindahan ke WhatsApp Business API resmi tidak menyentuh logika agen sama sekali, dan Telegram/Web-PWA tetap 100% mandiri tanpa WhatsApp.
    - `createUnofficialWhatsAppAdapter`: melarang keras broadcast massal (`maxRecipientsPerSend === 1` → tolak `mass_broadcast_forbidden`), bebas kredensial/sesi di kode, serta menyertakan `tosRiskDisclosure` (risiko ToS/blokir nomor & rekomendasi nomor pilot khusus).
    - `resolveChannelIdentity`: menautkan `(channelType, externalHandle)` ke `(orgId, memberId, role)` dengan isolasi lintas-tenant ketat (`cross_tenant_forbidden`).
    - `processInboundChannelMessage`: menegakkan deduplikasi `externalMessageId` (`duplicate_inbound_ignored`), batas laju `rateLimitPerMinute` (`rate_limited`), penyimpanan metadata media (`mediaAttachmentHash`, `mimeType`), deteksi prompt injection (`prompt_injection_rejected`), penanganan opt-out `"STOP"`/`"BERHENTI"` (`userOptedOut = true`), dan penerusan pesan sah ke `routeSingleDoorInput` + `prepareUnifiedAction` (**0 tulis data langsung tanpa `prepare`/`commit`**).
  - **Mesin Proaktif & Anggaran Gangguan (`packages/domain/src/proactiveOrchestrator.ts`):**
    - Mendukung seluruh 7 pemicu lintas domain (`absensi_belum_masuk`, `progres_mandek`, `hari_kerja_melebihi_rap`, `tagihan_jatuh_tempo`, `stok_menipis`, `hari_gajian`, `todo_terlambat`) dan lintas saluran.
    - `runProactiveDispatchCycle`: menegakkan `maxQuestionsPerPersonPerDay` (default `3`), jam tenang `quietHours` (`20:00`–`07:00` lokal → `deferred_quiet_hours`), bundling pemicu slot sama menjadi 1 ringkasan terpadu, **0 pertanyaan ganda** (`already_answered_or_sent`), penghentian + eskalasi ke atasan saat diabaikan (`ignoredStreak >= maxIgnoreCount`, default `2`), format tebakan kuat (`"Di proyek <X> hari ini? Jawab: ya / bukan"`), `userOptedOut` & `orgKillSwitch`, serta pencatatan wajib `OutboundMessageLog`.
    - `buildOwnerDailySummary5Lines`: menghasilkan tepat `<= 5` baris ringkasan harian pemilik (Kas, Kehadiran, Progres, Keputusan, Risiko) secara deterministik dan ber-provenance.
  - **Migrasi SQL Lokal (`my-supabase-project/supabase/migrations/20261124200000_g10_channel_gateway_proactive.sql`, status `BLOCKED remote`):**
    - Menambah tabel `planner_channel_identities`, tabel append-only `planner_outbound_message_logs`, dan `planner_org_proactive_budgets` ber-RLS ketat `is_org_member` tanpa memutasi tabel jurnal.
  - **Tes Gerbang & Simulasi G10 (`apps/web/src/lib/financeV2/__tests__/g10ChannelsAndProactiveSim.test.ts`):**
    - Simulasi penuh **20 orang** (14 tukang, 3 mandor, 2 PM, 1 pemilik), **5 proyek**, **7 hari** memverifikasi seluruh invarian anggaran gangguan, opt-out, kill switch, eskalasi, prompt injection, isolasi lintas-tenant, 0 tulis tanpa `prepare`/`commit`, ringkasan 5 baris, larangan broadcast massal WA non-resmi, kemandirian Telegram/Web-PWA, serta uji struktural SQL.
  - **Dokumentasi:** Menambah `D-G10-01` di `docs/finance/DECISIONS.md`, `Q-06` di `docs/finance/OPEN-QUESTIONS.md`, Langkah 16 di `docs/finance/DEPLOY-RUNBOOK.md`, memperbarui `docs/finance/PROGRESS.md` (Fase **G10 `DONE`**, siapkan **G11**), dan menerbitkan `docs/finance/PHASES/G10-report.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template baru; seluruh aksi masuk melalui gerbang `prepare`/`commit` runtime tunggal (`unifiedAgentGateway.ts`).
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124200000_g10_channel_gateway_proactive.sql` (`BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/g10ChannelsAndProactiveSim.test.ts`.
- **Dampak ke Tool Agent:** Melengkapi lapisan saluran masuk/keluar pluggable dan orkestrator proaktif beranggaran gangguan di depan runtime satu pintu G10-1.
- **Cara Rollback:** `git revert` commit PR ini (serta abaikan/batalkan migrasi `20261124200000` jika belum dijalankan di DB).

## [G10-1] 2026-11-24 — Satu Pintu Input (HRD + PM + Keuangan) & Penyatuan 18 Aksi `managerAgentService` ke Runtime `prepare`/`commit` Tunggal
- **Branch / PR:** `feat/g10-1-unified-agent-prepare-commit-18-actions`
- **Fase:** G10 (`G10-1` — Satu Pintu Input & Runtime `prepare`/`commit` Tunggal)
- **Perubahan & Alasan:**
  - **Domain Satu Pintu & Runtime Tunggal (`packages/domain/src/unifiedAgentGateway.ts`):**
    - `UNIFIED_MANAGER_ACTIONS` & `UNIFIED_MANAGER_ACTION_TYPES`: memetakan seluruh 18 aksi dari `managerAgentService.ts` ke peran terkait (`'hrd' | 'pm' | 'finance'`), tingkat risiko (`'read' | 'low_write' | 'high_risk'`), peran minimum, dan kebijakan persetujuan wajib manusia + SoD (aksi berisiko tinggi seperti `generate_payroll`, `review_bon`, `add_project`, `convert_estimation`, `record_transfer`, `update_project_status`, `add_employee`, serta `record_cost`/`record_income` di atas ambang selalu mewajibkan approval + SoD).
    - `routeSingleDoorInput`: menerima input multi-modalitas (`'text' | 'voice_transcript' | 'photo_ocr'`), menolak prompt injection (`detectPromptInjection` → `prompt_injection_detected`), mendeteksi peran terpicu (`hrd`, `pm`, `finance`) secara deterministik tanpa pengguna memilih modul, dan menghasilkan kandidat `PreparedActionRequest`.
    - `prepareUnifiedAction`: menegakkan isolasi `orgId`, kill switch, kuota token/biaya, batas nominal harian, dan deteksi prompt injection; menerbitkan `prepareToken` deterministik ber-TTL 10 menit, `idempotencyKey`, `requiresApproval`, dan `auditDraft` tanpa pernah menulis/memposting data.
    - `commitUnifiedAction`: menolak keras commit tanpa `prepareToken` sah & belum kedaluwarsa (`invalid_or_expired_prepare_token`), menolak override `idempotencyKey` (`idempotency_key_mismatch`), menegakkan isolasi lintas tenant (`cross_tenant_forbidden`), SoD (`self_approval_forbidden`), persetujuan manusia (`approval_required`), kill switch (`kill_switch_active`), dan idempotensi (`duplicate_commit_prevented` mengembalikan hasil sebelumnya dengan 0 eksekusi ganda), serta menerbitkan `auditRecord` lengkap.
  - **Integrasi ke `apps/web/src/services/managerAgentService.ts`:**
    - Menyelaraskan `ActionType` dengan `UNIFIED_MANAGER_ACTION_TYPES` (18 aksi), menambah gerbang `routeManagerSingleDoorInput`, `prepareManagerAction`, dan `commitManagerAction` (mengeksekusi payload terverifikasi dari `commitRes` sehingga tampering pasca-prepare ditolak/diabaikan, serta menghitung `baseCost` & `contract_value` pada `actionAmount`), dan menyalurkan `executeAgentAction` melalui gerbang `prepare`/`commit` + audit trail sambil menjaga kompatibilitas tipe pemanggil UI.
    - Menambahkan penjaga prompt injection pada `localSmartManagerTurn` dan `runManagerTurn`.
  - **Tes Paritas 18 Aksi & Satu Pintu (`apps/web/src/lib/financeV2/__tests__/g10UnifiedAgentParity.test.ts`):**
    - Verifikasi otomatis paritas 100% seluruh 18 aksi `managerAgentService.ts` di `UNIFIED_MANAGER_ACTIONS`, uji satu pintu 3 modalitas (`text`, `voice_transcript`, `photo_ocr`) memicu `hrd` + `pm` + `finance` sekaligus, uji penolakan tanpa `prepareToken` valid, token kedaluwarsa, prompt injection, self-approval SoD, lintas-tenant, kill switch aktif, batas harian/kuota, dan commit ganda (`idempotencyKey` sama → 0 eksekusi ganda).
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template baru; gerbang runtime tunggal membungkus eksekusi aksi Manager Agent sebelum memanggil layanan/intent keuangan maupun operasional.
- **Migrasi SQL:** Tidak ada migrasi SQL baru pada `G10-1`.
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/g10UnifiedAgentParity.test.ts`.
- **Dampak ke Tool Agent:** Menyatukan seluruh 18 aksi GM/Manajer di bawah satu pintu input dan satu runtime `prepare`/`commit` yang diaudit dan dilindungi SoD/idempotensi/kill-switch.
- **Cara Rollback:** `git revert` commit PR ini.

## [G9] 2026-11-24 — Agen Project Manager Deterministik, Guard Bukti Foto 100% UI Karyawan, Laporan Klien Terredaksi, & Simulasi Proyek 30 Hari End-to-End
- **Branch / PR:** `feat/g9-project-manager-agent-30d-sim`
- **Fase:** G9 (Agen Project Manager & Rekonsiliasi Lapangan–HRD–Keuangan)
- **Perubahan & Alasan:**
  - **Domain Deterministik Agen Project Manager (`packages/domain/src/projectManagerAgent.ts`):**
    - `deriveDailyPlanFromSchedule`: menurunkan `dailyAssignments` (`DailyAssignmentPlan` selaras `DailyAssignmentSchedule` di `hrdPayroll.ts`) dan `plannedProgressPct` / `actualProgressPct` tertimbang per tanggal dari jadwal Gantt `workItems`.
    - `evaluateProgressUpdateRequest`: menolak `requestedProgressPct >= 100` dari pekerja tanpa `photoAttachmentHash`/`photoUrl` valid atau persetujuan SoD supervisor (`mandor` / `pm` / `owner` dengan `approvedBy !== actorId`) dengan `ok: false`, `status: 'rejected_requires_proof'`, `reason: 'photo_or_supervisor_approval_required'`; unggahan foto oleh pekerja tanpa supervisor masuk `pending_supervisor_verification`.
    - `evaluateLaborProductivityAndEac`: menghitung `eacLaborCostRupiah` (`actualLaborCost / (actualProgressPct / 100)` saat `>= 10%`), `laborVarianceAtCompletionRupiah`, serta peringatan `'labor_overrun'` (`eac > rap * 1.1`) dan `'progress_stalled'` (`daysWithoutProgress >= 3` saat ada pekerja aktif).
    - `evaluateMaterialAndPurchaseDrafts`: mendeteksi `stock_low` saat `currentStockQty < neededQty` atau `<= minStockThreshold` dan menyusun `purchase_request_draft` berstatus wajib `'pending_human_approval'` (`autoOrderAllowed: false`) dalam integer rupiah.
    - `buildDailyProjectReport`: menyusun laporan harian proyek mode `'owner'` (menyertakan biaya upah/tarif/EAC/kasbon/margin internal) vs mode `'client'` (hanya aktif saat `clientReportEnabled === true` dan menyaring seluruh data internal `laborCost`, `dailyRate`, `margin`, `eac`, `kasbon`).
    - `evaluateDelayAndTerminImpact`: menghitung `scheduleSlipDays`, `projectedCompletionDate`, menandai `'termin_blocked_by_progress_delay'`, menghitung `estimatedCashInDelayDays` dan `blockedTerminAmountRupiah`, serta menghasilkan `advisorWhatIfScenario` siap-eksekusi untuk `runAdvisorWhatIf`.
    - `createTodoFromIssue` & `closeTodoWithProof`: membuat todo otomatis dari kendala/kekurangan stok ke PIC tahap dan menolak penutupan tanpa `proofAttachmentHash` atau konfirmasi mandor/PM (`reason: 'closure_proof_required'`).
  - **Perbaikan Guard UI Karyawan (`apps/web/src/lib/workerProgressGuard.ts`, `apps/web/src/pages/WorkerDashboard.tsx`):**
    - Menambatkan `validateWorkerProgressUpdate` (memanggil `evaluateProgressUpdateRequest`) ke tombol `+25%`, `Selesai 100%`, dan slider progres di `WorkerDashboard.tsx`, serta menambahkan panel lampiran bukti foto wajib yang menahan pengajuan pekerja pada status verifikasi mandor/PM tanpa langsung menandai `'completed'` 100%.
  - **Tes Gerbang G9 & Simulasi 30 Hari (`apps/web/src/lib/financeV2/__tests__/g9ProjectManager30DaySim.test.ts`):**
    - Simulasi penuh 30 hari proyek terpadu (3 tahap Gantt, 3 tukang + 1 mandor + 1 PM) memverifikasi paritas 3 arah **total upah HRD 30 hari (`Rp 13.200.000`) === total debit `hpp_labor` Buku Besar === `actualLaborCostRupiah` PM EAC**, pengakuan DP bertahap (`computeRecognizableRevenue`), dampak keterlambatan termin ke `runAdvisorWhatIf`, guard foto 100% domain & UI, draf PO `pending_human_approval`, todo berbukti, dan laporan klien bebas kebocoran data internal.
  - **Dokumentasi:** Menambah `D-G9-01` di `docs/finance/DECISIONS.md`, menerbitkan `docs/finance/PHASES/G9-report.md`, dan memperbarui `docs/finance/PROGRESS.md` & `docs/finance/CHANGELOG.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template baru; mengintegrasikan verifikasi buku besar dengan `hpp_labor`, `hutang_gaji`, `project_labor_accrual`, dan `dp_revenue_recognition`.
- **Migrasi SQL:** Tidak ada migrasi SQL baru pada fase G9.
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/g9ProjectManager30DaySim.test.ts`.
- **Dampak ke Tool Agent:** Menyediakan domain deterministik untuk penjadwalan harian PM, guard progres 100%, EAC upah, draf PO `pending_human_approval`, pelaporan owner/klien, todo berbukti, dan koordinasi keterlambatan termin ke `runAdvisorWhatIf`.
- **Cara Rollback:** `git revert` commit PR ini.

## [G7] 2026-11-24 — Sistem Umpan Balik Terpadu, Observabilitas Lintas Aplikasi, Anonimisasi PII, Penggabungan Laporan Otomatis, Dasbor Mutu, & Laporan Gerbang `G7-report.md`
- **Branch / PR:** `feat/g7-unified-feedback-observability`
- **Fase:** G7 (Sistem Umpan Balik Terpadu & Observabilitas Lintas Aplikasi)
- **Perubahan & Alasan:**
  - **Domain Umpan Balik & Observabilitas (`packages/domain/src/feedbackObservability.ts`):**
    - Mendefinisikan tipe terpadu `FeedbackModule` (`'keuangan' | 'proyek' | 'sdm' | 'ui' | 'agent'`), `FeedbackSeverity` (`'kritis' | 'sedang' | 'ringan'`), dan **seluruh 8 kategori sinyal** `FeedbackSignalCategory` (`user_bug_report`, `agent_rating`, `ui_confused`, `runtime_error`, `behavior_friction`, `silent_correction`, `data_invariant_failure`, `agent_unanswered_or_tool_fail`).
    - `anonymizeFeedbackPayload(payload)` & `anonymizeString`: menyapu & menyensor secara rekursif seluruh email (`[REDACTED_EMAIL]`), nomor HP Indonesia `+62`/`08...` (`[REDACTED_PHONE]`), NIK 16 digit (`[REDACTED_NIK]`), nomor rekening bank (`[REDACTED_BANK_ACCOUNT]`), token/kredensial (`Bearer ...`, `eyJ...`, `sk-...`, `sb_...`, `apikey`, `password`, `secret` -> `[REDACTED_SECRET]`), serta nilai pada kunci sensitif (`email`, `phone`, `bankAccount`, `token`, `password`, `apiKey`, `authorization`, `cookie`, dll.) sebelum masuk antrean.
    - `ingestFeedbackSignal(signal, orgConsent)`: menolak sinyal `behavior_friction` dengan alasan `'behavior_telemetry_opted_out'` saat `orgConsent.behaviorTelemetryOptOut === true`, selalu menjalankan `anonymizeFeedbackPayload`, men-hash `reporterId`, dan mengunci `autoModifyCodeOrPromptAllowed: false`.
    - `aggregateFeedbackQueue(events)`: menggabungkan laporan serupa secara deterministik menggunakan `fingerprint` (`module + category + normalizedErrorOrScreenKey`) menjadi 1 isu terpadu dengan `reporterCount` unik dan `priorityScore = baseSeverityWeight + Math.min(50, reporterCount * 5)`.
    - `buildEvalCandidateFromFailedAgent(input)`: menghasilkan `EvalCaseCandidate` teranonimisasi dengan status **wajib `'pending_human_review'`** (`requiresHumanReview: true`, `autoAddedToEvalSet: false`, `autoModifyCodeOrPromptAllowed: false`).
    - `computeQualityDashboard(metrics, policy)`: menghitung akurasi per modul & per intent, tren salah-posting, peringatan penurunan akurasi, serta sinyal rekomendasi penurunan otonomi `L2 -> L1` (`autonomyDemotionRecommended: true`, `recommendedAutonomyTransition: 'L2 -> L1'`) saat melampaui ambang kesalahan kritis atau penurunan akurasi.
  - **Migrasi SQL Lokal (`my-supabase-project/supabase/migrations/20261124193000_g7_unified_feedback_events.sql`, `BLOCKED remote`):**
    - Membuat tabel `planner_feedback_events` (beserta indeks `(org_id, fingerprint)` dan `(status, priority_score DESC)`) dan `planner_org_telemetry_settings` (`org_id UNIQUE`, `behavior_telemetry_opt_out boolean DEFAULT false`, `updated_by`, `updated_at`) dengan RLS ketat `is_org_member(org_id, ...)` tanpa menyentuh maupun memutasi tabel jurnal.
  - **Layanan Klien Pelacak Error & Umpan Balik (`apps/web/src/services/feedbackObservabilityService.ts`):**
    - Menyediakan `reportUserFeedback`, `reportRuntimeError` (pengganti `console.error` diam-diam), `reportBehaviorFriction` (mematuhi opt-out), `reportSilentCorrection`, `reportDataInvariantFailure`, dan `reportAgentUnansweredOrToolFail`.
  - **Tes Gerbang G7 & Dokumentasi (`apps/web/src/lib/financeV2/__tests__/g7FeedbackObservability.test.ts`, `docs/finance/DECISIONS.md` `D-G7-01`, `docs/finance/DEPLOY-RUNBOOK.md` Langkah 15, `docs/finance/PROGRESS.md`, `docs/finance/PHASES/G7-report.md`):**
    - Memverifikasi penggabungan 20 laporan serupa menjadi 1 issue, 0 kebocoran PII/kredensial, seluruh 8 kategori sinyal end-to-end, opt-out perilaku, `autoModifyCodeOrPromptAllowed: false`, status eval `'pending_human_review'`, penurunan `L2 -> L1` dasbor mutu, dan struktur SQL migrasi G7.
- **Akun / Template Jurnal Tersentuh:** Tidak ada; sistem observabilitas dan umpan balik tidak memutasi tabel jurnal maupun menambah akun/template.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124193000_g7_unified_feedback_events.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/g7FeedbackObservability.test.ts`.
- **Dampak ke Tool Agent:** Tidak mengubah kontrak tool agent; menambahkan sinyal observabilitas jawaban/tool agent gagal dan kandidat eval berstatus `'pending_human_review'` tanpa pernah memodifikasi kode atau prompt secara otomatis.
- **Cara Rollback:** `git revert` commit PR ini.

## [G8-3] 2026-11-24 — Anti-Kecurangan Kehadiran, Hak Akses (RBAC) 4 Peran HRD, Uji Gerbang Penuh G8, & Laporan Gerbang `G8-report.md`
- **Branch / PR:** `feat/g8-3-antifraud-rbac-g8-report`
- **Fase:** G8 (Hardening HRD, Payroll Jujur, & Kebenaran Buku Besar Gaji — G8-3 & Gerbang G8)
- **Perubahan & Alasan:**
  - **Domain Anti-Kecurangan Kehadiran & RBAC HRD (`packages/domain/src/hrdGovernance.ts`):**
    - `evaluateAttendanceFraudSignals(record, context)`: mendeteksi 4 pola kecurangan secara deterministik:
      1. `buddy_punch_suspected` (`deviceId` sama dipakai `>= 2` pekerja berbeda dalam jendela `<= 15` menit tanpa otorisasi `isSharedMandorDevice` yang disahkan);
      2. `impossible_location_jump` (jarak Haversine antar check-in pekerja yang sama menghasilkan kecepatan `> 120 km/jam` atau di luar `radiusMeters` geofence proyek);
      3. `abnormal_work_hours` (check-in rentang `00:00–04:30` tanpa izin shift malam, durasi kerja `> 16` jam dalam 1 hari, atau `checkOut <= checkIn`);
      4. `reused_photo_hash` (`photoSha256` identik sudah pernah dipakai pada catatan kehadiran sebelumnya).
    - **Aturan keras tanpa penolakan diam-diam:** setiap catatan yang memicu flag tetap diterima (`silentlyRejected: false`, `acceptedForReview: true`) dengan `verificationStatus: 'flagged_for_review'`, daftar `flags`, `reasons`, dan `requiresMandorOrOwnerReview: true`. Catatan bersih bertanda `verificationStatus: 'verified'` dengan `0` flag.
    - `filterHrdRecordsByRole(viewer, records)`: menegakkan RBAC 4 peran eksplisit (`worker`, `mandor`, `pm`, `owner` | `finance`) + isolasi ketat lintas `orgId`:
      - `worker`: hanya melihat baris miliknya sendiri (`workerId === viewer.userId`) lengkap dengan tarif, upah, dan kasbon sendiri.
      - `mandor`: melihat dirinya sendiri (lengkap) + anggota timnya (`teamWorkerIds`), dengan redaksi wajib (`null`) pada `dailyRate`, `grossSalary`, `netSalary`, dan `kasbonBalance` milik orang lain.
      - `pm`: melihat hari kerja (`dayFraction`, `regularHours`, `overtimeHours`, `projectId`) seluruh pekerja pada proyeknya (`projectIds`), dengan seluruh field tarif & nominal gaji/kasbon wajib di-redact (`null`).
      - `owner` | `finance`: melihat seluruh data & nominal lengkap dalam organisasinya sambil tetap menolak baris lintas `orgId`.
  - **Uji Gerbang Penuh G8 (`apps/web/src/lib/financeV2/__tests__/g8AntiFraudRbacAndGate.test.ts`):**
    - Menguji seluruh 4 sinyal anti-kecurangan (termasuk pengecualian perangkat mandor sah, shift malam berizin, dan multi-flag), RBAC 4 peran + isolasi lintas `orgId`, serta uji integrasi ujung-ke-ujung G8-1 + G8-2 + G8-3 (paritas total upah proyek === total debit `hpp_labor`, pembagian hari ke 2 proyek `0.5 + 0.5`, kasbon bersaldo, tarif kosong `missing_rate`, dan larangan status `"lunas"` tanpa konfirmasi nyata).
  - **Laporan Gerbang & Papan Kerja (`docs/finance/PHASES/G8-report.md`, `docs/finance/PROGRESS.md`, `docs/finance/CHANGELOG.md`):**
    - Menerbitkan laporan gerbang `G8-report.md`, menandai Fase **G8** seluruhnya `DONE`, dan menyiapkan Fase **G7** sebagai fase berikutnya sesuai urutan `G8 → G7 → G9 → G10 → G11`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template baru; menguji integrasi penuh dengan `hpp_labor`, `hutang_gaji`, `project_labor_accrual`, dan `payroll_liability_settlement`.
- **Migrasi SQL:** Tidak ada migrasi SQL baru pada `G8-3` (migrasi G8 tetap `20261124190000_g8_hrd_project_labor_accrual.sql` berstatus `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/g8AntiFraudRbacAndGate.test.ts`.
- **Dampak ke Tool Agent:** Tidak mengubah kontrak tool agent; menyediakan fungsi domain deterministik untuk pemeriksaan anti-kecurangan kehadiran dan penyaringan RBAC HRD.
- **Cara Rollback:** `git revert` commit PR ini.

## [G8-2] 2026-11-24 — Model Kehadiran `day_fraction`, Tarif Beriwayat `effectiveFrom`, Akrual Harian Upah Proyek (`Dr hpp_labor / Cr hutang_gaji`), Gaji Kantor Opex, BPJS/PPh 21 Konfigurabel, & Kasbon Bersaldo
- **Branch / PR:** `feat/g8-2-project-labor-accrual-day-fraction-kasbon`
- **Fase:** G8 (Hardening HRD, Payroll Jujur, & Kebenaran Buku Besar Gaji — G8-2)
- **Perubahan & Alasan:**
  - **Template Jurnal & COA (`packages/domain/src/journal.ts`, `apps/web/src/types/financeV2.ts`, `apps/web/src/lib/financeV2Calc.ts`):**
    - Menambahkan `'hutang_gaji'` pada `JournalAccountRole`, `PARTY_DIMENSION_ROLES` (wajib `party_id`), `AccountType`, `ACCOUNT_TYPE_LABEL` (`'Hutang Gaji & Upah'`), serta cakupan quick ratio & rute di `financeV2Calc.ts`.
    - Menambahkan 3 kode kejadian tertutup pada `FINANCE_EVENT_CODES`: `'project_labor_accrual'`, `'office_payroll_accrual'`, `'payroll_liability_settlement'`.
    - Menambahkan template seimbang (`toRupiah`): `projectLaborAccrual` (`Dr hpp_labor / Cr hutang_gaji`), `officePayrollAccrual` (`Dr beban_opex / Cr hutang_gaji`), dan `payrollLiabilitySettlement` (`Dr hutang_gaji / Cr kas + Cr piutang` saat ada potongan kasbon).
  - **Domain Deterministik HRD–Keuangan (`packages/domain/src/hrdPayroll.ts`):**
    - `validateDailyAttendanceSplits`: memvalidasi setiap `dayFraction` berada pada `(0, 1]` dan jumlah per `(workerId, workDate) <= 1.0` (mendukung pembagian 1 hari ke 2+ proyek, mis. `0.5 + 0.5`).
    - `resolveAttendanceProjectFromSchedule`: menebak proyek dari jadwal harian PM (`dailyAssignments`); `needsConfirmation: false` bila cocok rencana dan `true` bila berbeda/tanpa rencana/ambigu.
    - `resolveEffectiveCompensationRate`: memilih tarif `daily | borongan | monthly` dengan `effectiveFrom <= workDate` terbaru (prioritas tarif per orang lalu tarif per peran) tanpa fallback Rp 150.000; mengembalikan `status: 'missing_rate'` + pertanyaan jika kosong atau `<= 0`.
    - `buildDailyProjectLaborAccruals`: menghitung upah reguler (`dayFraction * dailyRate`, `boronganUnits * unitRate`, atau prorata bulanan sesuai `laborPolicy`) + lembur sesuai `laborPolicy`, menghasilkan entri seimbang `Dr hpp_labor (projectId) / Cr hutang_gaji (partyId)` dan menjaga invarian **total upah per proyek === total debit `hpp_labor` proyek di buku besar** (0 jurnal tebakan untuk pekerja `missing_rate`).
    - `buildOfficeMonthlyPayrollAccrual`: membukukan gaji bulanan karyawan kantor ke `beban_opex` (`Dr beban_opex / Cr hutang_gaji`), bukan beban proyek (`hpp_labor`), disertai draf BPJS & PPh 21 konfigurabel.
    - `calculatePayrollStatutoryDrafts`: menghitung draf BPJS & PPh 21 100% dari `statutoryConfig` (mengembalikan `config_required` bila kosong) dan selalu berlabel `"Draf untuk ditinjau konsultan pajak — bukan nasihat hukum/pajak berlisensi"`.
    - `computeKasbonSettlement`: membatasi potongan kasbon dengan `maxDeductionPct`, membawa `remainingKasbonBalance`, dan menghasilkan template jurnal seimbang `payrollLiabilitySettlement(grossPayable, deductedAmount)`.
  - **Migrasi SQL Lokal (`my-supabase-project/supabase/migrations/20261124190000_g8_hrd_project_labor_accrual.sql`, `BLOCKED remote`):**
    - Memperluas `planner_finance_accounts_type_check` & `seed_default_chart_of_accounts` dengan `'hutang_gaji'`.
    - Membuat tabel `planner_attendance_project_splits` (`day_fraction CHECK (day_fraction > 0 AND day_fraction <= 1)`, trigger integritas, `journal_entry_id ON DELETE RESTRICT`), `planner_compensation_rate_history`, `planner_daily_assignments`, dan `planner_org_labor_policies` dengan RLS ketat `is_org_member` tanpa mutasi tabel jurnal.
  - **Dokumentasi:** Memperbarui `docs/finance/ACCOUNTING-MODEL.md`, `docs/finance/DEPLOY-RUNBOOK.md` (Langkah 14), `docs/finance/PROGRESS.md`, dan `docs/finance/CHANGELOG.md`.
- **Akun / Template Jurnal Tersentuh:** `hutang_gaji`, `project_labor_accrual`, `office_payroll_accrual`, `payroll_liability_settlement`.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124190000_g8_hrd_project_labor_accrual.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/g8ProjectLaborAccrual.test.ts`.
- **Dampak ke Tool Agent:** Menambah kode kejadian tertutup akrual gaji/upah pada `FINANCE_EVENT_CODES` & `buildJournalTemplate`; tetap tunduk pada aturan `validateJournalDimensions` (`party_id` wajib untuk `hutang_gaji`).
- **Cara Rollback:** `git revert` commit PR ini.

## [G8-1] 2026-11-24 — Hapus Klaim "LUNAS/BERHASIL DITRANSFER" Palsu, Hapus Tarif Cadangan Tersembunyi, & Perbaiki Posting Jurnal Gaji Anti-Swallow
- **Branch / PR:** `feat/g8-1-remove-fake-disbursement-fix-payroll-errors`
- **Fase:** G8 (Hardening HRD, Payroll Jujur, & Kebenaran Buku Besar Gaji — G8-1)
- **Perubahan & Alasan:**
  - **Hapus Klaim Lunas Palsu & Transfer Palsu (`apps/web/src/services/aiHrdPayrollService.ts`, `apps/web/src/components/hr/AiHrdPayrollModal.tsx`):**
    - Menambahkan antarmuka pluggable `PayrollPaymentProvider` (`createPayoutBatch`, `verifyPaymentConfirmation`) dan tipe konfirmasi eksplisit `PaymentConfirmation` (`provider_webhook` | `manual_owner_confirmation`).
    - Memecah alur menjadi `preparePayrollDisbursementBatch` (tahap persiapan berstatus `'awaiting_payment_confirmation'`) dan `confirmPayrollDisbursementBatch` (hanya menandai `'paid'` bila ada `paymentConfirmation` nyata yang terverifikasi + SoD `confirmedBy !== preparedBy` untuk konfirmasi manual + posting jurnal sukses dengan UUID `planner_payroll_entries.id` valid). `executeMayarDisbursementBatch` dipertahankan sebagai wrapper kompatibilitas yang menolak menandai `'paid'` / `'LUNAS'` tanpa `paymentConfirmation`.
    - Menghapus `${batchRef}_${item.userId}` non-UUID dan menggantinya dengan validasi UUID ketat (`isValidUuid`) dari baris `planner_payroll_entries.id`.
    - Memperbarui `generateSlipGajiMessage` / alias `formatWhatsAppSlip`: tanpa konfirmasi nyata wajib menulis `"Status: *MENUNGGU KONFIRMASI PEMBAYARAN*"`, dan hanya menulis `"Status: *LUNAS (TERKONFIRMASI)*"` bila `item.status === 'paid' && item.paymentConfirmed === true` (menghapus total `"LUNAS & BERHASIL DITRANSFER ✅"`).
    - Memperbarui UI `AiHrdPayrollModal.tsx` agar jujur menampilkan status menunggu konfirmasi pembayaran dan memblokir pencairan bila masih ada pekerja tanpa tarif resmi.
  - **Hapus Tarif Cadangan `150000` & Hardcode Tersembunyi di `analyzeFieldPayroll`:**
    - Menambahkan `laborPolicy?: LaborPolicyConfig` (`standardWorkDaysPerMonth`, `overtimeThresholdDays`, `overtimeMultiplier`, `maxKasbonDeductionPct`).
    - Menghapus fallback `150000`: pekerja dengan `daily_rate`/`monthly_salary` kosong atau `<= 0` ditandai `rateStatus: 'missing_rate'`, `requiresRateQuestion: true`, `baseRate: 0`, `grossSalary: 0`, dan dicatat ke `missingRateQuestions` / `aiObservations`.
    - Menghapus `Math.max(0, gross + overtimeBonus - kasbon)` yang menyembunyikan kekurangan kasbon: menghitung `appliedKasbonDeduction = Math.min(totalKasbon, totalEarnings, maxDeductible)` dan mencatat eksplisit `remainingKasbonBalance` serta `kasbonShortfall` agar saldo utang kasbon tidak pernah hilang (`appliedKasbonDeduction + remainingKasbonBalance === totalKasbon`).
  - **Anti-Swallow Error Posting Jurnal (`apps/web/src/services/payrollService.ts`, `apps/web/src/services/financeV2/payrollJournalBridge.ts`, `apps/web/src/pages/HrEmployees.tsx`):**
    - Pada `updatePayrollStatus` dan `reviewBonRequest`, menghapus pola `catch (journalErr) { console.error(...); }` yang menelan error. Jika posting jurnal gagal saat menandai `'paid'`, sistem melakukan rollback kompensasi ke status sebelumnya (atau menandai `[JOURNAL_POST_FAILED]` jika rollback gagal) lalu melempar error.
    - Pada `aiHrdPayrollService`, kegagalan posting jurnal mengembalikan/mengikat status `'journal_post_failed'` + `journalError`, menjaga baris DB tidak `'paid'`, dan melempar `PayrollJournalPostError`.
    - Pada `payrollJournalBridge.ts`, melempar error jika akun sistem `kas`/`laba` tidak tersedia atau tautan `journal_entry_id` gagal.
- **Akun / Template Jurnal Tersentuh:** Tetap memakai `postPayrollDisbursementJournal` (`payroll_disbursement`) dan `postBonDisbursementJournal` (`bon_disbursement`) dengan referensi UUID valid.
- **Migrasi SQL:** Tidak ada migrasi SQL baru.
- **Tes Ditambah / Diperbarui:** `apps/web/src/lib/financeV2/__tests__/g8PayrollTruthAndNoFakePaid.test.ts` & `apps/web/src/services/aiHrdPayrollService.test.ts`.
- **Dampak ke Tool Agent:** Menjamin agen tidak pernah mengklaim transfer/lunas palsu dan tidak pernah menebak tarif gaji lapangan.
- **Cara Rollback:** `git revert` commit PR ini.

## [G6] 2026-11-24 — Penutupan Program G0–G6, Hardening Minor G5, Uji E2E Siklus Penuh, Panduan Pengguna, & Laporan Akhir Jujur
- **Branch / PR:** `feat/g6-program-closure-e2e-docs`
- **Fase:** G6 (Program Closure, Hardening, Full-Program E2E, & Documentation Gate — G6)
- **Perubahan & Alasan:**
  - **Hardening Minor G5 (`packages/domain/src/autonomyGovernance.ts`):**
    - Memperbaiki penentuan `requiresApproval` pada `authorizeAgentAction` menjadi `isHighRisk || (request.requiresApproval ?? orgPolicy.autonomyLevel !== 'L2')` agar `request.requiresApproval: false` tidak pernah bisa menonaktifkan kewajiban persetujuan manusia pada aksi berisiko tinggi (`dividen`, `tutup_proyek`, `tutup_periode`, `write_off`, `pinjaman_antar_proyek`, `pembayaran_keluar` pita `large` / di atas ambang).
    - Menambahkan uji regresi pada `apps/web/src/lib/financeV2/__tests__/g5TrustAndAttackSim.test.ts` (memastikan bypass `requiresApproval: false` pada `dividen` ditolak dengan `approval_required` dan `requiresApproval: true`).
  - **Uji E2E Siklus Bisnis Penuh Terpadu G0–G5 (`apps/web/src/lib/financeV2/__tests__/g6FullProgramE2E.test.ts`):**
    - Menjalankan satu simulasi siklus bisnis jasa/kontraktor terpadu (`PT Karya Konstruksi Nusantara`) yang merangkai modul nyata lintas G0 (COA 4-kategori, DP `uang_muka_klien`, pengakuan pendapatan progres, pinjaman antar proyek 4-baris, Neraca seimbang, penjaga imutabilitas), G1 (ekstraksi nota OCR -> `prepareEntry` -> `commitEntry`, penolakan prompt injection, impor mutasi bank CSV BCA + pencocokan + rekonsiliasi kas, deteksi duplikat & nominal janggal), G2 (aging 5 bucket, skor risiko klien, peringatan proyek, cron multitenant, draf penagihan WA L1 + SoD + audit log, checklist tutup bulan 6 butir), G3 (forecast 13 minggu, margin + EAC, rekomendasi harga, what-if, prioritas hutang, penjaga narasi menolak halusinasi, `buildAdvisorBriefTool <= 400` token), G4 (budget vs actual, KPI CFO, simulasi dividen 2 mode, laporan direksi PDF deterministik ber-SHA-256 identik, pajak konfigurabel berlabel draf konsultan pajak, penyusutan menolak `periode_terkunci`, amortisasi & skenario tahunan), dan G5 (shadow mode, promosi L2 & larangan L2 berisiko tinggi, auto-demote L2->L1, hardening `requiresApproval: false`, kill switch/SoD/cap/lintas-tenant, memori koreksi, prosedur insiden jurnal pembalik seimbang + post-mortem, dan ekspor audit JSON/CSV ber-SHA-256).
  - **Dokumentasi Penutupan Program:**
    - Memperbarui `docs/finance/DEPLOY-RUNBOOK.md` (tabel ringkasan lengkap Langkah 1 s.d. 13 `F0`–`G5`, aktivasi awal `L1` + Mode Bayangan).
    - Memperbarui `docs/finance/FINAL-REPORT.md` (laporan jujur F0–F4 & G0–G6: bukti deterministik vs pengujian sintetis/in-memory, status `BLOCKED remote`, sisa risiko, rekomendasi `L1` + Mode Bayangan, dan syarat objektif `L2`).
    - Menerbitkan `docs/finance/USER-GUIDE-ROLES.md` (panduan praktis Bahasa Indonesia untuk 3 peran: Asisten Keuangan, Financial Advisor, CFO).
    - Menerbitkan `docs/finance/PHASES/G6-report.md` dan memperbarui `docs/finance/PROGRESS.md` (`COMPLETED` / `DONE`) serta `docs/finance/CHANGELOG.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template baru maupun mutasi tabel jurnal; memakai seluruh template `FINANCE_EVENT_CODES` eksisting dalam uji E2E terpadu.
- **Migrasi SQL:** Tidak ada migrasi SQL baru pada G6 (total tetap 13 file migrasi lokal `F0`–`G5` berstatus `BLOCKED remote`).
- **Tes Ditambah / Diperbarui:** `apps/web/src/lib/financeV2/__tests__/g6FullProgramE2E.test.ts` & `apps/web/src/lib/financeV2/__tests__/g5TrustAndAttackSim.test.ts`.
- **Dampak ke Tool Agent:** Tidak mengubah signature tool agent; memperketat penjaga otorisasi aksi berisiko tinggi pada `authorizeAgentAction`.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G5] 2026-11-24 — Kepercayaan, Otonomi Berbasis Bukti, SoD, Ekspor Audit, Prosedur Insiden, Simulasi Serangan, & Laporan Gerbang G5
- **Branch / PR:** `feat/g5-trust-autonomy-governance-security`
- **Fase:** G5 (Trust, Evidence-Based Autonomy, Governance, & Security Gate — G5)
- **Perubahan & Alasan:**
  - Menambahkan modul domain deterministik `packages/domain/src/autonomyGovernance.ts`:
    - `resolveAmountBand` & `evaluateShadowAgreement(records)`: mengukur kesepakatan Mode Bayangan (draf agen vs keputusan akhir manusia) per kombinasi `(intent, category, amountBand)` (`small <= 1jt`, `medium 1jt..10jt`, `large > 10jt`), menghitung `sampleCount`, `agreedCount`, `agreementRate`, dan `criticalErrorCount` (salah nominal, salah pihak, duplikat, salah arah).
    - `evaluateAutonomyPromotion(sliceMetrics, policy?)`: menerapkan ambang konservatif `D-G5-01` (`minSamples = 30`, `minAccuracy = 0.98`, `maxCriticalErrors = 0`), **melarang keras** aksi berisiko tinggi (`dividen`, `tutup_proyek`, `tutup_periode`, `write_off`, `pinjaman_antar_proyek`, `pembayaran_keluar` pita `large`/di atas ambang) naik ke `L2`, dan memicu **auto-demote `L2 -> L1`** segera bila terjadi `criticalErrorCount > 0` atau `agreementRate < minAccuracy`.
    - `authorizeAgentAction(request, orgPolicy, dailyUsage)`: menegakkan isolasi lintas-tenant (`cross_tenant_forbidden`), kill switch (`kill_switch_active`), hierarki wewenang (`role_escalation_forbidden`), Segregation of Duties (`self_approval_forbidden`), idempotensi (`duplicate_payment_blocked`), batas nominal harian (`daily_amount_cap_exceeded`), dan kuota token/biaya (`token_budget_exceeded` / `cost_budget_exceeded`).
    - `buildAuditTrailExport(logs, format: 'json' | 'csv')`: mengekspor jejak audit lengkap (`orgId`, `actorId`, `actorType`, `model`, `promptTokens`, `completionTokens`, `evidenceAttachmentHash`, `journalEntryId`, `createdAt`) secara deterministik ber-SHA-256.
    - `recordUserCorrectionSignal(existingMemory, correction)`: menyimpan sinyal koreksi slot/kategori sambil menolak tegas upaya penyimpanan `debit`, `credit`, `journalLines`, atau rumus/nominal perhitungan LLM (`accounting_math_signal_forbidden`).
  - Menambahkan modul pemulihan insiden `packages/domain/src/incidentRecovery.ts`:
    - `proposeMispostingReversalAndPostmortem(incident)` & `approveMispostingReversalPostmortem(postmortem, approval)`: memvalidasi jurnal asli append-only (menolak `mutateOriginalAttempt` dengan `jurnal_tidak_boleh_diubah`), menyusun usulan jurnal pembalik seimbang 100% (`debit <-> credit`, `referenceType: 'reversal'`, `requiresHumanApproval: true`), menghasilkan dokumen post-mortem terstruktur dengan `autonomyDemotionTriggered: true` dan `status: 'awaiting_approval'`, serta menegakkan SoD saat persetujuan.
  - Menambahkan migrasi SQL lokal `my-supabase-project/supabase/migrations/20261124180000_g5_trust_autonomy_governance.sql` (`BLOCKED remote`): tabel `planner_shadow_evaluations` (append-only trigger), `planner_autonomy_policies` (`UNIQUE(org_id, intent, category, amount_band)`), dan `planner_incident_postmortems` (`REFERENCES planner_journal_entries(id) ON DELETE RESTRICT`, `CHECK (approved_by IS NULL OR approved_by <> created_by)`) dengan RLS ketat `is_org_member` tanpa mutasi tabel jurnal.
  - Menambahkan suite TDD & simulasi serangan `apps/web/src/lib/financeV2/__tests__/g5TrustAndAttackSim.test.ts` (menguji shadow mode, promosi & auto-demote L2, **5 simulasi serangan wajib** yang seluruhnya ditolak, prosedur insiden, ekspor audit JSON/CSV, memori koreksi, dan struktur SQL G5).
  - Memperbarui `docs/finance/DECISIONS.md` (`D-G5-01`), `docs/finance/DEPLOY-RUNBOOK.md` (Langkah 13), `docs/finance/PROGRESS.md` (Fase `G5` `DONE`, menyiapkan `G6`), `docs/finance/CHANGELOG.md`, dan menerbitkan laporan gerbang `docs/finance/PHASES/G5-report.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah template akun baru atau memutasi tabel jurnal; memakai validator `linesAreBalanced` dari `packages/domain/src/journal.ts` untuk menyusun usulan jurnal pembalik `referenceType = 'reversal'`.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124180000_g5_trust_autonomy_governance.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/g5TrustAndAttackSim.test.ts`.
- **Dampak ke Tool Agent:** Tidak mengubah kontrak tool agent eksisting; menyediakan lapisan tata kelola otorisasi, shadow mode, auto-demote, ekspor audit, dan prosedur insiden deterministik untuk eksekutor & admin UI.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G4-2] 2026-11-24 — Modul Pajak Konfigurabel, Aset Tetap & Penyusutan Terjadwal, Pendanaan/Cicilan, Skenario Tahunan, & Laporan Gerbang G4
- **Branch / PR:** `feat/g4-2-cfo-tax-assets-financing-annual-plan`
- **Fase:** G4 (CFO Tax, Capital Assets, Financing, Annual Plan, & Gerbang G4 — G4-2)
- **Perubahan & Alasan:**
  - Menambahkan modul domain deterministik `packages/domain/src/cfoTaxAndCapital.ts` dengan seluruh nominal integer rupiah (`toRupiah`), `provenance`, dan disclaimer wajib:
    - `calculateTaxDraftAndCalendar(input)`: menghitung draf PPN Keluaran, PPN Masukan, PPN Kurang/(Lebih) Bayar, dan PPh (`pph_final_konstruksi` | `pph_badan` | `pph_final_umkm`) serta `calendar` setor/lapor **100% dari `TaxProfileConfig`** tanpa tarif hardcode; mengembalikan `config_required` bila tarif/konfigurasi kosong, mengeluarkan `"Wajib verifikasi tarif ke regulasi terkini"` bila `verifiedAt` kosong atau `> 180` hari, dan selalu menyertakan disclaimer `"Draf untuk ditinjau konsultan pajak — bukan nasihat hukum/pajak berlisensi"` (`TAX_DRAFT_DISCLAIMER`).
    - `evaluateAssetCapitalization(item, capitalizationThresholdRupiah)`: membandingkan nilai perolehan vs `capitalizationThresholdRupiah` (dapat diatur, default `5_000_000` sesuai `D-F1-02`) dan masa manfaat `> 12` bulan (`capitalize_fixed_asset` vs `expense_opex`).
    - `buildScheduledDepreciationPlan(assets, periodMonth, lockedPeriods)`: menghitung penyusutan bulanan garis lurus (`straight_line`) dibatasi agar nilai buku tidak pernah turun di bawah `residualValue`, menghasilkan template jurnal seimbang `depreciationExpense(amount)` (`Dr beban_penyusutan / Cr akumulasi_penyusutan`), dan **menolak tegas (`ok: false`, `reason: 'periode_terkunci'`, `entries: []`)** bila `periodMonth` masuk `lockedPeriods`.
    - `buildLoanAmortizationSchedule(loan)` & `evaluateWorkingCapitalFundingNeed(forecast13w, minCashBufferRupiah)`: menghasilkan jadwal cicilan bulanan (pokok, bunga, sisa pokok akhir tepat `0`, dampak arus kas) dan rekomendasi kapan serta berapa modal kerja tambahan dibutuhkan saat `minEndingCash < minCashBufferRupiah`.
    - `buildAnnualScenarioPlan(input)`: menyusun proyeksi 12 bulan × 3 skenario (`conservative`, `base`, `growth`) meliputi pendapatan, HPP, opex, laba bersih, kas akhir tiap bulan, ringkasan tahunan, dan `provenance`.
  - Menambahkan migrasi SQL lokal `my-supabase-project/supabase/migrations/20261124170000_g4_cfo_tax_config_and_loans.sql` (`BLOCKED remote`): tabel `planner_org_tax_configs` (`UNIQUE(org_id)`) dan `planner_financing_loans` dengan RLS ketat `is_org_member` tanpa mutasi tabel jurnal.
  - Menambahkan suite TDD `apps/web/src/lib/financeV2/__tests__/cfoTaxAndCapital.test.ts` (uji multi-tarif pajak bebas hardcode + `config_required` + `verifiedAt > 180` hari, ambang kapitalisasi & penolakan penyusutan periode terkunci, amortisasi sisa pokok 0 & kebutuhan modal kerja, rencana tahunan 12 bulan × 3 skenario, serta uji struktural SQL `20261124170000_g4_cfo_tax_config_and_loans.sql`).
  - Memperbarui `docs/finance/DEPLOY-RUNBOOK.md` (Langkah 12), `docs/finance/DECISIONS.md` (`D-G4-01`), `docs/finance/PROGRESS.md` (Fase `G4` `DONE`, menyiapkan `G5`), `docs/finance/CHANGELOG.md`, dan menerbitkan laporan gerbang `docs/finance/PHASES/G4-report.md`.
- **Akun / Template Jurnal Tersentuh:** Memakai template eksisting `depreciationExpense` (`Dr beban_penyusutan / Cr akumulasi_penyusutan`) dari `packages/domain/src/journal.ts`; tidak memutasi tabel jurnal.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124170000_g4_cfo_tax_config_and_loans.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/cfoTaxAndCapital.test.ts`.
- **Dampak ke Tool Agent:** Tidak mengubah signature tool agent; menyediakan fungsi deterministik pajak konfigurabel, aset tetap, amortisasi pinjaman, dan rencana tahunan bebas perhitungan LLM.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G4-1] 2026-11-24 — CFO Anggaran vs Aktual, KPI, Kebijakan Dividen 2 Mode, & Laporan Bulanan Bergaya Direksi (Deterministik + Ekspor PDF)
- **Branch / PR:** `feat/g4-1-cfo-budget-kpi-board-report-dividend`
- **Fase:** G4 (CFO Analytics, Board Monthly Reporting, & Kebijakan Dividen — G4-1)
- **Perubahan & Alasan:**
  - Menambahkan modul domain deterministik `packages/domain/src/cfoAnalytics.ts` dengan seluruh nominal integer rupiah (`toRupiah`), `provenance`, dan disclaimer wajib `"Bukan nasihat hukum/pajak berlisensi"` (`CFO_ANALYTICS_DISCLAIMER`):
    - `computeBudgetVsActual(input)`: menghitung perbandingan anggaran vs aktual (`monthly` & `annual`) untuk pos `opexItems` dan `projectItems` beserta ringkasan kelompok/keseluruhan, `variance`, `variancePct`, `status` (`under_budget` | `on_track` | `over_budget`), dan penjelasan deterministik (`explanation`) untuk varians signifikan (`|variancePct| >= 10%`).
    - `computeCfoKpis(input)`: menghitung seluruh KPI wajib secara deterministik (`netCash`, `runwayMonths` + `runwayLabel` aman bila `burn <= 0`, `grossMarginPct`, `netMarginPct`, `dsoDays`, `dpoDays`, `receivableToRevenueRatioPct`, `clientConcentrationTop1Pct`, `clientConcentrationTop3Pct`, `teamUtilizationPct`) tanpa `NaN`/`Infinity` pada kasus `revenue === 0` / `hpp === 0` / `burn === 0`, lengkap dengan `assumptions` dan `provenance`.
    - `simulateDividendPolicyComparison(input)`: membandingkan kebijakan dividen **per proyek** vs **per bisnis** di bawah batasan `availableCash`, cadangan opex (`opexReserveMultiplier * monthlyOpexPlan`), dan saldo `labaDitahan`, menjamin batas kas tersedia dan cadangan opex tidak pernah dilanggar serta menghasilkan rekomendasi berbasis likuiditas (`per_bisnis` | `per_proyek` | `hold`).
    - `buildBoardMonthlyReport(input)`: menyusun laporan bulanan bergaya direksi (`pageOne`: `executiveSummary`, `kpis`, `topRisks`, `decisionsRequired`, `dividendPolicySummary`; `appendix`: `budgetVsActual`, `projectMargins`, `agingSummary`), mengisolasi transaksi & tagihan periode terkunci (`lockedPeriodMonth`) dari periode bulan berikutnya, serta menghitung `deterministicHash` (SHA-256 via `computeDeterministicSha256` atas JSON kanonis tanpa timestamp acak).
    - `renderBoardReportPdfHtml(report)`: menghasilkan HTML cetak 1 halaman eksekutif + lampiran siap ekspor PDF yang deterministik 100% (tanpa random ID atau `new Date()`, dengan HTML escaping penuh).
  - Menambahkan suite TDD `apps/web/src/lib/financeV2/__tests__/cfoAnalytics.test.ts` (10 tes yang menguji `computeBudgetVsActual` bulanan/tahunan + batas tepat 10%, seluruh KPI termasuk kasus batas 0, simulasi dividen 2 mode, reproduksibilitas hash & HTML 100% identik, HTML escaping, serta isolasi integritas periode terkunci `lockedPeriodMonth`).
  - Memperbarui `docs/finance/CHANGELOG.md` dan `docs/finance/PROGRESS.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template atau mutasi tabel jurnal.
- **Migrasi SQL:** Tidak ada migrasi SQL baru pada PR ini.
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/cfoAnalytics.test.ts`.
- **Dampak ke Tool Agent:** Tidak mengubah tool agent; menyediakan fungsi analitik CFO deterministik murni di `packages/domain/src/cfoAnalytics.ts` tanpa perhitungan LLM.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G3-2] 2026-11-24 — Penjaga Angka & Provenance Narasi Advisor, Backtest Forecast 13 Minggu, Tool `get_advisor_brief`, & Laporan Gerbang G3
- **Branch / PR:** `feat/g3-2-advisor-tools-narration-guard-backtest`
- **Fase:** G3 (Financial Advisor Deterministik, Penjaga Narasi, & Gerbang G3 — G3-2)
- **Perubahan & Alasan:**
  - Menambahkan modul domain deterministik `packages/domain/src/advisorNarrationGuard.ts`:
    - `formatAdvisorMobileAnswer(input)`: menyusun jawaban ringkas layar ponsel 5 bagian terstruktur (kesimpulan 1 kalimat -> angka kunci + sumber -> asumsi -> risiko -> langkah disarankan + disclaimer `"Bukan nasihat hukum/pajak berlisensi"`) dengan anggaran `<= 400` estimasi token.
    - `extractNumbersFromNarrative(text, opts?)` & `verifyNarrativeNumbersMatchSource(narrativeText, allowedNumbers, opts?)`: mengekstrak seluruh angka nominal rupiah (`Rp 15.000.000`, `-Rp 24.000.000`, `15jt`, `500rb`), persentase (`12,5%`), dan angka berdiri sendiri (mengecualikan nomor urut daftar `1.`/`2.`, tanggal ISO `YYYY-MM-DD`, pengenal alfanumerik, dan `allowedLiteralTokens` seperti `"13 minggu"`). Bila ada satu saja angka tanpa sumber di `allowedNumbers`, mengembalikan `{ ok: false, unsourcedNumbers, reason: 'unsourced_numbers_detected' }` (tolak jawaban).
    - `runCashFlowForecastBacktest(cases)`: menjalankan `forecastCashFlow13Weeks` (skenario `base`) terhadap realisasi kas mingguan aktual (`actualEndingCashByWeek`), menghitung MAPE per kasus, `overallMapePct`, `normalMapePct`, `shockMapePct`, dan `failedMapePct`, serta menandai kasus dengan `mapePct > 20` atau kas negatif tak terprediksi sebagai `failedCase: true` beserta `failureCause` secara jujur tanpa menyembunyikan kasus gagal (`datasetKind: 'synthetic'`).
  - Menambahkan tool agent deterministik `buildAdvisorBriefTool(input)` di `agent-core/src/advisorTools.ts` (`<= 400` token JSON, `summary`, `metrics` ber-`source`/`period`, `assumptions`, `risks`, `nextSteps`, `disclaimer`) dan mendaftarkan `get_advisor_brief` di `agent-core/src/registry.ts` pada domain spesialis `'advisor'` (menjaga batas `toolsFor('finance', 'manager').length <= 8` dan `toolsFor('manager', 'manager').length <= 8` tetap terpenuhi) beserta regenerasi `docs/agent/AGENT_MANUAL.md`, `agent-core/functions.json`, `agent-core/mcp.json`, dan `agent-core/fixtures.json`.
  - Menambahkan suite TDD `apps/web/src/lib/financeV2/__tests__/advisorGuardAndBacktest.test.ts` (uji format ponsel `<= 400` token, penolakan halusinasi angka palsu, backtest 5 jendela sintetis 3 normal + 2 shock/gagal, serta `buildAdvisorBriefTool` `<= 400` token & 100% angka lolos penjaga narasi).
  - Memperbarui `docs/finance/AGENT-GUIDE.md` (tetap `<= 1.500` token), `docs/finance/PROGRESS.md` (Fase `G3` `DONE`, menyiapkan `G4`), `docs/finance/CHANGELOG.md`, dan menerbitkan laporan gerbang `docs/finance/PHASES/G3-report.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template atau mutasi tabel jurnal.
- **Migrasi SQL:** Tidak ada migrasi SQL baru pada PR ini.
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/advisorGuardAndBacktest.test.ts`.
- **Dampak ke Tool Agent:** Menambah tool read-only `get_advisor_brief` untuk spesialis `'advisor'` (`minRole: 'manager'`); `finance/manager` tetap 8 tool; output dibatasi `<= 400` token dan seluruh angka narasi dijaga oleh `verifyNarrativeNumbersMatchSource`.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G3-1] 2026-11-24 — Mesin Analisis Deterministik Financial Advisor (Forecast 13 Minggu, Analisis Margin Proyek, Rekomendasi Harga, What-If, & Prioritas Bayar)
- **Branch / PR:** `feat/g3-1-forecast-margin-pricing-whatif`
- **Fase:** G3 (Financial Advisor Deterministik & Simulasi — G3-1)
- **Perubahan & Alasan:**
  - Menambahkan modul domain deterministik `packages/domain/src/financialAdvisor.ts` dengan seluruh nominal integer rupiah (`toRupiah`), `provenance` (sumber data, periode, `asOfDate`, `assumptions`), dan disclaimer wajib `"Bukan nasihat hukum/pajak berlisensi"` (`FINANCIAL_ADVISOR_DISCLAIMER`):
    - `forecastCashFlow13Weeks(input)`: proyeksi arus kas 13 minggu (91 hari) dalam 3 skenario (`base`, `worst`, `best`) dari `openingCash`, `receivables`, `payables`, `monthlyOpexPlan` (dibagi mingguan `× 3/13`), dan `scheduledProjectTermins`, menghasilkan 13 baris mingguan (`weekIndex: 1..13`, `weekStart`, `weekEnd`, `inflows`, `outflows`, `netCashFlow`, `endingCash`), `firstNegativeCashDate`, `minEndingCash`, `endingCashWeek13`, `assumptions`, dan `provenance`.
    - `analyzeProjectMargin(input)`: analisis 6 kategori RAP vs realisasi (`material`, `labor`, `equipment`, `overhead`, `other`, `uncategorized`) dengan `variance`, `variancePct`, **EAC** (`cpi_performance` `actualTotal / (progressPct / 100)` saat `progressPct >= 10` & `actualTotal > 0`, atau `baseline_remaining_rap` saat `< 10%`), `projectedFinalMargin`, `projectedMarginPct`, dan `topVarianceDrivers` terurut dari selisih over-budget terbesar.
    - `recommendProjectPricing(input)`: menghitung margin historis (`minMarginPct`, `medianMarginPct`, `maxMarginPct`) dan rentang harga penawaran (`lowPrice`, `recommendedPrice`, `highPrice`) saat `similarProjects.length >= minSampleSize` (default `3`), serta fallback margin katalog (`-5% / 0% / +5%`, `usedFallback: true`, catatan `"Sampel proyek serupa < 3; menggunakan margin katalog"`) saat sampel kurang dari 3.
    - `runAdvisorWhatIf(baseForecastInput, scenario)`: simulasi 3 skenario (`client_delay`, `take_new_project`, `pay_payable_early`) terhadap forecast `base`, mengembalikan `cashImpactWeek13`, `minCashDelta`, `beforeFirstNegativeDate`, `afterFirstNegativeDate`, `profitImpact`, `assumptions`, dan `provenance`.
    - `prioritizePayables(payables, availableCash, asOfDate)`: penentuan skor prioritas deterministik (`sudah jatuh tempo > segera jatuh tempo > tagihan proyek aktif/kritis > denda/pajak`) dan alokasi kas utuh (`recommendedPayNow`, `deferOrNegotiate`, `remainingCashAfterPriority`) tanpa pernah melebihi `availableCash`.
  - Menambahkan suite TDD `apps/web/src/lib/financeV2/__tests__/financialAdvisor.test.ts` yang menguji seluruh 5 fungsi domain deterministik beserta invarian `worst <= base <= best`, 6 kategori margin & EAC, cabang pricing historis vs fallback, 3 skenario what-if, dan hierarki alokasi hutang.
  - Memperbarui `docs/finance/PROGRESS.md` & `docs/finance/CHANGELOG.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template atau mutasi tabel jurnal; modul advisor bersifat murni read-only & deterministik.
- **Migrasi SQL:** Tidak ada migrasi SQL baru pada PR ini.
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/financialAdvisor.test.ts`.
- **Dampak ke Tool Agent:** Tidak mengubah signature tool agent; menyediakan mesin analisis deterministik yang bebas perhitungan oleh LLM serta menyertakan `provenance` dan disclaimer wajib.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G2-2] 2026-11-24 — Mesin Pengingat Multitenant (Cron), Draf Penagihan (WA/Email), Jejak Audit, & Laporan Gerbang G2
- **Branch / PR:** `feat/g2-2-cron-reminders-collection-drafts-audit`
- **Fase:** G2 (Keuangan Proaktif & Penutupan Periode — G2-2 & Gerbang G2)
- **Perubahan & Alasan:**
  - Menambahkan modul domain deterministik `packages/domain/src/reminderScheduler.ts`:
    - `buildTenantProactiveReminders(orgId, input, asOfDate, options?)`: memfilter ketat seluruh entitas hanya untuk `orgId` bersangkutan (menolak item lintas tenant & mencatat `crossTenantRejectedCount`), menghasilkan 5 jenis pengingat deterministik (`payable_due`, `receivable_overdue`, `termin_ready_to_bill`, `missing_receipt_attachment`, `journal_needs_review`) dengan `dedupeKey` idempoten per hari (`${orgId}:${reminderType}:${entityId}:${asOfDate}`) dan nominal bulat rupiah.
    - `buildCollectionMessageDraft(input)`: menyusun draf pesan penagihan Bahasa Indonesia sopan (`whatsapp` / `email`) lengkap dengan nomor invoice, nominal rupiah deterministik, & `provenance`; menegakkan aturan keras pada `L0` dan `L1` (serta pengiriman eksternal) bahwa `status` selalu `'pending_approval'` & `autoSendAllowed: false`.
    - `approveAndDispatchCollectionDraft(draft, approval)`: memvalidasi isolasi tenant (`cross_tenant_forbidden`), pemisahan wewenang / SoD (`approvedBy !== draft.createdBy` -> `self_approval_forbidden`), dan keberadaan `auditLogId` non-kosong (`audit_trail_required`) sebelum status berubah ke `'dispatched'`.
    - `runMultiTenantCronBatch(tenants, asOfDate)`: mengeksekusi `buildTenantProactiveReminders` secara terisolasi per `orgId` dengan penjaga lapis kedua terhadap kebocoran lintas organisasi.
  - Menambahkan migrasi SQL lokal `my-supabase-project/supabase/migrations/20261124160000_g2_proactive_reminders_audit.sql` (`BLOCKED remote`): tabel append-only `planner_proactive_audit_logs` (trigger `BEFORE UPDATE OR DELETE`, `ERRCODE = '55000'`), tabel `planner_finance_reminders` (`UNIQUE(org_id, dedupe_key)`), tabel `planner_collection_drafts` (`CHECK (approved_by IS NULL OR approved_by <> created_by)`, `CHECK (status <> 'dispatched' OR (approved_by IS NOT NULL AND audit_log_id IS NOT NULL))`), serta RLS ketat `is_org_member` bebas mutasi tabel jurnal.
  - Menambahkan layanan `apps/web/src/services/financeV2/proactiveAssistantService.ts` (`runTenantReminderCron`, `runIsolatedMultiTenantCron`, `createCollectionDraft`, `approveAndRecordCollectionDispatch`).
  - Menambahkan suite TDD `apps/web/src/lib/financeV2/__tests__/proactiveMultitenantAudit.test.ts` (isolasi multi-tenant, 0 kebocoran lintas org, aturan L0/L1, penolakan `audit_trail_required` / `self_approval_forbidden` / `cross_tenant_forbidden`, idempotensi `dedupeKey` 5 jenis pengingat, mock service, & uji struktural SQL).
  - Memperbarui `docs/finance/DEPLOY-RUNBOOK.md` (Langkah 11), `docs/finance/PROGRESS.md` (menandai Fase `G2` `DONE` & menyiapkan `G3`), `docs/finance/CHANGELOG.md`, dan menerbitkan laporan gerbang `docs/finance/PHASES/G2-report.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template atau mutasi tabel jurnal; layanan proaktif membaca metrik buku besar & mencatat pengingat, draf penagihan, dan jejak audit pada tabel terpisah.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124160000_g2_proactive_reminders_audit.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/proactiveMultitenantAudit.test.ts`.
- **Dampak ke Tool Agent:** Tidak mengubah signature tool agent; menyediakan penjadwal pengingat multitenant, penyusun draf WA/Email tanpa hitung LLM, dan penjaga persetujuan SoD + audit trail wajib.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G2-1] 2026-11-24 — Umur Piutang/Hutang (Aging), Skor Risiko Klien, Peringatan Proyek/Kas, & Checklist Tutup Bulan Otomatis
- **Branch / PR:** `feat/g2-1-aging-risk-alerts-month-close`
- **Fase:** G2 (Keuangan Proaktif & Penutupan Periode — G2-1)
- **Perubahan & Alasan:**
  - Menambahkan modul domain deterministik `packages/domain/src/proactiveFinance.ts` dengan seluruh kalkulasi bilangan bulat rupiah (`toRupiah`) dan `provenance` eksplisit:
    - `computeAgingSchedule(items, asOfDate, options?)`: mendukung `kind: 'receivable' | 'payable'`, mengelompokkan item jatuh tempo ke 5 bucket (`current`, `days_1_30`, `days_31_60`, `days_61_90`, `over_90`), menghitung total per bucket, `totalOutstanding`, `totalOverdue`, ringkasan per `partyId` (`byParty`), serta menolak pencampuran piutang dan hutang.
    - `scoreClientCollectionRisk(input)`: menghitung secara deterministik `latePaymentRate`, `avgDaysLate`, `maxDaysOverdue`, `overdueRatio`, skor risiko `0..100`, pita risiko (`'low' | 'medium' | 'high' | 'critical'`), `reasons[]`, dan `provenance`.
    - `evaluateProjectProactiveAlerts(projects, asOfDate)`: menghasilkan peringatan deterministik per proyek untuk `project_over_budget` (`warning` `>= 90%` RAP, `critical` `> 100%` RAP), `project_cash_low` (`< 15%` sisa RAP atau `< Rp 5.000.000` saat proyek aktif), dan `dp_received_zero_progress` (saldo DP masuk `> 0` dengan `progressPct === 0`).
    - `evaluateMonthCloseChecklist(input)`: mengevaluasi 6 butir wajib tutup bulan (`receipts_complete`, `bank_reconciled`, `accruals_reviewed`, `depreciation_posted`, `opex_vs_plan_reviewed`, `zero_needs_review`) beserta `opexVariance` dan menetapkan `readyToClose = true` hanya jika 0 butir berstatus `'block'`.
  - Menambahkan suite TDD `apps/web/src/lib/financeV2/__tests__/proactiveFinance.test.ts` yang memverifikasi seluruh 5 bucket aging piutang/hutang, skor risiko klien (`low` vs `critical`), 3 jenis alert proyek + proyek sehat, serta checklist tutup bulan (`readyToClose: true` vs pemblokiran bank/needs_review).
  - Memperbarui `docs/finance/PROGRESS.md` & `docs/finance/CHANGELOG.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template atau mutasi jurnal; modul membaca/mengevaluasi metrik deterministik dari data buku besar & proyek.
- **Migrasi SQL:** Tidak ada migrasi SQL baru pada PR ini.
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/proactiveFinance.test.ts`.
- **Dampak ke Tool Agent:** Tidak mengubah signature tool agent; menyediakan fungsi domain deterministik bagi briefing/alert proaktif dan checklist tutup bulan tanpa perhitungan oleh LLM.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G1-3] 2026-11-24 — Deteksi Duplikat & Nominal Janggal, 4 Intent Baru, Evaluasi Held-Out/Adversarial, & Laporan Gerbang G1
- **Branch / PR:** `feat/g1-3-duplicate-anomaly-intents-eval`
- **Fase:** G1 (Alur Bukti, Mutasi Bank, Deteksi Duplikat/Anomali, & Evaluasi Adversarial — G1-3 & Gerbang G1)
- **Perubahan & Alasan:**
  - Menambahkan modul domain deterministik `packages/domain/src/anomalyDetection.ts`:
    - `detectDuplicateEntry(candidate, existingEntries, { dateWindowDays })`: mendeteksi duplikat kuat dari kesamaan `attachmentHash` (`reason: 'duplicate_attachment_hash'`, `severity: 'high'`), kesamaan `invoiceNumber` + `partyId` (`reason: 'duplicate_invoice_number'`, `severity: 'high'`), serta duplikat sedang dari nominal integer rupiah identik + selisih tanggal `<= dateWindowDays` (default 2 hari) + proyek/pihak sama (`reason: 'duplicate_amount_date_entity'`, `severity: 'medium'`), lengkap dengan `matches` & `provenance`.
    - `detectAnomalousAmount(candidate, historicalAmounts, { rapRemainingBudget, highAmountThreshold, zScoreThreshold })`: mendeteksi nominal `<= 0` (`invalid_non_positive`), `>= highAmountThreshold` (default Rp 100.000.000, `above_approval_threshold`), `> 1.25 × rapRemainingBudget` (`exceeds_rap_remaining`), outlier statistik (`sampleCount >= 4` dan `zScore >= 2.5` atau `>= 4 × median`, `statistical_outlier`), serta indikasi salah ketik nol berlebih (`possible_extra_zero_typo`), mengembalikan `{ isAnomalous, flags, stats, requiresHumanConfirmation }`.
  - Memperbarui `packages/domain/src/receiptExtraction.ts` (`detectPromptInjection`) dan `packages/domain/src/money.ts` (`firstRupiah` & `parseCostCommand` agar angka di akhir nama proyek seperti `"Ruko Bu Ana 1 500rb"` tidak salah bergabung menjadi token nominal tidak valid).
  - Memperbarui `agent-core/src/financeEntryEngine.ts` (dan re-ekspor `apps/web/src/lib/financeEntryEngine.ts` + `agent-core/src/registry.ts` + artefak `docs/agent/AGENT_MANUAL.md`, `functions.json`, `mcp.json`, `fixtures.json`):
    - Menambahkan 4 intent baru (`FINANCE_AGENT_INTENTS` = 13 intent, `FinanceIntent`): `catat_invoice_terbit` (`receivable_accrual`, wajib `project_id` + `party_id`), `catat_termin_diterima` (`client_termin`, wajib `project_id`), `catat_retensi` (`client_retention_hold` / `client_retention_release`, wajib `project_id` + `party_id`), dan `catat_gaji` (`project_cost_labor` vs `opex_expense`), sambil menjaga 100% klasifikasi 9 intent lama & 218 kasus gold F3.
    - Menambahkan penjaga prompt injection (`prompt_injection_detected`) serta integrasi opsional `detectDuplicateEntry` & `detectAnomalousAmount` di `prepareEntry` yang menurunkan `auto_commit` menjadi `ask_back` / `confirm_one_tap` dengan `warnings` jelas (tingkat salah-auto-commit = 0).
  - Menambahkan runner evaluasi G1 (`loadG1EvalCases`, `evaluateG1FinanceSet`) di `agent-core/src/financeEvalRunner.ts` dan dua dataset terpisah:
    - `evals/finance/g1_dev_set.yaml` (20 kasus: 4 intent baru, duplikat, & anomali).
    - `evals/finance/g1_heldout_adversarial.yaml` (30 kasus tahan/adversarial: typo, slang Indonesia, campur EN-ID, nominal janggal `possible_extra_zero_typo` & `Rp 250jt`, dua proyek mirip nama `Ruko Bu Ana 1` vs `Ruko Bu Ana 2`, prompt injection, duplikat, & 4 intent baru).
  - Menambahkan suite TDD `apps/web/src/lib/financeV2/__tests__/g1AnomalyAndEval.test.ts` & memperbarui assertion jumlah intent di `apps/web/src/lib/financeEntryEngine.test.ts`.
  - Memperbarui `docs/finance/AGENT-GUIDE.md` (~1.302 token `<= 1.500`), menerbitkan laporan gerbang `docs/finance/PHASES/G1-report.md`, memperbarui `docs/finance/PROGRESS.md` (menandai Fase `G1` `DONE` & menyiapkan `G2`), dan `docs/finance/CHANGELOG.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template baru; 4 intent baru memetakan ke template tertutup eksisting (`receivable_accrual`, `client_termin`, `client_retention_hold`, `client_retention_release`, `project_cost_labor`, `opex_expense`).
- **Migrasi SQL:** Tidak ada migrasi SQL baru pada PR ini.
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/g1AnomalyAndEval.test.ts`.
- **Dampak ke Tool Agent:** `prepare_entry` kini mendukung 13 intent tertutup (9 lama + 4 G1), validasi prompt injection, serta warning duplikat & anomali nominal yang menurunkan `auto_commit` menjadi `ask_back`/`confirm_one_tap`.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G1-2] 2026-11-24 — Impor Mutasi Bank (BCA/Mandiri/BRI/BNI/Generic CSV), Pencocokan Otomatis, & Rekonsiliasi Kas
- **Branch / PR:** `feat/g1-2-bank-statement-reconciliation`
- **Fase:** G1 (Alur Bukti, Mutasi Bank, & Rekonsiliasi Kas — G1-2)
- **Perubahan & Alasan:**
  - Menambahkan modul domain deterministik `packages/domain/src/bankStatement.ts`:
    - `parseBankStatementCsv`: deteksi otomatis & parser CSV/TSV format bank Indonesia (BCA `Tanggal,Keterangan,Cabang,Jumlah,Saldo` dengan `CR`/`DB` & tanggal `DD/MM` via `yearHint`, Mandiri/BRI/BNI `Tanggal,Deskripsi,Debit,Kredit,Saldo`, dan Generic CSV), menghasilkan nominal integer rupiah (`> 0`), `entryDate` (`YYYY-MM-DD`), `direction` (`'in' | 'out'`), `runningBalance` opsional, serta `rowHash` SHA-256 deterministik untuk deduplikasi impor ulang.
    - `matchBankStatementToLedger`: pencocokan 1-to-1 deterministik berdasarkan arah sama, nominal integer rupiah eksak sama, selisih tanggal `<= dateToleranceDays` (default 3 hari), dengan skor kemiripan teks keterangan/pihak (`computeDescriptionSimilarity`) sebagai tie-breaker. Kandidat dengan skor sama (`tied_ledger_candidates` / `tied_bank_rows`) **tidak pernah auto-match** dan dimasukkan ke `ambiguousMatches`; baris tanpa pasangan masuk `unmatchedBankRows` (`status: 'unmatched'`) dan `unmatchedLedgerLines`.
    - `deriveReconciliationItems` & `reconcileCashVsBank`: menghitung `rawDifference = bankEndingBalance - bookCashBalance`, memilah item penjelas (`bank_fee`, `bank_interest`, `deposit_in_transit`, `outstanding_withdrawal`), serta menentukan status `'reconciled'` hanya jika `unexplainedDifference === 0` (selain itu `'needs_review'`) lengkap dengan `provenance`.
  - Menambahkan migrasi SQL lokal `my-supabase-project/supabase/migrations/20261124151000_g1_2_bank_reconciliation.sql` (`BLOCKED remote`): tabel `planner_bank_statement_rows` (`UNIQUE(org_id, wallet_account_id, row_hash)`, `matched_journal_id REFERENCES planner_journal_entries(id) ON DELETE RESTRICT`), tabel `planner_bank_reconciliations`, dan RLS berbasis `is_org_member` bebas mutasi tabel jurnal.
  - Menambahkan layanan `apps/web/src/services/financeV2/bankReconciliationService.ts` (`importAndMatchBankStatement`, `runCashBankReconciliation`, `resolveBankStatementMatch`, `loadWalletLedgerCashLines`) yang mengintegrasikan domain deterministik dengan tabel Supabase tanpa mutasi jurnal.
  - Menambahkan suite TDD `apps/web/src/lib/financeV2/__tests__/bankReconciliation.test.ts` (BCA, Mandiri, BRI, BNI, Generic CSV, deduplikasi `rowHash`, pencocokan 1-to-1, toleransi tanggal, deteksi kandidat ambigu, antrean `unmatched`, rekonsiliasi `'reconciled'` vs `'needs_review'`, layanan Supabase mock, dan uji struktural SQL).
  - Memperbarui `docs/finance/DEPLOY-RUNBOOK.md` (Langkah 10), `docs/finance/PROGRESS.md`, dan `docs/finance/CHANGELOG.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template baru; membaca baris buku besar pada akun dompet `kas` (`debit - credit`) secara read-only.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124151000_g1_2_bank_reconciliation.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/bankReconciliation.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan signature tool agent; angka rekonsiliasi kas vs bank dihitung penuh oleh kode deterministik dari buku besar.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G1-1] 2026-11-24 — Ekstraksi Nota/Struk/Invoice -> Draf `prepare_entry` & Lampiran Bukti Terikat ke Jurnal
- **Branch / PR:** `feat/g1-1-receipt-extraction-attachment`
- **Fase:** G1 (Alur Bukti, Nota OCR, & Review Terstruktur — G1-1)
- **Perubahan & Alasan:**
  - Menambahkan parser & normalizer deterministik `packages/domain/src/receiptExtraction.ts` (`extractReceiptFields`, `buildPrepareEntryFromReceipt`, `computeDeterministicSha256`) untuk teks OCR nota/struk/invoice Indonesia: mengekstrak `entryDate` (via `parseTanggal`), `supplierName`, `invoiceNumber`, `items`, `subtotalAmount`, `taxAmount` (PPN/pajak), `totalAmount` (integer rupiah via `parseRupiah`), dan `contentHash` SHA-256 deterministik untuk deteksi duplikat.
  - Menghitung skor keyakinan per-field (`fieldConfidence`) & `overallConfidence` (`0..1`), menyusun flag `warnings` (`sum_items_mismatch_total`, `missing_date`, `low_confidence_total`, `prompt_injection_detected`, dll.), serta membersihkan segmen prompt injection sebelum membangun teks slot `prepare_entry`. Seluruh hasil ekstraksi **selalu berstatus `draft` (`requiresReview: true`)**, tidak pernah auto-commit dan tidak pernah memilih debit/kredit.
  - Menambahkan adapter `apps/web/src/lib/financeEntryEngine.ts` (`prepareFinanceEntry` yang mendelegasikan ke `agent-core/src/financeEntryEngine.ts`) dan layanan `apps/web/src/services/financeV2/receiptAttachmentService.ts` (`extractReceiptToDraft`, `saveReceiptDraftAttachment`, `findDuplicateAttachmentByHash`, `bindAttachmentToJournal`, `loadAttachmentsForJournal`) agar nota selalu menghasilkan draf ber-token dengan `attachmentMeta` (`attachmentHash`, `provenance`) terikat dan lampiran diikat ke `journal_entry_id` saat `commit_entry`.
  - Menambahkan migrasi SQL lokal `my-supabase-project/supabase/migrations/20261124150000_g1_1_journal_attachments.sql` (`BLOCKED remote`): tabel `planner_journal_attachments` (`journal_entry_id REFERENCES planner_journal_entries(id) ON DELETE RESTRICT`), indeks `(org_id, sha256_hash)` & `(journal_entry_id)`, RLS `is_org_member` (`worker` SELECT, `manager` INSERT & UPDATE pengikatan `NULL -> UUID` saja), serta trigger `planner_guard_journal_attachment_binding()` penolak hapus/ubah bukti yang sudah terikat jurnal.
  - Menambahkan suite TDD `apps/web/src/lib/financeV2/__tests__/receiptExtraction.test.ts` (nota toko bangunan PPN 11%, struk SPBU, invoice vendor, nota buram/mismatch, prompt injection, non-auto-commit `extractReceiptToDraft`, pengikatan `bindAttachmentToJournal`, dan uji struktural SQL).
  - Memperbarui `docs/finance/AGENT-GUIDE.md`, `docs/finance/DEPLOY-RUNBOOK.md` (Langkah 9), `docs/finance/PROGRESS.md`, dan `docs/finance/CHANGELOG.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak menambah akun/template baru; memakai template tertutup `prepare_entry` yang sudah ada dan mengikat lampiran bukti via `planner_journal_attachments.journal_entry_id`.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124150000_g1_1_journal_attachments.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/receiptExtraction.test.ts`.
- **Dampak ke Tool Agent:** Alur OCR nota selalu masuk melalui `prepare_entry` sebagai draf (`requiresReview: true`, tanpa auto-commit) dan mengikat `attachmentHash` + `provenance`.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G0-7/G0-8] 2026-11-24 — Uji Migrasi Sintetis Skala Besar, Paritas Lokal Offline Owner, & Laporan Gerbang G0
- **Branch / PR:** `feat/g0-7-8-staging-parity-report`
- **Fase:** G0 (Koreksi Fondasi Kebenaran — G0-7, G0-8, & Penutupan Gerbang G0)
- **Perubahan & Alasan:**
  - **G0-7:** Menambahkan skrip CLI mandiri Node ESM `scripts/g0-staging-migration-dryrun.mjs` (+ definisi tipe `scripts/g0-staging-migration-dryrun.d.mts`) dengan PRNG deterministik Mulberry32 yang membangkitkan dataset sintetis besar (**25 proyek, 350 realisasi biaya 6 tipe RAP termasuk uncategorized, 150 pemasukan DP/termin/pelunasan/retensi, piutang, hutang, modal, dividen — total 596 transaksi**) dan menguji rekonsiliasi F1 serta Neraca pasca-migrasi.
  - **G0-7 Tes:** Menambahkan `apps/web/src/lib/financeV2/__tests__/g0StagingDryRun.test.ts` yang menjalankan `reconcileF1Migration` nyata (`dryRun: true` lalu `dryRun: false`) dan `buildBalanceSheetFromBalances` pada dataset sintetis besar (non-mutasi dry-run, keseimbangan 485 jurnal reklasifikasi, `matched === true`, kesetaraan `kas`/`piutang`/`hutang`/`netProfit + dpReclassified`/`uangMukaKlien`, Neraca seimbang, dan 0 akun beban di `aktiva[]`).
  - **G0-8:** Menambahkan skrip 100% **offline** `scripts/g0-owner-local-parity-check.mjs` (+ `scripts/g0-owner-local-parity-check.d.mts`) dengan mode `--input <path-ke-export.json>` dan `--demo-synthetic` untuk membandingkan laporan operasional (`project_incomes`, `cost_realizations`, `opex_realizations`, mengecualikan `status IN ('dividend','cancelled')` & `deleted_at != null`) vs buku besar (`journal_entries`, `journal_lines`, `finance_accounts`) pada Total Pendapatan, Total HPP, Total Opex, Laba Bersih, Total Kas, Neraca (`isBalanced`, bebas beban di aktiva), serta melaporkan anomali (`missingJournalEntryId`, `unbalancedJournals`, `needs_review = true`).
  - **G0-8 Tes:** Menambahkan `apps/web/src/lib/financeV2/__tests__/g0OwnerParityScript.test.ts` dengan uji statis keamanan offline (terbukti bebas modul/API jaringan), uji `--demo-synthetic`, dan uji deteksi anomali via `--input`.
  - **Dokumentasi & Gerbang G0:** Menerbitkan `docs/finance/PHASES/G0-report.md`, menambahkan panduan ekspor & eksekusi lokal owner pada `docs/finance/DEPLOY-RUNBOOK.md`, dan memperbarui `docs/finance/PROGRESS.md` (menandai seluruh `G0-1`..`G0-8` `DONE` dan menyiapkan `G1`).
- **Akun / Template Jurnal Tersentuh:** Tidak mengubah logika runtime aplikasi atau skema DB; memverifikasi seluruh akun COA F1 (`kas`, `piutang`, `hutang_dagang`, `uang_muka_klien`, `modal_disetor`, `dividen`, `laba`, `pendapatan_proyek`, `hpp_*`, `beban_opex`) melalui simulasi & skrip paritas offline.
- **Migrasi SQL:** Tidak ada migrasi SQL baru pada PR ini (seluruh migrasi G0 `g0_1`, `g0_3`, `g0_4`, `g0_2`, `g0_5`, `g0_6` tetap lokal berstatus `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/g0StagingDryRun.test.ts`, `apps/web/src/lib/financeV2/__tests__/g0OwnerParityScript.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan signature tool agent.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G0-6] 2026-11-24 — Identitas Pihak via `party_id` & Pinjaman Antar Proyek via Jurnal Double-Entry
- **Branch / PR:** `feat/g0-6-party-id-interproject-loan`
- **Fase:** G0 (Koreksi Fondasi Kebenaran — G0-6)
- **Perubahan & Alasan:**
  - Menambahkan `'interproject_loan_disbursement'` dan `'interproject_loan_repayment'` ke `FINANCE_EVENT_CODES` & `buildJournalTemplate` serta helper 4-baris seimbang `interprojectLoanDisbursement(amount)` & `interprojectLoanRepayment(amount)` (`side: 'from' | 'to'`) di `packages/domain/src/journal.ts`.
  - Membuat modul domain `packages/domain/src/party.ts` (`normalizePartyName`, `resolvePartyId` yang mendahulukan `partyId` lalu exact normalized name/alias sambil menolak ambigu, `aggregatePartyBalancesById`, dan `aggregatePartyBalancesFromJournalLines` berbasis `party_id`).
  - Memperbarui `apps/web/src/lib/financeV2/partyLedger.ts` & `apps/web/src/services/financeV2/partyLedgerService.ts` agar mengelompokkan dan mencari pihak berdasarkan `party_id` (dengan fallback `normalizePartyKey` hanya untuk data legacy tanpa `party_id`), serta memperbarui `payableService.ts`, `receivableService.ts`, dan `apps/web/src/types/financeV2.ts` agar menyimpan & meneruskan `partyId` ke baris jurnal hutang/piutang dan mendukung `JournalReferenceType` `'interproject_loan'` & `'interproject_loan_repayment'`.
  - Menambahkan layanan `apps/web/src/services/financeV2/interprojectLoanService.ts` (`postInterprojectLoan`, `postInterprojectLoanRepayment`, `computeInterprojectLoanBalancesFromLines`, `loadInterprojectLoanBalances`) yang membaca & menulis langsung ke buku besar (via RPC dengan fallback `postJournalEntry`).
  - Menambahkan migrasi SQL lokal `my-supabase-project/supabase/migrations/20261124145000_g0_6_party_id_and_interproject_loans.sql` (`BLOCKED remote`): memperluas `planner_journal_entries_reference_type_check`, menambah kolom + indeks `party_id` secara idempoten pada `planner_payables`, `planner_receivables`, `planner_project_incomes`, `planner_cost_realizations`, dan membuat RPC append-only `public.planner_post_interproject_loan(...)`.
  - Menambahkan suite pengujian `apps/web/src/lib/financeV2/__tests__/partyAndInterprojectLoan.test.ts` (jurnal 4-baris seimbang pencairan & pelunasan, dampak L/R = 0 & kas konsolidasi = 0, penolakan proyek sama / nominal <= 0, resolusi & agregasi `party_id`, `validateJournalDimensions`, layanan `payableService`/`receivableService`/`interprojectLoanService`, serta uji struktural SQL).
  - Memperbarui `docs/finance/ACCOUNTING-MODEL.md`, `docs/finance/DECISIONS.md` (`D-G0-03`), `docs/finance/DEPLOY-RUNBOOK.md` (Langkah 8), dan `docs/finance/PROGRESS.md`.
- **Akun / Template Jurnal Tersentuh:** `piutang`, `hutang_lain`, `kas`, `kas_tujuan`, `hutang_dagang`, `hutang_pajak` (`interproject_loan_disbursement`, `interproject_loan_repayment`, `reference_type = 'interproject_loan' | 'interproject_loan_repayment'`).
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124145000_g0_6_party_id_and_interproject_loans.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/partyAndInterprojectLoan.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan signature tool; identitas pihak kini deterministik via `party_id` dan pinjaman antar proyek tercatat penuh di buku besar.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G0-5] 2026-11-24 — Pengakuan Pendapatan DP Berbasis Progres / Termin Terjadwal
- **Branch / PR:** `feat/g0-5-revenue-recognition`
- **Fase:** G0 (Koreksi Fondasi Kebenaran — G0-5)
- **Perubahan & Alasan:**
  - Menambahkan `'dp_revenue_recognition'` ke `FINANCE_EVENT_CODES`, helper `recognizeDownPaymentRevenue(amount)` (`Dr uang_muka_klien, Cr pendapatan_proyek`), serta cabang pada `buildJournalTemplate` di `packages/domain/src/journal.ts`.
  - Membuat modul domain deterministik `packages/domain/src/revenueRecognition.ts`: tipe `RevenueRecognitionMethod` (`'termin' | 'progress_pct'`), `computeRecognizableRevenue(input)` (menjamin bilangan bulat rupiah dan batas atas `dpReceivedTotal` tanpa over-recognition), dan `buildScheduledRecognitionPlan(projects, periodMonth)`.
  - Menambahkan migrasi SQL lokal `my-supabase-project/supabase/migrations/20261124144000_g0_5_revenue_recognition.sql` (status `BLOCKED remote`): menambah kolom `revenue_recognition_method` pada `planner_projects` (`DEFAULT 'termin'`), menambah `'revenue_recognition'` pada `planner_journal_entries_reference_type_check`, membuat tabel `planner_revenue_recognition_schedules` + RLS `is_org_member`, dan fungsi idempoten `public.planner_recognize_project_dp_revenue(...)` yang memposting jurnal append-only tanpa mutasi tabel jurnal.
  - Membuat layanan `apps/web/src/services/financeV2/revenueRecognitionService.ts` (`planMonthlyRevenueRecognition`, `postRevenueRecognition` via RPC dengan fallback `postJournalEntry` memakai `recognizeDownPaymentRevenue`), memperbarui `JournalReferenceType` di `apps/web/src/types/financeV2.ts`, serta mengekspor alias `postJournalEntry` di `apps/web/src/services/financeV2/journalService.ts`.
  - Menambahkan suite pengujian `apps/web/src/lib/financeV2/__tests__/revenueRecognition.test.ts` (progres bertahap `0% -> 30% -> 75% -> 100% -> 120%`, mode `'termin'` persentase & nominal eksplisit, `buildScheduledRecognitionPlan`, uji struktural SQL, dan uji layanan RPC/fallback).
  - Memperbarui `docs/finance/ACCOUNTING-MODEL.md`, `docs/finance/DECISIONS.md` (`D-G0-02`), `docs/finance/OPEN-QUESTIONS.md` (`Q-05`), `docs/finance/DEPLOY-RUNBOOK.md` (Langkah 7), dan `docs/finance/PROGRESS.md`.
- **Akun / Template Jurnal Tersentuh:** `uang_muka_klien`, `pendapatan_proyek` (`dp_revenue_recognition`, `reference_type = 'revenue_recognition'`).
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124144000_g0_5_revenue_recognition.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/revenueRecognition.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan signature tool; proyek kini mendukung pengakuan pendapatan DP bertahap yang idempoten di buku besar.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G0-2] 2026-11-24 — Migrasi RPC Atomik ke Akun F1 & Paritas SQL vs Domain
- **Branch / PR:** `feat/g0-2-rpc-f1-parity`
- **Fase:** G0 (Koreksi Fondasi Kebenaran — G0-2)
- **Perubahan & Alasan:**
  - Menambahkan migrasi SQL lokal `my-supabase-project/supabase/migrations/20261124143000_g0_2_rpc_f1_accounts.sql` (status `BLOCKED remote`): menambahkan `public.planner_hpp_account_type_for_rap(p_rap_type text)` (`IMMUTABLE`), memperbarui `planner_create_project_income_atomic` (`+ p_party_id DEFAULT NULL`, drop overload lama) ke akun F1 (`uang_muka_klien`, `piutang_retensi`, `piutang`, `pendapatan_proyek`, `kas`), memperbarui `planner_create_cost_realization_atomic` (`+ p_party_id DEFAULT NULL`, drop overload lama) ke `Dr hpp_<type>` (`needs_review = (v_hpp_type = 'hpp_uncategorized')`) & `Cr hutang_dagang` (akrual) / `Cr kas` (tunai), serta memperbarui `planner_backfill_cost_journals()` agar memakai `planner_hpp_account_type_for_rap` dengan `project_id` & `needs_review` tanpa memakai akun legacy `laba`.
  - Menambahkan spesifikasi paritas tunggal `resolveProjectIncomeTemplate` & `resolveProjectCostTemplate` di `packages/domain/src/journal.ts` serta memindahkan `projectExpense`/`projectIncome` agar tidak memakai `'laba'` untuk pencatatan proyek baru.
  - Memperbarui jalur fallback TS di `apps/web/src/services/financeV2/projectJournalBridge.ts`, `apps/web/src/services/incomeService.ts`, `apps/web/src/services/costService.ts`, `apps/web/src/services/financeV2/journalService.ts`, dan `apps/web/src/types/financeV2.ts` (`needsReview`) agar memakai akun F1 yang sama, serta menyesuaikan fixture COA F1 di `apps/web/src/services/financeV2/__tests__/f0AccountingCorrectness.test.ts`.
  - Menambahkan suite tes paritas `apps/web/src/lib/financeV2/__tests__/rpcDomainParity.test.ts` yang memverifikasi paritas 100% antara SQL di `20261124143000_g0_2_rpc_f1_accounts.sql` dan `packages/domain/src/journal.ts` + runtime `projectJournalBridge.ts`.
  - Memperbarui `docs/finance/ACCOUNTING-MODEL.md`, `docs/finance/DEPLOY-RUNBOOK.md` (Langkah 6), dan `docs/finance/PROGRESS.md`.
- **Akun / Template Jurnal Tersentuh:** `uang_muka_klien`, `piutang_retensi`, `piutang`, `pendapatan_proyek`, `hpp_material`, `hpp_labor`, `hpp_equipment`, `hpp_overhead`, `hpp_other`, `hpp_uncategorized`, `hutang_dagang`, `kas`.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124143000_g0_2_rpc_f1_accounts.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/rpcDomainParity.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan signature tool; transaksi pemasukan & biaya proyek dari UI maupun RPC kini langsung masuk ke akun F1 yang sama dengan jalur agent.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G0-4] 2026-11-24 — Jaminan Trigger Imutabilitas Jurnal & Tes Penolakan Mutasi
- **Branch / PR:** `feat/g0-4-immutability-guard`
- **Fase:** G0 (Koreksi Fondasi Kebenaran — G0-4)
- **Perubahan & Alasan:**
  - Menambahkan migrasi SQL lokal `my-supabase-project/supabase/migrations/20261124142000_g0_4_immutability_guard.sql` (status `BLOCKED remote`): memperbarui secara idempoten `public.planner_reject_journal_mutation()` dengan `RAISE EXCEPTION 'jurnal_tidak_boleh_diubah' USING ERRCODE = '55000'`, memasang ulang trigger `BEFORE UPDATE OR DELETE` pada `planner_journal_entries` (`planner_journal_entries_no_mutation`), `planner_journal_lines` (`planner_journal_lines_no_mutation`), dan `planner_journal_allocations` (`planner_journal_allocations_no_mutation`), serta memastikan RLS aktif tanpa policy `UPDATE`/`DELETE`/`ALL` pada ketiga tabel jurnal.
  - Menambahkan modul penjaga kontrak `apps/web/src/lib/financeV2/immutabilityGuard.ts` (`assertJournalOperationAllowed`, `JournalImmutabilityError`, `JOURNAL_IMMUTABLE_TABLES`).
  - Menambahkan suite pengujian otomatis `apps/web/src/lib/financeV2/__tests__/journalImmutability.test.ts` yang mencakup: (1) uji statis layanan TS di `apps/web/src/services/**` bebas `.update()`/`.delete()` pada tabel jurnal, (2) uji statis migrasi SQL pasca-phase3 (`20261124*`) bebas mutasi jurnal (kecuali file lama F1 yang telah digantikan G0-1), (3) uji struktural SQL terhadap `20261104140000_planner_phase3_ledger.sql` & `20261124142000_g0_4_immutability_guard.sql`, dan (4) uji kontrak perilaku ledger append-only yang menolak `UPDATE`/`DELETE` dengan `'jurnal_tidak_boleh_diubah'` sambil mengizinkan `INSERT` & jurnal pembalik (`reversal`).
  - Memperbaiki klaim asal trigger imutabilitas pada `docs/finance/DEPLOY-RUNBOOK.md` (dari fase 3 `20261104140000_planner_phase3_ledger.sql` & diperkuat G0-4 `20261124142000_g0_4_immutability_guard.sql`, bukan F0) serta mendokumentasikan urutan migrasi G0 (`g0_1`, `g0_3`, `g0_4`), dan memperbarui `docs/finance/PROGRESS.md`.
- **Akun / Template Jurnal Tersentuh:** Seluruh tabel buku besar (`planner_journal_entries`, `planner_journal_lines`, `planner_journal_allocations`); koreksi tetap menggunakan jurnal pembalik (`reference_type = 'reversal'`).
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124142000_g0_4_immutability_guard.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/journalImmutability.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan signature tool; kontrak append-only buku besar kini dijamin oleh trigger SQL (3 tabel) + tes statis/struktural/kontrak di CI.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G0-3] 2026-11-24 — Perbaikan Taksonomi Kategori Akun (`pendapatan`/`beban`) & Neraca
- **Branch / PR:** `feat/g0-3-account-taxonomy-neraca`
- **Fase:** G0 (Koreksi Fondasi Kebenaran — G0-3)
- **Perubahan & Alasan:**
  - Menambahkan migrasi SQL lokal `my-supabase-project/supabase/migrations/20261124141000_g0_3_account_taxonomy.sql` (status `BLOCKED remote`): memperluas `planner_finance_accounts_category_check` menjadi `('aktiva', 'pasiva', 'pendapatan', 'beban')`, memperbarui kategori baris akun existing (`pendapatan_proyek` $\rightarrow$ `'pendapatan'`, `hpp_*`/`beban_opex`/`beban_penyusutan` $\rightarrow$ `'beban'`), memperbarui `seed_default_chart_of_accounts`, dan memperbarui trigger `planner_apply_line_balance()` agar `'aktiva'` & `'beban'` memakai `NEW.debit - NEW.credit` serta `'pasiva'` & `'pendapatan'` memakai `NEW.credit - NEW.debit`.
  - Memperluas tipe `AccountCategory` di `apps/web/src/types/financeV2.ts` dan `JournalLineEnriched['accountCategory']` di `apps/web/src/lib/financeV2/reports/types.ts` menjadi `'aktiva' | 'pasiva' | 'pendapatan' | 'beban'`, serta menyelaraskan `balanceDelta`, `balancesFromLines`, `loadReportData`, `normalCategoryForAccountType`, dan `rollupByCategory`.
  - Mengekstrak fungsi murni `buildBalanceSheetFromBalances(balanceMap, asOfDate)` di `apps/web/src/lib/financeV2/reports/balanceSheetReport.ts` (dan menyelaraskan `apps/web/src/services/financeV2/balanceSheetService.ts`): mengecualikan akun `'pendapatan'` & `'beban'` dari `aktiva[]`/`pasiva[]`, menghitung `computedCurrentProfit = SUM(pendapatan) - SUM(beban)`, dan menggabungkannya secara konsisten dengan akun `'laba'` legacy (tanpa double-counting) pada sisi `pasiva[]` sebagai `"Laba Periode Berjalan (Dari Buku Besar)"` agar `Total Aktiva === Total Pasiva`.
  - Memperbarui `docs/finance/ACCOUNTING-MODEL.md` (tabel COA 4 kategori), `docs/finance/DECISIONS.md` (`D-G0-01`), dan `docs/finance/PROGRESS.md`.
- **Akun / Template Jurnal Tersentuh:** `pendapatan_proyek` (`pendapatan`), `hpp_material`, `hpp_labor`, `hpp_equipment`, `hpp_overhead`, `hpp_other`, `hpp_uncategorized`, `beban_opex`, `beban_penyusutan` (`beban`), serta agregasi `laba` pada Neraca.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124141000_g0_3_account_taxonomy.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/balanceSheetTaxonomy.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan signature tool; laporan Neraca dari buku besar kini bersih dari kebocoran akun beban/pendapatan.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [G0-1] 2026-11-24 — Perbaikan Rekonsiliasi Migrasi F1 Nyata (Append-Only & Dry-Run Rollback)
- **Branch / PR:** `feat/g0-1-real-migration-reconciliation`
- **Fase:** G0 (Koreksi Fondasi Kebenaran — G0-1)
- **Perubahan & Alasan:**
  - Memperbaiki `apps/web/src/lib/financeV2/reconciliation.ts` yang sebelumnya menyalin `after = { ...before }` secara hardcode: kini membentuk jurnal reklasifikasi append-only yang seimbang (`Dr hpp_<rapType> / Cr laba` untuk biaya lama, `Dr laba / Cr pendapatan_proyek` untuk pemasukan non-DP, dan `Dr laba / Cr uang_muka_klien` untuk DP dengan pelacakan `dpReclassified` eksplisit), menerapkannya pada salinan saldo akun (`applyReclassificationJournalsToAccounts`), menghitung `after` secara independen dari buku besar pasca-posting (`summarizeAccounts`), dan membandingkan `before` vs `after` secara nyata (`compareF1Reconciliation`) sehingga ketidaksesuaian menghasilkan `matched = false` dan `mismatches` terisi. Menambahkan dukungan idempotensi via `alreadyMigratedReferenceIds`.
  - Menambahkan migrasi SQL lokal `my-supabase-project/supabase/migrations/20261124140000_g0_1_real_f1_migration.sql` (status `BLOCKED remote`): menambah `'f1_migration'` pada `planner_journal_entries_reference_type_check` dan mengganti `planner_migrate_f1_ledger(p_org_id, p_dry_run)` agar tidak lagi melakukan mutasi pada `planner_journal_lines`, menyisipkan jurnal reklasifikasi append-only secara idempoten, menghitung ulang `v_kas_after`/`v_piutang_after`/`v_hutang_after`/`v_uang_muka_after`/`v_laba_after` secara nyata, melakukan rollback subtransaksi (`SQLSTATE 'P0001'`) pada mode dry-run, dan melempar `migrasi_f1_tidak_cocok` apabila mode non-dry-run tidak cocok.
  - Memperluas `apps/web/src/lib/financeV2/__tests__/reconciliation.test.ts` dengan tes jurnal reklasifikasi seimbang, perhitungan `after` independen, injeksi ketidaksesuaian (`matched=false`), non-mutasi dry-run, idempotensi, serta verifikasi struktural file SQL `20261124140000_g0_1_real_f1_migration.sql`.
  - Memperbarui `docs/finance/PROGRESS.md` dengan papan kerja Program G0–G6 (`G0-1` selesai).
- **Akun / Template Jurnal Tersentuh:** `laba`, `hpp_material`, `hpp_labor`, `hpp_equipment`, `hpp_overhead`, `hpp_other`, `hpp_uncategorized`, `pendapatan_proyek`, `uang_muka_klien` (`reference_type = 'f1_migration'`).
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124140000_g0_1_real_f1_migration.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** 4 kasus uji baru di `apps/web/src/lib/financeV2/__tests__/reconciliation.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan signature tool agent; konsistensi saldo COA F1 pasca-migrasi kini terverifikasi nyata.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F4-T2] 2026-11-24 — Uji E2E Siklus Bisnis Penuh, DEPLOY-RUNBOOK, & FINAL-REPORT
- **Branch / PR:** `finance/F4-T2-e2e-full-business-cycle-and-final-report`
- **Fase:** F4 (AI Belajar RAP & E2E) — Penutupan Program F0–F4
- **Perubahan & Alasan:**
  - Menambahkan `apps/web/src/lib/financeV2/__tests__/fullBusinessCycleE2E.test.ts` untuk memverifikasi siklus bisnis lengkap dari awal sampai tutup periode, dividen dua mode, eksekusi agent 3 contoh wajib + aset vs opex, serta kesamaan angka `businessReportFromLedger` == buku besar.
  - Menambahkan `rapLearningEval.test.ts` & `fullBusinessCycleE2E.test.ts` ke `.github/workflows/agent-eval.yml`.
  - Menerbitkan `docs/finance/DEPLOY-RUNBOOK.md` (prosedur aman migrasi SQL F0/F1 yang `BLOCKED remote`) dan `docs/finance/FINAL-REPORT.md` (rangkuman F0–F4 + bagian TINDAKAN PEMILIK).
  - Menutup `PHASES/F4-report.md` & memperbarui `PROGRESS.md` (seluruh fase F0–F4 `DONE`).
- **Akun / Template Jurnal Tersentuh:** Seluruh siklus COA F1 dan template domain pada uji E2E in-memory.
- **Migrasi SQL:** Tidak ada migrasi baru (`F0` & `F1` tetap lokal `BLOCKED remote`, didokumentasikan di `DEPLOY-RUNBOOK.md`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/fullBusinessCycleE2E.test.ts`.
- **Dampak ke Tool Agent:** Validasi end-to-end otomatis di CI bersama gold eval F3 & MAPE eval F4.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F4-T1] 2026-11-24 — AI Belajar RAP dari Proyek Selesai, Fallback Katalog, & Evaluasi MAPE
- **Branch / PR:** `finance/F4-T1-rap-learning-and-eval`
- **Fase:** F4 (AI Belajar RAP & E2E)
- **Perubahan & Alasan:**
  - Membangun `packages/domain/src/rapLearning.ts` (`buildRapLearningDataset`, `generateRapDraftFromHistory`, `computeRapCompletionFeedback`, `evaluateRapPredictionMape`) yang menormalisasi realisasi proyek selesai (`completed`/`finance_closed`) per satuan volume (`m2`/`unit`), mengeluarkan draf rentang `low`/`mid`/`high` beserta *provenance* (`Berdasarkan N proyek serupa` jika $N \ge 3$ atau fallback katalog Estimator jika $N < 3$), serta selalu mewajibkan `requiresOwnerApproval: true`.
  - Menambahkan `apps/web/src/services/financeV2/rapLearningService.ts` (`proposeRapDraftForProject`, `approveRapDraft`, `recordProjectRapCompletionFeedback`).
  - Menambahkan dataset `evals/finance/rap_historical_eval.yaml` (6 proyek selesai historis + 3 proyek *holdout*) dan tes `apps/web/src/lib/rapLearningEval.test.ts`.
  - Menulis `PHASES/F4-plan.md`, `PHASES/F4-report.md`, memperbarui `AGENT-GUIDE.md` & `PROGRESS.md`.
- **Akun / Template Jurnal Tersentuh:** Membaca realisasi `hpp_*` dari buku besar (`buildProfitLossFromLines`); tidak menulis jurnal langsung tanpa persetujuan RAP.
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** `apps/web/src/lib/rapLearningEval.test.ts`, `evals/finance/rap_historical_eval.yaml`.
- **Dampak ke Tool Agent:** AI dapat mengusulkan draf RAP berrentang + *provenance* yang selalu meminta persetujuan pemilik.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F3-T2] 2026-11-24 — Gold Set Evaluasi 218 Kalimat Indonesia pada 2 Model Kecil & Integrasi CI
- **Branch / PR:** `finance/F3-T2-gold-eval-200-two-models`
- **Fase:** F3 (AI Pencatat)
- **Perubahan & Alasan:**
  - Menerbitkan dataset gold `evals/finance/gold_200_id.yaml` (**218** kalimat nyata bahasa Indonesia mencakup 9 intent, singkatan, typo, variasi rupiah/tanggal, 3 kalimat contoh wajib, kasus pengaman periode terkunci, pengeluaran pribadi, proyek ambigu, & ambang aset tetap $\ge \text{Rp }5.000.000$).
  - Menambahkan `agent-core/src/financeEvalRunner.ts` dan `apps/web/src/lib/financeAgentEval.test.ts` yang mengevaluasi 2 profil model kecil (`tier-small-flash-lite` dan `tier-small-haiku-mini`).
  - Memperketat urutan intent & resolusi entitas di `financeEntryEngine.ts` berdasarkan temuan iterasi evaluasi pertama (`pelunasan hutang/piutang` vs `catat_pemasukan`, urutan RAP `overhead -> equipment -> labor -> material`, proyek eksplisit dengan kata `listrik`/`kebersihan`, transfer `dari X ke Y` & `top up Y dari X`, serta isolasi substring nama proyek saat mencocokkan pihak).
  - Menambahkan tes F2 & F3 ke `.github/workflows/agent-eval.yml`, memperbarui `PROGRESS.md`, dan menerbitkan `PHASES/F3-report.md`.
- **Akun / Template Jurnal Tersentuh:** Semua 24 template F1 (via `financeEntryEngine.ts`).
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** `apps/web/src/lib/financeAgentEval.test.ts`, `evals/finance/gold_200_id.yaml`.
- **Dampak ke Tool Agent:** Verifikasi akurasi & anggaran token 2 model kecil berjalan otomatis di CI.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F3-T1] 2026-11-24 — Engine AI Pencatat 9 Intent (`prepare_entry` / `commit_entry`), Klasifikasi 3 Lapis, & Memori Koreksi
- **Branch / PR:** `finance/F3-T1-prepare-commit-classifier-intents`
- **Fase:** F3 (AI Pencatat)
- **Perubahan & Alasan:**
  - Membangun `agent-core/src/financeEntryEngine.ts`: mendukung 9 intent tertutup (`catat_biaya_proyek`, `catat_opex`, `catat_pemasukan`, `bayar_hutang`, `terima_piutang`, `kasbon`, `transfer_kas`, `dividen`, `tanya_saldo`), ekstraksi rupiah/tanggal deterministik, resolusi entitas dengan alias + fuzzy (`needs_choice` maks. 5 kandidat), klasifikasi 3 lapis (`org_rule` -> `domain_rule` -> `llm_closed_choice` maks. 5 kandidat), 3 pita keyakinan (`auto_commit` / `confirm_one_tap` / `ask_back`), penjaga aset vs opex $\ge \text{Rp }5.000.000$, blokir pengeluaran pribadi & periode terkunci, wajib `ownerApproved` untuk dividen, dan `recordFinanceCorrection`.
  - Mendaftarkan `prepare_entry` & `commit_entry` di `agent-core/src/registry.ts` (menjaga batas $\le 8$ tool/spesialis dengan memisahkan tool biaya proyek legacy ke `project`/`purchasing`) serta menyinkronkan `functions.json`, `mcp.json`, `fixtures.json`, dan `AGENT_MANUAL.md`.
  - Menulis `PHASES/F3-plan.md`, memperbarui `AGENT-GUIDE.md` beserta system prompt $\le 1.200$ token, dan menambah `financeEntryEngine.test.ts`.
- **Akun / Template Jurnal Tersentuh:** Semua 24 template kode kejadian di `packages/domain/src/journal.ts` (`source='agent'`, `model`, `prepare_token`).
- **Migrasi SQL:** Tidak ada (kolom metadata sudah disiapkan di migrasi F1).
- **Tes Ditambah:** `apps/web/src/lib/financeEntryEngine.test.ts`.
- **Dampak ke Tool Agent:** Specialist `finance` & `manager` memakai `prepare_entry` + `commit_entry` (9 intent) selain `get_finance_snapshot`.
- **Cara Rollback:** `git revert` commit merge PR ini dan jalankan ulang `writeArtifacts.ts`.

## [F2-T2] 2026-11-24 — Tool `get_finance_snapshot` ($\le 400$ Token) & Laporan Akhir F2
- **Branch / PR:** `finance/F2-T2-agent-finance-snapshot`
- **Fase:** F2 (Tampilan & Snapshot)
- **Perubahan & Alasan:**
  - Menambahkan `agent-core/src/financeSnapshot.ts` (`buildFinanceSnapshot`, `estimateJsonTokens`) yang mengembalikan JSON ringkas $\le 400$ token (~278 token untuk 8 dompet & 8 proyek), membatasi daftar ke maks. 5 item + total, serta mendukung parameter `kind` (`ringkasan`, `laba_rugi`, `neraca`, `arus_kas`).
  - Mendaftarkan `get_finance_snapshot` ke `agent-core/src/registry.ts` (deskripsi 11 kata $\le 25$ kata) dan menjaga `toolsFor('finance' | 'manager', *) <= 8` dengan menata ulang `propose_notification` ke `['project', 'purchasing', 'hr']`.
  - Menjalankan `writeArtifacts.ts` sehingga `agent-core/functions.json`, `agent-core/mcp.json`, `agent-core/fixtures.json`, dan `docs/agent/AGENT_MANUAL.md` tersinkronisasi.
  - Menambah kasus uji `evals/finance/f2_snapshot.yaml`, memperluas `apps/web/src/lib/agentTools.test.ts`, memperbarui `docs/finance/AGENT-GUIDE.md` & `PROGRESS.md`, dan menerbitkan `docs/finance/PHASES/F2-report.md`.
- **Akun / Template Jurnal Tersentuh:** Read-only dari saldo & ringkasan laporan buku besar `financeV2`.
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** Uji token budget & truncation F2 di `apps/web/src/lib/agentTools.test.ts` + `evals/finance/f2_snapshot.yaml`.
- **Dampak ke Tool Agent:** Specialist `finance` dan `manager` kini memiliki tool `get_finance_snapshot(kind?, project_id?)`.
- **Cara Rollback:** `git revert` commit merge PR ini dan jalankan ulang `writeArtifacts.ts`.

## [F2-T1] 2026-11-24 — 3 Kartu Halaman Depan, Laporan V1 dari Buku Besar, & Dividen 2 Mode
- **Branch / PR:** `finance/F2-T1-three-cards-v1-report-dividend-ui`
- **Fase:** F2 (Tampilan & Snapshot)
- **Perubahan & Alasan:**
  - Menambahkan `overviewCards.ts` + `overviewCardsService.ts` + komponen `FinanceOverviewThreeCards.tsx` untuk menampilkan 3 kartu utama di overview keuangan: (1) Uang & Hutang-Piutang (dompet kas, piutang/retensi, hutang jatuh tempo), (2) Untung/Rugi per Proyek (laba, margin %, RAP vs realisasi), (3) Bisnis Bulan Ini (profit kotor, plan vs realisasi opex, profit bersih).
  - Menambahkan `dividendModes.ts` + komponen `DividendTwoModePanel.tsx` untuk simulasi dan penyusunan jurnal dividen mode `per_proyek` (pool kas bersih proyek + offset piutang owner) dan mode `per_bisnis` (dari Laba Ditahan dengan batas kas dikurangi cadangan $1\times$ opex bulanan terencana sesuai `D-F2-01`).
  - Memperbarui `balanceSheetService.ts` (`computePeriodProfitFromAccounts`), `LaporanPage.tsx` (margin % & tabel profitabilitas per proyek dari buku besar pada tab Laba Rugi), dan `FinanceSandboxOverview.tsx` (aman untuk Demo mode).
  - Menulis `PHASES/F2-plan.md`, menambah `D-F2-01` di `DECISIONS.md`, dan memperbarui `PROGRESS.md`.
- **Akun / Template Jurnal Tersentuh:** `kas`, `piutang`, `piutang_retensi`, `pendapatan_proyek`, `hpp_*`, `beban_opex`, `laba_ditahan`, `dividen` (`businessDividendCash`, `projectDividendCash`).
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/f2OverviewDividend.test.ts`.
- **Dampak ke Tool Agent:** Fondasi data 3 kartu yang sama akan dipakai langsung oleh `get_finance_snapshot` di `F2-T2`.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F1-T2] 2026-11-24 — Migrasi SQL Lokal F1, Rekonsiliasi Dry-Run, & Pensiun Penghitung V1
- **Branch / PR:** `finance/F1-T2-migration-reconciliation-retire-v1`
- **Fase:** F1 (Akun Baru & Dimensi Proyek)
- **Perubahan & Alasan:**
  - Menulis migrasi SQL lokal `20261124120000_f1_coa_and_dimensions.sql` (`BLOCKED remote`): memperluas constraint COA, menambah `project_id`/`party_id`/`needs_review` pada `planner_journal_lines`, menambah `source`/`model`/`prepare_token` pada `planner_journal_entries`, memperbarui `seed_default_chart_of_accounts` & `planner_post_journal`, serta menambah RPC `planner_migrate_f1_ledger(org_id, p_dry_run)`.
  - Menambahkan engine rekonsiliasi & dry-run TypeScript di `apps/web/src/lib/financeV2/reconciliation.ts` + tes `reconciliation.test.ts`.
  - Memperbarui `profitLossReport.ts`, `loadReportData.ts`, dan `projectReport.ts` agar membaca akun F1 dan dimensi `project_id`/`party_id` langsung dari baris jurnal, serta mempertahankan kompatibilitas F0.
  - Memensiunkan `financeV1` sebagai penghitung: `businessReportService.ts` kini membaca buku besar `financeV2` via `businessReportFromLedger`.
  - Mencatat keputusan `D-F1-01` & `D-F1-02` di `DECISIONS.md`, memperbarui `ACCOUNTING-MODEL.md`, `PROGRESS.md`, dan menerbitkan `PHASES/F1-report.md`.
- **Akun / Template Jurnal Tersentuh:** Seluruh COA F1 (`pendapatan_proyek`, `hpp_*`, `uang_muka_klien`, `piutang_retensi`, `beban_opex`, `beban_penyusutan`, `akumulasi_penyusutan`, `dividen`).
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124120000_f1_coa_and_dimensions.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/lib/financeV2/__tests__/reconciliation.test.ts`.
- **Dampak ke Tool Agent:** Metadata `source`, `model`, `prepare_token` siap disimpan di `planner_journal_entries`.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F1-T1] 2026-11-24 — COA Baru, Dimensi Proyek/Pihak, & Template Kejadian Tertutup
- **Branch / PR:** `finance/F1-T1-coa-project-party-templates`
- **Fase:** F1 (Akun Baru & Dimensi Proyek)
- **Perubahan & Alasan:**
  - Memperluas `AccountType` dan `ACCOUNT_TYPE_LABEL` di `apps/web/src/types/financeV2.ts` dengan akun-akun F1 (`pendapatan_proyek`, `uang_muka_klien`, `piutang_retensi`, `hpp_material`, `hpp_labor`, `hpp_equipment`, `hpp_overhead`, `hpp_other`, `hpp_uncategorized`, `beban_opex`, `beban_penyusutan`, `akumulasi_penyusutan`, `dividen`), sambil menjaga kompatibilitas `laba`.
  - Menambahkan helper `hppAccountTypeForRapType` dan `computePeriodProfitFromAccounts` di `accountService.ts`.
  - Memperluas `packages/domain/src/journal.ts` dengan 24 enum kejadian tertutup (`FINANCE_EVENT_CODES`), builder `buildJournalTemplate`, template lengkap (DP klien, termin potong DP, retensi, opex, akrual hutang/piutang, kasbon, penyusutan, dividen, tutup proyek/periode), serta validator dimensi `validateJournalDimensions` (`project_id` & `party_id`).
  - Memperbarui `docs/finance/PROGRESS.md` dan `docs/finance/PHASES/F1-plan.md`.
- **Akun / Template Jurnal Tersentuh:** Seluruh 24 kejadian di `FINANCE_EVENT_CODES` dan COA F1.
- **Migrasi SQL:** Disiapkan pada PR `F1-T2`.
- **Tes Ditambah:** `apps/web/src/lib/domainJournal.test.ts` (tes seluruh 24 template + dimensi + mapping RAP).
- **Dampak ke Tool Agent:** Menyediakan enum kejadian tertutup `FINANCE_EVENT_CODES` untuk tool F3.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F0-T9] 2026-11-24 — Gerbang Agent-Ready F0, Tes Invarian Buku Besar, & Laporan F0
- **Branch / PR:** `finance/F0-T9-invariants-agent-gate-report`
- **Fase:** F0 (Kebenaran — Gerbang Akhir Fase)
- **Perubahan & Alasan:**
  - Menambahkan parser tanggal Indonesia deterministik `parseTanggal` di `packages/domain/src/dates.ts` (diekspor ulang di `money.ts`) beserta unit test di `apps/web/src/lib/domainMoney.test.ts`.
  - Menambahkan guard `lockedPeriods` (`periode_terkunci`) serta metadata `source` dan `model` pada `prepareRecordCost` di `agent-core/src/prepare.ts`.
  - Menambahkan kasus guardrail F0 di `evals/finance/f0_guardrails.yaml` dan tes anggaran token/guardrail di `apps/web/src/lib/agentTools.test.ts`.
  - Menambahkan suite tes invarian buku besar lengkap di `apps/web/src/lib/financeV2/__tests__/ledgerInvariants.test.ts`.
  - Menerbitkan laporan akhir fase `docs/finance/PHASES/F0-report.md`.
- **Akun / Template Jurnal Tersentuh:** Semua template domain diverifikasi seimbang pada `ledgerInvariants.test.ts`.
- **Migrasi SQL:** Tidak ada migrasi baru (seluruh SQL F0 berada di `20261124100000_f0_accounting_correctness.sql`, status `BLOCKED remote`).
- **Tes Ditambah:** `ledgerInvariants.test.ts`, tes `parseTanggal` di `domainMoney.test.ts`, tes guardrail & token di `agentTools.test.ts`.
- **Dampak ke Tool Agent:** `prepareRecordCost` mendukung `lockedPeriods`, `source`, dan `model`; seluruh deskripsi tool terverifikasi $\le 25$ kata.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F0-T6/T7] 2026-11-24 — Guard Tutup Proyek, Periode Terkunci, & Investor Atomik + Batas Dividen
- **Branch / PR:** `finance/F0-T6-T7-guards-and-atomic-investor`
- **Fase:** F0 (Kebenaran — T6 & T7)
- **Perubahan & Alasan:**
  - **T6a (`projectCloseService.ts`, `kasService.ts`):** `buildProjectClosePreview` kini memuat hutang proyek (`openPayables`) dan retensi belum cair (`openRetention`). `closeProjectFinance` memblokir penutupan proyek apabila masih ada piutang, retensi, hutang proyek, atau hutang antar-proyek terbuka kecuali diberikan `ownerWriteOff` eksplisit bertanda pemilik (`actorRole === 'owner'` dan `reason` terisi).
  - **T6b (`journalService.ts`, SQL `planner_post_journal`):** Menambahkan `assertPeriodNotLocked` di client dan validasi `periode_terkunci` di RPC `planner_post_journal` terhadap `planner_finance_period_snapshots`.
  - **T7 (`investorService.ts`, SQL `planner_sync_investor_total_invested`):** Memvalidasi `amount <= Kas Bisnis` dan `amount <= Laba Ditahan` sebelum menyisipkan transaksi dividen investor, menurunkan `total_invested` secara deterministik dari seluruh transaksi `planner_investor_transactions` (+ trigger SQL), serta menambahkan kompensasi rollback bila jurnal gagal.
- **Akun / Template Jurnal Tersentuh:** `Kas Bisnis`, `Modal Disetor`, `Laba Ditahan` (`dividend`, `manual`), seluruh jurnal pada periode terkunci.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124100000_f0_accounting_correctness.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** Tes T6a, T6b, dan T7 di `apps/web/src/services/financeV2/__tests__/f0AccountingCorrectness.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan signature tool; aturan periode terkunci dan persetujuan pemilik selaras dengan kontrak di `AGENT-GUIDE.md`.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F0-T3/T4] 2026-11-24 — Posting Atomik Pemasukan/Biaya & Edit/Hapus dengan Pembalik + Soft-Delete
- **Branch / PR:** `finance/F0-T3-T4-atomic-posting-and-reversals`
- **Fase:** F0 (Kebenaran — T3 & T4)
- **Perubahan & Alasan:**
  - **T3 (`incomeService.ts`, `costService.ts`, `projectJournalBridge.ts`, SQL RPC):**
    - Menambahkan RPC atomik `planner_create_project_income_atomic` dan `planner_create_cost_realization_atomic` di migrasi lokal (`BLOCKED remote`) sehingga baris sumber + jurnal tersimpan dalam satu transaksi.
    - Menambahkan kompensasi rollback pada fallback client bila RPC belum ada di remote, dan menghapus seluruh `console.error` yang menelan kegagalan posting jurnal.
    - `postProjectIncomeJournal` dan `postProjectExpenseJournal` memanggil `ensureChartOfAccounts` dan melempar error eksplisit bila akun sistem tetap tidak ditemukan.
  - **T4 (`costService.ts`, `incomeService.ts`, SQL `planner_post_journal`):**
    - `updateCostRealization` kini memposting jurnal pembalik (`reverseProjectJournal`) atas jurnal lama, lalu memposting jurnal baru dengan nominal/tanggal terbaru dan memperbarui `journal_entry_id`.
    - Memperbarui `planner_post_journal` di migrasi lokal agar dedup mengabaikan jurnal yang sudah di-reverse sehingga reposting setelah koreksi dapat membuat jurnal baru.
    - `deleteCostRealization`, `deleteCostsByRapItemId`, `deleteAllCosts`, dan `deleteProjectIncome` kini membalik jurnal tanpa menelan error dan melakukan *soft-delete* (`status = 'cancelled'`, `deleted_at`) pada baris sumber.
- **Akun / Template Jurnal Tersentuh:** `Kas Proyek`, `Laba Periode Berjalan` (`project_income`, `project_expense`, `reversal`).
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124100000_f0_accounting_correctness.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** Tes T3 dan T4 di `apps/web/src/services/financeV2/__tests__/f0AccountingCorrectness.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan signature tool; jalur tulis bersama lebih aman.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F0-T2/T5] 2026-11-24 — Laba Tidak Terhitung Dua Kali & Klasifikasi HPP Berbasis Akun/Jenis
- **Branch / PR:** `finance/F0-T2-T5-profit-loss-single-count`
- **Fase:** F0 (Kebenaran — T2 & T5)
- **Perubahan & Alasan:**
  - **T5 (`profitLossReport.ts`):** Menghapus klasifikasi HPP berbasis kata `"stok"` di deskripsi. Semua baris `project_expense` dan `payable_payment` masuk ke `hpp`; `amortize`/`depreciation` ke `otherExpense`; `opex`/`bon_disbursement` ke `opex`; `reversal` membalik kategori jurnal aslinya; dan jurnal penutup/distribusi ekuitas (`project_close`, `period_close`, `dividend`) diabaikan dari laporan Laba/Rugi.
  - **T2 (`periodCloseService.ts` & `kasService.ts`):** `closeFinancePeriod` menghitung selisih `netProfit` dikurangi laba proyek yang sudah ditutup lewat `project_close` pada periode tersebut sehingga laba hanya berpindah satu kali ke `Laba Ditahan` dan saldo `Laba Periode` menjadi `0`. Memperbaiki juga perhitungan `monthEnd` agar tidak bergeser mundur 1 hari di zona waktu UTC+7.
- **Akun / Template Jurnal Tersentuh:** `Laba Periode Berjalan`, `Laba Ditahan` (`project_close`, `period_close`, `project_expense`, `reversal`).
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** Tes T2 dan T5 di `apps/web/src/services/financeV2/__tests__/f0AccountingCorrectness.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F0-T1] 2026-11-24 — Dividen Proyek sebagai Jurnal Ekuitas, Bukan Biaya Proyek
- **Branch / PR:** `finance/F0-T1-project-dividend-equity`
- **Fase:** F0 (Kebenaran — T1)
- **Perubahan & Alasan:**
  - Menghapus penyisipan dividen ke `planner_cost_realizations` pada `projectDividendService.recordDividendPayouts`.
  - Menambahkan `postProjectDividendJournal` di `projectJournalBridge.ts` dan template `projectDividendCash` / `projectDividendReceivableOffset` di `packages/domain/src/journal.ts`:
    - Pembayaran kas dividen: `Dr Laba Ditahan, Cr Kas Proyek` (`reference_type = 'dividend'`).
    - Offset piutang owner: `Dr Laba Ditahan, Cr Piutang Usaha` (`reference_type = 'dividend'`).
  - Mengecualikan baris berstatus `'dividend'` dan `'cancelled'` di `backfillProjectJournalsForOrg` dan `getFinanceIntegrationStatus`.
  - Menulis migrasi SQL lokal `20261124100000_f0_accounting_correctness.sql` (status `BLOCKED remote`) untuk mengecualikan `'dividend'`/`'cancelled'`/`deleted_at` dari trigger `planner_fill_derived_project_totals()` (`total_spent`) dan `planner_backfill_cost_journals()`.
- **Akun / Template Jurnal Tersentuh:** `Laba Ditahan`, `Kas Proyek`, `Piutang Usaha`; template `projectDividendCash`, `projectDividendReceivableOffset`.
- **Migrasi SQL:** `my-supabase-project/supabase/migrations/20261124100000_f0_accounting_correctness.sql` (lokal saja, `BLOCKED remote`).
- **Tes Ditambah:** `apps/web/src/services/financeV2/__tests__/f0AccountingCorrectness.test.ts` (T1) & update `apps/web/src/lib/domainJournal.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan tool agent; `packages/domain/src/journal.ts` bertambah 2 template ekuitas.
- **Cara Rollback:** `git revert` commit merge PR ini.

## [F0-T8] 2026-11-24 — Keluarkan `apps/web/.env.local` dari Git & Tambah ke `.gitignore`
- **Branch / PR:** `finance/F0-T8-remove-env-local`
- **Fase:** F0 (Kebenaran — T8)
- **Perubahan & Alasan:**
  - Menghapus `apps/web/.env.local` dari indeks Git (`git rm --cached apps/web/.env.local`) sambil mempertahankan file lokal di disk.
  - Menambahkan `apps/web/.env.local` dan `apps/*/.env.local` secara eksplisit ke `.gitignore`.
  - Mencatat kewajiban rotasi manual semua token pada file tersebut (termasuk token Vercel) di `OPEN-DECISIONS.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak ada.
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** Verifikasi `git ls-files apps/web/.env.local` kosong dan `git check-ignore apps/web/.env.local` berhasil.
- **Dampak ke Tool Agent:** Tidak ada.
- **Cara Rollback:** `git revert` commit merge PR ini (tidak disarankan karena menyangkut keamanan kredensial).

## [F0-T0] 2026-11-24 — Kerangka Dokumentasi Keuangan, Template PR, & Gerbang CI `docs-gate`
- **Branch / PR:** `finance/F0-T0-docs-framework`
- **Fase:** F0 (Kebenaran)
- **Perubahan & Alasan:**
  - Membentuk seluruh kerangka dokumen wajib di `docs/finance/` (`ACCOUNTING-MODEL.md`, `CHANGELOG.md`, `DECISIONS.md`, `AGENT-GUIDE.md`, `OPEN-QUESTIONS.md`, `PHASES/F0-plan.md`).
  - Menambahkan `.github/pull_request_template.md` dengan checklist verifikasi akuntansi, dokumen, migrasi, dan dampak ke tool agent.
  - Menambahkan skrip gerbang CI `scripts/docs-gate-check.mjs`, script `npm run gate:docs`, workflow `.github/workflows/docs-gate.yml`, serta tes unit `apps/web/src/lib/docsGateCheck.test.ts` untuk menggagalkan PR bila file keuangan berubah tanpa pembaruan `docs/finance/CHANGELOG.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak ada perubahan kode akuntansi; mendokumentasikan baseline COA & template F0.
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** `apps/web/src/lib/docsGateCheck.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan runtime tool; mendefinisikan kontrak di `docs/finance/AGENT-GUIDE.md`.
- **Cara Rollback:** `git revert` commit merge PR ini.

