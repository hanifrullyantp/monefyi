# 01 — Audit Rebrand & Aset: Monefyi ke Froyek

**Tahap:** 1 (Audit kata, domain, aset, config tersembunyi, dan rahasia — **HANYA LAPORAN, TANPA UBAH KODE PRODUK**)  
**Branch:** `chore/froyek-split`  
**Tanggal:** 2026-11-23  
**Status Produksi:** Berjalan normal (tidak ada perubahan kode produk, tidak ada push/merge)  
**Sumber Kebenaran Inventaris:** [`docs/migration/00-inventory.md`](00-inventory.md)  
**Paket Brand Resmi:** `froyek-brand.zip` (berisi panduan merek `BRAND.md`, token warna `#0A3A2E` & `#FFFFFF`, icon 1024, wordmark, mark origami F, favicon lengkap, dan social preview).

---

## Ringkasan Eksekutif & Statistik Audit

Audit komprehensif ini memetakan seluruh jejak merek legacy (`monefyi`, `monefai`, `planner`, `planner-landing`, `monefyi-planner`, dan domain-domain terkait) pada seluruh komponen yang akan dipindahkan ke repo independen **Froyek**, serta mengidentifikasi batas integrasi dengan ekosistem Monefyi yang tetap tinggal di repo lama.

### Ringkasan Temuan per Kategori

| Kategori | Jumlah Temuan Kunci | Level Risiko Utama | Ringkasan Tindakan |
|---|---|---|---|
| **Aset Visual & Logo** | 28 file / aset | Sedang | Ganti ikon, logo PNG/SVG legacy dengan aset dari `froyek-brand.zip`. |
| **Identitas & Metadata Aplikasi** | 18 item | Rendah | Perbarui `name`, `<title>`, manifest PWA, deskripsi, dan service worker cache. |
| **Domain & Routing URL** | 34 lokasi | Tinggi | Migrasikan origin ke `froyek.com` dan `estimator.froyek.com`; pertahankan redirect 308 legacy. |
| **PDF, Kop & Watermark** | 22 template/context | Sedang | Ubah footer, watermark, dan kop default; pertahankan opsi logo kustom organisasi. |
| **Email & Notifikasi** | 16 titik | Sedang - Tinggi | Perbarui Resend sender (`noreply@froyek.com` saat DNS siap); pertahankan multi-brand email helper. |
| **Integrasi Pembayaran (Mayar/Lynk)** | 24 lokasi | Sedang | Sesuaikan display provider, tetap jaga format metadata webhook Mayar & Lynk agar tidak putus. |
| **Config Tersembunyi (Storage/Cache/Event)** | 42 kunci | Sedang | Buat adapter backward-compatible untuk localStorage/sessionStorage agar sesi user lama tidak hilang. |
| **Teks Tampilan UI & Copywriting** | 56 teks/halaman | Rendah | Ganti penyebutan "Monefyi" menjadi "Froyek" pada onboarding, modal, dan pesan antarmuka. |
| **CI/CD & GitHub Workflows** | 26 blok | Tinggi | Lepaskan ketergantungan workflow ke monefyi; bersihkan kredensial hardcoded ke GitHub Secrets. |
| **Database & Identifier Legacy** | 60+ tabel/RPC/fungsi | **CRITICAL (JANGAN DIUBAH)** | **DILARANG MENGUBAH** nama tabel `planner_*`, RPC, atau route API Supabase agar produksi tidak putus. |
| **Kredensial Tertanam (Rahasia)** | 14 lokasi unik | **TINGGI** | Pindahkan kredensial hardcoded (Service Role Key, Password) ke Environment Secrets. |

---

## Katalog Aset Baru (`froyek-brand.zip`) & Pemetaan Penggantian

Berdasarkan ekstraksi `froyek-brand.zip` (direktori `froyek-brand/`):
- **Nama Resmi Brand:** `froyek` (huruf kecil semua sesuai `BRAND.md`)
- **Tagline:** `Agent for your project`
- **Warna Utama:** Forest Green (`#0A3A2E`), White (`#FFFFFF`), Fold 30%
- **Font Tipografi:** Montserrat (Wordmark & Heading), Inter / system-ui (Body)

### Tabel Pemetaan Penggantian Aset Lama ke Aset Baru

| Aset Lama (Legacy) | Path Saat Ini | Target Pengganti dari `froyek-brand.zip` | Lokasi Target Baru di Froyek |
|---|---|---|---|
| `monefyi-logo.png` | `monefyi_planner/public/icons/monefyi-logo.png` | `png/froyek-horizontal-forest.png` & `froyek-horizontal-white.png` | `apps/web/public/icons/froyek/logo-horizontal.png` |
| `monefyi-logo-source.png` | `monefyi_planner/public/icons/monefyi-logo-source.png` | `png/froyek-icon-1024.png` | `apps/web/public/icons/froyek/icon-source.png` |
| `MonefyiLogo.tsx` | `monefyi_planner/src/components/MonefyiLogo.tsx` | `svg/froyek-mark-forest.svg` + `froyek-wordmark-forest.svg` | `apps/web/src/components/FroyekLogo.tsx` |
| `favicon.ico` | `monefyi_planner/public/favicon.ico` / `PlannerLP2/public/favicon.ico` | `favicon/favicon.ico` | `apps/web/public/favicon.ico` & `apps/landing/public/favicon.ico` |
| `favicon.svg` | `monefyi_planner/public/icons/froyek/favicon.svg` | `favicon/favicon.svg` | `apps/web/public/favicon.svg` |
| `apple-touch-icon.png` | `monefyi_planner/public/icons/icon-180.png` | `favicon/apple-touch-icon.png` | `apps/web/public/apple-touch-icon.png` |
| `icon-192.png` | `monefyi_planner/public/icons/icon-192.png` | `favicon/android-chrome-192x192.png` | `apps/web/public/icons/icon-192.png` |
| `icon-512.png` | `monefyi_planner/public/icons/icon-512.png` | `favicon/android-chrome-512x512.png` | `apps/web/public/icons/icon-512.png` |
| `icon-maskable-512.png` | `monefyi_planner/public/icons/icon-maskable-512.png` | `favicon/maskable-icon-512x512.png` | `apps/web/public/icons/icon-maskable-512.png` |
| `og-image.png` | `monefyi_planner/public/og-image.png` / `PlannerLP2/public/brand/estimator/og-image.png` | `social/og-image.png` (1200x630) | `apps/web/public/og-image.png` & `apps/landing/public/og-image.png` |
| Social Avatar | *(Belum ada sebelumnya)* | `social/avatar-1024x1024.png` | `config/brand/social/avatar-1024.png` |
| Lockup Dark/White | Disebut di `Brand Guide froyek.md` namun hilang | `svg/froyek-stacked-white.svg` & `svg/froyek-stacked-forest.svg` | `config/brand/svg/` |

