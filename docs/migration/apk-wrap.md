# Laporan Migrasi & Keamanan APK Wrap (`chore/apk-wrap`)

Tanggal: 2026-11-27
Branch: `chore/apk-wrap`

---

## 1. Yang Sudah Diubah, Per File

### Langkah 1 – Konfigurasi Capacitor
- `capacitor.config.json`:
  - Mengubah `server.url` dari `https://froyek.com` menjadi `https://froyek.com/app`.
  - Mempertahankan `appId: "com.froyek.app"`, `appName: "froyek"`, dan `webDir: "apps/web/dist"`.

### Langkah 2 – Verifikasi Integrasi Push di `apps/web`
- Status: **Sudah ada dan terverifikasi** (tidak mengubah perilaku web desktop/iOS).
- `apps/web/src/lib/fcmNative.ts`:
  - Memeriksa `Capacitor.isNativePlatform()` dan `getPlatform() === 'android'` sebelum memanggil plugin `FirebaseMessaging`, sehingga tidak dijalankan di browser web desktop maupun iOS PWA.
  - Meminta izin notifikasi (`requestPermissions()`), memastikan notification channel `froyek_high_priority` (`importance: 4` / HIGH), mengambil token FCM (`getToken()`), dan menyimpannya ke tabel Supabase `public.froyek_fcm_tokens` per `user_id` dan `device_id`.
- `apps/web/src/components/AuthBootstrap.tsx`:
  - Memanggil `initFcmNativePush(userId, supabase)` setelah sesi autentikasi pengguna tersedia.
- `apps/web/src/lib/pwa.ts`:
  - Registrasi Service Worker PWA tetap utuh untuk web desktop dan iOS.

### Langkah 3 – Pengirim Push & Tabel Token (Draft)
- File migration dan Edge Function dipindahkan ke `docs/migration/draft/` agar tidak berada di dalam folder yang di-deploy otomatis:
  - `docs/migration/draft/20261125120000_froyek_fcm_tokens.sql`: Draft DDL tabel `public.froyek_fcm_tokens` beserta RLS policy per `user_id` dan constraint unik `(user_id, device_id)` (tidak menyentuh tabel/kolom/RPC `planner_*` yang sudah ada).
  - `docs/migration/draft/_shared/fcmV1.ts`: Helper pengirim FCM HTTP v1 menggunakan OAuth2 JWT Service Account, `android.priority: "high"`, `channel_id: "froyek_high_priority"`, payload `notification`, serta penghapusan otomatis baris token yang dibalas `UNREGISTERED` / `NOT_FOUND`.
  - `docs/migration/draft/planner-push-notify/index.ts`: Draft Edge Function Supabase untuk memproses pengiriman batch FCM HTTP v1 per `user_id` atau broadcast.

### Langkah 4 – Pembersihan Key Tertanam (Satu Commit Per Bagian)
1. **Service Role di `apps/landing` (ex-`PlannerLP2`):**
   - Catatan prasyarat: Variabel `SUPABASE_SERVICE_ROLE_KEY` wajib sudah terisi di environment Vercel (`planner-lp2` dan `estimator`). Keberadaan variabel tersebut di Vercel Production telah diverifikasi melalui `vercel env ls`.
   - `apps/landing/src/lib/engine/engineDb.ts`: Sudah membaca `process.env.SUPABASE_SERVICE_ROLE_KEY` tanpa fallback hardcoded dan melempar error jika kosong.
   - `apps/landing/src/app/api/crm/customer/route.ts`: Diubah agar `getSupabaseAdmin()` melempar `Error` jika `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` atau `SUPABASE_SERVICE_ROLE_KEY` kosong.
   - `apps/landing/src/app/api/crm/provision/route.ts`: Diubah agar `getSupabaseAdmin()` melempar `Error` jika `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` atau `SUPABASE_SERVICE_ROLE_KEY` kosong.
2. **GitHub Actions Workflows:**
   - `.github/workflows/estimator-lp-deploy.yml`: Mengganti nilai literal `ADMIN_PASSWORD` pada step build dengan `${{ secrets.ADMIN_PASSWORD }}`.
   - `.github/workflows/planner-lp2-deploy.yml`: Mengganti nilai literal `ADMIN_PASSWORD` pada step build dengan `${{ secrets.ADMIN_PASSWORD }}`.
   - `.github/workflows/planner-spa-deploy.yml`: Menambahkan validasi wajib agar build gagal jika secret `NEXT_PUBLIC_SUPABASE_URL` atau `NEXT_PUBLIC_SUPABASE_ANON_KEY` kosong.
3. **Konfigurasi Supabase Mini App:**
   - `Mini App Monefyi/_shared/monefyi-config.ts`
   - `Mini App Monefyi/Bagi Hasil/src/lib/monefyi-config.ts`
   - `Mini App Monefyi/Hitung Gaji/src/lib/monefyi-config.ts`
   - `Mini App Monefyi/Hitung Waris/src/lib/monefyi-config.ts`
   - `Mini App Monefyi/Hitung Zakat/src/lib/monefyi-config.ts`
   - `Mini App Monefyi/Kalkulator Gaji/src/lib/monefyi-config.ts`
   - `Mini App Monefyi/budget-planner/src/lib/monefyi-config.ts`
   - `Mini App Monefyi/debt-free-planner/src/lib/monefyi-config.ts`
   - Seluruh fallback `anonKey` dan URL hardcoded dihapus; `getSupabaseConfig()` kini wajib membaca `process.env.NEXT_PUBLIC_SUPABASE_URL` dan `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` serta melempar error jika kosong.
