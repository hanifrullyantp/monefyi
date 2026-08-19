-- Estimator: 7-stage workflow status pipeline (wa → selesai)

ALTER TABLE planner_estimations DROP CONSTRAINT IF EXISTS planner_estimations_status_check;

UPDATE planner_estimations SET status = 'wa' WHERE status = 'draft';
UPDATE planner_estimations SET status = 'penawaran' WHERE status = 'sent';
UPDATE planner_estimations SET status = 'closing' WHERE status = 'accepted';

ALTER TABLE planner_estimations
  ADD CONSTRAINT planner_estimations_status_check
  CHECK (status IN (
    'wa', 'survei', 'penawaran', 'closing', 'proses', 'finishing', 'selesai',
    'rejected', 'converted'
  ));

ALTER TABLE planner_estimations
  ALTER COLUMN status SET DEFAULT 'wa';

ALTER TABLE planner_estimations
  ADD COLUMN IF NOT EXISTS wa_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS survei_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proses_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finishing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS selesai_at TIMESTAMPTZ;

UPDATE planner_estimations SET wa_at = created_at WHERE wa_at IS NULL;
UPDATE planner_estimations SET sent_at = updated_at WHERE status = 'penawaran' AND sent_at IS NULL;
UPDATE planner_estimations SET accepted_at = updated_at WHERE status = 'closing' AND accepted_at IS NULL;