---

## Tabel Audit Rinci (Tahap 1)

Kolom:
1. `file`: Lokasi relatif file di workspace
2. `baris`: Nomor baris temuan
3. `temuan`: Nilai teks / identifier yang ditemukan
4. `kategori`: teks tampilan / identifier internal / data / config / aset
5. `zona`: `[froyek-ikut-pindah]` / `[tetap-di-monefyi]` / `[legacy-identifier-jangan-diubah]`
6. `risiko`: rendah / sedang / tinggi
7. `tindakan yang disarankan`: Rekomendasi teknis yang aman dan presisi

### 1. Nama Aplikasi, Manifest & Service Worker Cache

| File | Baris | Temuan | Kategori | Zona | Risiko | Tindakan yang Disarankan |
|---|---|---|---|---|---|---|
| `monefyi_planner/package.json` | 2 | `"name": "monefyi-planner"` | config | `[froyek-ikut-pindah]` | Rendah | Ganti menjadi `"froyek-web"` atau `"@froyek/web"`. |
| `PlannerLP2/package.json` | 2 | `"name": "nextjs-postgresql-template"` | config | `[froyek-ikut-pindah]` | Rendah | Ganti menjadi `"froyek-landing"` atau `"@froyek/landing"`. |
| `monefyi_planner/public/sw.js` | 1 | `/* Monefyi Planner — service worker ... */` | config | `[froyek-ikut-pindah]` | Rendah | Perbarui header komentar menjadi `Froyek Web Service Worker`. |
| `monefyi_planner/public/sw.js` | 2 | `const CACHE = 'monefyi-planner-v1';` | config | `[froyek-ikut-pindah]` | Sedang | Ubah cache name menjadi `'froyek-web-v1'`. Buat cleanup cache lama di event `activate`. |
| `monefyi_planner/public/manifest.webmanifest` | 2-3 | `"name": "froyek"`, `"short_name": "froyek"` | config | `[froyek-ikut-pindah]` | Rendah | Sudah memakai "froyek". Perbarui path icons agar merujuk ke favicon baru. |
| `monefyi_planner/public/manifest-estimator.webmanifest` | 7 | `"id": "monefyi-estimator-pwa"` | config | `[froyek-ikut-pindah]` | Sedang | Ganti menjadi `"froyek-estimator-pwa"`. |
| `PlannerLP2/public/sw.js` | 1-2 | `// Service Worker for Monefyi Estimator PWA`, `CACHE_NAME = 'monefyi-estimator-v2'` | config | `[froyek-ikut-pindah]` | Sedang | Ganti menjadi `'froyek-estimator-v3'`. |
| `PlannerLP2/public/sw.js` | 23 | `key.startsWith('monefyi-estimator')` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Pertahankan pemeriksaan `key.startsWith('monefyi-estimator')` pada `activate` untuk membersihkan cache legacy. |
| `PlannerLP2/public/admin-sw.js` | 1-2 | `// Service Worker for Monefyi Admin CRM PWA`, `CACHE_NAME = 'monefyi-admin-crm-v3'` | config | `[froyek-ikut-pindah]` | Sedang | Ganti menjadi `'froyek-admin-crm-v4'`. |
| `PlannerLP2/public/admin-sw.js` | 26 | `key.startsWith('monefyi-admin')` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Pertahankan untuk auto-cleanup cache legacy. |
| `PlannerLP2/public/admin-sw.js` | 71 | `tag: data.tag || 'monefyi-admin-alert'` | config | `[froyek-ikut-pindah]` | Rendah | Ganti default notification tag ke `'froyek-admin-alert'`. |
| `PlannerLP2/public/admin-manifest.webmanifest` | 2-3 | `"name": "Monefyi Estimator Admin CRM"`, `"short_name": "Estimator CRM"` | config | `[froyek-ikut-pindah]` | Rendah | Ganti name menjadi `"Froyek CRM Admin"`. |
| `monefyi_planner/index.html` | 6 | `<title>froyek — Agent for your Project</title>` | config | `[froyek-ikut-pindah]` | Rendah | Sudah "froyek". Pertahankan. |
| `monefyi_planner/index.html` | 14-16 | `<link rel="manifest" href="/manifest.webmanifest" />`, `<link rel="icon" ... />` | aset | `[froyek-ikut-pindah]` | Rendah | Ganti href icon ke favicon resmi dari `froyek-brand.zip`. |

