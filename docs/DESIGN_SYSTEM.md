# Monefyi Design System Guidelines

Referensi untuk developer & AI saat menambah UI di Monefyi App.

## Prinsip

1. **Zero hardcoded colors** — pakai CSS variable dari `shared/tokens.css`
2. **Semantic > primitive** — `--text-primary` lebih baik dari `--color-neutral-900`
3. **Theme-first** — setiap komponen harus benar di light **dan** dark
4. **Kontras WCAG AA** — body text minimal 4.5:1

## Token files

| File | Peran |
|------|-------|
| `shared/tokens.css` | Primitives + semantic light/dark |
| `shared/brand-tokens.css` | Alias legacy `--mf-*` / `--app-*` |
| `app/css/components/*.css` | Komponen kritis (sidebar, saldo, akun, header, button) |

## Kapan pakai token apa

### Backgrounds
- `--bg-primary` — latar utama app
- `--bg-secondary` — section / area nested
- `--card-bg` — semua kartu

### Text
- `--text-primary` — judul, angka penting
- `--text-secondary` — body, deskripsi
- `--text-tertiary` — hint, timestamp

### Keuangan
- Pemasukan: `--finance-income`, `--finance-income-bg`
- Pengeluaran: `--finance-expense`, `--finance-expense-bg`

### Status
- Success / warning / danger / info → `--status-*-bg`, `--status-*-text`

### Sidebar & header
- `--sidebar-bg`, `--sidebar-item-text`, `--sidebar-item-active-*`
- `--header-bg`, `--header-border`

## Contoh

```css
.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--card-shadow);
  color: var(--text-primary);
}

.btn-primary {
  background: var(--interactive-primary);
  color: var(--interactive-primary-text);
}
```

## Theme switcher

`app/js/theme-manager.js` exposes `window.MonefyiTheme`:

- `initTheme()` — dipanggil otomatis saat load
- `setTheme('light' | 'dark' | 'auto')`
- `getChartColors()` — warna chart dari token

Setting app (`STATE.settings.theme`) tetap disinkronkan lewat `applyTheme()` di `app.js`.

## Anti-patterns

❌ `color: #fff` di komponen  
❌ `.dark .card { background: #1a1a2e }` terpisah  
❌ Inline `style="color: white"`  

✅ `color: var(--text-primary)`  
✅ Token semantic yang sudah switch di `[data-theme="light"]`

## Automated audit

```bash
npm run audit:theme          # static CSS scan
```

Browser (di `/app/`):

```js
MonefyiThemeAudit.run()
await MonefyiThemeAudit.testBothThemes()
```


## Menambah warna baru

1. Tambah primitive di `shared/tokens.css` (`--color-*-500`)
2. Buat semantic token (`--status-foo-bg`, dll) untuk **light dan dark**
3. Jalankan `npm run sync:brand`
4. Dokumentasikan di file ini
