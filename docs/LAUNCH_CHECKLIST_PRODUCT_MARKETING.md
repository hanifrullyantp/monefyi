# Launch Checklist — Product-Marketing Sync

Checklist Sprint 6+ sebelum public launch Monefyi PWA.

## 1. Landing ↔ App Parity

- [ ] Buka Admin → Landing → **Parity Audit** — score ≥ 90%, zero critical fails
- [ ] Settings → Akun → **Janji produk** card menampilkan score & issues
- [ ] Setiap janji di pricing page bisa diakses user dengan plan yang benar
- [ ] Fitur "coming soon" di landing sudah dihapus atau diberi timeline

## 2. Database Migrations (urutan)

**Product-Marketing (Sprint 1–6):**

1. `20260809140000_product_marketing_sync.sql`
2. `20260809150000_marketing_contextual_offers.sql`
3. `20260809160000_sprint3_pro_features.sql`
4. `20260809170000_sprint4_marketing_advanced.sql`
5. `20260809180000_sprint5_feature_flags.sql`
6. `20260809190000_sprint6_beta_launch.sql`
7. `20260809240000_product_marketing_compliance.sql` — account deletion + refund requests
8. `20260809250000_household_shared_visibility.sql` — transaction visibility personal/shared
9. `20260809260000_household_shared_tx_rls.sql` — RLS read shared txs across household members

**Cron setup reference:** `./scripts/setup-compliance-crons.sh`

Re-deploy product-marketing: `./scripts/deploy-monefyi-product-marketing.sh`

**Deploy everything:** `./scripts/deploy-all.sh`

**Compliance edge functions** (emails + purge cron):

```bash
./scripts/deploy-compliance-functions.sh
```

Set secrets: `RESEND_API_KEY`, `CRON_SECRET`, `APP_URL`, `LYNK_API_KEY` (optional).

**Cron schedules (UTC):**

| Function | Schedule | Notes |
|----------|----------|-------|
| `monefyi-account-purge` | `0 3 * * *` | Daily soft-delete purge; header `x-cron-secret` |
| `monefyi-weekly-digest-cron` | `0 12 * * 0` | Sunday 19:00 WIB; header `x-cron-secret` |

**Edge functions in compliance deploy:** `monefyi-compliance-notify`, `monefyi-account-purge`, `monefyi-weekly-digest-cron`

`monefyi-refund-lynk` deployed but **disabled by default** (`REFUND_AUTO_LYNK_ENABLED` unset/false). Refund flow is manual: email → super admin enables user button → user submits → admin processes in Lynk dashboard.

**Growth Phase (Sprint 7–18 + advanced + household):**

8. `20260809200000_growth_phase1_insights.sql`
9. `20260809210000_sprint8_monthly_review.sql`
10. `20260809220000_sprint13_18_community.sql`
11. `20260809230000_growth_advanced.sql`
12. `20260809250000_household_shared_visibility.sql`

Re-deploy growth: `./scripts/deploy-growth-migrations.sh`

**Launch gate (local):** `npm run launch:gate` — tests + parity/flag checks

## 3. Feature Flags (Admin → Feature Flags)

| Flag | Launch default |
|------|----------------|
| `household_mode` | active, 100% |
| `weekly_ai_digest` | active, 100% |
| `multiple_goals` | active, 100% |
| `debt_payoff_planner` | active, 100% |
| `monthly_auto_report` | active, 100% |
| `in_app_marketing` | active, 100% |
| `ai_coach_pro` | beta → active setelah QA |

## 4. Marketing Engine QA

- [ ] Startup offer muncul setelah 3 detik (first login hari ini)
- [ ] Couple Pack banner tampil saat `household_status = couple_inactive` (meski marketing prefs off)
- [ ] Dismiss → tidak muncul lagi hari itu
- [ ] Cooldown 7 hari setelah dismiss
- [ ] 3× dismiss → blacklist 30 hari
- [ ] Offer tidak muncul saat `financial_status = danger`
- [ ] Contextual trigger `goal_creation_attempted` untuk Basic user

## 5. Compliance (Features 6 & 7)

- [ ] Settings → Akun → Hapus akun — konfirmasi frase + soft delete 30 hari
- [ ] Settings → Bantuan — tombol refund **tidak** tampil sampai super admin aktifkan setelah email support
- [ ] Super admin → Refunds / Users — aktifkan tombol refund user
- [ ] Admin → Refunds — approve/reject **manual** (Lynk otomatis off)

## 6. Admin Panel

- [ ] Campaign create/edit/activate
- [ ] Global rules editable
- [ ] Notification templates
- [ ] Analytics funnel tampil
- [ ] User card → Marketing → test offer queue
- [ ] Feature flags toggle tanpa deploy
- [ ] Refund requests panel

## 7. Beta Test (real users)

- [ ] Invite 10–20 beta testers (lifetime early_access atau flag override)
- [ ] Beta banner tampil di beranda
- [ ] Feedback masuk ke Admin → Feedback
- [ ] Monitor error rate Sentry < 2%
- [ ] Fix P0/P1 issues sebelum launch

## 8. Legal & Compliance

- [x] Privacy policy & terms link di landing footer
- [ ] Cookie/tracking consent jika analytics aktif
- [ ] Refund policy selaras dengan checkout copy
- [ ] Account deletion flow documented in privacy policy

## 9. Performance

- [ ] Service worker cache bump & verify offline shell
- [ ] Marketing offers cache TTL 5 menit
- [ ] Feature flags sync < 500ms on boot

## 10. Success Metrics (30 hari post-launch)

| Metric | Target |
|--------|--------|
| Offer conversion | > 15% |
| Dismiss rate | < 40% |
| Not interested rate | < 10% |
| Broken promise incidents | 0 |
| Refund rate | < 5% |
| User satisfaction | > 4.5/5 |

---

**Launch gate:** Parity audit `ready = true` + zero P0 bugs + migrations applied.