### 2. Aset Visual, Logo & Komponen UI

| File | Baris | Temuan | Kategori | Zona | Risiko | Tindakan yang Disarankan |
|---|---|---|---|---|---|---|
| `monefyi_planner/src/components/MonefyiLogo.tsx` | 4-5 | `MONEFYI_LOGO_SRC = PLANNER_LOGO_SRC` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Buat komponen `FroyekLogo.tsx`, ekspor alias `MonefyiLogo` sebagai deprecated wrapper. |
| `monefyi_planner/src/components/MonefyiLogo.tsx` | 33 | `export function MonefyiLogo(props: PlannerLogoProps)` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Pindahkan ke implementasi SVG resmi origami F + wordmark froyek. |
| `monefyi_planner/public/icons/monefyi-logo.png` | - | File gambar logo lama Monefyi | aset | `[froyek-ikut-pindah]` | Sedang | Hapus file lama setelah digantikan dengan `froyek-mark-forest.png` / `froyek-horizontal-forest.png`. |
| `monefyi_planner/public/icons/monefyi-logo-source.png` | - | File aset sumber lama | aset | `[froyek-ikut-pindah]` | Rendah | Ganti dengan `png/froyek-icon-1024.png`. |
| `monefyi_planner/public/og-image.png` | - | File Open Graph lama | aset | `[froyek-ikut-pindah]` | Sedang | Ganti dengan `social/og-image.png` dari brand zip. |
| `monefyi_planner/public/icons/icon-192.png` | - | Ikon PWA 192px lama | aset | `[froyek-ikut-pindah]` | Sedang | Ganti dengan `favicon/android-chrome-192x192.png`. |
| `monefyi_planner/public/icons/icon-512.png` | - | Ikon PWA 512px lama | aset | `[froyek-ikut-pindah]` | Sedang | Ganti dengan `favicon/android-chrome-512x512.png`. |
| `monefyi_planner/public/icons/icon-maskable-512.png` | - | Ikon PWA maskable 512px lama | aset | `[froyek-ikut-pindah]` | Sedang | Ganti dengan `favicon/maskable-icon-512x512.png`. |
| `monefyi_planner/src/components/AuthPages.tsx` | 35 | `import { PlannerLogo } from './MonefyiLogo';` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Ubah import ke `./FroyekLogo`. |
| `monefyi_planner/src/components/Layout.tsx` | 19 | `import { PlannerLogo } from './MonefyiLogo';` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Ubah import ke `./FroyekLogo`. |
| `monefyi_planner/src/components/Layout.tsx` | 30 | `import { MONEFYI_BRAND } from '../lib/orgBrand';` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Refactor konstanta merek ke `FROYEK_BRAND` di `lib/orgBrand.ts`. |
| `monefyi_planner/src/components/auth/ResetPasswordPanel.tsx` | 6 | `import { PlannerLogo } from '../MonefyiLogo';` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Ubah import ke `../FroyekLogo`. |
| `monefyi_planner/src/components/PwaInstallBanner.tsx` | 11 | `import { PlannerLogo } from './MonefyiLogo';` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Ubah import ke `./FroyekLogo`. |
| `PlannerLP2/src/lib/brand/brand.config.ts` | 12-25 | `export const BRANDS = { estimator: { ... assets ... } }` | config | `[froyek-ikut-pindah]` | Sedang | Arahkan URL asset ke file brand Froyek yang baru. |
| `PlannerLP2/src/components/landing/LandingHeader.tsx` | 42 | Komponen Navbar Estimator/Froyek | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Gunakan logo SVG horizontal Froyek dari `froyek-brand.zip`. |

### 3. Domain, Origin, Routing & Hostname

| File | Baris | Temuan | Kategori | Zona | Risiko | Tindakan yang Disarankan |
|---|---|---|---|---|---|---|
| `PlannerLP2/src/lib/config/publicHosts.ts` | 3-4 | `PLANNER_HOST = "froyek.com"`, `ESTIMATOR_HOST = "estimator.froyek.com"` | config | `[froyek-ikut-pindah]` | Rendah | Sudah mengarah ke domain froyek.com kanonik. Pertahankan. |
| `PlannerLP2/src/lib/config/publicHosts.ts` | 8-9 | `LEGACY_PLANNER_HOSTS = ["planner.monefyi.com"]`, `LEGACY_ESTIMATOR_HOSTS = ["estimator.monefyi.com"]` | config | `[legacy-identifier-jangan-diubah]` | Sedang | **Wajib dipertahankan** agar redirect 308 dari domain lama ke froyek.com tetap aktif. |
| `PlannerLP2/src/lib/config/publicHosts.ts` | 27-40 | `legacyHostRedirects()` (308 redirect) | identifier internal | `[froyek-ikut-pindah]` | Sedang | Pertahankan agar traffic domain lama tidak putus. |
| `PlannerLP2/next.config.ts` | 14-17 | `"https://monefyi-planner.vercel.app"` (proxy `/app`) | config | `[legacy-identifier-jangan-diubah]` | Tinggi | Origin backend SPA Vercel lama. Ubah ke domain baru froyek hanya setelah domain alias di Vercel disetup. |
| `monefyi_planner/vercel.json` | 26 | `frame-ancestors ... https://estimator.monefyi.com https://planner.monefyi.com` | config | `[froyek-ikut-pindah]` | Sedang | Pertahankan domain froyek.com dan legacy monefyi.com dalam CSP frame-ancestors. |
| `PlannerLP2/.env.example` | 8-12 | `PLANNER_APP_ORIGIN=https://monefyi-planner.vercel.app` | config | `[froyek-ikut-pindah]` | Sedang | Catat sebagai opsi yang nantinya diisi URL production Froyek. |
| `monefyi_planner/src/services/customDomainService.ts` | 28 | `'monefyi.vercel.app'` | identifier internal | `[legacy-identifier-jangan-diubah]` | Rendah | Tetap masukkan dalam daftar default app hosts agar tidak dianggap custom domain. |
| `scripts/patch-supabase-auth-urls.sh` | 13-16 | `https://planner.monefyi.com/**`, `https://estimator.monefyi.com/**` | config | `[tetap-di-monefyi]` | Tinggi | Tambahkan `https://froyek.com/**`, `https://estimator.froyek.com/**`, `https://app.froyek.com/**` ke URI allow list Supabase Auth. |
| `scripts/patch-supabase-auth-urls.sh` | 27 | `site_url: "https://estimator.monefyi.com"` | config | `[tetap-di-monefyi]` | Tinggi | Pertahankan di monefyi, buat script terpisah untuk migrasi site_url ke `https://froyek.com`. |

