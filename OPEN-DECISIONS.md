# OPEN DECISIONS — Froyek

Dokumen ini mencatat item ambigu, blokir infrastruktur remote, serta implikasi bisnis dari keputusan produk yang teridentifikasi selama **Fase 0 (Triase)**.

---

## 1. Target Environment Supabase Remote (`BLOCKED` untuk Eksekusi Remote)

- **Fakta Terverifikasi:**
  - `.env.local` pada root workspace, `monefyi_planner/.env.local` (`VITE_SUPABASE_URL`), dan `PlannerLP2/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`) seluruhnya menunjuk ke project Supabase yang sama: **`https://zzwqfmdyncxbolestkqp.supabase.co`**.
  - Tidak ditemukan environment/URL Supabase staging terpisah di file konfigurasi mana pun.
- **Status & Dampak Fase 3:**
  - Sesuai aturan proyek untuk **tidak melakukan push/deploy ke Supabase remote produksi**, perubahan skema DB Fase 3 (`assigned_member_id`, `priority`, `notes`, `attachments`, index, dan trigger `updated_at` pada tabel `planner_work_items`) **hanya ditulis sebagai file migrasi SQL lokal** di `my-supabase-project/supabase/migrations/20261116120000_work_item_cpm_assignee_priority.sql`.
  - **Status Eksekusi Remote:** `BLOCKED` (menunggu approval operator/DBA atau penyediaan instance staging).
  - **Mitigasi Kode Client:** Seluruh query/mutasi `workItemService.ts` dan `ganttSaveService.ts` sudah memakai fallback PostgREST `42703`/`PGRST204` (`planner_projects.settings.work_item_meta` + `localStorage`) serta `loadDemoWorkItems`/`saveDemoWorkItems` sehingga fitur berjalan aman sebelum migrasi remote dijalankan.

---

## 2. Item Ambigu dari Inventaris `grep -ri monefyi`

