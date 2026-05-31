-- Fix infinite recursion in planner_org_members RLS (42P17).

CREATE OR REPLACE FUNCTION public.planner_auth_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
AS $$
  SELECT org_id
  FROM planner_org_members
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'manager');
$$;

REVOKE ALL ON FUNCTION public.planner_auth_org_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planner_auth_admin_org_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_auth_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_auth_admin_org_ids() TO authenticated;

DROP POLICY IF EXISTS planner_members_read ON planner_org_members;
CREATE POLICY planner_members_read ON planner_org_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR org_id IN (SELECT public.planner_auth_admin_org_ids())
  );

DROP POLICY IF EXISTS planner_members_manage ON planner_org_members;
CREATE POLICY planner_members_manage ON planner_org_members
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_admin_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_admin_org_ids()));

DROP POLICY IF EXISTS planner_orgs_member_read ON planner_organizations;
CREATE POLICY planner_orgs_member_read ON planner_organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.planner_auth_org_ids()));
