-- Project incomes (uang masuk) and inter-project transfers

ALTER TABLE planner_projects
  ADD COLUMN IF NOT EXISTS total_received NUMERIC(15,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS planner_project_incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('dp', 'termin', 'pelunasan', 'retensi', 'other')),
  description TEXT NOT NULL,
  payment_method TEXT,
  client_ref TEXT,
  invoice_ref TEXT,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'pending', 'cancelled')),
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_incomes_project ON planner_project_incomes(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_project_incomes_date ON planner_project_incomes(date DESC);

CREATE TABLE IF NOT EXISTS planner_project_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  from_project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  to_project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('loan', 'repayment')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT planner_project_transfers_distinct_projects CHECK (from_project_id != to_project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_transfers_org ON planner_project_transfers(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_transfers_from ON planner_project_transfers(from_project_id);
CREATE INDEX IF NOT EXISTS idx_project_transfers_to ON planner_project_transfers(to_project_id);

ALTER TABLE planner_project_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_project_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_project_incomes_all ON planner_project_incomes;
CREATE POLICY planner_project_incomes_all ON planner_project_incomes
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_project_transfers_all ON planner_project_transfers;
CREATE POLICY planner_project_transfers_all ON planner_project_transfers
  FOR ALL TO authenticated
  USING (
    from_project_id IN (SELECT public.planner_auth_project_ids())
    AND to_project_id IN (SELECT public.planner_auth_project_ids())
  )
  WITH CHECK (
    from_project_id IN (SELECT public.planner_auth_project_ids())
    AND to_project_id IN (SELECT public.planner_auth_project_ids())
  );
