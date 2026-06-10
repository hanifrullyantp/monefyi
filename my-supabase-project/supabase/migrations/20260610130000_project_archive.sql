-- Soft-delete / arsip proyek: 30 hari sebelum purge permanen (restore oleh platform admin)

ALTER TABLE planner_projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archive_purge_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_planner_projects_archived
  ON planner_projects (org_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

-- Proyek terarsip tidak tampil untuk user biasa
CREATE OR REPLACE FUNCTION public.planner_auth_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM planner_projects p
  WHERE p.deleted_at IS NULL
    AND p.org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'manager')
    )
  UNION
  SELECT pm.project_id
  FROM planner_project_members pm
  INNER JOIN planner_projects p ON p.id = pm.project_id AND p.deleted_at IS NULL
  WHERE pm.user_id = auth.uid()
  UNION
  SELECT p.id
  FROM planner_projects p
  WHERE p.deleted_at IS NULL
    AND p.org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role = 'worker'
    )
    AND NOT EXISTS (
      SELECT 1 FROM planner_project_members pm WHERE pm.project_id = p.id
    );
$$;

-- Platform admin: lihat & pulihkan proyek terarsip
DROP POLICY IF EXISTS planner_projects_archive_read ON planner_projects;
CREATE POLICY planner_projects_archive_read ON planner_projects
  FOR SELECT TO authenticated
  USING (deleted_at IS NOT NULL AND public.is_platform_admin());

DROP POLICY IF EXISTS planner_projects_archive_restore ON planner_projects;
CREATE POLICY planner_projects_archive_restore ON planner_projects
  FOR UPDATE TO authenticated
  USING (deleted_at IS NOT NULL AND public.is_platform_admin())
  WITH CHECK (deleted_at IS NULL AND public.is_platform_admin());
