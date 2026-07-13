-- Finance integration: journal links + payroll allocation + report runs

ALTER TABLE planner_project_incomes
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES planner_journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

ALTER TABLE planner_cost_realizations
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES planner_journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

ALTER TABLE planner_payroll_entries
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES planner_journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allocation_json jsonb;

ALTER TABLE planner_bon_requests
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES planner_journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payroll_entry_id uuid REFERENCES planner_payroll_entries(id) ON DELETE SET NULL;

-- Extend journal reference types
ALTER TABLE planner_journal_entries DROP CONSTRAINT IF EXISTS planner_journal_entries_reference_type_check;
ALTER TABLE planner_journal_entries ADD CONSTRAINT planner_journal_entries_reference_type_check
  CHECK (reference_type IN (
    'project_expense', 'project_income', 'opex', 'transfer', 'manual',
    'amortize', 'depreciation', 'opening',
    'project_close', 'payroll_disbursement', 'bon_disbursement', 'payroll_accrual', 'period_close'
  ));

CREATE TABLE IF NOT EXISTS planner_finance_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  period_from date NOT NULL,
  period_to date NOT NULL,
  report_kind text NOT NULL DEFAULT 'bundle',
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_finance_report_runs_org ON planner_finance_report_runs(org_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS planner_finance_period_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid REFERENCES auth.users(id),
  UNIQUE (org_id, period_month)
);

CREATE TABLE IF NOT EXISTS planner_finance_revenue_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES planner_projects(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  planned_amount numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, project_id, period_month)
);
