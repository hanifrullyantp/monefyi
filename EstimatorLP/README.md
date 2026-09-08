# Estimator Landing — estimator.monefyi.com

Domain khusus pelanggan **Monefyi Estimator**. Kode landing sama dengan [`PlannerLP2/`](../PlannerLP2/) — deploy terpisah via Vercel project `estimator-lp` (atau nama project Anda).

## Vercel setup

| Setting | Value |
|---------|--------|
| Root Directory | `PlannerLP2` |
| Domain | `estimator.monefyi.com` |
| `ESTIMATOR_STANDALONE` | `true` |
| `NEXT_PUBLIC_PLANNER_APP_URL` | `https://estimator.monefyi.com` |
| `PLANNER_APP_ORIGIN` | `https://monefyi-planner.vercel.app` |
| `NEXT_PUBLIC_LYNK_ESTIMATOR_STANDARD` | `http://lynk.id/asfin-ai/16w36xe7z3v1/checkout` |
| `NEXT_PUBLIC_LYNK_ESTIMATOR_PRO` | `http://lynk.id/asfin-ai/qynky6065k37/checkout` |

## GitHub Actions

Workflow **Deploy Estimator LP** (`.github/workflows/estimator-lp-deploy.yml`).

Secret wajib: `VERCEL_ESTIMATOR_LP_PROJECT_ID` = `prj_tK2hCrfgJfhgAoofYQ0lf2ghkng1` (project **estimator**), plus `VERCEL_TOKEN`, `VERCEL_ORG_ID`.

## Supabase Auth

Tambah redirect URLs:

- `https://estimator.monefyi.com/**`
- `https://estimator.monefyi.com/app/**`

## Alur pelanggan

1. Iklan → `estimator.monefyi.com`
2. Beli → Lynk (Basic / Pro)
3. Email konfirmasi → link ke `estimator.monefyi.com/app/estimator`
4. Login / atur password → Estimator aktif
