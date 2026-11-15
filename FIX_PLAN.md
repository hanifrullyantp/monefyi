# FIX PLAN — Froyek (Monorepo `/Users/user/Documents/GitHub/monefyi`)

Dokumen ini adalah rencana perbaikan terverifikasi hasil **Fase 0 (Triase & Perencanaan)** berdasarkan audit [FROYEK_AUDIT_REPORT.md](./FROYEK_AUDIT_REPORT.md), inventaris `grep -ri monefyi` ([`/tmp/monefyi_grep_inventory.txt`](/tmp/monefyi_grep_inventory.txt)), dan verifikasi langsung kode sumber aktual.

---

## 1. Keputusan Produk Final & Batasan Operasional (Wajib Dipatuhi)

1. **Migrasi Brand ke Froyek:** Semua UI, teks/copywriting publik, footer dokumen/PDF/Excel, widget CS, email transaksional Froyek/Planner/Estimator, dan domain publik bermigrasi ke **Froyek** dan **`froyek.com`** (`estimator.froyek.com`, `support@froyek.com`, dst.).
2. **Gating Kata "Estimator":** Kata **"Estimator"** hanya boleh tampil jika tenant/user memiliki lisensi Estimator (`snapshot.isEstimator === true` dan bukan paket Pro/Enterprise, atau pada jalur khusus pemilik lisensi Estimator). User Free Plan tidak lagi menampilkan chrome/brand "Estimator".
3. **Bypass `lower.includes('indra')` DISENGAJA (`F-25`):** Pengecualian multi-device di `monefyi_planner/src/services/singleDeviceSessionService.ts:15-24` berstatus **`[BUKAN-BUG]` / `SUDAH-BENAR`** sesuai keputusan produk. **Jangan dihapus** — tambahkan komentar penjelasan di Fase 6 dan pertahankan test terkait.
4. **Kuota/Harga `entitlementService.ts` Tidak Diubah (`F-04`):** Logika kuota dan harga di `monefyi_planner/src/services/entitlementService.ts` dan `monefyi_planner/src/lib/entitlement.ts` **tidak diubah**. Hanya redaksi pesan paywall yang diperbarui (Fase 4) agar sesuai Froyek tanpa menyebut "Estimator" untuk pengguna non-lisensi Estimator.
5. **Identifier Internal Tetap:** Nama folder (`monefyi_planner`, `PlannerLP2`, `my-supabase-project`), nama package (`monefyi-planner`), nama environment variable (`VITE_*`, `NEXT_PUBLIC_*`, `MONEFYI_EMAIL_PRODUCT`, `VERCEL_OIDC_TOKEN`), nama tabel/kolom DB, project ref Supabase (`zzwqfmdyncxbolestkqp`), nama/URL Edge Functions (`monefyi-admin-*`, `planner-*`), serta `localStorage`/`sessionStorage`/custom event key internal (atau pertahankan dual-read fallback) **TIDAK diubah**.
6. **Tidak Push/Deploy ke Supabase Remote Produksi:** Semua `.env.local` mengarah ke instance remote yang sama (`https://zzwqfmdyncxbolestkqp.supabase.co`). Perubahan skema DB Fase 3 **hanya ditulis sebagai file migrasi SQL lokal** di `my-supabase-project/supabase/migrations/` dan **tidak** dieksekusi ke remote. Kode frontend wajib backward-compatible jika kolom baru belum tersedia di remote.

---

## 2. Baseline Environment & Hasil Verifikasi Awal

Semua verifikasi baseline dijalankan pada kondisi repo bersih sebelum modifikasi kode apa pun:

| Komponen / Suite | Versi / Konfigurasi Terverifikasi | Perintah Uji | Hasil Aktual (Teramati) |
|---|---|---|---|
| **SPA (`monefyi_planner/`)** | Vite `7.3.2` (port default `5173`), React `19.2.6`, TypeScript `5.9.3`, Vitest `3.2.6` (`^3.2.4`) | `npx tsc --noEmit && npm test` | **PASS (exit 0)** — `tsc` bersih; Vitest **`57/57` test files, `391/391` tests passed** (`31.02s`). |
| **Landing & Admin (`PlannerLP2/`)** | Next.js `16.2.6`, React `19.2.6`, TypeScript `5.9.3` | `npm run typecheck && npm run test:all-engine` | **PASS (exit 0)** — `tsc` bersih; engine scenarios `33 + 16 + 12 + 19 + 6 + 7 = 93` passed (`0` failed) + **`Eval Gate: 8 skenario \| normalRate=100% \| critical=0 \| LULUS`**. |
| **Environment Lokal (`.env.local`)** | Root, `monefyi_planner/.env.local`, dan `PlannerLP2/.env.local` memakai `https://zzwqfmdyncxbolestkqp.supabase.co` | Inspeksi nama variabel & URL | Tidak ada URL staging terpisah; `monefyi_planner/.env.local` memiliki `VITE_PLANNER_LP2_DEV_URL=http://localhost:3000`; `PlannerLP2/.env.local` masih memuat `NEXT_PUBLIC_PLANNER_APP_URL="https://estimator.monefyi.com"`. |

---

## 3. Inventaris Lengkap `grep -ri monefyi` (693 Baris / 186 File)

Ringkasan distribusi sumber `/tmp/monefyi_grep_inventory.txt`:
- Total: **693 kemunculan** di **186 file** (`monefyi_planner/`: **194**, `PlannerLP2/`: **356**, `my-supabase-project/`: **143**).
- Semua temuan dikelompokkan tegas ke dalam 3 kategori di bawah ini.

