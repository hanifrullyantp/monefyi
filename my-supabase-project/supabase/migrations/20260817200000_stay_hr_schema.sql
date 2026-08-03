-- STAY HR module: attendance, payroll, staff loans

CREATE TABLE IF NOT EXISTS stay_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES stay_users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'leave')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id, work_date)
);

CREATE TABLE IF NOT EXISTS stay_payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES stay_users(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(12,2) DEFAULT 0,
  deductions NUMERIC(12,2) DEFAULT 0,
  net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id, period_month)
);

CREATE TABLE IF NOT EXISTS stay_staff_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES stay_users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  remaining NUMERIC(12,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stay_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_staff_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY stay_attendance_tenant ON stay_attendance_records FOR ALL
  USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_payroll_tenant ON stay_payroll_entries FOR ALL
  USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_loans_tenant ON stay_staff_loans FOR ALL
  USING (tenant_id = stay_current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_stay_attendance_date ON stay_attendance_records(tenant_id, work_date);
CREATE INDEX IF NOT EXISTS idx_stay_payroll_period ON stay_payroll_entries(tenant_id, period_month);
