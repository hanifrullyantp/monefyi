# Monefyi Accuracy Testing Protocol

Comprehensive QA protocol for validating financial calculations, anomaly handling, and UI behavior using the **8jt / 4-month accuracy persona**.

> **Not the demo persona.** For the lighter 5jt August demo, use `npm run seed:demo-august` and `scripts/fixtures/demo-august-2026/`.

---

## Quick start

```bash
# 1. Set test user
export SEED_USER_EMAIL=your-test@example.com
# or: export SEED_USER_ID=<uuid>

# 2. Seed database (linked Supabase or REST + service role)
npm run seed:accuracy-test -- --confirm

# 3. In-memory checks (no DB required)
npm run verify:accuracy
npm run test:accuracy

# 4. Browser: logout → login → period Agustus 2026
```

After every seed or reset: **logout, login, or clear IndexedDB** so the PWA reloads server data.

---

## Schema appendix (Monefyi reality)

| Concept | Table / shape |
|---------|----------------|
| Budget categories | `budgets` — one row per `user_id` + `month`; `categories` **jsonb** with `rows[]` |
| Transactions | `transactions` — `status` (`confirmed` \| `pending`), `meta.expense_treatment` (`consumption` \| `asset` \| `transfer`) |
| User income / payday | `user_preferences` — `monthly_income`, `payday_day`, `fixed_bills` jsonb |
| Balance sheet | `neraca_assets`, `neraca_debts`, `journal_entries` |
| Goals | `financial_goals` — `target_amount`, `current_amount`, `monthly_contribution` |
| Accounts | Names on transactions (`account` column) + preferences; no dedicated accounts table in repo |

### Budget row shape (jsonb)

```json
{
  "id": "acc-bdg-makan",
  "name": "Makan Sehari-hari",
  "amount": 1500000,
  "priority": "penting",
  "target_type": "monthly"
}
```

### HP anomaly transaction (canonical)

```json
{
  "id": "acc-tx-2026-08-hp-001",
  "date": "2026-08-04",
  "type": "expense",
  "amount": 7988000,
  "category": "Elektronik",
  "merchant": "Beli HP",
  "account": "BCA",
  "status": "pending",
  "meta": { "needs_classification": true, "status": "pending" }
}
```

### Opening balance fix (August)

BCA opening **Rp 15.000.000** on 1 Agu 2026 (carried from July close) so the HP purchase on 4 Agu is fundable.

Canonical numbers: `scripts/fixtures/accuracy-test-4month/expected-values.json`.

---

## Persona summary

| Item | Value |
|------|-------|
| Monthly income | Rp 8.000.000 (gajian tgl 25) |
| Months seeded | Mei, Juni, Juli, Agustus 2026 |
| Saving transfers | Mei 500rb → Juni 1,3jt → Juli 2jt |
| HP purchase | 4 Agu, Rp 7.988.000, **pending** |
| Neraca | Motor 15jt, laptop 6jt, HP lama 2jt; utang cicilan HP 2jt |

---

## Expected values (headline)

| Period | Income | Consumption expense | Saving rate | Notes |
|--------|--------|---------------------|-------------|-------|
| 2026-05 | 8jt | 6.095jt | 6,25% | Health band: fair (50–70) |
| 2026-06 | 8jt | 5.330jt | 16,25% | Improving |
| 2026-07 | 8jt | 4.975jt | 25% | Health band: excellent (80–95) |
| 2026-08 (day 1–15) | 0* | 3.395jt | — | HP excluded (pending) |

\*Gajian belum masuk sebelum tgl 25.

| Critical checks | Expected |
|-----------------|----------|
| Aug consumption **with** HP as expense | 11.383jt (wrong — must not happen in UI) |
| Aug consumption **correct** (HP pending/asset) | 3.395jt |
| 3-month trend (non-saving) | 6.095jt → 5.330jt → 4.975jt |
| HP `needsClassification` (when confirmed) | `true` |
| `isLoanPaymentTransaction` for "Beli HP" | `false` |

---

## Fase 1 — Setup

1. Create or pick a dedicated test user (`SEED_USER_EMAIL`).
2. Run `npm run reset:test-user -- --confirm` (optional; seed script resets by default).
3. Run `npm run seed:accuracy-test -- --confirm`.
4. Logout → login → select **Agustus 2026**.

**PASS:** Dashboard loads, ~61 August transactions visible, HP shows pending/review state.

---

## Fase 2 — Budget accuracy

1. Open Budget page for each month (Mei–Agu).
2. Verify 12 categories, total planned = Rp 8.000.000.
3. Fixed bills: Kost 1,2jt, Listrik 150rb, Internet 150rb, Cicilan HP 250rb.

**PASS:** Planned totals match fixture; fixed rows show `priority: harus`.

**Automated:** `npm run test:accuracy` (indirect via consumption vs budget spend).

---

## Fase 3 — Cash flow (Suite 1)

| Month | Check | Expected |
|-------|-------|----------|
| Mei | Consumption expense | 6.095jt |
| Juni | Consumption expense | 5.330jt |
| Juli | Consumption expense | 4.975jt |
| Agu | Consumption (HP excluded) | 3.395jt |

