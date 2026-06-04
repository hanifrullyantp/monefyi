-- v2.1: member profile fields, admin attendance, runtime traces

ALTER TABLE planner_org_members
  ADD COLUMN IF NOT EXISTS employee_id TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS bank_holder TEXT;

ALTER TABLE planner_org_members
  DROP CONSTRAINT IF EXISTS planner_org_members_employment_type_check;
ALTER TABLE planner_org_members
  ADD CONSTRAINT planner_org_members_employment_type_check
  CHECK (employment_type IS NULL OR employment_type IN ('full_time', 'part_time', 'contract', 'daily'));

-- Admin manual attendance (owner/manager can insert for any org member)
DROP POLICY IF EXISTS planner_attendance_admin_insert ON planner_attendance_records;
CREATE POLICY planner_attendance_admin_insert ON planner_attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT public.planner_auth_admin_org_ids()));

CREATE TABLE IF NOT EXISTS runtime_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES planner_organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  component TEXT,
  message TEXT,
  stack_trace TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  device_info JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runtime_traces_created ON runtime_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_traces_event ON runtime_traces(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_traces_severity ON runtime_traces(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_traces_tenant ON runtime_traces(tenant_id, created_at DESC);

ALTER TABLE runtime_traces ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

DROP POLICY IF EXISTS runtime_traces_insert ON runtime_traces;
CREATE POLICY runtime_traces_insert ON runtime_traces
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS runtime_traces_select ON runtime_traces;
CREATE POLICY runtime_traces_select ON runtime_traces
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());