### 4. PDF, Kop Surat & Watermark (`monefyi_planner/src/lib/pdf/`)

| File | Baris | Temuan | Kategori | Zona | Risiko | Tindakan yang Disarankan |
|---|---|---|---|---|---|---|
| `monefyi_planner/src/lib/pdf/templates/shared.ts` | 358 | `text: \`${ctx.footerText} ... · Froyek ${new Date().getFullYear()}\`` | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Sudah memakai "Froyek". Pertahankan. |
| `monefyi_planner/src/lib/pdf/pdfPlanPolicy.ts` | 1 | `export const FREE_ESTIMATOR_WATERMARK = 'Dibuat dengan Estimator · estimator.froyek.com';` | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Sudah memakai `estimator.froyek.com`. Pertahankan. |
| `monefyi_planner/src/lib/pdf/pdfPlanPolicy.ts` | 6 | `/** Logo, tanda tangan, dan cap hanya untuk Estimator Pro / Planner Pro / Enterprise. */` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Entitlement komentar. Tidak ada string monefyi. |
| `monefyi_planner/src/lib/pdf/digitalSignatureStorage.ts` | 3 | `const STORAGE_PREFIX = 'monefyi:doc_sig:';` | identifier internal | `[legacy-identifier-jangan-diubah]` | Sedang | Pertahankan prefix atau buat fallback `froyek:doc_sig:` + `monefyi:doc_sig:` agar tanda tangan tersimpan tidak hilang. |
| `monefyi_planner/src/lib/financeV1/exportBusinessReportPdf.ts` | 89 | Kop Laporan Bisnis | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Pastikan branding default header laporan bisnis memakai Froyek. |
| `monefyi_planner/src/lib/pdf/contractPdf.ts` | 342, 402 | Injeksi logo organisasi pada kontrak PDF | aset | `[froyek-ikut-pindah]` | Rendah | Menggunakan `ctx.logo` (logo milik user/org). Tidak hardcoded logo vendor. |
| `monefyi_planner/src/lib/pdf/kwitansiPdfTemplate.ts` | 6-17 | Injeksi logo organisasi pada kwitansi PDF | aset | `[froyek-ikut-pindah]` | Rendah | Dinamis dari data organisasi user. Aman. |

### 5. Email, WhatsApp & Telegram

| File | Baris | Temuan | Kategori | Zona | Risiko | Tindakan yang Disarankan |
|---|---|---|---|---|---|---|
| `PlannerLP2/src/lib/services/resendService.ts` | 291 | `(process.env.RESEND_FROM_EMAIL \|\| "").trim() \|\| "Froyek <noreply@support.monefyi.com>"` | config | `[froyek-ikut-pindah]` | Sedang | Ubah fallback ke `"Froyek <noreply@froyek.com>"` saat DNS DKIM/SPF froyek.com aktif. |
| `PlannerLP2/src/app/api/admin/meta-billing-alert/route.ts` | 18 | `(process.env.RESEND_FROM_EMAIL \|\| "").trim() \|\| "Froyek <noreply@support.monefyi.com>"` | config | `[froyek-ikut-pindah]` | Sedang | Sesuaikan fallback email pengirim. |
| `monefyi_planner/.env.example` | 11 | `# RESEND_FROM_EMAIL=Monefyi Planner <noreply@support.monefyi.com>` | config | `[froyek-ikut-pindah]` | Rendah | Ganti contoh menjadi `Froyek <noreply@froyek.com>`. |
| `my-supabase-project/supabase/functions/_shared/email.ts` | 11-13 | `FROYEK_FROM = "Froyek <noreply@support.monefyi.com>"`, `MONEFYI_FROM = ...` | config | `[tetap-di-monefyi]` | Sedang | Helper Supabase tetap di monefyi. Akan otomatis memakai `Froyek <noreply@froyek.com>` jika env `RESEND_FROM_EMAIL` disetel. |
| `my-supabase-project/supabase/functions/_shared/monefyi-email-layout.ts` | 23, 31 | `productName: "Froyek"`, `support@froyek.com` | config | `[tetap-di-monefyi]` | Rendah | Email layout sudah disetel ke "Froyek" untuk produk planner & estimator. |
| `monefyi_planner/src/services/customerSupportService.ts` | 143, 164 | `Di Froyek ada fitur khusus ...`, `tim support Froyek` | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Teks balasan CS sudah menyebut "Froyek". Pertahankan. |
| `monefyi_planner/src/services/telegramService.ts` | 48-50 | `STORAGE_TELEGRAM_CFG = 'monefyi_telegram_config_v1'`, `STORAGE_FIELD_CONTACTS = ...`, `STORAGE_PROACTIVE_LOGS = ...` | identifier internal | `[legacy-identifier-jangan-diubah]` | Sedang | **Wajib dipertahankan** agar konfigurasi bot Telegram yang sudah diatur user di localStorage tidak hilang. |
| `PlannerLP2/src/lib/services/whatsappBotService.ts` | 72 | `const WA_CONFIG_STORAGE_KEY = 'monefyi_wa_bot_config_v1';` | identifier internal | `[legacy-identifier-jangan-diubah]` | Sedang | Pertahankan pembacaan storage key lama untuk backward compatibility. |
| `PlannerLP2/src/lib/services/whatsappBotService.ts` | 243, 255 | `Berikut format perintah cepat WhatsApp Froyek:` | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Teks template WhatsApp sudah memakai "Froyek". |

