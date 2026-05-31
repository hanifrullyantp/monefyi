-- RLS smoke test — run after db push (service role / SQL editor).
-- Verifies helper functions exist and are callable without 42P17.
--
-- For full authenticated CRUD tests, run: ./scripts/rls-smoke-test.sh

-- 1. Helper functions exist
DO $rls_check$
BEGIN
  PERFORM public.planner_auth_org_ids();
  PERFORM public.planner_auth_admin_org_ids();
  PERFORM public.planner_auth_owner_org_ids();
  PERFORM public.planner_auth_project_ids();
  PERFORM public.planner_auth_admin_project_ids();
  RAISE NOTICE 'RLS helpers: OK (empty result without JWT is expected)';
EXCEPTION
  WHEN undefined_function THEN
    RAISE EXCEPTION 'Missing RLS helper function — apply migration 20260601120000';
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%infinite recursion%' THEN
      RAISE EXCEPTION 'RLS infinite recursion in helper: %', SQLERRM;
    END IF;
    RAISE;
END $rls_check$;

-- 2. Policies present on critical tables
DO $policy_check$
DECLARE
  missing text[];
BEGIN
  SELECT array_agg(t.table_name)
  INTO missing
  FROM (
    VALUES
      ('planner_projects'),
      ('planner_project_members'),
      ('planner_rap_items'),
      ('planner_work_items'),
      ('planner_cost_realizations'),
      ('planner_daily_logs')
  ) AS t(table_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = t.table_name
  );

  IF missing IS NOT NULL AND array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'Tables without RLS policies: %', missing;
  END IF;
  RAISE NOTICE 'RLS policies: OK on critical tables';
END $policy_check$;

-- 3. Seed org exists (onboarding seed)
DO $seed_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM planner_organizations WHERE slug = 'buana-onboard-test'
  ) THEN
    RAISE WARNING 'Seed org buana-onboard-test not found — skip authenticated API tests or run onboarding seed migration';
  ELSE
    RAISE NOTICE 'Seed org: OK';
  END IF;
END $seed_check$;
