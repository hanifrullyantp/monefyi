# Struktur deploy Monefyi

| URL | Direktori | Keterangan |
|-----|-----------|------------|
| `monefyi.com/` | [`landing/`](../landing/) | Landing page marketing |
| `monefyi.com/app/` | [`app/`](../app/) | Aplikasi PWA Monefyi |

## Build

```bash
npm run build          # landing + app → dist/
npm run dev            # dev server app di http://localhost:5173/app/
npm run dev:landing    # dev server landing di http://localhost:5174/
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
```

## Vercel

- Root project: repo ini
- `outputDirectory`: `dist`
- Rewrite SPA: `/app/*` → `/app/index.html` (lihat [`vercel.json`](../vercel.json))

## Supabase Auth

Set Site URL ke `https://monefyi.com/app/` dan redirect URLs minimal `https://monefyi.com/app/**`.