### 6. Integrasi Pembayaran (Mayar & Lynk.id)

| File | Baris | Temuan | Kategori | Zona | Risiko | Tindakan yang Disarankan |
|---|---|---|---|---|---|---|
| `PlannerLP2/src/app/api/checkout/mayar/route.ts` | 256 | `description: \`monefyi:${JSON.stringify(descriptionMeta)}\`` | data | `[legacy-identifier-jangan-diubah]` | **Tinggi** | **JANGAN DIUBAH SEMBARANGAN**. Webhook Mayar mengidentifikasi transaksi lewat awalan `monefyi:` dan objek JSON di dalamnya. Ubah hanya bila edge function webhook mendukung awalan `froyek:`. |
| `monefyi_planner/src/lib/plannerMayarDescription.ts` | 1-25 | Parser deskripsi transaksi Mayar | identifier internal | `[froyek-ikut-pindah]` | Sedang | Pastikan parser mendukung baik awalan `monefyi:` maupun `froyek:`. |
| `monefyi_planner/.env.example` | 14-17 | `VITE_LYNK_ESTIMATOR_STANDARD`, `VITE_LYNK_ESTIMATOR_PRO`, `VITE_LYNK_PLANNER_PRO` | config | `[froyek-ikut-pindah]` | Sedang | Pertahankan nama env var (atau sediakan alias `VITE_LYNK_FROYEK_*`). |
| `PlannerLP2/.env.example` | 21-23 | `NEXT_PUBLIC_LYNK_ESTIMATOR_STANDARD`, `NEXT_PUBLIC_LYNK_ESTIMATOR_PRO`, `NEXT_PUBLIC_LYNK_PLANNER_PRO` | config | `[froyek-ikut-pindah]` | Sedang | Pertahankan nama variabel env Lynk. |
| `PlannerLP2/src/lib/services/mayarHealthService.ts` | 217, 230 | `ALERT MAYAR PAYMENT GATEWAY (FROYEK)`, `Admin Froyek -> Pengaturan` | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Notifikasi alert sudah memakai nama "Froyek". |
| `monefyi_planner/src/lib/checkout.ts` | 27-29 | Mapping env `VITE_LYNK_*` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Pertahankan agar alur checkout tidak terganggu. |
| `PlannerLP2/src/lib/engine/winningEngine.ts` | 20 | `export const MONEFYI_PRICING = { ... }` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Rename ke `FROYEK_PRICING` atau alias `export const FROYEK_PRICING = MONEFYI_PRICING`. |

### 7. Penyimpanan Lokal, Sesi, Cookie & Custom Events

