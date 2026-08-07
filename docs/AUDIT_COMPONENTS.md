# AUDIT_COMPONENTS — Theme Hardcoded Colors

Generated: 2026-08-07

Scan target: `app/css/**` for dark hardcoded colors.

| Component | Priority | Files | Dark colors found | Suggested token |
|-----------|----------|-------|-------------------|-----------------|
| Account Cards (Dashboard) | High | app/css/app.css, app/css/home-page.css | #131A24, #0B1118, #1e293b | var(--card-bg) or var(--bg-secondary) |
| KPI Cards (Pemasukan/Pengeluaran) | High | app/css/app.css | #131A24, #0B1118, #1e293b | var(--card-bg) or var(--bg-secondary) |
| Transaction Table | High | app/css/app.css, app/css/tx-edit-toolbar.css | #131A24, #0B1118, #1e293b, #131a24 | var(--card-bg) or var(--bg-secondary) |
| Monevisor Card | High | app/css/app.css, app/css/budget-enhanced.css, app/css/monevisor-page.css | #131A24, #0B1118, #1e293b, #131a24 | var(--card-bg) or var(--bg-secondary) |
| Daftar Budgeting Panel | High | app/css/budget-enhanced.css, app/css/budget-final-refinements.css | #131A24, #0b1118 | var(--card-bg) or var(--bg-secondary) |
| Icon Containers | Medium | app/css/app.css, app/css/neraca.css, app/css/tx-edit-toolbar.css | #131A24, #0B1118, #1e293b, #131a24 | var(--card-bg) or var(--bg-secondary) |
| Empty States | Medium | app/css/budget-final-refinements.css | #0b1118 | var(--card-bg) or var(--bg-secondary) |
| Tab Navigation (Settings) | Medium | app/css/settings-page.css | #0B1118 | var(--card-bg) or var(--bg-secondary) |
| Sidebar Active State | Low | app/css/app.css, app/css/tokens.css | #131A24, #0B1118, #1e293b, #334155, #1E293B | var(--card-bg) or var(--bg-secondary) |

## Remaining global offenders

- `app/css/app.css` — 3 dark color hits
- `app/css/tokens.css` — 3 dark color hits
- `app/css/admin-page.css` — 2 dark color hits
- `app/css/preview-card.css` — 2 dark color hits
- `app/css/quick-preview.css` — 2 dark color hits
- `app/css/budget-enhanced.css` — 1 dark color hits
- `app/css/budget-final-refinements.css` — 1 dark color hits
- `app/css/home-page.css` — 1 dark color hits
- `app/css/monevisor-page.css` — 1 dark color hits
- `app/css/native-pwa.css` — 1 dark color hits
- `app/css/neraca.css` — 1 dark color hits
- `app/css/onboarding.css` — 1 dark color hits
- `app/css/settings-page.css` — 1 dark color hits
- `app/css/tutorial-page.css` — 1 dark color hits
- `app/css/tx-edit-toolbar.css` — 1 dark color hits

## Run audit

```bash
node scripts/component-theme-audit.cjs
npm run audit:theme
```
