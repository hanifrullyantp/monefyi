-- Allow project loans/repayments from external sources (bank, owner, HQ, etc.)

ALTER TABLE planner_project_transfers
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'project'
    CHECK (source_type IN ('project', 'external')),
  ADD COLUMN IF NOT EXISTS counterparty_name TEXT;

ALTER TABLE planner_project_transfers
  ALTER COLUMN from_project_id DROP NOT NULL,
  ALTER COLUMN to_project_id DROP NOT NULL;

ALTER TABLE planner_project_transfers
  DROP CONSTRAINT IF EXISTS planner_project_transfers_distinct_projects;

ALTER TABLE planner_project_transfers
  DROP CONSTRAINT IF EXISTS planner_project_transfers_endpoints_check;

ALTER TABLE planner_project_transfers
  ADD CONSTRAINT planner_project_transfers_endpoints_check CHECK (
    (type = 'loan' AND to_project_id IS NOT NULL)
    OR (type = 'repayment' AND from_project_id IS NOT NULL)
  );

ALTER TABLE planner_project_transfers
  DROP CONSTRAINT IF EXISTS planner_project_transfers_source_check;

ALTER TABLE planner_project_transfers
  ADD CONSTRAINT planner_project_transfers_source_check CHECK (
    (source_type = 'project' AND from_project_id IS NOT NULL AND to_project_id IS NOT NULL AND from_project_id != to_project_id)
    OR (
      source_type = 'external'
      AND counterparty_name IS NOT NULL
      AND length(trim(counterparty_name)) > 0
      AND (
        (type = 'loan' AND from_project_id IS NULL AND to_project_id IS NOT NULL)
        OR (type = 'repayment' AND from_project_id IS NOT NULL AND to_project_id IS NULL)
      )
    )
  );

DROP POLICY IF EXISTS planner_project_transfers_all ON planner_project_transfers;
CREATE POLICY planner_project_transfers_all ON planner_project_transfers
  FOR ALL TO authenticated
  USING (
    (from_project_id IS NOT NULL AND from_project_id IN (SELECT public.planner_auth_project_ids()))
    OR (to_project_id IS NOT NULL AND to_project_id IN (SELECT public.planner_auth_project_ids()))
  )
  WITH CHECK (
    (from_project_id IS NOT NULL AND from_project_id IN (SELECT public.planner_auth_project_ids()))
    OR (to_project_id IS NOT NULL AND to_project_id IN (SELECT public.planner_auth_project_ids()))
  );
