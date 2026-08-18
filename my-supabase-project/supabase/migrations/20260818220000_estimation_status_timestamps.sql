-- Estimator Phase 2: status pipeline timestamps + project link

ALTER TABLE planner_estimations
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_project_id UUID REFERENCES planner_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_planner_estimations_converted_project
  ON planner_estimations(converted_project_id)
  WHERE converted_project_id IS NOT NULL;
