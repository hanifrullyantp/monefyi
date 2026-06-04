-- Advanced attendance: location, salary type, automation metadata

ALTER TABLE planner_member_compensation
  ADD COLUMN IF NOT EXISTS salary_type TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE planner_member_compensation
  DROP CONSTRAINT IF EXISTS planner_member_compensation_salary_type_check;
ALTER TABLE planner_member_compensation
  ADD CONSTRAINT planner_member_compensation_salary_type_check
  CHECK (salary_type IN ('daily', 'monthly'));

ALTER TABLE planner_attendance_records
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS is_offsite BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE planner_attendance_records
  DROP CONSTRAINT IF EXISTS planner_attendance_records_source_check;
ALTER TABLE planner_attendance_records
  ADD CONSTRAINT planner_attendance_records_source_check
  CHECK (source IN ('manual', 'admin_manual', 'geofence', 'wifi_auto'));

CREATE INDEX IF NOT EXISTS idx_planner_attendance_offsite
  ON planner_attendance_records(org_id, is_offsite, recorded_at DESC);
