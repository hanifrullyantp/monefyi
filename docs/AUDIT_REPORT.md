# Theme System Audit Report

Generated as part of MONEFYI_THEME_SYSTEM execution (Aug 2026).

## Summary

| Metric | Count |
|--------|------:|
| CSS files with hardcoded hex/rgba (excl. tokens) | 22 |
| Critical broken areas (pre-fix) | 5 |
| Phase 1 fixes applied | ✅ |
| Phase 2 fixes applied | ✅ |
| Phase 3 (pages + overrides) | ✅ |
| Phase 4 (toast/loading/empty) | ✅ |

## Critical issues fixed (Phase 1)

| Area | Problem | Fix |
|------|---------|-----|
| Sidebar | Text putih di bg putih (light) | `app/css/components/sidebar.css` + semantic tokens |
| Saldo card | Dark gradient di light mode | `components/balance-card.css` |
| Account cards | Dark bg di light mode | `components/account-card.css` + `home-page.css` |
| Header / search | Low contrast title & placeholder | `components/header.css` |
| Body / app shell | Hardcoded theme-light block | Removed; tokens drive `--app-*` aliases |

## Files with remaining hardcoded colors (Phase 2–3)

Prioritas migrasi bertahap:

### High (user-facing dashboard)
- `app/css/app.css` — legacy tx/list/chart overrides
- `app/css/home-page.css` — quick access, KPI sections
- `app/css/desktop-layout.css` — chart polish, saldo metrics chips

### Medium (feature pages)
- `app/css/budget-enhanced.css`
- `app/css/budget-final-refinements.css`
- `app/css/monevisor-page.css`
- `app/css/monevisor-panel.css`
- `app/css/neraca.css`
- `app/css/monthly-financial.css`

### Lower (modals / flows)
- `app/css/onboarding.css`
- `app/css/settings-page.css`
- `app/css/quick-preview.css`
- `app/css/preview-card.css`
- `app/css/transaction-detail.css`
- `app/css/receipt-scanner.css`
- `app/css/email-import.css`
- `app/css/notification-settings.css`
- `app/css/admin-page.css`
- `app/css/tutorial-page.css`
- `app/css/native-pwa.css`
- `app/css/tx-edit-toolbar.css`

## Infrastructure added

| File | Purpose |
|------|---------|
| `shared/tokens.css` | Design token SSOT |
| `shared/brand-tokens.css` | Legacy `--mf-*` bridge |
| `app/js/theme-manager.js` | `data-theme` + localStorage + meta |
| `app/js/theme-audit.js` | Browser audit helper |
| `docs/DESIGN_SYSTEM.md` | Developer guidelines |

## Verification

1. Buka `/app/` → Settings → toggle **Mode terang**
2. Periksa sidebar, kartu saldo, kartu akun (DANA/OVO), header
3. Console: `MonefyiThemeAudit.run()`

## Migration checklist (remaining)

- [x] Phase 2: KPI cards, quick access, buttons global di `app.css`
- [x] Phase 3 (pages): onboarding, settings, preview-card, transaction-detail + `theme-overrides.css`
- [x] Phase 4: Toast, skeleton, loading overlay, empty/error states
- [ ] Phase 5: Run audit + manual pass semua halaman
