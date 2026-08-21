# Planner Lynk + Resend — QA Checklist

## Lynk store (manual)

- [ ] Store Planner terpisah dari Finance (`asfin-ai`)
- [ ] 3 produk dengan title exact (lihat `docs/planner/LYNK_RESEND_SETUP.md`)
- [ ] Webhook → `planner-lynk-webhook` + signature token

## Resend + Auth

- [ ] Domain `support.monefyi.com` verified
- [ ] Supabase Auth hook `auth-send-email` aktif, `APP_URL=https://planner.monefyi.com`
- [ ] Signup → email verifikasi branded
- [ ] Forgot password → email reset branded

## Estimator Standard (Rp 99.000)

- [ ] Landing CTA → login → redirect Lynk dengan `org_id`, `user_id`, `product=estimator_standard`
- [ ] Webhook → `planner_org_subscriptions.tier = estimator`, `estimator_variant = standard`
- [ ] Email konfirmasi terkirim
- [ ] Return URL `?payment=success` → entitlement refresh di `/app/estimator`

## Estimator Pro (Rp 199.000)

- [ ] Checkout dengan `product=estimator_pro`
- [ ] Webhook → `estimator_variant = pro`, `isEstimatorPro` true di app
- [ ] Tidak bentrok dengan Planner Pro (wajib field `product`)

## Planner Pro (Rp 199.000/bulan)

- [ ] Upsell modal → checkout Lynk Planner Pro
- [ ] Webhook → tier `pro`, `expires_at` +30 hari
- [ ] Renew saat masih aktif → extend dari `expires_at`
- [ ] Email konfirmasi menampilkan tanggal berlaku

## User baru post-payment

- [ ] Tidak ada password plain-text di email
- [ ] Email berisi CTA **Atur password & masuk** (recovery link)
- [ ] Link valid → set password → login → akses Estimator

## Idempotency & security

- [ ] Duplicate webhook → `alreadyProcessed: true`, tidak double-activate
- [ ] Webhook tanpa signature ditolak jika `REQUIRE_LYNK_SIGNATURE=true`

## Admin CMS

- [ ] `/admin/pricing` — edit 3 Lynk URLs tersimpan di content JSON
