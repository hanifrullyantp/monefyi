# Entitlement Matrix — Sign-off (Phase 0)

Default `PLAN_ENTITLEMENTS` for Monefyi Finance. Admin catalog may override later.

| Cap / fitur | trial | monthly | lifetime | none |
|-------------|-------|---------|----------|------|
| duration_days | 7 | 30 | null | — |
| max_transactions | 50 | unlimited | unlimited | 0 |
| max_accounts | 2 | unlimited | unlimited | 0 |
| max_budgets | 3 | unlimited | unlimited | 0 |
| max_ocr_scans | 5 / trial | 50 / month | unlimited | 0 |
| Core (manual, parse, budget, dashboard, categories, offline) | on | on | on | off |
| AI coach / insights / email import / export / monevisor advanced / push / sync | locked | on | on | — |
| OCR | limited (5) | on (50/mo) | unlimited | — |
| priority_support / early_access | off | off | on | — |
| upgrade banner / feature locks | yes | no | no | redirect pricing |
| grace_period_days | 3 then read-only | 7 then degrade | null | — |

## Enforcement

- **HARD BLOCK** + soft-sell sheet: AI Coach, Email Import, Export, Monevisor Advanced
- **SOFT LIMIT**: transactions, OCR
- **VISIBLE DISABLED**: 🔒 + Upgrade sheet
- **GRACE**: trial D1–3 full; D4+ read-only. Monthly D1–7 full; D8+ premium off
