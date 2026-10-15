# Isolasi produk & tier — Monefyi

Satu **Supabase Auth** (`auth.users`) dipakai semua aplikasi, tetapi **akses produk dan tier tidak otomatis saling membuka**. Setiap produk punya **kode entitlement** dan (untuk Planner) **subscription org** terpisah.

---

## 1. Kode produk (wajib)

| Kode | Aplikasi | Cara dapat entitlement |
|------|----------|-------------------------|
| `monefyi` | PWA keuangan pribadi (`app.monefyi.com`) | Trial (`start-trial`), Lynk Finance (`lynk-webhook`), admin |
| `planner` | Planner / Estimator SPA (`planner.monefyi.com/app`, `estimator.monefyi.com/app`) | Daftar org, undangan, Lynk Estimator/Planner (`processPlannerLynkPurchase`), admin |
| `stay` | Stay (jika aktif) | Registrasi Stay |

**Database:** `public.user_product_entitlements` (UNIQUE `user_id` + `product`).

**RPC (client):** `user_has_product(p_product text)` → `boolean`.

### Gate di client

| App | File | Perilaku |
|-----|------|----------|
| Finance PWA | `app/js/app.js` → `assertMonefyiProductAccess()` | Login/sign-in ditolak jika **tidak** punya `monefyi` |
| Planner SPA | `monefyi_planner/src/hooks/useBootstrap.ts` | Bootstrap gagal jika **tidak** punya `planner` (kecuali signup intent / platform admin) |

**Implikasi:** Email + password yang sama bisa dipakai di Auth, tetapi user **hanya masuk** ke app yang sudah pernah “mendaftar” produknya (trial, bayar, atau join org). Punya Monefyi Finance **tidak** membuka Planner/Estimator tanpa baris `planner`.

---

## 2. Tier / paket (per produk)

### Finance (`monefyi`)

| Sumber | Tabel | Field |
|--------|-------|--------|
| Trial / Lynk / admin | `user_plans` + sync `profiles.plan_*` | `plan_type`: `trial`, `monthly`, `lifetime`, `none` |
| Fitur app | `app/js` entitlements | Dari `profiles.plan_type`, `plan_expires_at` |

Lynk Finance (`lynk-webhook`, bukan Estimator): hanya `grant_product_entitlement(..., 'monefyi')` — **tidak** grant `planner`.

### Planner / Estimator (`planner` product + org)

| Sumber | Tabel | Field |
|--------|-------|--------|
| Lynk Estimator/Planner | `planner_org_subscriptions` via RPC `activate_subscription` | `tier`: `free`, `estimator`, `pro`, `enterprise` |
| Variant Estimator | kolom / metadata | `estimator_variant`: `standard` \| `pro` |
| Fitur UI | `monefyi_planner/src/lib/entitlement.ts` | `canAccessEstimator`, `canAccessFinance`, `canGenerateKwitansi`, dll. |

Lynk Estimator/Planner: `grant_product_entitlement(..., 'planner')` + aktivasi tier — **tidak** grant `monefyi`.

---

## 3. Alur otomatis (ringkas)

```text
Bayar Lynk (Finance)  → lynk-webhook → user_plans + entitlement monefyi → email → login app.monefyi.com
Bayar Lynk (Estimator)→ lynk-webhook / planner-lynk-webhook → org + subscription + entitlement planner → email → login estimator/planner
Lupa password         → auth-send-email (brand dari redirect_to) → reset di app yang meminta
```

Email: [`email/MONEFYI_TRANSACTIONAL_EMAIL.md`](email/MONEFYI_TRANSACTIONAL_EMAIL.md) · Lynk: [`planner/LYNK_WEBHOOK.md`](planner/LYNK_WEBHOOK.md).

---

## 4. Verifikasi otomatis (lokal / CI)

```bash
# Isolasi RPC + URL + webhook Lynk (signature)
./scripts/verify-product-funnel.sh
```

Variabel opsional: `RLS_TEST_EMAIL`, `RLS_TEST_PASSWORD` (user Planner test), `LYNK_MERCHANT_KEY` (uji webhook).

---

## 5. Deploy

| Target | Cara |
|--------|------|
| Supabase DB + Edge | `./scripts/deploy-planner-supabase.sh` atau GitHub Actions **Supabase Planner migrate & deploy** (manual) |
| Vercel (Planner SPA, Estimator LP, …) | Push `main` + secret `VERCEL_TOKEN` valid, atau deploy manual dari dashboard Vercel |

Jika GitHub Actions Vercel gagal dengan *invalid token*, perbarui secret **`VERCEL_TOKEN`** di repo — situs production bisa tetap online dari deploy manual terakhir.

---

## 6. Checklist QA isolasi

- [ ] User hanya `planner`: `user_has_product('monefyi')` = false → login `app.monefyi.com` ditolak.
- [ ] User hanya `monefyi`: `user_has_product('planner')` = false → bootstrap Planner ditolak.
- [ ] Estimator Standard: tier `estimator`, variant `standard` — Pro features terkunci di UI.
- [ ] Estimator Pro / upgrade: `estimator_variant` = `pro`, kwitansi sesuai `canGenerateKwitansi`.
- [ ] Finance monthly/lifetime: `user_plans` sesuai produk Lynk.