| No | Item & Lokasi Terverifikasi | Kenapa Ambigu | Rekomendasi Saat Ini |
|---|---|---|---|
| **2.1** | **Edge Functions Produk Personal Finance (`app.monefyi.com`) & Stay** di `my-supabase-project/supabase/functions/` (`ai-user-coach`, `email-drip`, `email-import`, `finance-purchase-email.ts`, `financeLynkPayment.ts`, `lynk-webhook/activate.html`, `monefyi-account-purge`, `monefyi-compliance-notify`, `monefyi-generate-insights`, `monefyi-refund-lynk`, `monefyi-weekly-digest-cron`, `monevisor-apply-action`, `start-trial`, `_shared/stayWebPush.ts`) | Kode di `PlannerLP2/src/app/api/engine/tick/route.ts:203` memisahkan tegas produk Estimator/Planner (`froyek.com`) dari *"aplikasi pengatur keuangan pribadi atau chat bot personal finance monefyi.com"*. Tidak jelas apakah produk Personal Finance `app.monefyi.com` ikut rebrand ke Froyek atau tetap memakai brand Monefyi. | Jangan ubah string produk Personal Finance & Stay di Edge Functions pada Fase 4 sebelum ada konfirmasi stakeholder. Fokuskan rebranding Edge Functions ke bagian Planner/Froyek (`_shared/email-templates.ts`, `_shared/monefyi-email-layout.ts` varian `planner`/`estimator`, `_shared/purchase-email.ts`, `plannerLynkPayment.ts`, `planner-create-owner-org`, `planner-refund-request`). |
| **2.2** | **Email Test, Synthetic & Seed Accounts** (`hanif@monefyi.com` di `intero3dService.test.ts` & `singleDeviceSessionService.test.ts`; `owner-onboard@test.monefyi.app` / `worker1-onboard@test.monefyi.app` di seed audit; `@workers.monefyi.local` di `createHrMemberQuick.ts:51`; `@monefyi.temp` di `PlannerLP2/src/app/api/crm/lead/route.ts`) | Mengganti email seed test atau email internal tanpa migrasi data Supabase Auth dapat merusak test atau akun seed uji yang sudah ada. | Pertahankan sebagai **identifier internal / fixture uji** (Kategori c). Bila ingin diganti ke `@froyek.local` / `@test.froyek.app`, lakukan terpisah bersama pembaruan seed Auth DB. |
| **2.3** | **DNS TXT Verification Prefix (`_monefyi-verify.{host}`)** di `CustomDomainPanel.tsx:178` & `planner-verify-custom-domain/index.ts:52` | Mengubah prefix TXT verifikasi menjadi `_froyek-verify.{host}` saja dapat memecahkan proses verifikasi custom domain tenant lama yang sudah memasang DNS TXT `_monefyi-verify`. | Pertahankan instruksi UI baru `_froyek-verify.{host}` atau dukung **dual-check** (`_froyek-verify.{host}` ATAU `_monefyi-verify.{host}`) di Edge Function, lalu konfirmasi sebelum deploy Edge Function. |
| **2.4** | **Username Bot Telegram Default (`MonefyiAssistantBot`, `monefyi_proyek_bot`)** di `FieldCoordinationPanel.tsx:547,678` | Belum terverifikasi apakah handle `@FroyekAssistantBot` / `@froyek_proyek_bot` sudah didaftarkan di Telegram BotFather. | Ubah contoh ilustratif ke `FroyekAssistantBot` / `froyek_proyek_bot` dengan keterangan contoh, dan konfirmasi handle resmi BotFather jika ingin dipakai sebagai default produksi. |
| **2.5** | **Vercel Project Origin & Token (`VERCEL_OIDC_TOKEN`, `monefyi-planner.vercel.app`, `monefyi.vercel.app`)** di `.env.local`, `spaAssets.ts:4`, `PlannerLP2/next.config.ts:17`, `customDomainService.ts:27` | Nama project Vercel internal masih `monefyi-planner.vercel.app` (juga dipakai sebagai `SPA_ORIGIN` proxy rewrite `/app`). Mengubah tanpa project Vercel baru akan memutus aset `/icons/*` dan proxy `/app`. | Pertahankan `monefyi-planner.vercel.app` sebagai origin internal (Kategori c); tambahkan saja `'froyek.vercel.app'` pada allowlist host non-custom bila diperlukan. |
| **2.6** | **Deployment Edge Function `planner-analyze`, `planner-parse-command` & LLM Vault Proxy (`F-08`, `F-16`, `F-24`)** | (1) `planner-parse-command` mengembalikan `all_providers_failed: true` di remote saat audit (kunci platform / kuota provider di Supabase secrets belum terkonfigurasi atau habis); (2) Memindahkan BYOK API key keluar dari plaintext `localStorage` & `profiles.settings.planner_ai_config.keys` (`F-24`) ke Supabase Vault + Edge Function LLM Proxy memerlukan pembuatan & deployment Edge Function + secret Vault di Supabase remote (`BLOCKED`). | Siapkan lapisan abstraksi proxy client & kode Edge Function lokal jika diperlukan, namun **tandai deployment proxy server & aktivasi secrets LLM remote sebagai `BLOCKED`** menunggu izin deploy remote. |
| **2.7** | **Domain Pengirim Email Resend & Kontak Support (`Froyek <noreply@support.monefyi.com>`, `support@froyek.com`)** di `my-supabase-project/supabase/functions/_shared/email.ts:16-36`, `PlannerLP2/src/lib/services/resendService.ts:291`, `PlannerLP2/src/app/api/admin/meta-billing-alert/route.ts:18`, `monefyi_planner/src/pages/auth/OwnerSignup.tsx:253` | Domain `support.monefyi.com` sudah terverifikasi (SPF/DKIM) di Resend, sedangkan domain `froyek.com` belum tentu selesai verifikasi DNS-nya. Mengganti header `From` ke `@froyek.com` sebelum verifikasi Resend berisiko email gagal terkirim (`403` / bounce). | **KEPUTUSAN & PENGECUALIAN TERVERIFIKASI:** Pertahankan sementara pengirim `"Froyek <noreply@support.monefyi.com>"` di `_shared/email.ts` (`FROYEK_FROM` + routing `product?: "finance" \| "froyek"`), `resendService.ts`, `meta-billing-alert/route.ts`, dan keterangan pengirim di `OwnerSignup.tsx:253` sampai SPF/DKIM `froyek.com` terverifikasi di Resend (lalu set env `RESEND_FROM_EMAIL="Froyek <noreply@froyek.com>"`). Alamat kontak publik UI (`mailto:support@froyek.com`) tetap dimigrasi ke `froyek.com`. |
| **2.8** | **Handle Sosial Media, Nomor WA Support & Rekening Transfer** (`@monefyi` & `https://instagram.com/monefyi` di `defaultContent.ts:704-718`; WA `6281234567890` di `CustomerSupportWidget.tsx`; WA `6281214736340` di `InviteMemberModal.tsx`; BCA `869-093-4567 a/n Monefyi` di `FollowUpPaymentWaModal.tsx:108`) | Akun media sosial & nama pemilik rekening bank resmi (`Monefyi` vs entitas hukum baru) tidak bisa dipastikan hanya dari kode. | Konfirmasi handle `@froyek` / nomor WA resmi / nama rekening legal penerima sebelum publish landing & CRM production. |