| File | Baris | Temuan | Kategori | Zona | Risiko | Tindakan yang Disarankan |
|---|---|---|---|---|---|---|
| `monefyi_planner/index.html` | 29, 34 | `sessionStorage.setItem('monefyi_password_recovery', '1')`, `sessionStorage.setItem('monefyi_password_recovery_error', message)` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Ganti ke `froyek_password_recovery`, buat fallback pembacaan kunci `monefyi_*` di `passwordRecoveryIntent.ts`. |
| `monefyi_planner/src/lib/passwordRecoveryIntent.ts` | 3-4 | `sessionStorage.getItem('monefyi_password_recovery')` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Baca `froyek_password_recovery` terlebih dahulu, fallback ke `monefyi_password_recovery`. |
| `monefyi_planner/src/components/CommandModal.tsx` | 198, 833, 874 | `localStorage.getItem('monefyi_ai_mode')`, `localStorage.setItem('monefyi_ai_mode', ...)` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Ganti ke `froyek_ai_mode` dengan fallback pembacaan legacy. |
| `monefyi_planner/src/components/PwaInstallBanner.tsx` | 13-14 | `'monefyi_planner_pwa_install_dismissed'`, `'monefyi_estimator_pwa_install_dismissed'` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Ubah prefix ke `froyek_`. |
| `monefyi_planner/src/services/aiProviderService.ts` | 88-90 | `'monefyi_planner_ai_config_v1'`, `'monefyi_planner_ai_keys_session_v1'`, `'monefyi_planner_ai_owner_v1'` | identifier internal | `[legacy-identifier-jangan-diubah]` | Sedang | Pertahankan atau buat migrator otomatis di startup agar API key tersimpan user tidak terhapus. |
| `monefyi_planner/src/services/auditService.ts` | 5 | `'monefyi_audit_logs_local_v1:'` | identifier internal | `[legacy-identifier-jangan-diubah]` | Rendah | Pertahankan prefix storage lokal. |
| `monefyi_planner/src/services/customDomainService.ts` | 100 | `'monefyi_custom_domain_ctx'` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Ubah ke `froyek_custom_domain_ctx` dengan fallback. |
| `monefyi_planner/src/services/singleDeviceSessionService.ts` | 29-30 | `'monefyi_active_device_session_v1'`, `'monefyi_logout_reason'` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Ubah ke `froyek_` dengan fallback legacy agar user tidak ter-kick out mendadak. |
| `monefyi_planner/src/services/workItemService.ts` | 21-23 | `'monefyi_work_item_meta_v1:'`, `'monefyi_demo_work_items_v1:'`, `'monefyi_demo_work_item_project_index_v1'` | identifier internal | `[legacy-identifier-jangan-diubah]` | Sedang | Pertahankan pembacaan data offline / demo project. |
| `monefyi_planner/src/store/appStore.ts` | 222, 237, 239 | `'monefyi_ui_view_mode'`, `'monefyi_nav_sidebar_collapsed'`, `'monefyi_right_panel_hidden'` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Ubah ke `froyek_` dengan fallback pembacaan legacy. |
| `monefyi_planner/src/store/appStore.ts` | 273 | `window.dispatchEvent(new Event('monefyi:entitlement-invalidate'))` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Ubah ke `'froyek:entitlement-invalidate'`. |
| `monefyi_planner/src/components/Layout.tsx` | 83-84, 192 | `window.addEventListener('monefyi:migration-flags-changed')`, `'monefyi:open-upgrade'` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Ubah nama event ke namespace `froyek:`. |
| `PlannerLP2/src/lib/store/contentStore.ts` | 196 | `name: "monefyi_content_lp3"` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Nama storage Zustand persist. Pertahankan pembacaan lama atau migrasi ke `froyek_content_lp3`. |
| `PlannerLP2/src/lib/store/leadsStore.ts` | 166 | `name: "monefyi-leads"` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Nama storage Zustand leads CRM. Berikan migrasi otomatis ke `froyek-leads`. |
| `PlannerLP2/src/lib/store/settingsStore.ts` | 21 | `name: "monefyi-settings"` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Nama storage Zustand settings. Migrasi otomatis ke `froyek-settings`. |
| `PlannerLP2/src/lib/store/authStore.ts` | 18-19 | `"monefyi_user_auth"`, `"monefyi_planner_trial_uses"` | identifier internal | `[froyek-ikut-pindah]` | Sedang | Nama storage Zustand auth & trial. Migrasi otomatis ke `froyek_user_auth`. |
| `PlannerLP2/src/lib/hooks/useAdminNotificationEngine.ts` | 49, 259, 262 | `'monefyi-notifications-changed'`, `'monefyi_billing_threshold'`, `'monefyi_billing_alert_hours'` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Ubah namespace event dan storage ke `froyek_`. |

### 8. Copywriting UI, Export CSV & Video Remotion

| File | Baris | Temuan | Kategori | Zona | Risiko | Tindakan yang Disarankan |
|---|---|---|---|---|---|---|
| `PlannerLP2/src/app/admin/crm/page.tsx` | 1129 | `a.download = \`monefyi-leads-${...}.csv\`` | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Ganti nama file export CSV ke `froyek-leads-${...}.csv`. |
| `remotion/src/Root.tsx` | 58, 85, 113, 141 | `<Folder name="Monefyi-Estimator-*">` | identifier internal | `[froyek-ikut-pindah]` | Rendah | Ganti nama folder komposisi ke `Froyek-Estimator-*`. |
| `remotion/src/data/subtitles30s.ts` | 41 | `text: "Di Monefyi Estimator..."` | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Ganti teks subtitle ke `"Di Estimator by Froyek..."`. |
| `remotion/src/data/subtitles60s.ts` | 65 | `text: "Itulah kenapa kamu butuh Monefyi Estimator"` | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Ganti teks subtitle ke `"Itulah kenapa kamu butuh Froyek Estimator"`. |
| `remotion/src/EstimatorMotionVideo/components/BrandMark.tsx` | 52 | `by Monefyi` | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Ganti badge menjadi `by Froyek`. |
| `remotion/src/EstimatorMotionVideo/components/ExactEstimatorApp.tsx` | 548 | `<span ...>MONEFYI ESTIMATOR</span>` | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Ganti menjadi `FROYEK ESTIMATOR`. |
| `remotion/src/CustomerHilangVideo/scenes/Scene1GhostingHook.tsx` | 168 | `Estimator by Monefyi • Kenapa Customer Bisa Dingin?` | teks tampilan | `[froyek-ikut-pindah]` | Rendah | Ganti menjadi `Estimator by Froyek`. |
| `remotion/public/brand/estimator/demo-preview.svg` | 6 | `<text ...>Monefyi Estimator</text>` | aset | `[froyek-ikut-pindah]` | Rendah | Ganti teks di SVG mock menjadi `Froyek Estimator`. |

### 9. CI/CD & GitHub Workflows

