# Launch Checklist — Product-Marketing Sync

Checklist Sprint 6 sebelum public launch Monefyi PWA.

## 1. Landing ↔ App Parity

- [ ] Buka Admin → Landing → **Parity Audit** — score ≥ 90%, zero critical fails
- [ ] Setiap janji di pricing page bisa diakses user dengan plan yang benar
- [ ] Fitur "coming soon" di landing sudah dihapus atau diberi timeline

## 2. Database Migrations (urutan)

**Status: ✅ Applied to remote Supabase (2026-08-09)**

1. `20260809140000_product_marketing_sync.sql`
2. `20260809150000_marketing_contextual_offers.sql`
3. `20260809160000_sprint3_pro_features.sql`
4. `20260809170000_sprint4_marketing_advanced.sql`
5. `20260809180000_sprint5_feature_flags.sql`
6. `20260809190000_sprint6_beta_launch.sql`

Re-deploy: `./scripts/deploy-monefyi-product-marketing.sh`

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
- [ ] Dismiss → tidak muncul lagi hari itu
- [ ] Cooldown 7 hari setelah dismiss
- [ ] 3× dismiss → blacklist 30 hari
- [ ] Offer tidak muncul saat `financial_status = danger`
- [ ] Contextual trigger `goal_creation_attempted` untuk Basic user

## 5. Admin Panel

- [ ] Campaign create/edit/activate
- [ ] Global rules editable
- [ ] Notification templates
- [ ] Analytics funnel tampil
- [ ] User card → Marketing → test offer queue
- [ ] Feature flags toggle tanpa deploy

## 6. Beta Test (real users)

- [ ] Invite 10–20 beta testers (lifetime early_access atau flag override)
- [ ] Beta banner tampil di beranda
- [ ] Feedback masuk ke Admin → Feedback
- [ ] Monitor error rate Sentry < 2%
- [ ] Fix P0/P1 issues sebelum launch

## 7. Legal & Compliance

- [ ] Privacy policy & terms link di landing footer
- [ ] Cookie/tracking consent jika analytics aktif
- [ ] Refund policy selaras dengan checkout copy

## 8. Performance

- [ ] Service worker cache bump & verify offline shell
- [ ] Marketing offers cache TTL 5 menit
- [ ] Feature flags sync < 500ms on boot

## 9. Success Metrics (30 hari post-launch)

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