---

## 3. Implikasi Bisnis `entitlementService.ts` Memblokir `Free Plan` (`F-04`)

- **Kondisi Kode Terverifikasi:**
  - `monefyi_planner/src/lib/entitlement.ts`: `TIER_LIMITS.free.maxActiveProjects = 0` (`canCreateProject` menjadi `false` bagi semua organisasi di paket `free`).
  - `monefyi_planner/src/services/entitlementService.ts:99-116`: `assertCanCreateProjectByEntitlement` melempar error ketika `tier === 'free'`.
  - Inkonsistensi visual: di `monefyi_planner/src/pages/Settings.tsx:410,631`, UI membaca `pricingPlans.ts` (`projects_per_month: 2` untuk Free) sehingga menampilkan **`0/2 proyek bulan ini`**, sementara `entitlementService` memblokir pembuatan proyek baru pada hitungan ke-1.
- **Sesuai Keputusan Produk #4:**
  - Logika kuota dan harga di `entitlementService.ts` dan `entitlement.ts` **TIDAK diubah**.
  - Hanya redaksi error di `entitlementService.ts:100,111` yang diperbaiki pada Fase 4 agar konsisten menyebut **Froyek** dan tidak menyebut kata *"Estimator"* bagi pengguna tanpa lisensi Estimator (`Keputusan Produk #2`).
- **Implikasi Bisnis untuk Diputuskan Stakeholder:**
  1. Calon pengguna baru atau trial di paket `Free` **tetap tidak dapat membuat proyek baru** melalui Wizard `+ Buat Proyek Baru` maupun AI GM (`Setujui & Eksekusi`) sampai mereka melakukan upgrade paket berbayar.
  2. Teks `0/2 proyek bulan ini` di `Settings.tsx` berasal dari konfigurasi `pricingPlans.ts` dan tetap bertentangan dengan kuota aktif `0` di `entitlement.ts` kecuali stakeholder memutuskan untuk menyelaraskan `pricingPlans.ts` (`projects_per_month: 0`) atau membuka kuota trial 1 proyek di iterasi berikutnya.

---

## 4. Arsitektur Auth Route Admin/Webhook `PlannerLP2` & Bundel Statis `/bonus/mini` (Di Luar Scope `F-01`..`F-38`)

- **Temuan Review Kode `PlannerLP2/` (Pra-eksisting / Perubahan Fitur LP2 di Branch Fase 4):**
  1. **Endpoint API Admin/CRM & Webhook tanpa Auth Session/Secret Khusus:**
     - `PlannerLP2/src/app/api/crm/lead/route.ts` (`GET`/`PATCH`/`DELETE`), `PlannerLP2/src/app/api/email/resend/route.ts`, `PlannerLP2/src/app/api/health/mayar/route.ts` (`GET ?test_url=` & `POST`), `PlannerLP2/src/app/api/webhook/mayar/route.ts` (tanpa verifikasi signature Mayar / memakai anon client untuk query `orders`), dan `PlannerLP2/src/app/api/webhook/whatsapp/route.ts`.
     - **Alasan tidak dipaksa `requireEngineAuth` pada Fase 4:** Dashboard Admin CRM/Marketing `PlannerLP2` memanggil endpoint tersebut langsung dari browser tanpa header `x-engine-secret` sehingga mengubah mekanismenya di luar scope akan memutus dashboard Admin & webhook eksisting. Perlu hardening terpisah (cookie/session Admin CRM terverifikasi di server + verifikasi signature webhook Mayar/WhatsApp + whitelist URL Mayar).
  2. **Bundel Statis `PlannerLP2/public/bonus/mini/*`:**
     - Berisi `234` kecocokan kata `"Monefyi"` pada hasil build statis lama dari `Mini App Monefyi/` (`bagi-hasil`, `budget`, `cicilan`, `debt-free`, `salary`, `waris`, `zakat`). Karena file HTML/JS minified adalah artefak build statis, pembaruannya memerlukan build ulang dari repositori/folder sumber mini app secara terpisah.
  3. **Edge Functions Remote Deployment (`BLOCKED`):**
     - Perubahan copy/CORS di `my-supabase-project/supabase/functions/*` sudah siap di repo lokal, namun belum di-deploy ke project Supabase remote `zzwqfmdyncxbolestkqp` sesuai batasan tanpa deploy remote.