| File | Baris | Temuan | Kategori | Zona | Risiko | Tindakan yang Disarankan |
|---|---|---|---|---|---|---|
| `.github/workflows/planner-spa-deploy.yml` | 7, 16, 24 | Trigger & working-directory `monefyi_planner/**` | config | `[froyek-ikut-pindah]` | Tinggi | Pada repo baru Froyek, arahkan path ke `apps/web/**`. |
| `.github/workflows/planner-spa-deploy.yml` | 42 | `VERCEL_PROJECT_ID: ${{ secrets.VERCEL_MONEFYI_PLANNER_PROJECT_ID }}` | config | `[froyek-ikut-pindah]` | Tinggi | Buat project Vercel baru untuk Froyek Web dan gunakan secret ID baru. |
| `.github/workflows/planner-lp2-deploy.yml` | 7, 16, 24 | Trigger & working-directory `PlannerLP2/**` | config | `[froyek-ikut-pindah]` | Tinggi | Pada repo baru Froyek, arahkan path ke `apps/landing/**`. |
| `.github/workflows/planner-lp2-deploy.yml` | 36-38 | `PLANNER_APP_ORIGIN: https://monefyi-planner.vercel.app`, `NEXT_PUBLIC_PLANNER_APP_URL: https://froyek.com` | config | `[froyek-ikut-pindah]` | Tinggi | Perbarui origin ke deployment production Froyek. |
| `.github/workflows/estimator-lp-deploy.yml` | 7-10 | Path `PlannerLP2/**`, `Mini App Monefyi/**`, `EstimatorLP/**` | config | `[froyek-ikut-pindah]` | Tinggi | Pisahkan alur deploy Estimator di Froyek tanpa ketergantungan pada path folder monefyi. |
| `.github/workflows/agent-eval.yml` | 10, 18 | `monefyi_planner/src/lib/agentEval.test.ts`, working-directory | config | `[froyek-ikut-pindah]` | Sedang | Sesuaikan working directory ke struktur target (`apps/web`). |
| `.github/workflows/supabase-planner-deploy.yml` | 1-135 | Workflow deploy Supabase DB push & Functions | config | `[tetap-di-monefyi]` | **Tinggi** | **TETAP DI REPO MONEFYI**. Sesuai keputusan hard rules, repo froyek dilarang menjalankan db push / deploy fungsi Supabase. |
| `.github/workflows/supabase-lynk-auto-deploy.yml` | 40 | Auto-deploy edge functions `planner-*` | config | `[tetap-di-monefyi]` | **Tinggi** | Tetap di repo monefyi. |

### 10. Database, RPC & Identifier Legacy (DILARANG UBAH)

| Identifier | Tipe | Sumber File / Tabel | Kategori | Zona | Risiko Bila Diubah | Tindakan yang Disarankan |
|---|---|---|---|---|---|---|
| `planner_organizations` | Tabel DB | Supabase PostgreSQL | data / schema | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. Mengubah nama tabel akan merusak seluruh data tenant produksi saat ini. |
| `planner_org_members` | Tabel DB | Supabase PostgreSQL | data / schema | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. Pusat relasi user-organisasi produksi. |
| `planner_projects` | Tabel DB | Supabase PostgreSQL | data / schema | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. Data proyek user live. |
| `planner_quotations` | Tabel DB | Supabase PostgreSQL | data / schema | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. Data estimasi dan penawaran live. |
| `planner_invoices` | Tabel DB | Supabase PostgreSQL | data / schema | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. Data penagihan live. |
| `planner_proposals` | Tabel DB | Supabase PostgreSQL | data / schema | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. Data proposal live. |
| `planner_audit_logs` | Tabel DB | Supabase PostgreSQL | data / schema | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. Jejak audit produksi. |
| `planner_channel_*` | 6 Tabel DB | Supabase PostgreSQL (secrets, inbox, identitas, dll.) | data / schema | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. Integrasi Telegram bot live. |
| `planner_agent_*` | 4 Tabel DB | Supabase PostgreSQL (runs, settings, memories, dll.) | data / schema | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. State agen live. |
| `planner_domain_mappings` | Tabel DB | Supabase PostgreSQL | data / schema | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. Custom domain tenant live. |
| `planner_quotations` (bucket) | Supabase Storage | Supabase Storage Bucket | data / storage | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. Berisi file PDF penawaran user yang sudah dikirim ke klien. |
| `company-logos` (bucket) | Supabase Storage | Supabase Storage Bucket | data / storage | `[legacy-identifier-jangan-diubah]` | Sedang | Pertahankan nama bucket logo tenant. |
| `planner-field-media` (bucket) | Supabase Storage | Supabase Storage Bucket | data / storage | `[legacy-identifier-jangan-diubah]` | **Tinggi** | Pertahankan nama bucket media dokumentasi lapangan. |
| `planner-*` (25 Edge Functions) | Edge Functions | `my-supabase-project/supabase/functions/` | identifier internal | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH NAMA ROUTE**. SPA memanggil URL `functions/v1/planner-*`. Tetap hidup di backend monefyi. |
| `planner_issue_channel_link` | Database RPC | Supabase PostgreSQL | identifier internal | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. Fungsi RPC Supabase live. |
| `planner_channel_redeem` | Database RPC | Supabase PostgreSQL | identifier internal | `[legacy-identifier-jangan-diubah]` | **CRITICAL** | **JANGAN UBAH**. Fungsi RPC Supabase live. |

---

## Rahasia di File (Credentials Tertanam)

> [!CAUTION]
> Bagian ini mendaftar lokasi (file:baris) kredensial sensitif yang ditemukan tertanam langsung di dalam kode atau file workflow repository. Sesuai aturan keras, **isi rahasia/password/token TIDAK DISALIN ke dalam laporan ini**. Hanya dicantumkan file, baris, jenis kredensial, dan nama variabelnya.