4. **Konfigurasi Drizzle Mini App:**
   - `Mini App Monefyi/Bagi Hasil/drizzle.config.json`
   - `Mini App Monefyi/Hitung Gaji/drizzle.config.json`
   - `Mini App Monefyi/Hitung Waris/drizzle.config.json`
   - `Mini App Monefyi/Hitung Zakat/drizzle.config.json`
   - `Mini App Monefyi/budget-planner/drizzle.config.json`
   - `Mini App Monefyi/debt-free-planner/drizzle.config.json`
   - Menghapus connection string hardcoded ber-password dan menggantinya dengan referensi environment `$DATABASE_URL`.
5. **Dokumentasi README:**
   - `apps/landing/README.md`: Mengganti contoh nilai default `ADMIN_PASSWORD` dan `DATABASE_URL` dengan placeholder `<isi_password_admin_anda>` dan `<isi_connection_string_database_anda>`.

---

## 2. Hasil Typecheck, Test, dan Build

- `npm ci` (root) & `npm --prefix apps/web ci`: **BERHASIL**
- `npm --prefix apps/web run typecheck` (`tsc --noEmit`): **BERHASIL** (`0` error)
- `npm --prefix apps/web run test` (`vitest run`):
  - `110/111` file test lulus pada run paralel penuh (`796/797` test lulus); 1 test (`src/lib/pdf/pdfTemplates.test.ts`) sempat timeout 5000ms akibat beban CPU paralel dan **BERHASIL (`3/3` passed)** saat diverifikasi ulang.
- `npm --prefix apps/web run build` (`vite build` singlefile → `apps/web/dist/index.html`): **BERHASIL**
- `npx cap sync android`: **BERHASIL** (menyalin aset `apps/web/dist` ke `android/app/src/main/assets/public` dan memperbarui `capacitor.config.json` dengan `server.url: "https://froyek.com/app"` serta plugin `@capacitor-firebase/messaging@8.6.0`).
- **Build APK (`./gradlew assembleDebug`):** Lingkungan lokal tidak memiliki Java Runtime (`Unable to locate a Java Runtime`), sehingga build APK dijalankan melalui GitHub Actions (`.github/workflows/android-apk-build.yml`).

---

## 3. Yang Belum Terverifikasi

1. **Status Rotasi Key di Supabase:** **TIDAK DIKETAHUI** apakah `anon` key, `service_role` key, maupun password database yang pernah tercatat di riwayat git sudah dirotasi di dashboard Supabase.
2. **Eksekusi Migration & Edge Function Draft di Produksi:** File di `docs/migration/draft/` belum dijalankan ke Supabase produksi (sesuai instruksi untuk tidak menjalankan `supabase db push` atau deploy Edge Function).
3. **Uji End-to-End Push FCM di Perangkat Fisik Android setelah Draft Dideploy:** Menunggu tabel `public.froyek_fcm_tokens` dan Edge Function `planner-push-notify` diaktifkan di Supabase produksi.

---

## 4. Langkah Manual yang Harus Anda Lakukan

> **PERINGATAN WAJIB:** Karena repository `hanifrullyantp/monefyi` bersifat publik dan key lama pernah tertanam di riwayat git (`git log`), menghapus key dari kode terbaru **tidak** menghapusnya dari riwayat git. **Rotasi key di Supabase adalah langkah wajib, bukan opsional.**

1. **Rotasi Key di Supabase (`Project Settings → API`):**
   - Generate/rotasi `service_role` secret key (dan `anon` / publishable key jika diperlukan).
   - Segera perbarui nilai key baru tersebut di seluruh layanan produksi sebelum menonaktifkan key lama.
2. **Rotasi Password Database (`Project Settings → Database`):**
   - Reset database password di Supabase Dashboard dan perbarui `DATABASE_URL` / `SUPABASE_DB_PASSWORD` di tempat penyimpanannya.
3. **Pastikan Environment Variables di Vercel (`planner-lp2`, `estimator`, `monefyi-planner`):**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (atau `VITE_SUPABASE_ANON_KEY`)
   - `SUPABASE_SERVICE_ROLE_KEY` (khusus project server/Next.js)
   - `ADMIN_PASSWORD`
4. **Pastikan Secrets di GitHub Repository (`Settings → Secrets and variables → Actions`):**
   - `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
   - `GOOGLE_SERVICES_JSON_BASE64` (base64 dari `android/app/google-services.json` untuk workflow `.github/workflows/android-apk-build.yml`).
5. **Aktifkan Tabel & Edge Function FCM dari Folder Draft (Saat Siap ke Produksi):**
   - Jalankan SQL di `docs/migration/draft/20261125120000_froyek_fcm_tokens.sql` pada Supabase SQL Editor.
   - Pindahkan `docs/migration/draft/planner-push-notify` dan `docs/migration/draft/_shared/fcmV1.ts` ke `my-supabase-project/supabase/functions/`, set secret `FIREBASE_SERVICE_ACCOUNT_JSON` di Supabase, lalu deploy `planner-push-notify`.
