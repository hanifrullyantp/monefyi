-- Estimator Soft Delete & Drag Order
-- Menambahkan kolom deleted_at, archive_purge_at, deleted_by, dan sort_order pada planner_estimations

ALTER TABLE planner_estimations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archive_purge_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_planner_estimations_deleted
  ON planner_estimations (org_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_planner_estimations_sort_order
  ON planner_estimations (org_id, sort_order ASC);

