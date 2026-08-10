# Accuracy Test Persona — 4 Month (8jt)

End-to-end accuracy validation dataset for Monefyi. **Separate** from the 5jt demo at `scripts/fixtures/demo-august-2026/`.

## Persona

| Field | Value |
|-------|-------|
| Monthly income | Rp 8.000.000 |
| Payday | 25th |
| Months | Mei–Agu 2026 |
| Critical case | HP Rp 7.988.000 on 4 Agu (pending, needs classification) |

## Files

| File | Purpose |
|------|---------|
| `expected-values.json` | Canonical assertion targets |
| `transactions-all.json` | ~249 transactions (May–Aug) |
| `budgets-2026-*.json` | Monthly budget rows (jsonb shape) |
| `user-preferences.json` | Income, payday, fixed bills |
| `neraca-opening.json` | Assets + debts opening |
| `financial-goals.json` | Dana Darurat + DP Motor |
| `generate-fixtures.cjs` | Regenerate month JSON from category totals |

## Commands

```bash
# Reset test user only
npm run reset:test-user -- --dry-run
npm run reset:test-user -- --confirm

# Seed full 4-month dataset (requires SEED_USER_EMAIL or SEED_USER_ID)
npm run seed:accuracy-test -- --dry-run
npm run seed:accuracy-test -- --confirm

# In-memory verification (no DB)
npm run verify:accuracy
npm run test:accuracy
```

## Post-seed (browser)

1. **Logout** and **login** again (or clear site data / IndexedDB).
2. Select period **Agustus 2026**.
3. Confirm HP transaction shows as pending / needs categorization.
4. Run manual checklist in `docs/testing/MONEFYI_ACCURACY_TESTING.md`.

## Regenerate fixtures

```bash
node scripts/fixtures/accuracy-test-4month/generate-fixtures.cjs
npm run verify:accuracy
```
