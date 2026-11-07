-- Allow organization owners & managers to view and restore archived projects for their own org
-- in addition to platform admins.

DROP POLICY IF EXISTS planner_projects_archive_read ON planner_projects;
CREATE POLICY planner_projects_archive_read ON planner_projects
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NOT NULL
    AND (
      public.is_platform_admin()
      OR org_id IN (SELECT public.planner_auth_admin_org_ids())
    )
  );

DROP POLICY IF EXISTS planner_projects_archive_restore ON planner_projects;
CREATE POLICY planner_projects_archive_restore ON planner_projects
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NOT NULL
    AND (
      public.is_platform_admin()
      OR org_id IN (SELECT public.planner_auth_admin_org_ids())
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      public.is_platform_admin()
      OR org_id IN (SELECT public.planner_auth_admin_org_ids())
    )
  );

