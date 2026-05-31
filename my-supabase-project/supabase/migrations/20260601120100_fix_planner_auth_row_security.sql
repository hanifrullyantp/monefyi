-- Hotfix: SECURITY DEFINER helpers must disable row_security when reading RLS-protected tables.
-- Without this, INSERT ... RETURNING fails (SELECT policy re-enters helpers → 42501 / 42P17).

CREATE OR REPLACE FUNCTION public.planner_auth_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT org_id
  FROM planner_org_members
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.planner_auth_admin_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT org_id
  FROM planner_org_members
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'manager');
$$;

CREATE OR REPLACE FUNCTION public.planner_auth_owner_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT org_id
  FROM planner_org_members
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND role = 'owner';
$$;

CREATE OR REPLACE FUNCTION public.planner_auth_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
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

CREATE OR REPLACE FUNCTION public.planner_auth_admin_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT p.id
  FROM planner_projects p
  WHERE p.org_id IN (
    SELECT org_id FROM planner_org_members
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'manager')
  );
$$;

REVOKE ALL ON FUNCTION public.planner_auth_org_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planner_auth_admin_org_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planner_auth_owner_org_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planner_auth_project_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planner_auth_admin_project_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_auth_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_auth_admin_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_auth_owner_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_auth_project_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_auth_admin_project_ids() TO authenticated;
