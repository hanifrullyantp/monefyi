-- Attendance, compensation, payroll, and bon/advance requests for HR module.

CREATE TABLE IF NOT EXISTS planner_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('check_in', 'check_out')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  project_id UUID REFERENCES planner_projects(id) ON DELETE SET NULL,
  project_name TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_attendance_org_time
  ON planner_attendance_records(org_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_planner_attendance_user_time
  ON planner_attendance_records(user_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS planner_member_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES planner_org_members(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  monthly_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
  daily_rate NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, member_id)
);

CREATE TABLE IF NOT EXISTS planner_payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  days_present INT NOT NULL DEFAULT 0,
  base_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  bonus_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  deduction_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_planner_payroll_org_month
  ON planner_payroll_entries(org_id, period_month DESC);

CREATE TABLE IF NOT EXISTS planner_bon_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_bon_org_status
  ON planner_bon_requests(org_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.planner_touch_member_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE planner_org_members
  SET last_active_at = NEW.recorded_at
  WHERE org_id = NEW.org_id AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planner_attendance_touch_active ON planner_attendance_records;
CREATE TRIGGER trg_planner_attendance_touch_active
  AFTER INSERT ON planner_attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_member_active();

ALTER TABLE planner_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_member_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_bon_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_attendance_select ON planner_attendance_records;
CREATE POLICY planner_attendance_select ON planner_attendance_records
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR org_id IN (SELECT public.planner_auth_admin_org_ids())
  );

DROP POLICY IF EXISTS planner_attendance_insert ON planner_attendance_records;
CREATE POLICY planner_attendance_insert ON planner_attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND org_id IN (SELECT public.planner_auth_org_ids())
  );

DROP POLICY IF EXISTS planner_compensation_select ON planner_member_compensation;
CREATE POLICY planner_compensation_select ON planner_member_compensation
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR org_id IN (SELECT public.planner_auth_admin_org_ids())
  );

DROP POLICY IF EXISTS planner_compensation_manage ON planner_member_compensation;
CREATE POLICY planner_compensation_manage ON planner_member_compensation
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_admin_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_admin_org_ids()));

DROP POLICY IF EXISTS planner_payroll_select ON planner_payroll_entries;
CREATE POLICY planner_payroll_select ON planner_payroll_entries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR org_id IN (SELECT public.planner_auth_admin_org_ids())
  );

DROP POLICY IF EXISTS planner_payroll_manage ON planner_payroll_entries;
CREATE POLICY planner_payroll_manage ON planner_payroll_entries
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_admin_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_admin_org_ids()));

DROP POLICY IF EXISTS planner_bon_select ON planner_bon_requests;
CREATE POLICY planner_bon_select ON planner_bon_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR org_id IN (SELECT public.planner_auth_admin_org_ids())
  );

DROP POLICY IF EXISTS planner_bon_insert ON planner_bon_requests;
CREATE POLICY planner_bon_insert ON planner_bon_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND org_id IN (SELECT public.planner_auth_org_ids())
  );

DROP POLICY IF EXISTS planner_bon_update ON planner_bon_requests;
CREATE POLICY planner_bon_update ON planner_bon_requests
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT public.planner_auth_admin_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_admin_org_ids()));
