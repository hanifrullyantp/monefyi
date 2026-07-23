# Admin Runbook — Monefyi Finance

## Entry: Admin Console (full page)

1. Login dengan akun yang `profiles.role = 'admin'` (email allowlist di `config.js` hanya soft-gate UI).
2. Ikon **hijau shield** muncul di header mobile + desktop.
3. Klik ikon → full-page console (`#admin/dashboard`). Deep-link: `#admin`, `#admin/users`, `#admin/feedback`, `#admin/plans`, `#admin/landing`, `#admin/config`, `#admin/tutorial`.
4. Menu → “Buka Admin Console” tetap ada sebagai secondary entry.

Edge auth: semua EF admin cek `profiles.role === 'admin'`.

---

## Ganti Mode Bisnis

### Mode A: Bayar 1x saja (Lifetime Only)

1. Admin Console → **Plans & Pricing**
2. Disable **Trial** toggle
3. Disable **Monthly** toggle
4. Enable **Lifetime** toggle
5. Simpan Plans — landing CTA mengikuti SKU aktif

### Mode B: Langganan + Trial

1. Admin Console → **Plans & Pricing**
2. Enable **Monthly** + **Trial** (set hari, mis. 7)
3. Optional: Enable **Lifetime**
4. Simpan Plans

### Mode A+B

Enable Trial + Monthly + Lifetime sekaligus.

---

## Users (inline CRUD)

1. **Users** → Refresh / cari email
2. Edit inline: name, phone, plan, expiry, status akun, email/push notif → **Simpan** (`monefyi-admin-update-user`)
3. **Grant Trial** (7 hari), **Set Password**, **Suspend** / **Activate**
4. **+ User** → email + password + name/phone/plan (`action: create`)
5. Soft-delete default = suspend; hard delete hanya via `hard_delete:true` (ops, bukan UI default)

## Grant Trial Manual

1. Users → cari email → **Grant Trial**
2. Atau set plan=`trial` + expiry → Simpan

## Extend / Revoke Plan

1. Users → pilih plan (`none` / `trial` / `monthly` / `lifetime`)
2. Set tanggal expiry (kosongkan untuk lifetime)
3. **Simpan** — sync `profiles` + `user_plans`

## Ubah Harga & Checkout

1. Lynk.id → edit produk → ubah harga checkout
2. Admin → **Plans & Pricing** → update **price_display** + checkout URLs
3. Atau **Config** tab untuk URL / affiliate / notif threshold

## Landing CMS bridge

1. Admin → **Landing** → snapshot checkout URLs dari `app_config`
2. **Buka Landing CMS** → `/admin/` untuk copy/media marketing penuh
3. Plans/pricing yang dipakai landing mengikuti `app_config.platform_settings.plans`

## Feedback tickets

### User (Help Center)

1. Tutorial / Help Center root → form **Kirim masukan**
2. Type: feature / bug / complaint / general → insert `user_feedback` (RLS)
3. Offline: antrian `localStorage` lalu flush saat online

### Admin

1. Migration: `20260816000000_admin_feedback_system.sql`
2. Console → **Feedback** → filter type/status → update status + admin notes
3. Edge: `monefyi-admin-feedback`
4. Dashboard KPI menampilkan open tickets (`monefyi-admin-dashboard`)

## Dashboard insight

- Total users, new 7/30d, active 7d (tx), trial/paid, rough MRR
- Plan mix, recent signups, recent feedback
- Edge: `monefyi-admin-dashboard`

## Revenue & Funnel (legacy sheet / revenue EF)

1. Edge Function: `monefyi-admin-revenue` (MRR, ARR, funnel 30 hari)
2. Deploy jika belum: `monefyi-admin-revenue`

## Webhook Lynk

- Env wajib production: `LYNK_SIGNATURE_TOKEN`, `REQUIRE_LYNK_SIGNATURE=true`, `APP_URL=https://app.monefyi.com`
- Idempotency: `lynk_webhook_events`
- Setelah bayar: sync `user_plans` + `profiles` + email konfirmasi

## Trial self-serve

- Landing form → `start-trial`
- Anti-abuse: disposable email, domain rate limit, device hash, cooldown 90 hari
- Drip: tabel `drip_schedule` + cron `email-drip` (`x-cron-secret`)

## Settings (user)

1. Entry: Sidebar **Pengaturan** / Profile, atau Menu → **Buka Pengaturan** (full page, bukan bottom sheet)
2. Deep-link: `#settings`, `#settings/account`, `#settings/notifications`, `#settings/ai`, dll.
3. Section: Akun, Tampilan, Dashboard, Akun keuangan, Notifikasi, Email Import, AI, Monevisor, Data
4. Branding/logo **bukan** di menu user — kelola di Admin Console → **Config** (Logo URL)

## Tutorial / Help Center

1. Jalankan migration `20260815000000_tutorial_system.sql` (tables + RLS + bucket `tutorial-media`)
2. Admin Console → **Tutorial** → **Seed konten default**
3. Upload gambar/GIF/video per langkah — Storage bucket `tutorial-media` (public read)
4. User: Quick Access / Menu → **Buka Tutorial lengkap**, atau `#tutorial/transactions/quick-text`

## Deploy checklist (Admin Console)

- [ ] Apply migration `user_feedback`
- [ ] Deploy EF: `monefyi-admin-dashboard`, `monefyi-admin-feedback`, `monefyi-admin-update-user`, `monefyi-admin-users`
- [ ] Pastikan admin punya `profiles.role = 'admin'`
- [ ] `npm run prebuild` (sync `app/` → `app/public/`)
- [ ] SW cache bump terlihat (`v43-admin-console`)
- [ ] QA: ikon hijau hanya admin; full page; users CRUD; feedback form + admin tab; plans/landing bridge

## UI Brand (target)

- Font: Montserrat (`--mf-font`)
- Tokens: `shared/brand-tokens.css` → `--mf-*` / `--brand-grad` / `--brand-green`
- Sheet pattern: Settings (`#menuSheet` / `#userSheet`) + Affiliate (`#affSheet`)
- Primary CTA: green / brand-grad — jangan pakai indigo/purple
- Admin entry: ikon shield hijau di chrome
