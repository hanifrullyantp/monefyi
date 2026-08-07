# MONEFYI — PENYEMPURNAAN LIGHT MODE

## KONTEKS

Setelah audit visual dari 7 screenshot user, ditemukan:

- Sistem token sudah diterapkan sebagian
- Beberapa komponen masih hardcoded dark background
- Inkonsistensi visual antar halaman
- User experience terganggu karena dark card di light theme

**TUJUAN AKHIR:** Setiap komponen 100% konsisten dengan theme. Zero dark background di light mode. Zero hardcoded colors di komponen kritis.

---

## STATUS IMPLEMENTASI (2026-08-07)

| Task | Status | Catatan |
|------|--------|---------|
| TASK 1 — Audit komponen | ✅ | `scripts/component-theme-audit.cjs` → `docs/AUDIT_COMPONENTS.md` |
| TASK 2 — Komponen kritis | ✅ | Account cards, KPI, tx table, budget list, Monevisor, banner, tabs |
| TASK 3 — Background inheritance | ✅ | Explicit `--card-bg` di card/panel |
| TASK 4 — Icon container | ✅ | `app/css/components/icon-container.css` |
| TASK 5 — Contrast audit | 🔶 | Runtime: `themeDebug.highlightLowContrast()` |
| TASK 6 — Empty states | ✅ | `#txEmpty` + class `.empty-state` |
| TASK 7 — theme-debug.js | ✅ | `app/js/theme-debug.js` |
| TASK 8 — Priority fixes | ✅ | Source CSS + `theme-overrides.css` |
| TASK 9 — Testing checklist | 🔶 | Manual visual test diperlukan |
| TASK 10 — DESIGN_SYSTEM.md | ✅ | Anti-patterns section updated |

---

## TASK 1: FULL AUDIT

```bash
npm run audit:components   # → docs/AUDIT_COMPONENTS.md
npm run audit:theme        # static hex/rgb scan
```

---

## TASK 2: KOMPONEN KRITIS (FIXED)

File yang diperbaiki:

| Komponen | File utama |
|----------|------------|
| Account cards | `app/css/home-page.css`, `components/account-card.css` |
| KPI cards | `app/css/app.css`, `app/index.html` (hapus `text-white`) |
| Transaction table | `app/css/app.css` (`.tx-card-inner`, group headers) |
| Daftar Budgeting | `app/css/budget-final-refinements.css` |
| Monevisor card | `app/css/monevisor-page.css` |
| Warning banner | `theme-overrides.css`, `components/home-dashboard.css` |
| Settings tabs | `theme-overrides.css`, `settings-page.css` |

Override final: `app/css/theme-overrides.css` (section **LIGHT MODE COMPLETION**)

---

## TASK 7: DEBUG TOOL

Browser console (`/app/`):

```js
themeDebug.highlightHardcoded()  // red outline = dark bg in light mode
themeDebug.highlightLowContrast()
themeDebug.toggleTheme()
themeDebug.reset()
```

---

## TASK 9: TESTING CHECKLIST

Test setiap halaman **light + dark**:

- [ ] Dashboard — account cards, KPI, quick access
- [ ] Semua Transaksi — table rows, group headers, empty state
- [ ] Budgeting — daftar budgeting panel kanan
- [ ] Neraca — banner selisih kas, icon kategori
- [ ] Monevisor — intervention card
- [ ] Settings — tab navigation, form, status save

Automated:

```js
themeDebug.highlightHardcoded()  // expected: 0 red outlines
```

---

## PRINSIP EKSEKUSI

1. **Audit dulu, fix source, override last**
2. **Global utility > local one-off** (`.icon-container`)
3. **Test kedua theme sebelum merge**
4. **Consistency > innovation**

Lihat juga: `docs/DESIGN_SYSTEM.md`, `docs/AUDIT_COMPONENTS.md`
