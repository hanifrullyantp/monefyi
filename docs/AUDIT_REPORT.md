# Theme System Audit Report

Generated as part of MONEFYI_THEME_SYSTEM execution (Aug 2026).

## Summary

| Phase | Status |
|-------|--------|
| Phase 1 — Sidebar, header, saldo, akun | ✅ |
| Phase 2 — KPI, quick access, forms | ✅ |
| Phase 3 — Pages + modals | ✅ |
| Phase 4 — Toast, skeleton, empty states | ✅ |
| Phase 5 — Feature pages + audit tooling | ✅ |

## Architecture

| File | Purpose |
|------|---------|
| `shared/tokens.css` | Design token SSOT |
| `shared/brand-tokens.css` | Legacy `--mf-*` / `--app-*` bridge |
| `app/css/components/*.css` | Component-level token styles |
| `app/css/theme-overrides.css` | **Loaded last** — page & legacy overrides |
| `app/js/theme-manager.js` | `MonefyiTheme.setTheme()` |
| `app/js/theme-audit.js` | Browser audit helper |
| `scripts/theme-audit.cjs` | Static CSS scan (`npm run audit:theme`) |
| `docs/DESIGN_SYSTEM.md` | Developer guidelines |

## Verification checklist

Run after deploy or local `npm run dev`:

1. [ ] Settings → **Mode terang** — sidebar, saldo, akun readable
2. [ ] Dashboard — KPI, quick access, daily hero
3. [ ] Budget page — cards, priority bars, recommendations
4. [ ] Monevisor — coach cards, intervention
5. [ ] Neraca — panels, segment control
6. [ ] Onboarding wizard — inputs & chips
7. [ ] Toast — save/delete transaction
8. [ ] Repeat in **dark mode**

## Automated audit

```bash
# Static scan (CI-friendly)
npm run audit:theme

# Browser console (on /app/)
MonefyiThemeAudit.run()
await MonefyiThemeAudit.testBothThemes()
```

## Remaining tech debt

Legacy source files still contain hardcoded colors; `theme-overrides.css` wins at runtime.
Future refactors should migrate colors **in place** in source CSS and remove redundant overrides.

Priority for inline migration (optional):
- `app/css/app.css` — tx list legacy
- `app/css/budget-enhanced.css` — largest offender
- `app/css/monevisor-page.css`
