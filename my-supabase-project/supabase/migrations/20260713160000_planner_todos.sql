-- Checklist todos linked to Gantt work items, with assignee support.

CREATE TABLE IF NOT EXISTS planner_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES planner_work_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_member_id UUID REFERENCES planner_org_members(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_todos_org ON planner_todos(org_id, status);
CREATE INDEX IF NOT EXISTS idx_planner_todos_work_item ON planner_todos(work_item_id);
CREATE INDEX IF NOT EXISTS idx_planner_todos_assignee ON planner_todos(assigned_user_id, status);

ALTER TABLE planner_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_todos_all ON planner_todos;
CREATE POLICY planner_todos_all ON planner_todos
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));
