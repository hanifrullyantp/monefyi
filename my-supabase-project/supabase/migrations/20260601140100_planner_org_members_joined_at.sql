-- Back-compat: frontend previously ordered by joined_at (column never existed).
ALTER TABLE planner_org_members
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ
  GENERATED ALWAYS AS (coalesce(accepted_at, invited_at)) STORED;
