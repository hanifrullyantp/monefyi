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

## Deploy path (production)

| App | Folder | `NEXT_PUBLIC_BASE_PATH` | URL contoh |
|-----|--------|-------------------------|------------|
| Budget Planner | `budget-planner/` | `/bonus/budget` | `https://monefyi.com/bonus/budget/` |
| Debt Free | `debt-free-planner/` | `/bonus/debt-free` | … |
| Bagi Hasil | `Bagi Hasil/` | `/bonus/bagi-hasil` | … |
| Kalkulator Gaji | `Kalkulator Gaji/` | `/bonus/salary` | … |

Etalase pembeli Estimator/Planner: `https://estimator.monefyi.com/bonus` (PlannerLP2).

## Akses (auth)

Login Supabase sama dengan aplikasi Estimator. Gate mini app memakai RPC `user_has_bonus_app_access` (pembeli **Estimator berbayar**, **Planner**, atau **Lifetime monefyi**).

## Dev

```bash
./scripts/sync-monefyi-shared.sh   # setelah edit _shared/
cd "Mini App Monefyi/Kalkulator Gaji"  # atau app lain
npm install
npm run dev
```

Untuk dev lokal tanpa basePath, set `NEXT_PUBLIC_BASE_PATH=` kosong di `.env.local`.

Buka app → login → akun dengan org Estimator **sudah bayar** atau entitlement `monefyi`.
