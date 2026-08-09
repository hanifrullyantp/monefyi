# Monefyi Launch Status — Aug 2026

Ringkasan otomatis vs manual sebelum public launch.

## ✅ Selesai (kode + deploy)

| Area | Status |
|------|--------|
| Growth Sprints 7–24 + polish | Shipped, 139 tests pass |
| Roadmap NEXT (what-if, retirement, split tx, debt milestones) | Shipped |
| Product-marketing (engine, parity audit, CMS sync) | Shipped |
| Compliance (account deletion, refund manual gate) | Shipped + migrated |
| Household v2 (Bersama tab, shared sync, RLS) | Shipped |
| Edge functions | compliance-notify, account-purge, weekly-digest-cron deployed |
| Refund Lynk auto | **Disabled** — manual super-admin flow |
| Launch gate CLI | `npm run launch:gate` ✅ |
| Legal pages | terms.html + privacy.html updated |

## 🔧 Satu kali manual (ops)

1. **Secrets Supabase** — `RESEND_API_KEY`, `CRON_SECRET`, `APP_URL` (Edge Functions → Secrets)
2. **Cron** — `./scripts/apply-compliance-crons.sh` (butuh `CRON_SECRET`) atau Dashboard schedule
3. **Beta testers** — invite 10–20 user, monitor Sentry
4. **Parity CMS** — Admin → Landing → Sync dari parity audit (score ≥ 90%)
5. **Feature flags** — pastikan critical flags `active` 100% di Admin

## 📋 Perintah verifikasi

```bash
npm run test:all          # 139 tests
npm run launch:gate         # tests + parity simulation
npm run launch:full       # all + build
./scripts/deploy-all.sh   # migrations + edge functions
```

## Refund flow (operasional)

1. User email `support@monefyi.com`
2. Super admin → Users/Refunds → **Aktifkan tombol refund**
3. User submit di Settings → Bantuan
4. Admin approve → proses manual di Lynk dashboard

## Branch

`main` — production-ready PWA build di `dist/app/`.
