-- Pembatalan 20261104130000_planner_phase1_safety.sql
-- Mengembalikan policy longgar sebelumnya (anggota aktif boleh menulis keuangan).
-- Jalankan manual. Jangan menaruh berkas ini di folder migrations.

DROP TRIGGER IF EXISTS planner_income_touch_derived ON planner_project_incomes;
DROP TRIGGER IF EXISTS planner_work_touch_derived ON planner_work_items;
DROP TRIGGER IF EXISTS planner_cost_touch_derived ON planner_cost_realizations;
DROP TRIGGER IF EXISTS planner_rap_touch_derived ON planner_rap_items;
DROP TRIGGER IF EXISTS planner_projects_derived_biu ON planner_projects;

DROP FUNCTION IF EXISTS public.planner_touch_project_derived();
DROP FUNCTION IF EXISTS public.planner_fill_derived_project_totals();

DROP POLICY IF EXISTS planner_investor_transactions_read ON planner_investor_transactions;
DROP POLICY IF EXISTS planner_investor_transactions_write ON planner_investor_transactions;
CREATE POLICY planner_investor_transactions_all ON planner_investor_transactions
  FOR ALL TO authenticated
  USING (
    investor_id IN (
      SELECT id FROM planner_investors
      WHERE org_id IN (SELECT public.planner_auth_org_ids())
    )
  )
  WITH CHECK (
    investor_id IN (
      SELECT id FROM planner_investors
      WHERE org_id IN (SELECT public.planner_auth_org_ids())
    )
  );

DROP POLICY IF EXISTS planner_journal_lines_read ON planner_journal_lines;
DROP POLICY IF EXISTS planner_journal_lines_write ON planner_journal_lines;
CREATE POLICY planner_journal_lines_all ON planner_journal_lines
  FOR ALL TO authenticated
  USING (
    journal_id IN (
      SELECT id FROM planner_journal_entries
      WHERE org_id IN (SELECT public.planner_auth_org_ids())
    )
  )
  WITH CHECK (
    journal_id IN (
      SELECT id FROM planner_journal_entries
      WHERE org_id IN (SELECT public.planner_auth_org_ids())
    )
  );

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'planner_finance_accounts',
    'planner_journal_entries',
    'planner_opex_categories',
    'planner_opex_budgets',
    'planner_opex_realizations',
    'planner_inventory_items',
    'planner_fixed_assets',
    'planner_prepaid_items',
    'planner_receivables',
    'planner_payables',
    'planner_investors'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_read', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_write', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (org_id IN (SELECT public.planner_auth_org_ids())) WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()))',
      tbl || '_all', tbl
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS planner_analysis_read ON planner_analysis_snapshots;
DROP POLICY IF EXISTS planner_analysis_write ON planner_analysis_snapshots;
CREATE POLICY planner_analysis_all ON planner_analysis_snapshots
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_logs_read ON planner_daily_logs;
DROP POLICY IF EXISTS planner_logs_write ON planner_daily_logs;
CREATE POLICY planner_logs_all ON planner_daily_logs
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_cost_read ON planner_cost_realizations;
DROP POLICY IF EXISTS planner_cost_write ON planner_cost_realizations;
CREATE POLICY planner_cost_all ON planner_cost_realizations
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_work_read ON planner_work_items;
DROP POLICY IF EXISTS planner_work_insert ON planner_work_items;
DROP POLICY IF EXISTS planner_work_update ON planner_work_items;
DROP POLICY IF EXISTS planner_work_delete ON planner_work_items;
CREATE POLICY planner_work_all ON planner_work_items
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_rap_read ON planner_rap_items;
DROP POLICY IF EXISTS planner_rap_insert ON planner_rap_items;
DROP POLICY IF EXISTS planner_rap_update ON planner_rap_items;
DROP POLICY IF EXISTS planner_rap_delete ON planner_rap_items;
CREATE POLICY planner_rap_all ON planner_rap_items
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_members_owner_write ON planner_org_members;
DROP POLICY IF EXISTS planner_members_manager_insert_worker ON planner_org_members;
DROP POLICY IF EXISTS planner_members_manager_update_worker ON planner_org_members;
CREATE POLICY planner_members_manage ON planner_org_members
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_admin_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_admin_org_ids()));

DROP FUNCTION IF EXISTS public.planner_can_write_project(uuid, text);
DROP FUNCTION IF EXISTS public.is_org_member(uuid, text);
DROP FUNCTION IF EXISTS public.planner_role_rank(text);