---

## 5. Cakupan AI Planner/Rescheduler Penuh & Migrasi RLS `planner_audit_logs` (Fase 5)

- **Eksekusi Migrasi `planner_audit_logs_insert` (`BLOCKED` untuk Remote Push):**
  - File migrasi lokal `my-supabase-project/supabase/migrations/20261121120000_planner_audit_logs_insert.sql` menambahkan policy `INSERT TO authenticated` pada `public.planner_audit_logs`.
  - Karena tidak boleh melakukan `supabase db push` ke project remote `zzwqfmdyncxbolestkqp`, eksekusi remote berstatus **`[BLOCKED]`**. `auditService.ts` memakai circuit-breaker `42501`/`403` + ring buffer lokal per org (`monefyi_audit_logs_local_v1:<orgId>`) agar riwayat `Audit Log` tampil tanpa spam error jaringan sebelum migrasi dijalankan.
- **Generator WBS Multi-Fase AI & Engine Auto-Reschedule (`[BUTUH-KEPUTUSAN]`):**
  - Sesuai batasan scope proyek, Fase 5 memperbaiki bug terukur (`tim 4 orang` salah rute HRD, ekstraksi `add_project`, edit inline draf proyek, parser markdown aman, penolakan jujur input off-topic/reschedule, serta `commandParser` `unknown` fallback).
  - Rancang bangun generator WBS multi-fase + estimasi bobot otomatis maupun engine *auto-rescheduling* lintas banyak tugas Gantt berbasis LLM (`F-15` / `F-27` penuh) memerlukan keputusan desain produk dan infrastruktur AI proxy terpisah.

---

## 6. Deployment Migrasi RLS Hardening & Edge Function `planner-ai-proxy` (Fase 6 — `[BLOCKED]` Remote)

- **Artefak Lokal Siap Deploy (Belum Diterapkan ke Remote `zzwqfmdyncxbolestkqp`):**
  1. `my-supabase-project/supabase/migrations/20261121130000_phase6_rls_and_secrets_hardening.sql`: menutup policy permisif `winning_engine_config`, memisahkan write policy `profiles` + trigger proteksi kolom istimewa (`profiles` & `planner_organizations`), memperketat `runtime_traces` `tenant_id` & `planner_org_custom_domains`, serta membuat tabel `planner_user_ai_secrets`.
  2. `my-supabase-project/supabase/functions/planner-ai-proxy/index.ts`: Edge Function terenkripsi AES-GCM (`status`, `set_key`, `delete_key`, `chat`).
- **Status Eksekusi Remote:** `BLOCKED` (aturan kerja melarang push DB atau deploy Edge Functions ke Supabase remote produksi/aktif).
- **Mitigasi Aktif:** Di klien, BYOK API keys sudah dipisahkan keluar dari `localStorage` (`monefyi_planner_ai_config_v1`) ke `sessionStorage`/memori, dibersihkan otomatis saat `logout()` dan saat pergantian user, default `executionMode` diturunkan ke `'review'`, dan pemanggilan `planner-ai-proxy` dikunci di belakang env `VITE_AI_PROXY_ENABLED === 'true'` agar belum memicu `404` sebelum server di-deploy (saat deploy nanti: jalankan migrasi SQL -> deploy `planner-ai-proxy` + set secret `AI_SECRET_KEY` -> aktifkan `VITE_AI_PROXY_ENABLED=true`).
- **Keputusan Terkait `F-25` (`[BUKAN-BUG]`):** `lower.includes('indra')` di `singleDeviceSessionService.ts` tetap dipertahankan dengan komentar kode eksplisit sesuai Keputusan Produk #3.
