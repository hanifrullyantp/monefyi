-- Fix infinite recursion in planner_projects / planner_project_members RLS (42P17).
-- RLS RULE: no cross-table subquery A→B if B→A exists.
-- Use SECURITY DEFINER helpers (same pattern as 20260531160200_fix_planner_org_members_rls.sql).

-- Owner-only org ids
CREATE OR REPLACE FUNCTION public.planner_auth_owner_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id
  FROM planner_org_members
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND role = 'owner';
$$;

-- Projects the current user may read (owner/manager: all org projects; worker: assigned or unassigned pool)
CREATE OR REPLACE FUNCTION public.planner_auth_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM planner_projects p
  WHERE p.org_id IN (
    SELECT org_id FROM planner_org_members
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'manager')
  )
  UNION
  SELECT pm.project_id
  FROM planner_project_members pm
  WHERE pm.user_id = auth.uid()
  UNION
  SELECT p.id
  FROM planner_projects p
  WHERE p.org_id IN (
    SELECT org_id FROM planner_org_members
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role = 'worker'
  )
  AND NOT EXISTS (
    SELECT 1 FROM planner_project_members pm WHERE pm.project_id = p.id
  );
$$;

-- Projects owner/manager may write
CREATE OR REPLACE FUNCTION public.planner_auth_admin_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM planner_projects p
  WHERE p.org_id IN (SELECT public.planner_auth_admin_org_ids());
$$;

REVOKE ALL ON FUNCTION public.planner_auth_owner_org_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planner_auth_project_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planner_auth_admin_project_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_auth_owner_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_auth_project_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_auth_admin_project_ids() TO authenticated;

-- ============================================================
-- planner_projects
-- ============================================================
DROP POLICY IF EXISTS planner_projects_read ON planner_projects;
CREATE POLICY planner_projects_read ON planner_projects
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_projects_write ON planner_projects;
CREATE POLICY planner_projects_write ON planner_projects
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT public.planner_auth_admin_org_ids()));

DROP POLICY IF EXISTS planner_projects_update ON planner_projects;
CREATE POLICY planner_projects_update ON planner_projects
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT public.planner_auth_admin_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_admin_org_ids()));

DROP POLICY IF EXISTS planner_projects_delete ON planner_projects;
CREATE POLICY planner_projects_delete ON planner_projects
  FOR DELETE TO authenticated
  USING (org_id IN (SELECT public.planner_auth_owner_org_ids()));

-- ============================================================
-- planner_project_members
-- ============================================================
DROP POLICY IF EXISTS planner_project_members_read ON planner_project_members;
CREATE POLICY planner_project_members_read ON planner_project_members
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_project_members_manage ON planner_project_members;
CREATE POLICY planner_project_members_manage ON planner_project_members
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_admin_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_admin_project_ids()));

-- ============================================================
-- Project child tables (rap, work, cost, logs, analysis)
-- ============================================================
DROP POLICY IF EXISTS planner_rap_all ON planner_rap_items;
CREATE POLICY planner_rap_all ON planner_rap_items
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_work_all ON planner_work_items;
CREATE POLICY planner_work_all ON planner_work_items
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_cost_all ON planner_cost_realizations;
CREATE POLICY planner_cost_all ON planner_cost_realizations
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_logs_all ON planner_daily_logs;
CREATE POLICY planner_logs_all ON planner_daily_logs
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_analysis_all ON planner_analysis_snapshots;
CREATE POLICY planner_analysis_all ON planner_analysis_snapshots
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

-- ============================================================
-- Org-scoped tables — use org helpers (no inline org_members subquery)
-- ============================================================
DROP POLICY IF EXISTS planner_invitations_read ON planner_invitations;
CREATE POLICY planner_invitations_read ON planner_invitations
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT public.planner_auth_admin_org_ids()));

DROP POLICY IF EXISTS planner_join_requests_org_read ON planner_join_requests;
CREATE POLICY planner_join_requests_org_read ON planner_join_requests
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT public.planner_auth_admin_org_ids()));

DROP POLICY IF EXISTS planner_join_requests_org_update ON planner_join_requests;
CREATE POLICY planner_join_requests_org_update ON planner_join_requests
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT public.planner_auth_admin_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_admin_org_ids()));

DROP POLICY IF EXISTS planner_audit_logs_owner ON planner_audit_logs;
CREATE POLICY planner_audit_logs_owner ON planner_audit_logs
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT public.planner_auth_owner_org_ids()));

DROP POLICY IF EXISTS planner_rules_read ON planner_parsing_rules;
CREATE POLICY planner_rules_read ON planner_parsing_rules
  FOR SELECT TO authenticated
  USING (
    org_id IS NULL
    OR org_id IN (SELECT public.planner_auth_org_ids())
  );

-- Re-assert org_members manage (onboarding migration may have used inline subquery)
DROP POLICY IF EXISTS planner_members_manage ON planner_org_members;
CREATE POLICY planner_members_manage ON planner_org_members
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_admin_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_admin_org_ids()));

DROP POLICY IF EXISTS planner_orgs_owner_update ON planner_organizations;
CREATE POLICY planner_orgs_owner_update ON planner_organizations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.planner_auth_owner_org_ids()))
  WITH CHECK (id IN (SELECT public.planner_auth_owner_org_ids()));
