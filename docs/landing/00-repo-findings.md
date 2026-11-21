# Temuan repo — Landing Marketing 3.0 Froyek

Dokumen ini mencatat keadaan repo sebelum landing Froyek ditambahkan. Keputusan produk yang mengikat implementasi ada di bagian akhir.

## Stack

- Produk di `froyek.com/app` adalah SPA React 19 + TypeScript + Vite 7 + Tailwind 4 + Zustand + Supabase, di folder `monefyi_planner/`. Package manager: npm. Router: `react-router-dom`, rute aplikasi di `/app/*`.
- Host publik `froyek.com` adalah Next.js 16 di `PlannerLP2/`. Next memproksi `/app`, `/login`, `/signup`, `/onboarding` ke origin SPA (`monefyi-planner.vercel.app`).
- Root repo (`app/`, `vercel.json`, `monefyi-marketing-landing-page/`) adalah Monefyi keuangan pribadi di `monefyi.com`, bukan Froyek.
- Deploy Froyek: workflow `planner-lp2-deploy.yml` (landing) dan `planner-spa-deploy.yml` (SPA). Host Estimator memakai kode `PlannerLP2` yang sama dengan `ESTIMATOR_STANDALONE=true` ke `estimator.froyek.com`.
- Env landing: `PlannerLP2/.env.example` (`NEXT_PUBLIC_SUPABASE_*`, `MAYAR_API_KEY`, `NEXT_PUBLIC_PLANNER_PAYMENT_PROVIDER`, URL Lynk). Env SPA: `monefyi_planner/.env.example`.

## Routing

- `froyek.com/` dirender `PlannerLP2/src/app/page.tsx`. Sebelum perubahan ini, salinannya adalah landing Estimator (slug `estimator-lp`).
- `froyek.com/app` adalah proxy ke SPA. Bukan folder `app/` di root.
- `estimator.froyek.com` tetap landing Estimator. `planner.monefyi.com` mengarah 308 ke `froyek.com`.

## Auth

- Login SPA: Supabase email + kata sandi. Sesi di `localStorage` (`persistSession`), bukan cookie httpOnly. Origin `froyek.com` dan path `/app` berbagi storage yang sama.
- Satu perangkat: `singleDeviceSessionService.ts`. Ada pengecualian platform admin dan daftar uji internal. Tidak diubah.
- Role platform: `profiles.role = admin`. Role organisasi: `owner | manager | worker`.
- Halaman login publik: `/login` (diproksi ke SPA). Landing memakai `AuthHydrator` untuk membaca sesi yang sama.
- Tombol Login mengarah ke `/login`. Jika sesi ada, tombol menjadi "Buka Aplikasi" ke `/app`. Tidak ada migrasi sesi ke cookie.

## Database dan pembayaran

- Tidak ada tabel `licenses`. Akses = `user_product_entitlements` (produk `planner`) + `planner_org_subscriptions` (`free | estimator | pro | enterprise`).
- Migrasi kanonis: `my-supabase-project/supabase/migrations`. Klien SPA memakai Supabase JS, bukan Drizzle. Drizzle di landing tidak dipakai untuk langganan.
- Checkout landing Estimator: `POST /api/checkout/mayar` lalu webhook `POST /api/webhook/mayar` yang memperbarui tabel `orders`.
- Aktivasi langganan organisasi yang sudah ada: edge `planner-checkout`, `planner-mayar-webhook`, `planner-lynk-webhook` memanggil `activate_subscription` dan `grant_product_entitlement`.
- Harga di kode produk (`monefyi_planner/src/lib/entitlement.ts`): Estimator Standard Rp 93.000, Estimator Pro Rp 199.000, Froyek Pro Rp 199.000 per bulan. Enterprise tidak punya harga di kode.
- Provider default di sebagian dokumen masih Lynk. Env landing yang ada memakai Mayar. Wizard Froyek memakai jalur Mayar landing ini, sesuai keputusan di bawah.

## Desain, konten, admin

- Merek Froyek: `#0A3A2E`, `#10B981`, `#047857`, Inter + Poppins (`plannerBrand.ts`, Brand Guide). Landing Estimator memakai `#157F5F` dan tidak diubah.
- Konten Estimator: tipe `SiteContent`, disimpan lewat edge `monefyi-landing-config` ke tabel `landing_content`.
- Admin marketing sudah ada di `PlannerLP2` `/admin` (CRM, iklan, analitik, konten Estimator). Role admin mengikuti sesi Supabase.
- Toast Estimator dan edit inline (`?edit=1`) sudah ada untuk slug Estimator.

## Produk yang benar-benar ada

Boleh disebut, dengan batas:

- Proyek untuk paket berbayar yang kuotanya mengizinkan. Paket gratis tidak bisa membuat proyek (`maxActiveProjects = 0`).
- RAP dan realisasi biaya: ada, masih parsial.
- Keuangan proyek: Pro dan Enterprise.
- Laporan proyek ringkas (mingguan, keuangan, progres) plus ekspor.
- Modul penawaran Estimator sebagai lisensi, bukan nama utama Froyek.
- Undang anggota di Pro/Enterprise.
- Catat cepat lewat Smart Button. Agen `planner-agent-run` belum tersambung ke SPA; jangan menjanjikan manajer AI yang andal.

Jangan dijanjikan: HR/absensi (masih mock), konversi otomatis Estimator menjadi RAP, status siap produksi.

## Risiko

- Dua jalur bayar (webhook Next `orders` dan edge langganan). Pembeli Froyek harus mendapat keduanya: pesanan CRM dan langganan org.
- Webhook Mayar landing belum memverifikasi tanda tangan. Tidak diubah untuk pesanan Estimator. Cabang Froyek hanya berjalan jika pesanan yang cocok bertanda `brand: "froyek"`.
- Checkout Estimator lama mengirim kata sandi bawaan. Cabang Froyek tidak menyalin pola itu; pengguna baru mendapat tautan atur kata sandi.
- Harga Rp 99.000 di dokumen Lynk tidak dipakai. Harga landing mengikuti `entitlement.ts` atau promo di JSON yang lolos validasi server.

## Keputusan yang dipakai

1. `froyek.com` menampilkan narasi Froyek (slug `froyek`). `estimator.froyek.com` tetap landing Estimator.
2. Wizard Froyek berbentuk wawancara dan membayar lewat `POST /api/checkout/mayar`, sama seperti landing Estimator.
3. Admin kanonis ada di `froyek.com/admin` dan mengatur Estimator maupun Froyek (landing, CRM, iklan). `estimator.froyek.com/admin` dialihkan ke sana.
4. Aplikasi `/app` dan pengecualian keamanan yang sudah ada tidak diubah.

## Rencana implementasi

1. Skema Zod, token emerald hanya di permukaan Froyek, slug `froyek`.
2. Landing dari JSON, section bisa disembunyikan.
3. Wizard wawancara + Mayar + aktivasi langganan untuk pesanan `brand: froyek`.
4. Modul admin Froyek di panel yang sama.
5. Edit inline, tombol masuk, toast.
6. Event perilaku dan kartu A/B di analitik yang ada.
7. Tes skema/rekomendasi, catatan QA.
