# Struktur deploy Monefyi

> 📚 **Indeks:** [`README.md`](README.md) · **Master:** [`MONEFYI_MASTER.md`](MONEFYI_MASTER.md) § Deploy

| URL | Direktori | Keterangan |
|-----|-----------|------------|
| `monefyi.com/` | [`monefyi-marketing-landing-page/`](../monefyi-marketing-landing-page/) | Landing React (marketing) |
| `monefyi.com/app/` | [`app/`](../app/) | Aplikasi PWA Monefyi |
| `monefyi.com/stay/` | [`STAY/`](../STAY/) | STAY — manajemen penginapan |

## Build

```bash
npm run build          # landing + app + stay → dist/
npm run dev            # dev server app di http://localhost:5173/app/
npm run dev:landing    # dev server landing di http://localhost:5174/
npm run dev:stay       # dev server STAY di http://localhost:5173/stay/
npm run preview        # preview dist/ setelah build
```

Output:

```
dist/
  index.html          ← landing (monefyi.com)
  css/landing.css
  icons/
  app/
    index.html        ← aplikasi (monefyi.com/app)
    js/
    css/
    sw.js
    manifest.webmanifest
    icons/
  stay/
    index.html        ← STAY (monefyi.com/stay)
```

## Vercel

- Root project: repo ini
- `outputDirectory`: `dist`
- Rewrite SPA: `/app/*` → `/app/index.html`, `/stay/*` → `/stay/index.html` (lihat [`vercel.json`](../vercel.json))

## Supabase Auth

Set Site URL ke `https://monefyi.com/app/` dan redirect URLs minimal `https://monefyi.com/app/**`.