**Services:** `computePeriodFinancials`, `buildCashFlowCardData`

**PASS:** Cash flow card shows positive consumption net for closed months; August does **not** include 7,988jt HP.

```bash
npm run verify:accuracy
```

---

## Fase 4 — Health score (Suite 2)

Test on **Juli 2026** (full month) and **Mei 2026**:

| Month | Score band |
|-------|------------|
| Mei | 50–70 (fair) |
| Juli | 80–95 (excellent) |

August early-month may show `status: analyzing` — use July for full score validation.

**PASS:** Score within ±5 of band; grade label matches (`Cukup` / `Sangat Baik`).

---

## Fase 5 — Recommendations (Suite 3)

On **Agustus 2026**:

1. With HP **pending**: P1 recommendation = transaksi perlu review (`pending_transactions`).
2. After confirming HP (still unclassified): P1/P2 = anomaly categorization (`anomaly_categorization`).
3. Must **not** show "Makan Sehari-hari over budget" at ~43% usage.

**PASS:** No false "over budget" on Makan; anomaly/review surfaced for HP.

---

## Fase 6 — Anomaly & classification (Suite 5)

1. Locate HP transaction (4 Agu, Beli HP, 7.988jt).
2. Pending state: excluded from reports and category breakdown.
3. Confirm → large-transaction sheet: classify as **Aset**.
4. Re-check cash flow: consumption stays 3.395jt; asset line shows 7.988jt.
5. Verify **Cicilan HP** category is not suggested for 7.988jt purchase.

**Manual only:** UI banners, large-transaction-sheet flow.

**Automated:**

```bash
npm run test:accuracy   # Suite 5 + Critical HP
```

**PASS criteria:**

- [ ] HP 8jt → no fantasy deficit when classified as asset
- [ ] `needsClassification(hpTx) === true` when confirmed & unclassified
- [ ] Cicilan HP ≠ 8jt purchase in journal logic
- [ ] No "Menunggu proses" in category breakdown

---

## Fase 7 — Trend & goals (Suites 6–7)

**Trend (Mei–Jul):** Non-saving expense decreases 6.095jt → 5.330jt → 4.975jt.

**Goals (end Juli):**

| Goal | Target | Current | Progress |
|------|--------|---------|----------|
| Dana Darurat | 24jt | 4,3jt | ~17,9% |
| DP Motor Baru | 5jt | 1,6jt | 32% |

**PASS:** Report comparison matches trend array in `expected-values.json`.

---

## Manual QA checklist (not fully automated v1)

| ID | Area | Steps |
|----|------|-------|
| M1 | Pending banner | HP pending → banner "transaksi perlu review" visible |
| M2 | Classification sheet | Confirm HP → asset/consumption/cicilan options |
| M3 | IndexedDB sync | After seed, stale cache cleared (logout required) |
| M4 | Neraca page | Motor + laptop + HP lama − utang cicilan balances |
| M5 | Weekly digest copy | No "deficit 32jt" fantasy wording |
| M6 | Safe to spend (day 15) | ~Rp 212.000 (±10%) |

Link each failure to Test Suite ID when filing bugs.

---

## npm scripts reference

| Script | Description |
|--------|-------------|
| `npm run reset:test-user` | FK-safe delete for test user |
| `npm run seed:accuracy-test` | Reset + seed 4-month persona |
| `npm run verify:accuracy` | CLI expected vs actual table |
| `npm run test:accuracy` | Automated node:test suites |
| `npm run launch:gate -- --with-accuracy` | Optional accuracy in launch gate |

Environment: `SEED_USER_EMAIL` or `SEED_USER_ID`; `SUPABASE_SERVICE_ROLE_KEY` for REST; `--via-db` for linked Supabase CLI.

---

## PASS / FAIL criteria (launch)

| Criterion | Check |
|-----------|-------|
| HP 8jt → no fantasy deficit | `consumptionNet > 0` when HP is asset + income present |
| Cash flow correct | Aug consumption 3.395jt, not 11.383jt |
| Health score realistic | July 80–95, Mei 50–70 (±5) |
| Prediction sane | No "lose 32jt" without disclaimer |
| Anomaly detected | Confirmed unclassified HP flagged |
| Breakdown clean | Pending excluded from reports |
| Cicilan HP fix | Beli HP ≠ loan payment |
| 3-month trend | `[6095000, 5330000, 4975000]` |

---

## Bug report template

```
**Suite:** (e.g. Suite 5 — Anomaly)
**Period:** 2026-08
**Steps:** ...
**Expected:** (from expected-values.json)
**Actual:** ...
**Screenshot / verify output:** ...
**Fixture tx id:** acc-tx-2026-08-hp-001 (if relevant)
```

---

## Related files

- Fixtures: `scripts/fixtures/accuracy-test-4month/`
- Seed: `scripts/seed-accuracy-test-4month.cjs`
- Reset: `scripts/reset-test-user.cjs`
- Tests: `tests/accuracy-test-4month.test.js`
- Unit golden (HP): `tests/transaction-classification.test.js`
- 5jt audit: `tests/data-logic-audit.test.js`
