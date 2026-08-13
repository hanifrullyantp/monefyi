# Bonus Apps (Lite) — Monefyi

Mini apps **versi Lite** dengan branding standar **by Monefyi**.  
**Login akun Monefyi wajib** (`user_has_product('monefyi')`) sebelum akses fitur.

## Aplikasi

| App | Folder | Bonus Lifetime |
|-----|--------|----------------|
| Kalkulator Bagi Hasil | `Bagi Hasil/` | ✓ |
| Kalkulator Gaji & PPh21 | `Kalkulator Gaji/` | ✓ |
| Debt Freedom Planner | `debt-free-planner/` | ✓ |
| Budget Planner | `budget-planner/` | ✓ |
| Kalkulator Cicilan | `Hitung Gaji/` | — |
| Kalkulator Zakat | `Hitung Zakat/` | — |
| Hitung Waris | `Hitung Waris/` | — |

Versi **FULL & terintegrasi** termasuk paket Lifetime (Rp 99.000) — total bonus Rp 796.000.

## Auth & branding

Modul shared (`_shared/`):

| File | Fungsi |
|------|--------|
| `monefyi-config.ts` | Supabase URL/key, URL app |
| `monefyi-auth.ts` | signIn, session, `user_has_product` |
| `MonefyiProviders.tsx` | Auth + login gate + brand bar |
| `MonefyiBrandBar.tsx` | Header standar: **App · by Monefyi · Lite** |
| `MonefyiLoginGate.tsx` | Form login / CTA trial & Lifetime |

Setelah edit `_shared/`, jalankan:

```bash
./scripts/sync-monefyi-shared.sh
```

Per app: metadata di `src/lib/mini-app-meta.ts`, layout memakai `<MonefyiAppLayout>`.

## Env (opsional)

```env
NEXT_PUBLIC_SUPABASE_URL=https://zzwqfmdyncxbolestkqp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Default fallback = sama dengan `app/js/config.js`.

## Dev

```bash
cd "Mini App Monefyi/Kalkulator Gaji"  # atau app lain
npm install
npm run dev
```

Buka app → layar login Monefyi → masuk dengan email/password akun yang sudah punya entitlement `monefyi` (trial atau Lifetime).
