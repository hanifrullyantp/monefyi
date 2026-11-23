# Migrasi Sandbox → Production — Rollout Playbook

## Ringkasan

Migrasi fitur sandbox (`refined-project-planner-prompt`) ke `planner.monefyi.com` menggunakan feature flags di `profiles.settings.migration_flags`.

| Flag | Default | Fitur |
|------|---------|-------|
| `database_master` | `false` | `/app/database` — CRUD `rpp_*` |
| `create_project_smart` | `false` | Wizard create + RAP draft |
| `finance_dashboard_v2` | `false` | Neraca validator + diagnosa |
| `project_view_v2` | `false` | Project Detail 6-tab parallel |

## Tahap Rollout

### Alpha (internal)
- **Audience:** `owner-onboard@test.monefyi.app`, org Intero
- **Flags:** semua `true`
- **Aktivasi:** Settings → Developer (owner only)

### Beta
- **Audience:** org dengan < 5 project
- **Flags:** `database_master`, `create_project_smart`
- **Durasi:** 7 hari monitoring

### GA
- **Audience:** semua org
- **Flags:** `project_view_v2` default ON (via seed/migration script)
- **Sunset Command Center:** T+90 hari setelah GA

## Rollback (< 5 menit)

| Insiden | Aksi |
|---------|------|
| RLS error `rpp_*` | Matikan `database_master` global |
| Wizard corrupt RAP | Matikan `create_project_smart` |
| V2 data salah | Matikan `project_view_v2` |
| Neraca false positive | Matikan `finance_dashboard_v2` |

Rollback via Settings → Developer atau SQL:

```sql
UPDATE profiles
SET settings = jsonb_set(COALESCE(settings, '{}'), '{migration_flags,project_view_v2}', 'false')
WHERE id = '<user_id>';
```

## Monitoring

- **Sentry:** error rate per flag (`project_view_v2`, dll.)
- **Audit:** `planner_audit_logs` untuk CRUD `rpp_*`
- **Balance:** log `isBalanced=false` counts per org (non-PII)

## Deploy Database (Fase 0)

```bash
./scripts/deploy-planner-supabase.sh
./scripts/rls-smoke-test.sh
```

Migrasi SQL:
- `20260712100000_rpp_master_tables.sql`
- `20260712100100_rpp_master_rls.sql`
- `20260712100200_rpp_master_seed_from_pricelist.sql`

## QA Checklist

- [ ] Owner login → query `rpp_materials` hanya row org sendiri
- [ ] Tambah material di Database → muncul di autosuggest RAP
- [ ] Kitchen Set 3m → project + RAP + work items + `rpp_materials`
- [ ] Finance V2 neraca balance/imbalance + diagnosa
- [ ] Project V2 6-tab parallel; Command Center tetap jalan (flag off)
- [ ] `npm run test` lulus
- [ ] Tidak ada regresi 9 project Intero existing
