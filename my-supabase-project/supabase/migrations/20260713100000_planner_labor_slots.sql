-- Labor scheduling per project date (planning vs actual), linked to HR members.

CREATE TABLE IF NOT EXISTS planner_labor_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  rap_item_id UUID REFERENCES planner_rap_items(id) ON DELETE CASCADE,
  member_id UUID REFERENCES planner_org_members(id) ON DELETE SET NULL,
  work_date DATE NOT NULL,
  slot_kind TEXT NOT NULL CHECK (slot_kind IN ('planned', 'actual')),
  rate_type TEXT NOT NULL CHECK (rate_type IN ('daily', 'hourly', 'monthly')),
  day_fraction NUMERIC(4,2) NOT NULL DEFAULT 1,
  regular_hours NUMERIC(6,2) DEFAULT 8,
  overtime_hours NUMERIC(6,2) DEFAULT 0,
  unit_rate NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_labor_slots_project_rap
  ON planner_labor_slots(project_id, rap_item_id);
CREATE INDEX IF NOT EXISTS idx_labor_slots_member_date
  ON planner_labor_slots(member_id, work_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_labor_slots_unique_day
  ON planner_labor_slots(rap_item_id, work_date, slot_kind)
  WHERE rap_item_id IS NOT NULL;

ALTER TABLE planner_rap_items
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES planner_org_members(id) ON DELETE SET NULL;

ALTER TABLE planner_member_compensation
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(15,2) NOT NULL DEFAULT 0;

ALTER TABLE planner_labor_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_labor_slots_all ON planner_labor_slots;
CREATE POLICY planner_labor_slots_all ON planner_labor_slots
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));