### Kategori (a): Teks / UI / Copywriting Publik → **UBAH ke Froyek (Fase 4)**
*(Catatan: kata "Estimator" hanya dipertahankan di halaman/komponen berlisensi Estimator sesuai Keputusan Produk #2; copy untuk produk Finance terpisah `app.monefyi.com` dicatat di `OPEN-DECISIONS.md` sebelum disentuh.)*

1. **`monefyi_planner/` (UI, CS, Onboarding, PDF/Excel, Brand Assets):**
   - `monefyi_planner/index.html:6-7` — `<title>` & `<meta name="description">` (`Monefyi Planner` → `Froyek`).
   - `monefyi_planner/src/components/AuthPages.tsx:43,157` — `loginTitle` (`Monefyi Estimator` / `Monefyi Planner` → `Froyek Estimator` / `Froyek`), badge `Powered by Monefyi Planner` → `Powered by Froyek`.
   - `monefyi_planner/src/components/Layout.tsx:251,364,390-395,723` — `Monefyi Workspace` → `Froyek Workspace`, `Monefyi AI` → `Froyek AI`, mobile brand text `Monefyi` → `Froyek`, upgrade feature label.
   - `monefyi_planner/src/components/common/AccountMenu.tsx:53` — fallback `tenantName = 'Monefyi'` → `'Froyek'`.
   - `monefyi_planner/src/components/common/BottomNav.tsx:58,70` — `aria-label` & label FAB `Monefyi` → `Froyek`.
   - `monefyi_planner/src/components/CommandModal.tsx:727,1162` — `Monefyi Assistant (Input Cepat)` → `Froyek Assistant (Input Cepat)`, footer `Powered by Monefyi AI` → `Powered by Froyek AI`.
   - `monefyi_planner/src/components/common/CustomerSupportWidget.tsx:56,125,134,141,310` — placeholder `Tanya Mbak Esti seputar Monefyi...` & pesan WA/Telegram `Owner Monefyi` / `User Aplikasi Monefyi Planner` → `Froyek`.
   - `monefyi_planner/src/services/customerSupportService.ts:15,17,20,54,68,75,77,102,115,130,151,153,165` — seluruh FAQ Mbak Esti & URL WA text `Monefyi` → `Froyek` (serta kondisikan info Estimator hanya jika relevan).
   - `monefyi_planner/src/components/branding/BrandIdentityPanel.tsx:57` — `"Tetap identitas Monefyi"` → `"Tetap identitas Froyek"`.
   - `monefyi_planner/src/lib/orgBrand.ts:119-121` — label `MONEFYI_ONLY_SURFACES` (`Monefyi Planner`, `Monefyi AI`) → `Froyek`, `Froyek AI`.
   - `monefyi_planner/src/lib/plannerBrand.ts:11` — `PLANNER_BRAND_NAME` (`'Monefyi Planner'` → `'Froyek'`).
   - `monefyi_planner/src/lib/estimatorBrand.ts:14` — `ESTIMATOR_BRAND_NAME` (`'Monefyi Estimator'` → `'Froyek Estimator'`).
   - `monefyi_planner/src/components/EstimatorLogo.tsx:11` — `alt = 'Froyek Estimator'`.
   - `monefyi_planner/src/components/PwaInstallBanner.tsx:61` — `'Install Froyek Estimator'` / `'Install Froyek'`.
   - `monefyi_planner/src/components/estimator/EstimatorOnboardingWizard.tsx:121` — `'Selamat Datang di Froyek Estimator! 🎉'`.
   - `monefyi_planner/src/components/estimator/Intero3DLaunchModal.tsx:67,110` — nama file default & teks perbandingan `Froyek`.
   - `monefyi_planner/src/pages/estimator/EstimatorGuidePage.tsx:71,93,184,421` — panduan & teks WA ke `Froyek Estimator` / `Admin Froyek`.
   - `monefyi_planner/src/services/intero3dService.ts:2,63,258` — default `projectName` (`Desain Kitchen Set Froyek`) & copy jembatan.
   - `monefyi_planner/src/components/settings/CustomDomainPanel.tsx:116` — `ke Monefyi Planner` → `ke Froyek`.
   - `monefyi_planner/src/components/settings/ErrorTraceDiagnosticsPanel.tsx:76,142` — metadata diagnostik `Froyek`.
   - `monefyi_planner/src/components/settings/FieldCoordinationPanel.tsx:58,510,547,678` — judul Bot Telegram, pesan tes default, & contoh username/nama bot ke `Froyek` *(status placeholder bot `@MonefyiAssistantBot` dicatat di `OPEN-DECISIONS.md`)*.
   - `monefyi_planner/src/components/settings/UpgradePlansPanel.tsx:31,33,132` — subjek/isi email upgrade & catatan aktivasi `tim Froyek`.
   - `monefyi_planner/src/components/team/InviteMemberModal.tsx:99,187` — teks link WA `Admin Froyek` & catatan akun `di Froyek`.
   - `monefyi_planner/src/pages/auth/SignupHub.tsx:15` — `bergabung dengan Froyek`.
   - `monefyi_planner/src/pages/LegalPages.tsx:27,29,37,139` — seluruh teks syarat, privasi, & garansi ke `Froyek` / `Froyek Estimator`.
   - `monefyi_planner/src/pages/onboarding/OwnerWizard.tsx:113` — `Monefyi Button` → `Froyek AI Button`.
   - `monefyi_planner/src/pages/WorkerDashboard.tsx:378` — `Update via Monefyi Button` → `Update via Froyek Assistant` (atau `Lapor Progres Cepat`).
   - `monefyi_planner/src/pages/Settings.tsx:576,765` — `logo Froyek`, `<AboutRow label="Aplikasi" value="Froyek" />`.
   - `monefyi_planner/src/utils/evmMetrics.ts:50` — label sumber `Froyek AI Button`.
   - `monefyi_planner/src/lib/pdf/templates/shared.ts:358` — footer PDF `· Froyek ${year}`.
   - `monefyi_planner/src/services/rapExcelService.ts:209` — header sheet Excel `Template RAP Froyek`.
   - `monefyi_planner/src/services/aiHrdPayrollService.ts:462` — footer slip/dokumen `AI HRD Froyek`.
   - `monefyi_planner/src/services/aiProviderService.ts:235` — header `X-Title: 'Froyek'`.
   - `monefyi_planner/src/services/telegramService.ts:429,442` — label eskalasi `[ESKALASI PERTANYAAN USER - FROYEK]`.
   - `monefyi_planner/src/services/productEntitlements.ts:18` — pesan registrasi ke `Froyek`.
   - `monefyi_planner/src/services/entitlementService.ts:100,111` *(tambahan dari F-04)* — redaksi error pembuatan proyek Free Plan tanpa memaksa kata "Estimator" bagi user tanpa lisensi Estimator.

2. **`PlannerLP2/` (Landing Page, Admin/CRM, Email Resend, Engine Copy & WA Bot):**
   - `PlannerLP2/src/data/defaultContent.ts` (semua entri copy publik: L5, 85, 124-125, 146, 195, 304, 309, 580, 588, 608, 610, 615, 624, 645, 657, 701, 721-722, 744, 760, 792, 824, 856, 872, 888, 941 — ubah ke `Froyek` / `Froyek Estimator`; `monefyi` key di row perbandingan `comparison` dibahas di Kategori (c)).
   - `PlannerLP2/src/lib/brand/brand.config.ts:38,58` — `name: "Froyek Estimator"`, `"Froyek"`.
   - `PlannerLP2/src/lib/types/settings.ts:30` & `PlannerLP2/src/lib/content/comparison.config.ts:21` — `siteName` & judul perbandingan `Froyek Estimator`.
   - `PlannerLP2/src/lib/permissions.ts:128,133-136` — label produk (`Froyek Estimator`, `Froyek`, `Froyek Stay`, dll.).
   - `PlannerLP2/src/components/landing/ComparisonSection.tsx:197`, `EstimatorPwaInstallPrompt.tsx:183`, `FreeTrialPopup.tsx:217`, `HeroLiveDemo.tsx:63,78`, `LiveChatWidget.tsx:74,170,182,353`, `LoginModal.tsx:226`, `ToastNotification.tsx:26,42,74,106,138,154,170` — seluruh teks UI landing → `Froyek` / `Froyek Estimator`.
   - `PlannerLP2/src/app/bonus/page.tsx:46,135` — `Kembali ke Froyek`, `by Froyek Lite`.
   - `PlannerLP2/src/lib/services/customerSupportService.ts:15-165`, `whatsappBotService.ts:45,243,301`, `resendService.ts:44-294` *(kecuali fallback email dev bila perlu verifikasi domain)*, `mayarHealthService.ts:217,230,329`, `metaAdsService.ts:202`, `marketingAgentService.ts:68-498`, `notificationService.ts:2` — seluruh template email/WA/copywriting ke `Froyek`.
   - `PlannerLP2/src/lib/analytics/metaPixel.ts:68,95,120,163` — `content_name` event Meta Pixel `Froyek Estimator`.
   - `PlannerLP2/src/lib/engine/copyAnalyzer.ts:89-144`, `creativeCritic.ts:48`, `supervisorCritic.ts:64`, `winningEngine.ts:705,815-816`, `llmRouter.ts:155,448,513`, `pageAudit.ts:274` — prompt/teks engine ke `Froyek Estimator` (pertahankan guard `winningEngine`/`tick` agar tidak tertukar dengan produk finance `monefyi.com` selama domain finance masih aktif).
   - `PlannerLP2/src/lib/engine/__tests__/evalHarness.ts:174`, `PlannerLP2/src/lib/engine/__tests__/phase3_4.scenarios.ts:109,115,118` — sesuaikan assertion test copy HTML/title jika perlu setelah migrasi brand.
   - `PlannerLP2/src/app/admin/layout.tsx:5-6`, `admin/page.tsx:62-85,511`, `admin/crm/page.tsx:391,514,638,1142,1153,1833`, `admin/crm/[id]/page.tsx:199,265,339,678`, `admin/marketing/page.tsx:283,293,379`, `admin/settings/page.tsx:328,408`, `admin/toast/page.tsx:24`, `admin/whatsapp/page.tsx:42,55`, `components/admin/AdminTopBar.tsx:155`, `components/admin/Sidebar.tsx:108,114,251`, `components/admin/crm/EditCustomerModal.tsx:45`, `FollowUpPaymentWaModal.tsx:82-108` *(cek rekening bank di `OPEN-DECISIONS.md`!)*, `EvergreenFunnelPlanner.tsx:78-330`, `FunnelAovPanel.tsx:45`, `MarketingWarRoom.tsx:243,460`, `WinningEngineCommandCenter.tsx:623,966`, `marketingStore.ts:1030,1079` — UI Admin/CRM & template pesan WA/AI ke `Froyek`.
   - `PlannerLP2/src/app/api/checkout/mayar/route.ts:124,142`, `api/crm/lead/route.ts:108-111,471`, `api/engine/apply/route.ts:110,137,235,316,377,434`, `api/engine/review/route.ts:139`, `api/engine/tick/route.ts:197-212,405,412`, `api/health/mayar/route.ts:61`, `api/marketing/ai/route.ts:356,360,443`, `api/meta/actions/route.ts:267`, `api/webhook/mayar/route.ts:187`, `api/webhook/whatsapp/route.ts:56,83` — copy notifikasi & metadata produk ke `Froyek`.

3. **`my-supabase-project/supabase/functions/` (Copy Planner/Froyek):**
   - `_shared/email-templates.ts:33,145` — `Monefyi Planner` → `Froyek`.
   - `_shared/monefyi-email-layout.ts:29,36,124` — `productName` `planner` (`Froyek`) & `estimator` (`Froyek Estimator`), footer copyright `Froyek` *(entri `finance` `productName: "Monefyi"` dicatat di `OPEN-DECISIONS.md`)*.
   - `_shared/purchase-email.ts:26,47` — `Froyek Estimator`.
   - `_shared/plannerLynkPayment.ts:148-177` — label paket `Froyek Estimator Standard/Pro` & `Froyek Pro Bulanan`.
   - `planner-create-owner-org/index.ts:90` — `"Selamat datang di Froyek"`.
   - *(Fungsi khusus Personal Finance `app.monefyi.com`: `ai-user-coach`, `email-drip`, `finance-purchase-email.ts`, `lynk-webhook/activate.html`, `monefyi-account-purge`, `monefyi-compliance-notify`, `monefyi-generate-insights`, `monefyi-refund-lynk`, `monefyi-weekly-digest-cron`, `start-trial` dicatat sebagai Open Decision di `OPEN-DECISIONS.md` sebelum perubahan.)*

---

### Kategori (b): Konfigurasi Domain, Host Publik, Redirect & Email → **UBAH ke `froyek.com` (Fase 4), PERTAHANKAN Rule Redirect Host Lama**

| File & Baris | Kondisi Saat Ini | Rencana Fase 4 |
|---|---|---|
| `PlannerLP2/.env.local:4` | `NEXT_PUBLIC_PLANNER_APP_URL="https://estimator.monefyi.com"` | Ubah ke `https://estimator.froyek.com` (atau `https://froyek.com` sesuai target host LP2). |
| `PlannerLP2/src/lib/config/publicHosts.ts:8-9` + `publicHosts.test.ts:21-29` | Sudah memakai `froyek.com` & `estimator.froyek.com` serta `LEGACY_*_HOSTS` + `legacyHostRedirects()` | **PERTAHANKAN** `LEGACY_PLANNER_HOSTS` (`planner.monefyi.com`) & `LEGACY_ESTIMATOR_HOSTS` (`estimator.monefyi.com`) agar traffic lama ter-redirect 308 ke `froyek.com`. |
| `PlannerLP2/src/app/globals.css:30` | Komentar `estimator.monefyi.com` | Update komentar ke `estimator.froyek.com`. |
| `PlannerLP2/src/data/defaultContent.ts:702,704,714-718` | `support@monefyi.com`, `@monefyi`, `https://instagram.com/monefyi` dkk. | Ubah email ke `support@froyek.com` *(link sosial `@monefyi` atau `@froyek` dikonfirmasi di `OPEN-DECISIONS.md`)*. |
| `PlannerLP2/src/lib/config/bonusApps.ts:6,15` | Cek legacy `monefyi.com/bonus` | Pertahankan deteksi legacy host agar tetap aman. |
| `PlannerLP2/src/lib/engine/llmRouter.ts:154,447,512`, `PlannerLP2/src/app/api/marketing/ai/route.ts:442` | `"HTTP-Referer": "https://monefyi.com"` | Ubah ke `"https://froyek.com"`. |
| `PlannerLP2/src/lib/engine/pushNotify.ts:21` | Fallback VAPID `"mailto:admin@monefyi.com"` | Ubah fallback ke `"mailto:admin@froyek.com"`. |
| `monefyi_planner/src/lib/estimatorBrand.ts:22` | `hostname === 'estimator.monefyi.com' \|\| hostname.startsWith('estimator.')` | Dukung `estimator.froyek.com` sebagai utama; pertahankan pengecekan `estimator.` / `estimator.monefyi.com` untuk backward compatibility saat transisi. |
| `monefyi_planner/src/lib/pwaBrand.ts:7` & `monefyi_planner/src/lib/spaAssets.ts:6` | `['estimator.froyek.com', 'froyek.com', 'estimator.monefyi.com', 'planner.monefyi.com']` | **SUDAH TEPAT** (keduanya sudah mendahulukan `froyek.com` & mempertahankan host legacy). |
| `monefyi_planner/src/pages/LegalPages.tsx:95-96,146`, `Settings` / `UpgradePlansPanel.tsx:35` | `mailto:support@monefyi.com` | Ubah semua kontak publik ke `support@froyek.com`. |
| `monefyi_planner/src/pages/auth/OwnerSignup.tsx:253` | `noreply@monefyi.com` | Ubah ke `noreply@froyek.com` (sinkron dengan Resend domain verification di `OPEN-DECISIONS.md`). |
| `monefyi_planner/src/lib/pdf/templates/invoices/atlasblue.ts:190` | `{ text: 'www.monefyi.com', ... }` | Ubah ke `'www.froyek.com'`. |
| `my-supabase-project/supabase/functions/_shared/cors.ts:5,9-14,93,120` | Allowlist hanya `monefyi.com` / `www.monefyi.com` / `planner.monefyi.com` / `estimator.monefyi.com`, fallback `https://www.monefyi.com/` | **TAMBAHKAN** `https://froyek.com`, `https://www.froyek.com`, `https://estimator.froyek.com` dan jadikan `https://froyek.com` fallback default, sambil **pertahankan** origin `*.monefyi.com` lama selama masa transisi. |
| `my-supabase-project/supabase/functions/_shared/email.ts:11` | `RESEND_DEFAULT_FROM = "Monefyi <noreply@support.monefyi.com>"` | Ubah display/domain sesuai domain terverifikasi Froyek (tergantung DNS Resend — lihat `OPEN-DECISIONS.md`). |
| `my-supabase-project/supabase/functions/planner-refund-request/index.ts:45` | `Hubungi support@monefyi.com` | Ubah ke `support@froyek.com`. |
| `my-supabase-project/supabase/functions/planner-verify-custom-domain/index.ts:52` & `CustomDomainPanel.tsx:178` | `_monefyi-verify.${host}` | Tandai di `OPEN-DECISIONS.md` (disarankan dual-accept `_froyek-verify.` dan `_monefyi-verify.` agar domain existing tidak putus). |
| `monefyi_planner/src/services/customDomainService.ts:27` | `'monefyi.vercel.app'` | Tambahkan `'froyek.vercel.app'` bila ada sambil pertahankan `'monefyi.vercel.app'`. |

---

### Kategori (c): Identifier Internal yang HARUS TETAP (Jangan Diubah!)

Seluruh identifier di bawah ini **TIDAK BOLEH diubah** agar tidak mematahkan backward compatibility data lokal browser, database Supabase, Edge Function URL, webhook payment, atau pipeline test:

1. **Storage Keys, Cookies, & Custom Events Browser (Pertahankan persis / dual-read jika perlu):**
   - `monefyi_planner/`: `monefyi_estimator_launch_promo_admin_dismiss` (`EstimatorLaunchPromoAdminModal.tsx:12`), `monefyi_ai_mode` (`CommandModal.tsx`, `AgentHomePanel.tsx`), `monefyi:post-purchase-banner` (`PostPurchaseBanner.tsx:5`), `monefyi:contract:${code}` (`ContractModal.tsx:42`), `monefyi:migration-flags-changed` (`Layout.tsx`, `MigrationDeveloperPanel.tsx`), `monefyi:open-upgrade` (`Layout.tsx`, `upgradePrompt.ts`), `monefyi_planner_pwa_install_dismissed` / `monefyi_estimator_pwa_install_dismissed` (`PwaInstallBanner.tsx`), `monefyi_runtime_trace_queue` / `monefyi_trace_session` (`ErrorTraceDiagnosticsPanel.tsx`, `runtimeTracer.ts`), `monefyi_manual_logout` (`useBootstrap.ts`, `appStore.ts`), `monefyi-theme` (`useColorScheme.ts`), `monefyi:entitlement-invalidate` (`useEntitlement.ts`, `appStore.ts`), `monefyi:milestone_5_shown` (`milestones.ts`), `monefyi_custom_host` (`customDomainHost.ts`), `monefyi_entitlement_preview` (`entitlement.ts`), `monefyi-estimator-draft:*` (`estimationDraftStore.ts`), `monefyi_estimator_list_view_v2` (`estimationListView.ts`), `monefyi_estimator_onboarding_completed_*` (`estimatorOnboarding.ts`), `monefyi:doc_sig:` (`digitalSignatureStorage.ts`), `monefyi_projects_view` (`Projects.tsx`), `monefyi_hrd_mayar_disbursements` (`aiHrdPayrollService.ts`), `monefyi_planner_ai_config_v1` (`aiProviderService.ts`), `monefyi_custom_domain_ctx` (`customDomainService.ts`), `monefyi_gantt_deps` (`ganttDependencyService.ts`), `monefyi_gantt_draft` (`ganttDraftService.ts`), `monefyi_planner_notif_prefs` (`settingsPrefsService.ts`), `monefyi_active_device_session_v1` & `monefyi_logout_reason` (`singleDeviceSessionService.ts`), `monefyi_telegram_config_v1` / `monefyi_field_member_contacts_v1` / `monefyi_proactive_triggers_v1` (`telegramService.ts`), `monefyi_ui_view_mode` / `monefyi_nav_sidebar_collapsed` / `monefyi_right_panel_hidden` (`appStore.ts`), `public/manifest-estimator.webmanifest:7` (`"id": "monefyi-estimator-pwa"`), `public/sw.js:2` (`CACHE = 'monefyi-planner-v1'`).
   - `PlannerLP2/`: `monefyi_admin_notifications_log`, `monefyi_admin_sound_enabled`, `monefyi-notifications-changed`, `monefyi-${item.type}` (`notificationService.ts`, `useAdminNotificationEngine.ts`), `monefyi_wa_bot_config_v1` (`whatsappBotService.ts`), `monefyi_user_auth`, `monefyi_planner_trial_uses` (`authStore.ts`), `monefyi_content_lp3` (`contentStore.ts`), `monefyi-leads` (`leadsStore.ts`), `monefyi_marketing_store` (`marketingStore.ts`), `monefyi-media` (`mediaStore.ts`), `monefyi-settings` (`settingsStore.ts`), `monefyi-ui-prefs` (`uiStore.ts`), `monefyi_campaign_keywords` (`MetaAdsCommanderTable.tsx`), `monefyi_billing_banner_dismissed` / `monefyi_billing_threshold` / `monefyi_billing_alert_hours` / `monefyi_last_billing_alert_ts` (`MetaBillingAlertBanner.tsx`, `useAdminNotificationEngine.ts`), `monefyi_checkout_session` (`ConversationalCheckout.tsx`), `monefyi_user_toast` (`ConversationalCheckout.tsx`, `FreeTrialPopup.tsx`, `ToastNotification.tsx`), `monefyi-demo` (`demoAnalytics.ts`, `HeroLiveDemo.tsx`), `monefyi_estimator_pwa_dismissed` (`EstimatorPwaInstallPrompt.tsx`), `monefyi_estimator_lp_cache_v3` (`landingService.ts`), `monefyi-leads-${date}.csv` atau pola internal (`crm/page.tsx:1129`).
2. **Simbol Kode, Props, Nama File, Export Konstanta & Field Type Internal:**
   - File paths & component/symbol exports: `MonefyiLogo.tsx` (`MONEFYI_LOGO_SRC`, `MonefyiLogo`), `MONEFYI_BRAND`, `MONEFYI_ONLY_SURFACES` (`orgBrand.ts`, `BrandIdentityPanel.tsx`, `Layout.tsx`), `onOpenMonefyiAi` (`BottomNav.tsx`), `MONEFYI_PRICING` (`winningEngine.ts`, `apply/route.ts`, `page-audit/route.ts`, `tick/route.ts`, `build-analytics.ts`), `PRODUCT_MONEFYI` / `'monefyi'` (`productEntitlements.ts`, `brand.config.ts`), `MonefyiEmailProduct` / `monefyiEmailShell` (`monefyi-email-layout.ts`, `email-templates.ts`, `auth-send-email`), `MonefyiLead` column key `monefyi: string` (`PlannerLP2/src/lib/types/content.ts:178`, `defaultContent.ts:318-409`), `MONEFYI_DESC_PREFIX = "monefyi:"` / `buildMonefyiCheckoutDescription` / `parseMonefyiCheckoutDescription` (`plannerMayarPayment.ts`, `plannerMayarDescription.test.ts`, `mayar/route.ts:185`), `monefyi_5pillar_diag_*` (`llmRouter.ts:455`), komentar teknis di file (`Intero3DLaunchModal.tsx:1`, `estimatorDimension.ts:1`, `designTokens.ts:2-3`, `commandTags.ts:2`, `recommendations.ts:2`, `ai-providers.ts:2`, `monevisor-apply-action/index.ts:3`, `meta/campaigns/route.ts:817`).
3. **Edge Functions, Deployment Origins, Env Var & Migrasi Historis DB:**
   - Edge Function names & callers in `monefyi_planner/src/lib/config.ts:25-30` (`monefyi-admin-users`, `monefyi-admin-update-user`, `monefyi-admin-app-config`, `monefyi-admin-platform-stats`, `monefyi-admin-company-types`, `monefyi-user-account`) dan `PlannerLP2/src/lib/services/landingService.ts:36,147,201` (`monefyi-landing-config`).
   - Semua folder Edge Function di `my-supabase-project/supabase/functions/monefyi-*` & `monevisor-*`.
   - `PlannerLP2/next.config.ts:17` & `monefyi_planner/src/lib/spaAssets.ts:1,4` (`https://monefyi-planner.vercel.app`) dan env var `MONEFYI_EMAIL_PRODUCT`.
   - Email test / synthetic / placeholder internal & file migrasi historis: `hanif@monefyi.com`, `andi@monefyi.com` (`intero3dService.test.ts`, `singleDeviceSessionService.test.ts`), `@workers.monefyi.local` (`createHrMemberQuick.ts:51`), `@monefyi.temp` (`PlannerLP2/src/app/api/crm/lead/route.ts:143,301,468`), serta `email-import/index.ts:150-152` (`/tx-... @(?:support|import)\.monefyi\.com/i` — untuk aplikasi finance).

---

## 4. Tabel Triase F-01 s.d. F-38

| ID | Fase | Status Triase | Lokasi Kode Terverifikasi | Ringkasan Solusi | Pemilik File |
|---|---|---|---|---|---|
| **F-01** | Fase 1 | `CONFIRMED` | `monefyi_planner/src/components/NotificationPanel.tsx:105-106,125`; `Layout.tsx:631,674` | Fallback `typeConfig[notif.type] ?? typeConfig.system` & `priorityBadge[...] ?? ''` + mini `<ErrorBoundary>` di wrapper `NotificationPanel`. | Track 1A |
| **F-02** | Fase 1 | `CONFIRMED` | `monefyi_planner/src/components/AppShell.tsx:116-118`; `Layout.tsx:342-670`; `WorkerDashboard.tsx:251-265`; `Settings.tsx:361` | Izinkan `activeTab === 'settings'` di `AppShell.tsx` sebelum guard `if (isWorker)`; tambah fallback tab non-owner di `Settings.tsx` (`organisasi` → `profil`); tambah tombol Logout langsung di sidebar/header semua role (termasuk Worker & Demo). | Track 1A & Track 1B *(Settings)* |
| **F-03** | Fase 1 | `CONFIRMED` | `monefyi_planner/src/pages/Projects.tsx:332-336`; `CreateProjectRapDraft.tsx:19-39` | `useMemo` prop `selections` di `Projects.tsx`, simpan `onDraftChange` via `useRef` & pakai serialized `selectionKey` di `CreateProjectRapDraft.tsx`; tambah `contract_value` Step 1 & jaga tanggal saat Kembali. | Track 1B |
| **F-04** | Fase 4 | `SUDAH-BENAR` *(Logika)* / `CONFIRMED` *(Copy)* | `monefyi_planner/src/services/entitlementService.ts:99-116`; `lib/entitlement.ts:10-27` | **Logika kuota TIDAK diubah (Keputusan #4)**. Ubah redaksi error `entitlementService.ts:100,111` agar menyebut **Froyek** dan hanya menyebut Estimator jika berlisensi Estimator (Keputusan #2). Implikasi bisnis dicatat di `OPEN-DECISIONS.md`. | Track 4A |
| **F-05** | Fase 1 | `CONFIRMED` | `monefyi_planner/src/components/projects/v2/TabV2Rap.tsx:332-360` | Stabilkan `notifyDraft` dengan `useRef` untuk `onDraftChange` & guard nilai primitif (`viewMode`, `hasChanges`, `changeCount`, `saving`, `canUndo`, `canRedo`) agar tidak re-trigger `setState` induk terus-menerus. | Track 1B |
| **F-06** | Fase 2 | `CONFIRMED` | `monefyi_planner/src/lib/migration/planner-mapper.ts:343`; `TabV2Keuangan.tsx:196`; `TabV2Analisa.tsx:197` | Hapus `Math.max(0, ...)` pada `estLaba = contractValue - effectiveProjectedCost` sehingga kerugian tampil negatif jujur dengan warna merah. | Track 2A |
| **F-07** | Fase 2 | `CONFIRMED` | `monefyi_planner/src/components/projects/v2/TabV2Analisa.tsx:26-38`; `planner-analyze/index.ts:143-150` | Saat `evm.total_budget === 0` / `cpi === 0` / `isOverBudget` / `isCashDeficit`, gunakan `computedScore` konsisten dengan penalti defisit & overbudget eksplisit agar skor tidak pernah naik saat rugi. | Track 2A |
| **F-08** | Fase 2 | `CONFIRMED` | `Dashboard.tsx:106,633`; `TabV2Analisa.tsx:45,183`; `analyzeService.ts:4-34`; `planner-analyze/index.ts:114-159` | Normalisasi `message: r.description ?? r.message ?? ''` & `pv: evm.planned_value ?? evm.pv` di `analyzeService.ts` / komponen UI; muat snapshot terakhir dari `planner_analysis_snapshots` saat Dashboard mount. | Track 2B *(Dashboard & analyzeService)* / Track 2A *(TabV2Analisa)* |
| **F-09** | Fase 1 | `CONFIRMED` | `ProjectEditModal.tsx:42-65,184-213`; `planner-mapper.ts:272` | Validasi JS `contract_value < 0` & `total_budget_planned < 0` serta `<form onSubmit>` di `ProjectEditModal.tsx` (perbaikan fallback `contractValue` di `planner-mapper.ts:272` dikerjakan di Fase 2 Track 2A). | Track 1B *(Modal)* / Track 2A *(Mapper)* |
| **F-10** | Fase 1 | `CONFIRMED` | `AuthPages.tsx:56-80`; `appStore.ts:359-367`; `useEntitlement.ts:49-64`; `AppShell.tsx:33-42`; `Layout.tsx:67-75`; `Dashboard.tsx:92-104,649`; `AgentHomePanel.tsx:36-38`; `Projects.tsx:504-508`; `HrEmployees.tsx:100-139`; `Settings.tsx:153-185`; `Finance.tsx`; `FinanceV2Routes.tsx`; `FinanceSandboxOverview.tsx`; `DatabaseMaster.tsx`; `EstimatorListPage.tsx`; `CustomerSupportWidget.tsx:125`; `useGanttData.ts:44-50`; `useProjectGanttData.ts:49`; `runtimeTracer.ts:88-90` | **Short-circuit seluruh pemanggilan Supabase saat `isDemoMode === true`** (pakai data seed/mock lokal, bukan sekadar ganti `'demo'` jadi UUID karena Demo Login tidak punya JWT Auth sehingga tetap gagal RLS/`401`/`PGRST116`), serta pastikan Logout Demo bersih. | Track 1A *(Auth/Shell/Store/Entitlement/CS/Tracer)*, Track 1B *(Pages)*, Track 1C *(Gantt)* |
| **F-11** | Fase 2 | `CONFIRMED` | `Dashboard.tsx:247-248,488-489` | Tambahkan mode filter `'attention'` (`p.health_status === 'at_risk' \|\| p.health_status === 'behind'`) saat kartu `PERHATIAN` diklik. | Track 2B |
| **F-12** | Fase 3 | `CONFIRMED` *(tombol Sub Tugas & tab placeholder; note: `ProjectScheduleGantt.tsx:84` sudah toggle `detailOpen`, namun panel kosong tanpa pilihan task)* | `GanttDetailPanel.tsx:49-63,258-260,295-297`; `ProjectScheduleGantt.tsx:84-86,115-122` | Wire tombol `+ Tambah Sub Tugas` ke modal tambah `work_item`, ubah tab `Catatan` menjadi komentar catatan aktif (minimal catatan lokal/DB sederhana) & beri aksi cepat pilih tugas di `GanttDetailPanel`. | Track 3B |
| **F-13** | Fase 3 | `CONFIRMED` | `workItemService.ts:30`; `GanttEditModal.tsx`; `GanttContextMenu.tsx`; `TaskListPanel.tsx`; `TabV2Progress.tsx` | Pasang aksi **Hapus** (dengan konfirmasi) menggunakan `deleteWorkItem` & **Duplikasi** `work_item` di Edit Modal, Context Menu Gantt, TaskList, dan Tab Progress. | Track 3B & 3C |
| **F-14** | Fase 3 | `CONFIRMED` *(DB `dependencies UUID[]` & drag edge sudah ada; kurang UI modal, `assigned_member_id`/`priority`, & CPM)* | `20260523120000_planner_core_schema.sql:90-91`; `ganttDependencyService.ts`; `GanttEditModal.tsx`; `GanttAddWorkItemModal.tsx`; `GanttTimeline.tsx` | Tambah migrasi SQL `assigned_member_id` & `priority` (file saja), modul `criticalPath.ts` (CPM), selector Predecessor/Assignee/Priority di Modal & Detail Panel, serta visualisasi Jalur Kritis. *(Desain lengkap di Bagian 6)*. | Track 3A & 3B |
| **F-15** | Fase 5 | `CONFIRMED` | `managerAgentService.ts:1006,1033,1274-1275`; `ManagerWorkspaceModal.tsx` | Perketat intent HRD (`tim` tidak menyalip perencanaan proyek/WBS); draf WBS terstruktur multi-industri yang bisa diedit/disetujui; parse markdown `**...**` rapi; tolak halus input off-topic tanpa briefing/status palsu. | Track 5A |
| **F-16** | Fase 5 | `CONFIRMED` | `commandParser.ts:171-183`; `CommandModal.tsx` | Ubah `createAIFallbackParse` agar mengembalikan `intent: 'unknown'` (bukan `'record_cost'`) dan tampilkan pesan klarifikasi + pilihan aksi aman saat AI gagal/offline. | Track 5A |
| **F-17** | Fase 1 | `CONFIRMED` | `WorkerDashboard.tsx:225,441-477` | Tolak nominal bon bertanda `-` atau `< 1000` sebelum `.replace(/\D/g, '')`, dan sediakan tombol **Batalkan** untuk bon berstatus `pending`. | Track 1A |
| **F-18** | Fase 1 | `CONFIRMED` | `WorkerDashboard.tsx:370-379`; `CommandModal.tsx` | Jika `isWorker === true`, blokir tampilan GM Owner di `CommandModal` dan tampilkan khusus asisten input progres/absensi Worker. | Track 1A |
| **F-19** | Fase 1 & 3 | `CONFIRMED` *(catatan: hook `useGanttRealtime` belum ada di repo)* | `monefyi_planner/src/hooks/` *(missing)*; `useGanttData.ts`; `useProjectGanttData.ts:74`; `workItemService.ts:24-28`; `ganttSaveService.ts` | **Fase 1:** buat `src/hooks/useGanttRealtime.ts` & integrasikan ke `useGanttData.ts` + `useProjectGanttData.ts` (subscribe `planner_work_items` antar-tab + perluas deps `planned_end`/`name`/`status`/`updated_at`). **Fase 3:** optimistic concurrency `updated_at` + dialog resolusi konflik. | Track 1C *(Realtime P0)* & Track 3A/3B *(Concurrency)* |
| **F-20** | Fase 5 | `CONFIRMED` | `CustomerSupportWidget.tsx`; `TabV2Overview.tsx:355`; `ProjectScheduleGantt.tsx`; `GanttPlannerView.tsx`; `GanttToolbar.tsx`; `ManagerWorkspaceModal.tsx:314-360` | Sembunyikan/offset tombol CS di atas `BottomActionBar`; tampilkan mode List/Card responsif di `<768px` untuk Gantt; rapikan `flex-wrap` header `ManagerWorkspaceModal` di `375px`. | Track 5C & 5A |
| **F-21** | Fase 2 | `CONFIRMED` | `dashboardService.ts:14-17`; `attendanceService.ts:250-269`; `WorkerDashboard.tsx:396-412` | Hitung `if (g?.checkIn) present += 1` agar yang sudah check-out tetap terhitung hadir hari ini; muat ulang & cek query/timezone riwayat absensi Worker segera setelah check-out. | Track 2B |
| **F-22** | Fase 2 | `CONFIRMED` | `TabV2Analisa.tsx:86,164,177,193` | Hapus label `Keuangan: Sehat` saat pemasukan `Rp 0`; hitung proyeksi `Est. Selesai` dinamis berdasarkan progres & tanggal hari ini; sesuaikan copy saran/item dengan tipe proyek non-konstruksi. | Track 2A |
| **F-23** | Fase 2 | `CONFIRMED` | `ProjectDetailV2.tsx:159`; `planner-mapper.ts:272` | Pisahkan eksplisit `settings.contract_value` vs `total_budget`; jangan sulap `contract_value = 0` menjadi nilai RAP ketika item RAP ditambahkan. | Track 2A |
| **F-24** | Fase 6 | `CONFIRMED` | `aiProviderService.ts:83,255`; `aiConfigSync.ts:68-80` | Implementasi jalur client ke backend Edge Function proxy (plus file Edge Function proxy terenkripsi bila siap), hentikan penyimpanan key plaintext di `profiles.settings` begitu proxy aktif *(deploy server dicatat di `OPEN-DECISIONS.md`)*. | Track 6A |
| **F-25** | Fase 6 | `SUDAH-BENAR` **`[BUKAN-BUG]`** *(Keputusan #3)* | `singleDeviceSessionService.ts:15-24`; `.test.ts:1-21` | **BYPASS `lower.includes('indra')` DISENGAJA**. Jangan dihapus; tambahkan komentar penjelas keputusan produk pada baris 15–23 dan pertahankan unit test-nya. | Track 6A |
| **F-26** | Fase 2 | `CONFIRMED` | `TabV2Laporan.tsx:85-102,151-172` | Tambah modal fallback preview + tombol Copy + tombol buka langsung `https://wa.me/?text=...` jika Web Share / clipboard gagal. | Track 2B |
| **F-27** | Fase 5 | `CONFIRMED` | `Dashboard.tsx:106-120,609-637`; `managerAgentService.ts` | Tampilkan pesan status jelas bila `recommendations` kosong (`"Isi RAP & transaksi terlebih dahulu"`), dan integrasikan aksi rescheduling jadwal ke draft preview Gantt. | Track 5A & 2B *(toast Dashboard)* |
| **F-28** | Fase 3 | `CONFIRMED` | `GanttEditModal.tsx`; `GanttTodoModal.tsx:24-26,203-251` | Beri peringatan saat deadline `work_item` > `project.end_date` (+ opsi perpanjang); lengkapi form `GanttTodoModal` (`priority`, `due_date`, mode edit judul/tag, & rapikan tampilan daftar selesai). | Track 3B & 3C |
| **F-29** | Fase 1 | `CONFIRMED` | `GanttTaskBar.tsx:46,84`; `GanttEditModal.tsx:45,59`; `useProjectGanttData.ts:76-80`; `ganttStore.ts:313-315` | Jangan `pushHistory()` / `onCommitDates()` saat drag nol piksel (`daysDelta === 0`) / klik ganda; di `GanttEditModal`, `pushHistory()` 1x saja (`setBarColor(..., false)`) dan hindari double-push di `useProjectGanttData.ts` sehingga `1x Undo` langsung memulihkan tanggal dan `barColor`. | Track 1C |
| **F-30** | Fase 5 | `CONFIRMED` | `HrEmployees.tsx:220,906-915`; `InviteMemberModal.tsx:46-48,80-84`; `EmployeeDetailSheet.tsx`; `auditService.ts` | Samakan sumber hitungan `currentMembers` vs daftar anggota HR; tambah aksi ubah role / nonaktifkan anggota di `EmployeeDetailSheet`; tulis entri `planner_audit_logs` pada mutasi proyek/RAP/biaya & format tanggal lokal. | Track 5B |
| **F-31** | Fase 4 & 5 | `CONFIRMED` | `AuthPages.tsx:272`; `LandingEntry.tsx:10-15`; `AppShell.tsx`; `ProjectDetailV2.tsx` | Ubah link *"Punya undangan?"* di `/login` ke `/join-by-code` (Fase 4); sinkronkan query `?tab=` saat kembali dari `/app/projects/:id` & perjelas fallback `LandingEntry` di dev mode (Fase 5). | Track 4A & 5C |
| **F-32** | Fase 5 | `CONFIRMED` | `ProjectTransactionModals.tsx:236`; `GanttTodoModal.tsx:221` | Pasang `inputMode="numeric"` & sanitasi angka non-negatif real-time di `ProjectTransactionModals`; tambah `break-words [overflow-wrap:anywhere]` & cegah duplikat ringan di `GanttTodoModal` (3C). | Track 5C & 3C |
| **F-33** | Fase 4 | `CONFIRMED` | `appProductBrand.ts:15`; `index.html`; `Layout.tsx`; `Settings.tsx:366-367,392-394`; `TabV2Deviden.tsx`; `ProjectDetailV2.tsx:66`; `PlannerLP2/*`; `my-supabase-project/*` | Migrasi penuh brand **Froyek**; ubah `shouldShowEstimatorProductBrand` agar `isFree` mengembalikan `false` (Keputusan #2); batasi tab `Trace & Error`, `Developer`, & link `Uji agen` hanya untuk `platformRole === 'admin'`; perbaiki ejaan **Dividen**. | Track 4A, 4B, 4C |
| **F-34** | Fase 5 | `CONFIRMED` | `GanttToolbar.tsx`; `TimelineHeader.tsx:62-72`; `TabV2Overview.tsx:98-99,417`; `ProgressBarLg.tsx:21`; `Dashboard.tsx:270,509`; `CustomerSupportWidget.tsx` | Hapus `min-w-[4rem]` saat `actual/value === 0` di `ProgressBarLg` & `TabV2Overview` (Fase 2 Track 2A); sapaan berdasar jam di `Dashboard` (Fase 2 Track 2B); perbaiki layout `GanttToolbar`, `TimelineHeader` & posisi `CustomerSupportWidget` (Fase 5 Track 5C). | Track 2A, 2B, 5C |
| **F-35** | Fase 1 & 6 | `CONFIRMED` | `runtimeTracer.ts:15,68-79,88-90,137-138`; `useBootstrap.ts:246-255`; `20260602120000_planner_upgrade_v21.sql:61-64`; `telegramService.ts:47` | **Fase 1 (`403 runtime_traces` Worker):** akar masalah di RLS `WITH CHECK (user_id IS NULL OR user_id = auth.uid())` + satu key `localStorage` global (`monefyi_runtime_trace_queue`); `logSessionExpired()` menyimpan `user_id` Owner sebelum `setUser(null)` & `flushQueue()` me-requeue batch saat error 403/401/22P02 sehingga tiap 30 detik mengirim `user_id` Owner memakai JWT Worker (`403` loop). Perbaikan: bersihkan antrean lintas-user pada logout/switch, validasi `session.user.id === item.user_id` + UUID valid sebelum flush, skip saat `isDemoMode`, dan jangan re-queue error permanen (`400/401/403/42501/22P02`). **Fase 6:** batasi cache kontak `telegramService.ts` untuk non-owner/non-manager. | Track 1A *(Traces 403)* & Track 6A *(Telegram cache)* |
| **F-36** | Fase 5 | `CONFIRMED` | `AuthPages.tsx`; `OwnerSignup.tsx`; `Settings.tsx`; `ProjectEditModal.tsx`; form komponen lain | Tambah pasangan `<label htmlFor>` + `id`/`name` + `autoComplete="off"` pada kolom sensitif API key/token, serta tingkatkan kontras link `← Kembali`. | Track 5C |
| **F-37** | Fase 1 | `CONFIRMED` | `analyzeService.ts:25-34`; `Dashboard.tsx:106-120` | Deteksi `!navigator.onLine` / error fetch di `analyzeService.ts` dan lempar error terstruktur agar UI memunculkan toast offline/gagal koneksi yang jelas. | Track 1B *(service)* & 2B *(Dashboard handler)* |
| **F-38** | Fase 1 | `CONFIRMED` | `AuthPages.tsx:103,161-176`; `ProjectEditModal.tsx:242` | Auto-redirect langsung ke `next` (`/app`) begitu `runBootstrap` selesai tanpa klik tambahan `"Masuk ke Dashboard"` (Track 1A); perbarui teks modal arsip agar Owner memahami hak pemulihan 30 hari selaras RLS `20261107090000` (Track 1B). | Track 1A *(AuthPages redirect)* & Track 1B *(ProjectEditModal copy)* |
| **P0-AUTH** *(Item #6)* | Fase 1 | `CONFIRMED` | `authService.ts:36-39`; `useBootstrap.ts:265-273`; `supabase.ts:6-11`; `GoTrueClient.js:3854-3864,3927-3934` | `supabase.auth.getSession()` saat load awal merefresh token stale (`Invalid Refresh Token: Refresh Token Not Found`), lalu `authService.getSession()` & `useBootstrap` mengabaikan `{ error }`. Tangani `error` secara eksplisit dengan `signOut({ scope: 'local' })`, bersihkan state sesi lokal stale / `authError` tanpa menggantung inisialisasi. | Track 1A |

---

## 5. Rencana Fase 1 s.d. 7 & Pembagian Kepemilikan File (Zero Conflict)

> Aturan paralel: implementer dalam satu fase yang sama **dilarang menyentuh file milik track lain**. Fase dijalankan berurutan `1 → 2 → 3 → 4 → 5 → 6 → 7` (atau dengan syarat antar-fase tuntas dulu).

### Fase 1: Stabilitas P0, Auth/Refresh Token, Trace 403 Worker, Demo Guard, Loops, Realtime & Undo Gantt
> **3 Track Paralel — 0 Irisan File** *(12 + 14 + 6 = 32 file eksklusif; tidak ada file yang muncul di lebih dari satu track).*

- **Track 1A (Notification, Worker Logout/Isolation, Auth Auto-Redirect, Refresh Token, Trace 403 & Demo Shell — 12 file):**
  - `monefyi_planner/src/components/NotificationPanel.tsx` *(F-01 fallback `typeConfig[notif.type] ?? typeConfig.system` & `priorityBadge[...] ?? ''`)*
  - `monefyi_planner/src/components/Layout.tsx` *(F-01 mini `<ErrorBoundary>` di `L631,674`; F-02 tombol Logout langsung di sidebar & header semua role + gear settings non-owner ke `'profil'`; F-10 skip `loadFinanceVersion`/`loadMigrationFlags` saat `isDemoMode`)*
  - `monefyi_planner/src/components/AppShell.tsx` *(F-02 izinkan `activeTab === 'settings'` sebelum guard `if (isWorker)` di `L116-118`; F-10 skip `hydrateAIConfigFromAccount`, `fetchTelegramConfigFromSupabase`, & `fetchFieldMemberContactsFromSupabase` saat `isDemoMode`)*
  - `monefyi_planner/src/pages/WorkerDashboard.tsx` *(F-02 tombol Logout langsung di header `L251-265`; F-17 validasi bon negatif/`< 1000` & batal pending; F-18 isolasi AI Worker)*
  - `monefyi_planner/src/components/CommandModal.tsx` *(F-18 mode terbatas Worker, blokir GM Owner)*
  - `monefyi_planner/src/components/AuthPages.tsx` *(F-10 set flag membership/onboarding/emailVerified + seed demo lokal di `handleDemoLogin`; F-38 `L103,161-176` auto-redirect langsung ke `next`/`/app` setelah `runBootstrap` selesai tanpa klik ekstra `"Masuk ke Dashboard"`)*
  - `monefyi_planner/src/store/appStore.ts` *(F-10 `refreshData()` skip saat `isDemoMode || tenant.id === 'demo'`; `logout()` bersihkan demo state & koordinasikan pembersihan trace user aktif)*
  - `monefyi_planner/src/hooks/useEntitlement.ts` *(F-10 skip `loadEntitlementSnapshot` saat `isDemoMode || tenant.id === 'demo'`)*
  - `monefyi_planner/src/components/common/CustomerSupportWidget.tsx` *(F-10 guard eskalasi Telegram saat `isDemoMode` agar tidak memicu `runtimeTracer` ber-ID `'demo'`)*
  - `monefyi_planner/src/services/authService.ts` *(Item #6: inspeksi `{ data, error }` di `getSession()`, tangani `Invalid Refresh Token` dengan `signOut({ scope: 'local' })`)*
  - `monefyi_planner/src/hooks/useBootstrap.ts` *(Item #6: tangani `{ error }` dari `getSession()`/`onAuthStateChange` tanpa menggantung inisialisasi & bersihkan sesi stale; Item #7: bersihkan antrean trace lintas-user saat logout/expiry atau hindari enqueue row user lama sebelum `setUser(null)`)*
  - `monefyi_planner/src/services/runtimeTracer.ts` *(Item #7 + F-10: skip trace saat `isDemoMode` atau `tenant_id`/`user_id` non-UUID; sebelum `flushQueue()`, cek `session.user.id` & buang item antrean `localStorage` dengan `user_id` milik user lain agar Worker tidak terkena `403` RLS `WITH CHECK (user_id IS NULL OR user_id = auth.uid())`; jangan re-queue error permanen `400`/`401`/`403`/`42501`/`22P02`)*
- **Track 1B (Loops, Edit Modal, Settings Guard, Analyze Offline & Page-Level Demo Guards — 14 file):**
  - `monefyi_planner/src/pages/Projects.tsx` *(F-03 `useMemo` prop `selections`, `contract_value` Step 1 wizard, jaga tanggal saat Kembali; F-10 skip `fetchArchivedList`, `loadRppMaster`, & mutasi Supabase saat `isDemoMode`)*
  - `monefyi_planner/src/components/projects/CreateProjectRapDraft.tsx` *(F-03 `useRef` untuk `onDraftChange` & serialized `selectionKey`)*
  - `monefyi_planner/src/components/projects/v2/TabV2Rap.tsx` *(F-05 hentikan `"Maximum update depth exceeded"` di `notifyDraft` dengan `useRef` & deps primitif)*
  - `monefyi_planner/src/components/projects/ProjectEditModal.tsx` *(F-09 validasi angka `< 0` + `<form onSubmit>`; F-38 teks pemulihan Owner 30 hari)*
  - `monefyi_planner/src/pages/Dashboard.tsx` *(F-10 short-circuit 4 query `useEffect`, analisa proyek, & `<AgentHomePanel>` saat `isDemoMode`)*
  - `monefyi_planner/src/components/dashboard/AgentHomePanel.tsx` *(F-10 defense-in-depth short-circuit `planner_agent_reports`/`planner_agent_actions` saat `isDemoMode || orgId === 'demo'`)*
  - `monefyi_planner/src/pages/HrEmployees.tsx` *(F-10 short-circuit 11 Supabase query saat `isDemoMode || tenant.id === 'demo'`)*
  - `monefyi_planner/src/pages/Settings.tsx` *(F-02 fallback tab non-owner dari `'organisasi'`/`'pricelist'`/`'domain'`/`'developer'` ke `'profil'` agar Worker/Demo tidak blank + tombol Logout; F-10 short-circuit `load()`, `FinanceIntegrationPanel`, `TelegramLinkPanel`, & save handlers saat `isDemoMode`)*
  - `monefyi_planner/src/pages/Finance.tsx` *(F-10 short-circuit `load()` saat `isDemoMode || tenant.id === 'demo'`)*
  - `monefyi_planner/src/pages/finance-v2/FinanceV2Routes.tsx` *(F-10 short-circuit `loadFinanceVersion(user.id)` saat `isDemoMode`)*
  - `monefyi_planner/src/pages/finance-v2/FinanceSandboxOverview.tsx` *(F-10 short-circuit snapshot/payables/cashflow/payroll queries & `FinanceIntegrationPanel` saat `isDemoMode || tenant.id === 'demo'`)*
  - `monefyi_planner/src/pages/DatabaseMaster.tsx` *(F-10 short-circuit `reload()` saat `isDemoMode || orgId === 'demo'`)*
  - `monefyi_planner/src/pages/estimator/EstimatorListPage.tsx` *(F-10 short-circuit `loadEstimations`/`countLifetimeEstimations`/`shouldShowEstimatorOnboarding` saat `isDemoMode || tenant.id === 'demo'`)*
  - `monefyi_planner/src/services/analyzeService.ts` *(F-37 lempar error offline/jaringan terstruktur alih-alih diam-diam `null`)*
- **Track 1C (Realtime Gantt Antar-Tab & Undo Gantt P0 — 6 file):**
  - `monefyi_planner/src/hooks/useGanttRealtime.ts` *(file baru — Item #8 / prasyarat F-19: subscribe Realtime `planner_work_items` & `planner_projects` dengan debounce, filter `org_id`/`project_id`, dan skip saat `isDemoMode` / `'demo'`)*
  - `monefyi_planner/src/store/ganttStore.ts` *(F-29: tambah opsi `recordHistory = true` di `setBarColor` atau helper atomik agar edit modal tidak double-push history)*
  - `monefyi_planner/src/components/projects/gantt/GanttTaskBar.tsx` *(F-29: `pushHistory()` hanya saat `daysDelta !== 0`; jangan panggil `onCommitDates` saat drag nol piksel / klik ganda)*
  - `monefyi_planner/src/components/projects/gantt/GanttEditModal.tsx` *(F-29: `pushHistory()` tepat 1x & `setBarColor(..., false)` sehingga `1x Undo` langsung memulihkan tanggal + `barColor` bersamaan)*
  - `monefyi_planner/src/components/projects/gantt/useGanttData.ts` *(Item #8 + F-10: ekstrak `reloadFromRemote` + integrasi `useGanttRealtime` dengan guard `isDirty`; skip Supabase saat `isDemoMode || orgId === 'demo'`)*
  - `monefyi_planner/src/components/projects/gantt/useProjectGanttData.ts` *(Item #8 + F-29 + F-10: integrasi `useGanttRealtime`; perluas deps `workItems` mencakup `planned_end`, `name`, `status`, `updated_at`; hindari double `pushHistory` di `commitDates`; skip `loadBarColors` saat `isDemoMode || orgId === 'demo'`)*
- **Catatan Arsitektur Demo (`F-10`) & Trace (`#7`) & Refresh (`#6`):**
  - **Mengapa short-circuit `isDemoMode` wajib (bukan ganti `'demo'` → UUID palsu):** Demo Login tidak membuat Supabase Auth session (`JWT`); seluruh tabel memakai RLS `TO authenticated` / `.single()`. Mengirim UUID palsu tetap memicu `401`/`403`/`PGRST116` dan menimpa data mock lokal.
  - **Akar `403` `runtime_traces` pada Worker:** RLS `runtime_traces_insert` (`20260602120000_planner_upgrade_v21.sql:61-64`) mengizinkan `WITH CHECK (user_id IS NULL OR user_id = auth.uid())`, namun `runtimeTracer.ts:15,75-78` memakai satu antrean `localStorage` global (`monefyi_runtime_trace_queue`). Saat sesi Owner berakhir (`useBootstrap.ts:252`), `logSessionExpired()` menulis trace ber-`user_id` Owner sebelum `setUser(null)`. Ketika Worker login, `flushQueue()` mengirim batch berisi `user_id` Owner memakai JWT Worker (`auth.uid()` Worker) → ditolak `403` oleh RLS → `flushQueue()` mengembalikan `batch` ke `localStorage` (loop tiap 30 detik).
  - **Akar `Invalid Refresh Token: Refresh Token Not Found`:** Pada load awal (`supabase.ts:6-11`), `GoTrueClient` me-refresh token kadaluarsa (`_recoverAndRefresh` `L3854-3864`), menerima 400 dari server, lalu `authService.getSession()` (`L36-39`) dan `useBootstrap` (`L265-273`) mengabaikan `error` di response tanpa membersihkan sesi lokal stale (`signOut({ scope: 'local' })`).
- **Risiko Minimal:** Pastikan handler Error UI di caller `analyzeService` (`TabV2Analisa` sudah pakai `try/catch`; `Dashboard` diperkuat di Fase 2); jalankan `npx tsc --noEmit` & `npm test` di `monefyi_planner/` setelah ketiga track selesai agar kontrak `useGanttRealtime` dan `useBootstrap`/`runtimeTracer` terverifikasi penuh.

### Fase 2: Kebenaran Data Keuangan, Health Score, Kehadiran & Share WhatsApp
- **Track 2A (Finance Truth, Mapper, Analisa & ProgressBar):**
  - `monefyi_planner/src/lib/migration/planner-mapper.ts` *(F-06 hapus `Math.max(0, ...)` pada `estLaba`; F-23 pisahkan `contract_value` eksplisit vs `total_budget`)*
  - `monefyi_planner/src/components/projects/v2/ProjectDetailV2.tsx` *(F-23 tampilkan `contract_value` jujur tanpa menyulap RAP jadi kontrak)*
  - `monefyi_planner/src/components/projects/v2/TabV2Keuangan.tsx` *(F-06 styling rugi merah)*
  - `monefyi_planner/src/components/projects/v2/TabV2Analisa.tsx` *(F-06, F-07 konsistensi `healthScore`, F-08 `rec.description ?? rec.message`, F-22 `Est. Selesai` dinamis + non-hardcode konstruksi + badge keuangan jujur)*
  - `monefyi_planner/src/components/projects/v2/TabV2Overview.tsx` *(F-34 perbaikan `plan || 1` & bar `min-w-[4rem]` saat `Rp 0`)*
  - `monefyi_planner/src/components/sandbox-ui/ProgressBarLg.tsx` *(F-34 hilangkan `min-w-[4rem]` saat `value <= 0` / `pct === 0`)*
- **Track 2B (Dashboard KPI, Attendance & Share WA):**
  - `monefyi_planner/src/services/dashboardService.ts` *(F-21 hitung `g?.checkIn` untuk hadir hari ini)*
  - `monefyi_planner/src/services/attendanceService.ts` *(F-21 cek timezone/range `getUserAttendance` agar riwayat langsung muncul setelah check-out)*
  - `monefyi_planner/src/pages/Dashboard.tsx` *(F-08 muat snapshot + `description ?? message`; F-11 filter `'attention'` (`at_risk || behind`); F-27 toast feedback; F-34 sapaan dinamis berdasar jam; F-37 tangkap error offline)*
  - `monefyi_planner/src/components/projects/v2/TabV2Laporan.tsx` *(F-26 modal preview + Copy + link `https://wa.me/?text=`)*

### Fase 3: Manajemen Tugas, Dependensi, Jalur Kritis (CPM) & Kolaborasi Realtime
*(Track 3A dikerjakan terlebih dahulu atau kontrak TS disepakati sebelum 3B/3C.)*
- **Track 3A (DB Migration Lokal, Adapters, Services, CPM Engine & Realtime Hook):**
  - `my-supabase-project/supabase/migrations/20261115120000_work_item_assignee_priority.sql` *(file baru — hanya file migrasi lokal, JANGAN push ke remote)*
  - `monefyi_planner/src/lib/adapters.ts` *(tambah opsional `assigned_member_id`, `priority` di `DbWorkItem`)*
  - `monefyi_planner/src/lib/gantt/types.ts` *(field `dependencyType?`, `isCritical?`, `totalFloatDays?`, `priority`)*
  - `monefyi_planner/src/lib/gantt/criticalPath.ts` & `criticalPath.test.ts` *(file baru — algoritma CPM Forward/Backward pass + circular guard + unit tests)*
  - `monefyi_planner/src/services/workItemService.ts` *(duplicate helper + optimistic concurrency `expectedUpdatedAt`)*
  - `monefyi_planner/src/services/ganttSaveService.ts` *(persist `assigneeId`, `priority`, `dependencyType`, dan propagasi konflik `updated_at`)*
  - *(Catatan: `src/hooks/useGanttRealtime.ts` sudah dibuat di Fase 1 Track 1C; Track 3A/3B menambahkan optimistic concurrency `updated_at` & dialog resolusi konflik untuk `F-19`)*
- **Track 3B (Gantt Store, Critical Path UI & Gantt Components — lanjutan setelah F-29 & Realtime di Fase 1C):**
  - `monefyi_planner/src/store/ganttStore.ts`
  - `monefyi_planner/src/lib/gantt/utils.ts` *(map `assigneeId`, `priority` di `workItemToGanttTask`; style highlight critical path)*
  - `monefyi_planner/src/components/projects/gantt/GanttTaskBar.tsx` *(F-13 menu konteks hapus/duplikat; F-14 badge/border kritis)*
  - `monefyi_planner/src/components/projects/gantt/GanttTimeline.tsx` *(visualisasi CPM critical edges)*
  - `monefyi_planner/src/components/projects/gantt/DependencyOverlay.tsx` *(warna khusus jalur kritis)*
  - `monefyi_planner/src/components/projects/gantt/GanttEditModal.tsx` *(F-13 hapus/duplikat; F-14 Predecessor, Assignee, Priority; F-28 warning > `project.end_date`)*
  - `monefyi_planner/src/components/projects/gantt/GanttAddWorkItemModal.tsx` *(F-14 Predecessor, Assignee, Priority)*
  - `monefyi_planner/src/components/projects/gantt/GanttDetailPanel.tsx` *(F-12 wiring `+ Tambah Sub Tugas`, catatan komentar sederhana, tampilan CPM/Predecessor/Assignee)*
  - `monefyi_planner/src/components/projects/gantt/TaskListPanel.tsx` *(F-13 menu baris + indikator kritis)*
  - `monefyi_planner/src/components/projects/gantt/GanttToolbar.tsx` *(toggle `Jalur Kritis (CPM)` — layout mobile dirapikan di 5C)*
  - `monefyi_planner/src/components/projects/gantt/GanttPlannerView.tsx`, `ProjectScheduleGantt.tsx`, `useGanttData.ts`, `useProjectGanttData.ts` *(F-12, F-19 conflict dialog saat save `updated_at` bentrok)*
- **Track 3C (Progress List & Todo Modal):**
  - `monefyi_planner/src/components/projects/v2/TabV2Progress.tsx` *(F-13 tombol hapus & duplikat `work_item`, tampilkan badge CPM/Assignee)*
  - `monefyi_planner/src/components/projects/gantt/GanttTodoModal.tsx` *(F-28 field `priority`, `due_date`, edit judul/tag, label pending vs selesai; F-32 `break-words` & cek duplikat)*

### Fase 4: Migrasi Brand ke Froyek (`froyek.com`), Estimator Gating, Entitlement Copy, Dividen & Isolasi Dev Tabs
- **Track 4A (SPA `monefyi_planner/`):**
  - `index.html`, `src/lib/appProductBrand.ts` + `appProductBrand.test.ts` *(ubah `if (snapshot.isFree) return true;` → `return false;` per Keputusan #2)*, `src/lib/plannerBrand.ts`, `src/lib/estimatorBrand.ts`, `src/lib/orgBrand.ts`, `src/services/entitlementService.ts` *(redaksi pesan saja per Keputusan #4)*, `src/components/entitlement/UpgradeModal.tsx` *(sembunyikan CTA Estimator pada konteks non-Estimator)*, `src/components/AuthPages.tsx` *(brand Froyek & link `/join` → `/join-by-code`)*, `src/components/Layout.tsx`, `src/components/common/AccountMenu.tsx`, `src/components/common/BottomNav.tsx`, `src/components/common/CustomerSupportWidget.tsx`, `src/services/customerSupportService.ts`, `src/pages/Settings.tsx` *(sembunyikan tab `Trace & Error`, `Developer`, link `Uji agen` untuk non-admin; ringkas AI BYOK developer panel; copy Froyek)*, `src/components/projects/v2/TabV2Deviden.tsx` & `ProjectDetailV2.tsx` *(typo `Dividen`)*, `src/pages/LegalPages.tsx`, `src/pages/auth/*`, `src/pages/onboarding/OwnerWizard.tsx`, `src/pages/WorkerDashboard.tsx` *(label tombol)*, `src/pages/estimator/*`, `src/components/estimator/*`, `src/components/EstimatorLogo.tsx`, `src/components/PwaInstallBanner.tsx`, `src/components/settings/*`, `src/components/team/InviteMemberModal.tsx`, `src/components/branding/BrandIdentityPanel.tsx`, `src/lib/pdf/templates/*`, `src/services/*` copy (`aiHrdPayrollService.ts`, `aiProviderService.ts`, `intero3dService.ts`, `productEntitlements.ts`, `rapExcelService.ts`, `telegramService.ts`, `customDomainService.ts`), `src/utils/evmMetrics.ts`.
- **Track 4B (`PlannerLP2/`):**
  - `PlannerLP2/.env.local`, `src/lib/brand/brand.config.ts`, `src/lib/config/publicHosts.ts` *(pertahankan redirect host lama)*, `src/data/defaultContent.ts`, `src/components/landing/*`, `src/components/checkout/*`, `src/components/admin/*`, `src/app/admin/*`, `src/app/api/*`, `src/app/bonus/page.tsx`, `src/app/globals.css`, `src/lib/services/*`, `src/lib/engine/*` & `__tests__/*`, `src/lib/analytics/metaPixel.ts`, `src/lib/permissions.ts`, `src/lib/store/marketingStore.ts`, `src/lib/types/settings.ts`, `src/lib/content/comparison.config.ts`.
- **Track 4C (`my-supabase-project/supabase/functions/`):**
  - `_shared/cors.ts` *(tambah `froyek.com` & `estimator.froyek.com`, pertahankan host lama)*, `_shared/email-templates.ts`, `_shared/monefyi-email-layout.ts`, `_shared/purchase-email.ts`, `_shared/plannerLynkPayment.ts`, `planner-create-owner-org/index.ts`, `planner-refund-request/index.ts`.
  *(JANGAN deploy ke remote!)*

### Fase 5: AI Planner Engine, HR & Audit Trail, Mobile `375px`, Aksesibilitas & Validasi Form
- **Track 5A (AI Intent, WBS Multi-Industri, Quick Mode `unknown`, Reschedule & Modal Mobile Header):**
  - `monefyi_planner/src/services/managerAgentService.ts` *(F-15, F-27)*
  - `monefyi_planner/src/lib/commandParser.ts` *(F-16)*
  - `monefyi_planner/src/components/CommandModal.tsx` *(F-16 handler UI `intent: 'unknown'` & opsi aman saat offline/gagal)*
  - `monefyi_planner/src/components/agent/ManagerWorkspaceModal.tsx` *(F-15 render markdown + preview editable WBS/reschedule + F-20 `flex-wrap` header mobile)*
- **Track 5B (HR Member Deactivation, Seat Count Sync & Audit Trail):**
  - `monefyi_planner/src/pages/HrEmployees.tsx` *(F-30 format waktu human-readable, sinkronisasi hitungan kuota)*
  - `monefyi_planner/src/components/hr/EmployeeDetailSheet.tsx` *(F-30 tombol ubah role & nonaktifkan/hapus anggota)*
  - `monefyi_planner/src/services/auditService.ts` + hook/panggilan audit dari `projectService.ts`, `costService.ts`, `rapService.ts` *(F-30 record `planner_audit_logs` pada mutasi penting)*
- **Track 5C (Mobile `375px`, CS Offset, Validasi Nominal, Routing Back & Aksesibilitas):**
  - `monefyi_planner/src/components/projects/gantt/GanttToolbar.tsx` & `TimelineHeader.tsx` *(F-20, F-34)*
  - `monefyi_planner/src/components/projects/v2/ProjectScheduleGantt.tsx` & `GanttPlannerView.tsx` *(F-20 mobile list-first view di `<768px`)*
  - `monefyi_planner/src/components/common/CustomerSupportWidget.tsx` *(F-20, F-34 geser offset/sembunyikan saat bottom action bar aktif)*
  - `monefyi_planner/src/components/projects/v2/ProjectTransactionModals.tsx` *(F-32 `inputMode="numeric"` & sanitasi minus)*
  - `monefyi_planner/src/components/AuthPages.tsx`, `pages/auth/OwnerSignup.tsx`, `pages/Settings.tsx`, `pages/onboarding/OwnerWizard.tsx`, `components/LandingEntry.tsx`, `components/AppShell.tsx`, `components/projects/v2/ProjectDetailV2.tsx` *(F-31 routing Back `?tab=` + LandingEntry UX; F-36 `<label htmlFor>` + `id`/`name` + kontras; catatan: F-38 auto-redirect login sudah diselesaikan di Fase 1 Track 1A)*
  *(Catatan: sinkronkan dengan Fase 4 sehingga perubahan F-31/F-36/F-38 di file bersama dilakukan bersih tanpa menimpa Froyek copy Fase 4.)*

### Fase 6: Keamanan Client Storage, Worker Traces, Komentar Indra & Proxy Vault AI
- **Track 6A (Semua tugas keamanan & dokumentasi bypass):**
  - `monefyi_planner/src/services/singleDeviceSessionService.ts` & `.test.ts` *(F-25 `[BUKAN-BUG]` — tambah komentar eksplisit sesuai Keputusan Produk #3)*
  - `monefyi_planner/src/services/telegramService.ts` *(F-35 — batasi caching kontak `localStorage` hanya untuk Owner/Manager, jangan Worker)*
  - `monefyi_planner/src/services/runtimeTracer.ts` *(F-35 lanjutan: verifikasi final tidak ada regresi `403` lintas-role; fix akar antrean `localStorage` lintas-user & guard `session.user.id` sudah dijalankan di Fase 1 Track 1A)*
  - `monefyi_planner/src/services/aiProviderService.ts` & `aiConfigSync.ts` *(F-24 — isolasi/siapkan panggilan lewat backend proxy Edge Function; lihat `OPEN-DECISIONS.md` untuk deployment secret/Vault remote)*

### Fase 7: QA Regresi, Verifikasi Grep Brand & Penutupan Laporan
- Jalankan ulang `npx tsc --noEmit`, `npm test`, `npm run build` (`monefyi_planner/`), `npm run typecheck && npm run test:all-engine` (`PlannerLP2/`).
- Jalankan ulang audit `grep -ri monefyi` untuk memastikan **0 kemunculan publik yang terlewat** di Kategori (a) dan (b) sambil memastikan Kategori (c) utuh.
- Perbarui `FIX_PROGRESS.md` hingga semua fase tuntas / terdokumentasi blokirnya.

---

## 6. Desain Tertulis Fitur Dependensi Tugas & Jalur Kritis (Critical Path — Fase 3)

### 6.1 Skema Database (`planner_work_items`)
- **Sudah ada di DB (`my-supabase-project/supabase/migrations/20260523120000_planner_core_schema.sql:90-91`):**
  - `dependencies UUID[] DEFAULT '{}'` (array ID predecessor `planner_work_items.id`)
  - `dependency_type TEXT DEFAULT 'FS' CHECK (dependency_type IN ('FS','FF','SS','SF'))`
  - Publikasi realtime sudah aktif pada `planner_work_items` (baris 297 file migrasi yang sama).
- **Migrasi SQL baru (file lokal saja: `my-supabase-project/supabase/migrations/20261115120000_work_item_assignee_priority.sql`):**
  ```sql
  ALTER TABLE planner_work_items
    ADD COLUMN IF NOT EXISTS assigned_member_id UUID REFERENCES planner_org_members(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
      CHECK (priority IN ('low', 'medium', 'high'));

  CREATE INDEX IF NOT EXISTS idx_work_items_assigned_member
    ON planner_work_items(assigned_member_id);
  ```
- **Backward Compatibility Client:** Karena migrasi tidak di-push ke remote produksi dalam siklus ini, `workItemService.ts` dan `ganttSaveService.ts` hanya mengirim `assigned_member_id` / `priority` jika diset dan melakukan fallback aman bila PostgREST mengembalikan error schema cache kolom belum tersedia (`42703` / `PGRST204`), atau menginformasikan status migrasi.

### 6.2 Algoritma Critical Path Method (`monefyi_planner/src/lib/gantt/criticalPath.ts`)
- **Fungsi Utama:**
  `export function computeCriticalPath(tasks: GanttTask[], dependencies: GanttDependency[]): CriticalPathResult`
- **Langkah Perhitungan:**
  1. **Filter Node:** Ambil seluruh `work_item` milik proyek aktif (atau per `projectId` yang terisolasi). Hitung `durationDays = Math.max(1, daysBetween(t.startDate, t.endDate))`. Konversi tanggal ke offset hari integer relatif terhadap `minProjectStartMs`:
     `plannedStartOffset = Math.round((parseDate(t.startDate) - minProjectStartMs) / DAY_MS)`.
  2. **Graph & Circular Dependency Guard (Kahn's Algorithm):**
     - Bangun peta `preds` dan `succs` hanya dari edge `dependencies` di mana `fromTaskId` dan `toTaskId` sama-sama berada dalam himpunan task proyek (abaikan `fromTaskId === toTaskId` / self-loop).
     - Hitung `inDegree` tiap node, proses antrean node ber-`inDegree === 0` untuk menghasilkan `topoOrder`.
     - Jika `topoOrder.length < nodes.length`, seluruh node tersisa ditandai dalam `cyclicTaskIds` (`hasCycle = true`), mencegah infinite loop saat evaluasi atau render.
  3. **Forward Pass (Urutan `topoOrder`):**
     - Jika tanpa predecessor valid: `ES[id] = plannedStartOffset`.
     - Jika memiliki predecessor valid (`p`): berdasarkan tipe relasi (`FS` default: `EF[p]`; `SS`: `ES[p]`; `FF`: `EF[p] - durationDays[id]`; `SF`: `ES[p] - durationDays[id]`), ambil nilai maksimum terhadap jadwal dasar tugas: `ES[id] = Math.max(plannedStartOffset, maxConstraintStart)`.
     - `EF[id] = ES[id] + durationDays[id]`.
     - `projectEarlyFinish = Math.max(...topoOrder.map(id => EF[id]), 0)`.
  4. **Backward Pass (Urutan terbalik `topoOrder`):**
     - Jika tanpa successor valid: `LF[id] = projectEarlyFinish`.
     - Jika memiliki successor valid (`s`): ambil batas akhir paling awal dari seluruh successor (`FS`: `LS[s]`; `SS`: `LS[s] + durationDays[id]`; `FF`: `LF[s]`; `SF`: `LF[s] + durationDays[id]`), `LF[id] = Math.min(...constraints)`.
     - `LS[id] = LF[id] - durationDays[id]`.
  5. **Slack & Penandaan Kritis:**
     - `totalFloatDays = LS[id] - ES[id]`.
     - `isCritical = !cyclicTaskIds.has(id) && totalFloatDays <= 0`.
- **Unit Test (`src/lib/gantt/criticalPath.test.ts`):**
  1. Rantai linear `A -> B -> C` (semua kritis, `totalFloatDays === 0`).
  2. Graf paralel/berlian `A -> B (10h) -> D` vs `A -> C (3h) -> D`: `B` kritis (`float = 0`), `C` non-kritis (`float = 7`).
  3. Tugas tanpa dependensi + tugas paralel lebih pendek: hanya lintasan terlama yang kritis.
  4. Siklus `A -> B -> A`: `hasCycle === true`, tidak crash/loop, kedua node masuk `cyclicTaskIds`.

### 6.3 Integrasi UI (Gantt & Modal)
1. **Gantt Toolbar (`GanttToolbar.tsx` & `ProjectScheduleGantt.tsx`):**
   - Tombol toggle **"Jalur Kritis"** (badge jumlah tugas kritis & durasi total lintasan kritis).
2. **Timeline & Overlay (`GanttTaskBar.tsx`, `DependencyOverlay.tsx`):**
   - Saat toggle aktif, bar dengan `isCritical === true` diberi aksen garis luar `#DC2626` + lencana kecil `Kritis` (tetap menghormati `barColor` custom di bagian isi atau tanda border); tugas non-kritis menampilkan `Float: +Xh` pada tooltip/panel.
   - Panah SVG di `DependencyOverlay.tsx` yang menghubungkan dua tugas kritis disorot warna merah (`#DC2626`, `strokeWidth: 2`).
3. **Modal Edit / Tambah & Panel Detail (`GanttEditModal.tsx`, `GanttAddWorkItemModal.tsx`, `GanttDetailPanel.tsx`, `TabV2Progress.tsx`):**
   - Multi-select daftar **Predecessor (Bergantung pada)** yang otomatis memfilter tugas sendiri dan menonaktifkan tugas yang akan membentuk siklus (`wouldCreateCycle`).
   - Dropdown **Assignee (`assigned_member_id`)** dari daftar anggota aktif organisasi & dropdown **Prioritas (`low` / `medium` / `high`)**.
   - Validasi tanggal selesai vs `project.end_date` (tampilkan peringatan oranye + opsi perpanjang tanggal proyek).
   - Di `GanttDetailPanel.tsx`, tampilkan bagian ringkas: **Predecessor**, **Successor**, **Total Float / Status Kritis**, **Assignee**, dan tombol fungsional `+ Tambah Sub Tugas`, `Hapus`, serta `Duplikasi`.
