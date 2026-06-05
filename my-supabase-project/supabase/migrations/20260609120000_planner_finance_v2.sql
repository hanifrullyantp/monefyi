-- Monefyi Planner: Finance V2 (balance sheet / double-entry)
-- Isolated from V1 project finance tables. Uses org_id → planner_organizations.

-- ---------------------------------------------------------------------------
-- Project finance closure columns (additive)
-- ---------------------------------------------------------------------------
ALTER TABLE planner_projects
  ADD COLUMN IF NOT EXISTS finance_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_profit numeric(15,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planner_projects_finance_status_check'
  ) THEN
    ALTER TABLE planner_projects
      ADD CONSTRAINT planner_projects_finance_status_check
      CHECK (finance_status IS NULL OR finance_status IN ('active', 'finance_closed'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Chart of Accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner_finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'kas', 'piutang', 'stok', 'aset_tetap', 'prabayar',
    'hutang_dagang', 'hutang_pajak', 'hutang_lain',
    'modal_disetor', 'laba_ditahan', 'laba'
  )),
  category text NOT NULL CHECK (category IN ('aktiva', 'pasiva')),
  name text NOT NULL,
  project_id uuid REFERENCES planner_projects(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES planner_finance_accounts(id) ON DELETE SET NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  current_balance numeric(15,2) NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_accounts_org ON planner_finance_accounts(org_id, category);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_type ON planner_finance_accounts(org_id, type);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_project ON planner_finance_accounts(project_id) WHERE project_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Journal (double-entry)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  reference_type text CHECK (reference_type IN (
    'project_expense', 'project_income', 'opex', 'transfer', 'manual', 'amortize', 'depreciation', 'opening'
  )),
  reference_id uuid,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_org_date ON planner_journal_entries(org_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS planner_journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES planner_journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES planner_finance_accounts(id),
  debit numeric(15,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(15,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  notes text,
  CONSTRAINT planner_journal_lines_debit_xor_credit CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_journal ON planner_journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON planner_journal_lines(account_id);

-- ---------------------------------------------------------------------------
-- Opex
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner_opex_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_opex_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES planner_opex_categories(id) ON DELETE CASCADE,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year int NOT NULL,
  planned_amount numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  UNIQUE (org_id, category_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS planner_opex_realizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES planner_opex_categories(id),
  paid_date date NOT NULL,
  amount numeric(15,2) NOT NULL,
  source_account_id uuid REFERENCES planner_finance_accounts(id),
  notes text,
  attachment_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Inventory, fixed assets, prepaid
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  qty numeric(15,4) NOT NULL DEFAULT 0,
  unit_cost numeric(15,2) NOT NULL DEFAULT 0,
  total_value numeric(15,2) GENERATED ALWAYS AS (qty * unit_cost) STORED,
  min_stock numeric(15,4) NOT NULL DEFAULT 0,
  location text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  purchase_date date,
  purchase_value numeric(15,2) NOT NULL DEFAULT 0,
  current_value numeric(15,2) NOT NULL DEFAULT 0,
  depreciation_method text NOT NULL DEFAULT 'straight' CHECK (depreciation_method IN ('straight', 'none')),
  useful_life_months int,
  notes text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_prepaid_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  total_amount numeric(15,2) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  remaining_value numeric(15,2) NOT NULL,
  account_id uuid REFERENCES planner_finance_accounts(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Receivables & Payables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner_receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  debtor_type text NOT NULL CHECK (debtor_type IN ('person', 'company', 'project')),
  debtor_name text NOT NULL,
  debtor_project_id uuid REFERENCES planner_projects(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL,
  paid_amount numeric(15,2) NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'paid', 'overdue')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  creditor_type text NOT NULL,
  creditor_name text NOT NULL,
  creditor_project_id uuid REFERENCES planner_projects(id) ON DELETE SET NULL,
  category text CHECK (category IN ('dagang', 'pajak', 'lain')),
  amount numeric(15,2) NOT NULL,
  paid_amount numeric(15,2) NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'paid', 'overdue')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Investors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner_investors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  investment_type text CHECK (investment_type IN ('equity', 'project_based', 'profit_share')),
  total_invested numeric(15,2) NOT NULL DEFAULT 0,
  share_pct numeric(5,2),
  notes text,
  joined_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_investor_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES planner_investors(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('invest', 'withdraw', 'dividend')),
  amount numeric(15,2) NOT NULL,
  trans_date date NOT NULL,
  project_id uuid REFERENCES planner_projects(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Seed default chart of accounts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_chart_of_accounts(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'org_id required';
  END IF;

  IF EXISTS (SELECT 1 FROM planner_finance_accounts WHERE org_id = p_org_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO planner_finance_accounts (org_id, type, category, name, is_system) VALUES
    (p_org_id, 'kas', 'aktiva', 'Kas Bisnis', true),
    (p_org_id, 'piutang', 'aktiva', 'Piutang Usaha', true),
    (p_org_id, 'stok', 'aktiva', 'Persediaan Barang', true),
    (p_org_id, 'aset_tetap', 'aktiva', 'Properti & Peralatan', true),
    (p_org_id, 'prabayar', 'aktiva', 'Biaya Dibayar Dimuka', true),
    (p_org_id, 'hutang_dagang', 'pasiva', 'Hutang Dagang', true),
    (p_org_id, 'hutang_pajak', 'pasiva', 'Hutang Pajak', true),
    (p_org_id, 'hutang_lain', 'pasiva', 'Hutang Lain-lain', true),
    (p_org_id, 'modal_disetor', 'pasiva', 'Modal Disetor', true),
    (p_org_id, 'laba_ditahan', 'pasiva', 'Laba Ditahan', true),
    (p_org_id, 'laba', 'pasiva', 'Laba Periode Berjalan', true);
END;
$$;

REVOKE ALL ON FUNCTION public.seed_default_chart_of_accounts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_default_chart_of_accounts(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE planner_finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_opex_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_opex_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_opex_realizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_prepaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_investor_transactions ENABLE ROW LEVEL SECURITY;

-- Accounts
DROP POLICY IF EXISTS planner_finance_accounts_all ON planner_finance_accounts;
CREATE POLICY planner_finance_accounts_all ON planner_finance_accounts
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

-- Journal entries
DROP POLICY IF EXISTS planner_journal_entries_all ON planner_journal_entries;
CREATE POLICY planner_journal_entries_all ON planner_journal_entries
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

-- Journal lines (via parent entry org)
DROP POLICY IF EXISTS planner_journal_lines_all ON planner_journal_lines;
CREATE POLICY planner_journal_lines_all ON planner_journal_lines
  FOR ALL TO authenticated
  USING (
    journal_id IN (
      SELECT id FROM planner_journal_entries
      WHERE org_id IN (SELECT public.planner_auth_org_ids())
    )
  )
  WITH CHECK (
    journal_id IN (
      SELECT id FROM planner_journal_entries
      WHERE org_id IN (SELECT public.planner_auth_org_ids())
    )
  );

-- Opex
DROP POLICY IF EXISTS planner_opex_categories_all ON planner_opex_categories;
CREATE POLICY planner_opex_categories_all ON planner_opex_categories
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS planner_opex_budgets_all ON planner_opex_budgets;
CREATE POLICY planner_opex_budgets_all ON planner_opex_budgets
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS planner_opex_realizations_all ON planner_opex_realizations;
CREATE POLICY planner_opex_realizations_all ON planner_opex_realizations
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

-- Inventory & assets
DROP POLICY IF EXISTS planner_inventory_items_all ON planner_inventory_items;
CREATE POLICY planner_inventory_items_all ON planner_inventory_items
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS planner_fixed_assets_all ON planner_fixed_assets;
CREATE POLICY planner_fixed_assets_all ON planner_fixed_assets
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS planner_prepaid_items_all ON planner_prepaid_items;
CREATE POLICY planner_prepaid_items_all ON planner_prepaid_items
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

-- Receivables & payables
DROP POLICY IF EXISTS planner_receivables_all ON planner_receivables;
CREATE POLICY planner_receivables_all ON planner_receivables
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS planner_payables_all ON planner_payables;
CREATE POLICY planner_payables_all ON planner_payables
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

-- Investors
DROP POLICY IF EXISTS planner_investors_all ON planner_investors;
CREATE POLICY planner_investors_all ON planner_investors
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS planner_investor_transactions_all ON planner_investor_transactions;
CREATE POLICY planner_investor_transactions_all ON planner_investor_transactions
  FOR ALL TO authenticated
  USING (
    investor_id IN (
      SELECT id FROM planner_investors
      WHERE org_id IN (SELECT public.planner_auth_org_ids())
    )
  )
  WITH CHECK (
    investor_id IN (
      SELECT id FROM planner_investors
      WHERE org_id IN (SELECT public.planner_auth_org_ids())
    )
  );
