# RUNBOOK.md — Modul "Estimator RAB Rumah" (migrasi, rollback, feature flag)

## 1. Ringkasan

Modul Estimator RAB Rumah terintegrasi ke aplikasi Estimator Froyek (`apps/web`, diakses via `estimator.froyek.com/app`). Akses hanya super admin `hanif.rullyant@gmail.com` (terverifikasi), ditegakkan di server (Supabase RLS + edge function `rab-api`) dan front-end (guard + sembunyi menu). Fitur default **OFF** di produksi hingga disetujui.

Stack: React 19 + TS + Vite + Tailwind 4 + Dexie + Three.js + Zod (modul_7), Supabase Auth/DB + Edge Functions (host).

## 2. Env yang diperlukan

### Supabase (server)
| Env | Sumber | Catatan |
|---|---|---|
| `SUPABASE_URL` | Supabase project | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings | **Server only**, jangan di browser |
| `RAB_SUPERADMIN_EMAILS` | admin | Daftar dipisah koma, default `hanif.rullyant@gmail.com` |

### Host (apps/web, browser)
| Env | Default | Catatan |
|---|---|---|
| `VITE_SUPABASE_URL` | — | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | — | Supabase anon key (bisa di browser) |
| `VITE_RAB_ENABLED` / `NEXT_PUBLIC_RAB_ENABLED` | `false` | Nyalakan hanya setelah migrasi + edge function terpasang |

## 3. Migrasi (sekali)

1. `supabase link <project-ref>` (link project Supabase)
2. `supabase db push` (terapkan `supabase/migrations/20261127000000_rab_schema.sql`: 15 tabel RAB + `rab_app_state` + `app_super_admins` + fungsi `is_super_admin()` + RLS)
3. `supabase functions deploy rab-api` (edge function `/api/rab/*`, guard super admin)
4. Set env Supabase: `SUPABASE_SERVICE_ROLE_KEY`, `RAB_SUPERADMIN_EMAILS`
5. Set env host: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_RAB_ENABLED=true`
6. Jalankan `modul-estimator-rab-rumah (7)/scripts/migrate-dexie-to-supabase.mjs` sekali (di browser, konfirmasi `MIGRATE_CONFIRM=yes`) untuk memindahkan data Dexie lokal ke Supabase.
7. Super admin meninjau katalog AHSP di layar `AhspImport` (diff + konfirmasi), ubah status baris dari "draft" ke "terverifikasi". Katalog lama (CONTOH) tidak dihapus; versi berdampingan (`SE-47-2026` vs katalog lama).

## 4. Rollback

1. `NEXT_PUBLIC_RAB_ENABLED=false` (matikan fitur di front-end, tanpa redeploy jika via env Vercel)
2. `supabase functions delete rab-api` (opsional, matikan edge function)
3. Data `rab_*` di Supabase bisa dibiarkan (tidak menganggu estimasi lama); tabel `rab_app_state` dihapus bila ingin total rollback
4. Katalog AHSP `SE-47-2026` bisa di-set status "draft" kembali atau diabaikan; katalog lama (CONTOH) tetap aktif
5. Jika sudah jalankan migrasi Dexie→Supabase, data lokal Dexie tetap ada (tidak dihapus); cukup jangan pakai adaptor Supabase

## 5. Feature flag

- `NEXT_PUBLIC_RAB_ENABLED` (atau `VITE_RAB_ENABLED`) di `apps/web/.env` / Vercel env. Default `false` (off).
- Nyalakan ke `true` hanya setelah: migrasi diterapkan, edge function di-deploy, dan Anda (pemilik) menyetujui rilis produksi.
- Rilis bertahap: staging dulu → produksi setelah persetujuan.

## 6. Akses & keamanan

- Semua route `/app/rab/*` dilindungi `RabGuard`: hanya muncul jika `isRabEnabled() && isRabSuperAdmin(email, emailVerified)`.
- URL langsung ke `/app/rab/*` oleh non-super admin → 404 / akses ditolak.
- Edge function `rab-api` memeriksa JWT + email super admin → 403 untuk non-super admin.
- RLS semua tabel `rab_*` hanya izinkan `is_super_admin()` (`auth.jwt()->>'email'` + `email_verified='true'`).
- Tidak ada API key AI di browser; AI lewat edge function dengan key di env server.
- Uji otomatis: 3 kasus (anonim → 401/403, pengguna biasa → 403, super admin → 200).

## 7. Checklist sebelum produksi

- [ ] Migrasi SQL diterapkan di Supabase staging (15 tabel RAB + RLS + `is_super_admin()`)
- [ ] Edge function `rab-api` di-deploy + env server di-set
- [ ] Env host di-set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_RAB_ENABLED=false` dulu)
- [ ] Typecheck + test + build lolus (modul_7: 178/178; host: 806/806)
- [ ] Uji 3 kasus akses (anonim, biasa, super admin) di staging
- [ ] Katalog AHSP ditinjau super admin (status "terverifikasi" pada baris yang dipilih)
- [ ] `NEXT_PUBLIC_RAB_ENABLED=true` di produksi (setelah persetujuan pemilik)
- [ ] Konfirmasi tidak ada API key di bundle klien (`dist/`)
- [ ] RLS aktif di semua tabel `rab_*`

## 8. File yang berubah (ringkasan)

- `supabase/migrations/20261127000000_rab_schema.sql` (baru)
- `supabase/functions/rab-api/index.ts` (baru)
- `apps/web/src/lib/rab.ts` (baru), `apps/web/src/services/rabService.ts` (diubah)
- `apps/web/src/components/rab/RabGuard.tsx` (baru), `apps/web/src/pages/rab/RabPage.tsx` (baru)
- `apps/web/src/components/AppShell.tsx` (diubah, route rab), `apps/web/src/components/Layout.tsx` (diubah, menu RAB)
- `modul-estimator-rab-rumah (7)/src/ui/screens/LayoutEditor.tsx` (diubah Fase 1)
- `modul-estimator-rab-rumah (7)/src/integration/supabaseRepository.ts` (baru Fase 4)
- `modul-estimator-rab-rumah (7)/src/integration/repository.ts` (diubah Fase 4)
- `modul-estimator-rab-rumah (7)/scripts/migrate-dexie-to-supabase.mjs` (baru Fase 4)
- `modul-estimator-rab-rumah (7)/package.json` + `package-lock.json` (diubah Fase 4)
- `data/sources/se-47-2026/*` (baru Fase 2), `data/katalog/se-47-2026/*` (baru Fase 2)
- `data/mapping/pemetaan-kerja.json` (baru Fase 2), `data/staging/se-47-2026/*` (baru Fase 2)
- `data/sources/se-47-2026/SOURCES.md` (baru Fase 2)
- `INTEGRATION_PLAN.md` (baru Fase 0), `RUNBOOK.md` (baru Fase 5)

## 9. Risiko tersisa

- Migrasi SQL & edge function belum di-deploy ke Supabase production (butuh `supabase` CLI link project + env server).
- Skrip migrasi Dexie→Supabase belum dijalankan di production (butuh browser + env Supabase).
- UI tombol "Buat penawaran" ↔ "Buka sebagai RAB" dan isi `RabPage` masih stub; lapisan data (B5) sudah ada di `rabService.ts`.
- Katalog AHSP: 429 analisis diterima, 2094 needs_review (belum diverifikasi super admin); cakupan pemetaan pekerjaan 18% (6/33).
- Playwright untuk uji gestur LayoutEditor hanya di `stay/`, belum di `apps/web`.