| File | Baris | Jenis Kredensial | Nama Variabel / Konteks | Level Bahaya | Rekomendasi Tindakan |
|---|---|---|---|---|---|
| `PlannerLP2/src/lib/engine/engineDb.ts` | 13 | Supabase Service Role Key (Hardcoded String) | `process.env.SUPABASE_SERVICE_ROLE_KEY \|\| "eyJ..."` | **CRITICAL** | Hapus string fallback hardcoded; lempar error jika env kosong. |
| `PlannerLP2/src/app/api/crm/customer/route.ts` | 9 | Supabase Service Role Key (Hardcoded String) | `process.env.SUPABASE_SERVICE_ROLE_KEY \|\| "eyJ..."` | **CRITICAL** | Hapus string fallback hardcoded; gunakan service role murni dari env. |
| `PlannerLP2/src/app/api/crm/provision/route.ts` | 9 | Supabase Service Role Key (Hardcoded String) | `process.env.SUPABASE_SERVICE_ROLE_KEY \|\| "eyJ..."` | **CRITICAL** | Hapus string fallback hardcoded; gunakan service role murni dari env. |
| `.github/workflows/estimator-lp-deploy.yml` | 47 | Supabase Anon Key (Hardcoded JWT) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (env step build) | **Tinggi** | Pindahkan ke `${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}`. |
| `.github/workflows/estimator-lp-deploy.yml` | 48 | Supabase Service Role Key (Hardcoded JWT) | `SUPABASE_SERVICE_ROLE_KEY` (env step build) | **CRITICAL** | Pindahkan ke `${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}`. |
| `.github/workflows/estimator-lp-deploy.yml` | 73 | Supabase Anon Key (Hardcoded JWT) | `sync_env NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Tinggi** | Ambil dari `${{ secrets.* }}` bukan hardcoded string di script bash. |
| `.github/workflows/estimator-lp-deploy.yml` | 74 | Supabase Service Role Key (Hardcoded JWT) | `sync_env SUPABASE_SERVICE_ROLE_KEY` | **CRITICAL** | Ambil dari `${{ secrets.* }}` bukan hardcoded string di script bash. |
| `.github/workflows/estimator-lp-deploy.yml` | 94, 95 | Supabase Anon & Service Role Key | Step deploy prebuilt | **CRITICAL** | Ganti dengan secret GitHub Actions. |
| `.github/workflows/planner-lp2-deploy.yml` | 41, 42 | Supabase Anon & Service Role Key | Step build production | **CRITICAL** | Ganti dengan secret GitHub Actions. |
| `.github/workflows/planner-lp2-deploy.yml` | 61, 62 | Supabase Anon & Service Role Key | Step sync Vercel env | **CRITICAL** | Ganti dengan secret GitHub Actions. |
| `.github/workflows/planner-lp2-deploy.yml` | 76, 77 | Supabase Anon & Service Role Key | Step deploy Vercel | **CRITICAL** | Ganti dengan secret GitHub Actions. |
| `.github/workflows/planner-spa-deploy.yml` | 33, 44 | Supabase Anon Key (Hardcoded JWT) | Step deploy Vercel | **Tinggi** | Ganti dengan `${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}`. |
| `.github/workflows/supabase-planner-deploy.yml` | 47, 126 | Test Account Email | `RLS_TEST_EMAIL: owner-onboard@test.monefyi.app` | Sedang | Pertahankan di repo monefyi; jangan salin ke froyek. |
| `PlannerLP2/README.md` | 181, 302 | Default Plaintext Password | `ADMIN_PASSWORD=monefyi2026` | Sedang | Hapus dokumentasi password default; rekomendasikan generate random password. |
| `PlannerLP2/.screenshots/` | - | Screenshot PNG | File binary artefak | Rendah | Abaikan saat pemindahan ke repo baru. |
| `Mini App Monefyi/*/src/lib/monefyi-config.ts` | 20 | Supabase Anon Key (Hardcoded JWT) | `anonKey` (di 6 sub-aplikasi mini) | **Tinggi** | Mini App tetap di monefyi; bila dipindah harus menggunakan env var. |
| `Mini App Monefyi/*/drizzle.config.json` | 5 | PostgreSQL Connection String | `postgresql://postgres:[password]@...` | **CRITICAL** | Berada di Mini App Monefyi (zona monefyi). Tetap di repo monefyi. |

---

## Keputusan & Batas Pemisahan yang Dikonfirmasi

1. **Kepemilikan Supabase**:
   - Direktori `my-supabase-project/` dan `supabase/` **TETAP 100% di repo monefyi**.
   - Tidak ada workflow di repo froyek yang akan menjalankan `supabase db push` atau deploy schema.
   - Seluruh identifier skema database (`planner_*`), kolom, enum, dan RPC **TIDAK DIUBAH** agar produksi tidak putus.
2. **Komponen yang Tetap Tinggal di Monefyi**:
   - `Planner-Landing-Page` (landing legacy)
   - `monefyi-autonomous-ads`
   - `EstimatorLP`
   - `Mini App Monefyi` (tetap di monefyi; Froyek Estimator mengonsumsinya via URL bila diperlukan)
   - File arsip `.zip` di root
3. **Struktur Target (Tahap 2 Nanti)**:
   - `apps/web` (berasal dari `monefyi_planner`)
   - `apps/landing` (berasal dari `PlannerLP2`)
   - `packages/domain` (domain logic)
   - `agent-core` (logika agen)
   - `evals` (skenario evaluasi)
   - `remotion` (video motion graphics)
   - `config/brand` (aset resmi dari `froyek-brand.zip`)
   - `docs/` (dokumentasi relevan Froyek)
4. **Strategi Rebranding (Tahap 3 Nanti)**:
   - Integrasikan file SVG/PNG dari `froyek-brand.zip` ke `apps/web/public/` dan `apps/landing/public/`.
   - Pasang adapter localStorage / sessionStorage untuk migrasi halus data user lokal.
   - Ganti teks UI yang terlihat user ("Monefyi" -> "Froyek").
   - Bersihkan seluruh fallback service role key yang tertanam di kode sumber.
