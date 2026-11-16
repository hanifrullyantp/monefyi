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
| **2.7** | **Domain Pengirim Email Resend & Kontak Support (`noreply@support.monefyi.com`, `noreply@monefyi.com`, `support@froyek.com`)** di `_shared/email.ts:11`, `OwnerSignup.tsx:253`, `LegalPages.tsx`, `UpgradePlansPanel.tsx` | Mengubah `From` email pengirim ke `*@froyek.com` sebelum domain `froyek.com` terverifikasi (SPF/DKIM) di dashboard Resend akan menyebabkan email verifikasi & invoice gagal terkirim (`403` / ditolak Resend). | Ubah alamat kontak publik UI (`mailto:support@froyek.com`) di Fase 4; pastikan tim ops sudah memverifikasi domain `froyek.com` di Resend sebelum mendeploy perubahan `_shared/email.ts`. |
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
