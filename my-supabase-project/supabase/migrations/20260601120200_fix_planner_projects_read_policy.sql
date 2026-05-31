-- Fix INSERT ... RETURNING on planner_projects: avoid recursive read policies.
-- planner_projects_read must NOT call planner_auth_project_ids() (which scans planner_projects).

CREATE OR REPLACE FUNCTION public.planner_auth_project_org_id(p_project_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT org_id FROM planner_projects WHERE id = p_project_id LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.planner_auth_project_org_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_auth_project_org_id(uuid) TO authenticated;

DROP POLICY IF EXISTS planner_projects_read ON planner_projects;
CREATE POLICY planner_projects_read ON planner_projects
  FOR SELECT TO authenticated
  USING (
    org_id IN (SELECT public.planner_auth_admin_org_ids())
    OR id IN (
      SELECT pm.project_id
      FROM planner_project_members pm
      WHERE pm.user_id = auth.uid()
    )
    OR (
      org_id IN (
        SELECT m.org_id
        FROM planner_org_members m
        WHERE m.user_id = auth.uid()
          AND m.role = 'worker'
          AND m.status = 'active'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM planner_project_members pm
        WHERE pm.project_id = planner_projects.id
      )
    )
  );

DROP POLICY IF EXISTS planner_project_members_read ON planner_project_members;
CREATE POLICY planner_project_members_read ON planner_project_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.planner_auth_project_org_id(project_id) IN (
      SELECT public.planner_auth_admin_org_ids()
    )
  );

DROP POLICY IF EXISTS planner_project_members_manage ON planner_project_members;
CREATE POLICY planner_project_members_manage ON planner_project_members
  FOR ALL TO authenticated
  USING (
    public.planner_auth_project_org_id(project_id) IN (
      SELECT public.planner_auth_admin_org_ids()
    )
  )
  WITH CHECK (
    public.planner_auth_project_org_id(project_id) IN (
      SELECT public.planner_auth_admin_org_ids()
    )
  );
