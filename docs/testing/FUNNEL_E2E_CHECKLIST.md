# Funnel & Monetization — E2E Checklist

## Trial path

- [ ] Landing `/#daftar` tampil comparison + form trial
- [ ] Submit trial → email welcome + password (user baru)
- [ ] Login app → onboarding wizard 3 langkah
- [ ] Cap 50 transaksi memunculkan upgrade sheet
- [ ] AI Coach locked → soft-sell sheet (bukan error mentah)
- [ ] Trial banner countdown tampil
- [ ] Setelah expiry: grace 3 hari full, lalu read-only overlay

## Paid path (Lynk)

- [ ] CTA Monthly/Lifetime → Lynk (URL dari config/fallback)
- [ ] Webhook `payment.received` → `user_plans` + `profiles` sync
- [ ] Email konfirmasi brand Finance, link `app.monefyi.com`
- [ ] Renew monthly memperpanjang `expires_at`
- [ ] Lifetime mengabaikan monthly berikutnya

## Admin

- [ ] Plans toggle persist di `app_config.platform_settings.plans`
- [ ] User edit plan + Grant Trial
- [ ] Revenue tab load metrics
- [ ] Mode A/B sesuai runbook

## Security

- [ ] Webhook tanpa signature ditolak jika token di-set
- [ ] Trial disposable email ditolak
- [ ] Trial device/cooldown ditolak
- [ ] Duplicate webhook → `alreadyProcessed`
