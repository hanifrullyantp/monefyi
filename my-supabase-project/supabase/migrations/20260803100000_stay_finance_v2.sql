-- STAY Finance V2: Double-entry accounting for hospitality PMS
-- Scoped by tenant_id with RLS via stay_current_tenant_id()

-- ---------------------------------------------------------------------------
-- Chart of Accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stay_chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN (
    'aktiva', 'pasiva', 'pendapatan', 'beban'
  )),
  sub_type TEXT NOT NULL CHECK (sub_type IN (
    'kas', 'bank', 'xendit', 'piutang', 'stok', 'aset_tetap', 'prabayar',
    'hutang_dagang', 'hutang_gaji', 'hutang_pajak', 'hutang_lain', 'pendapatan_dimuka', 'hutang_bank',
    'modal', 'simpanan', 'laba_ditahan', 'laba',
    'pendapatan', 'beban'
  )),
  parent_id UUID REFERENCES stay_chart_of_accounts(id) ON DELETE SET NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_stay_coa_tenant ON stay_chart_of_accounts(tenant_id, account_type);
CREATE INDEX IF NOT EXISTS idx_stay_coa_parent ON stay_chart_of_accounts(parent_id) WHERE parent_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Journal (double-entry)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stay_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
    'booking', 'payment', 'pos', 'payroll', 'kasbon', 'expense', 'refund',
    'inventory', 'xendit', 'manual', 'closing', 'void'
  )),
  reference_type TEXT,
  reference_id UUID,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'void')),
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  void_reason TEXT,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES stay_users(id),
  created_by UUID REFERENCES stay_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_stay_journal_tenant_date ON stay_journal_entries(tenant_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS stay_journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES stay_journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES stay_chart_of_accounts(id),
  debit NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  notes TEXT,
  CONSTRAINT stay_journal_lines_debit_xor_credit CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE INDEX IF NOT EXISTS idx_stay_journal_lines_journal ON stay_journal_entry_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_stay_journal_lines_account ON stay_journal_entry_lines(account_id);

-- ---------------------------------------------------------------------------
-- Bank accounts & reconciliation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stay_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  chart_account_id UUID REFERENCES stay_chart_of_accounts(id),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES stay_bank_accounts(id),
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  bank_statement_balance NUMERIC(15,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bank_account_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS stay_bank_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES stay_bank_reconciliations(id) ON DELETE CASCADE,
  journal_id UUID REFERENCES stay_journal_entries(id),
  transaction_date DATE,
  description TEXT,
  amount NUMERIC(15,2) NOT NULL,
  match_status TEXT NOT NULL DEFAULT 'unchecked' CHECK (match_status IN ('matched', 'unmatched', 'unchecked', 'variance')),
  notes TEXT
);

-- ---------------------------------------------------------------------------
-- Tax
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stay_tax_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  tax_type TEXT NOT NULL CHECK (tax_type IN ('ppn', 'pph21', 'pph_final', 'pajak_daerah')),
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  taxable_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, tax_type, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS stay_tax_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_record_id UUID NOT NULL REFERENCES stay_tax_records(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Financial periods & budget
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stay_financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES stay_users(id),
  UNIQUE(tenant_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS stay_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES stay_chart_of_accounts(id),
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  planned_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE(tenant_id, account_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS stay_closing_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES stay_financial_periods(id),
  journal_id UUID NOT NULL REFERENCES stay_journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE stay_chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_bank_reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_tax_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_tax_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_closing_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY stay_coa_tenant ON stay_chart_of_accounts FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_journal_tenant ON stay_journal_entries FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_journal_lines_tenant ON stay_journal_entry_lines FOR ALL
  USING (journal_id IN (SELECT id FROM stay_journal_entries WHERE tenant_id = stay_current_tenant_id()));
CREATE POLICY stay_bank_accounts_tenant ON stay_bank_accounts FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_bank_recon_tenant ON stay_bank_reconciliations FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_bank_recon_items_tenant ON stay_bank_reconciliation_items FOR ALL
  USING (reconciliation_id IN (SELECT id FROM stay_bank_reconciliations WHERE tenant_id = stay_current_tenant_id()));
CREATE POLICY stay_tax_records_tenant ON stay_tax_records FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_tax_payments_tenant ON stay_tax_payments FOR ALL
  USING (tax_record_id IN (SELECT id FROM stay_tax_records WHERE tenant_id = stay_current_tenant_id()));
CREATE POLICY stay_fin_periods_tenant ON stay_financial_periods FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_budget_tenant ON stay_budget_items FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_closing_tenant ON stay_closing_entries FOR ALL USING (tenant_id = stay_current_tenant_id());

-- ---------------------------------------------------------------------------
-- Seed default chart of accounts for a tenant
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION stay_seed_default_chart_of_accounts(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM stay_chart_of_accounts WHERE tenant_id = p_tenant_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, sub_type, is_system) VALUES
    (p_tenant_id, '1101', 'Kas Tunai', 'aktiva', 'kas', true),
    (p_tenant_id, '1102', 'Kas Bank BCA', 'aktiva', 'bank', true),
    (p_tenant_id, '1103', 'Kas Bank Mandiri', 'aktiva', 'bank', true),
    (p_tenant_id, '1104', 'Saldo Xendit', 'aktiva', 'xendit', true),
    (p_tenant_id, '1201', 'Piutang Tamu', 'aktiva', 'piutang', true),
    (p_tenant_id, '1202', 'Piutang Karyawan', 'aktiva', 'piutang', true),
    (p_tenant_id, '1203', 'Piutang Xendit', 'aktiva', 'piutang', true),
    (p_tenant_id, '1204', 'Piutang OTA', 'aktiva', 'piutang', true),
    (p_tenant_id, '1301', 'Perlengkapan Kamar', 'aktiva', 'stok', true),
    (p_tenant_id, '1302', 'Perlengkapan Kebersihan', 'aktiva', 'stok', true),
    (p_tenant_id, '1303', 'Persediaan F&B', 'aktiva', 'stok', true),
    (p_tenant_id, '1401', 'Bangunan', 'aktiva', 'aset_tetap', true),
    (p_tenant_id, '1402', 'Peralatan', 'aktiva', 'aset_tetap', true),
    (p_tenant_id, '1403', 'Furniture', 'aktiva', 'aset_tetap', true),
    (p_tenant_id, '1499', 'Akumulasi Penyusutan', 'aktiva', 'aset_tetap', true),
    (p_tenant_id, '1501', 'Sewa Dibayar Dimuka', 'aktiva', 'prabayar', true),
    (p_tenant_id, '1502', 'Asuransi Dimuka', 'aktiva', 'prabayar', true),
    (p_tenant_id, '2101', 'Hutang Dagang', 'pasiva', 'hutang_dagang', true),
    (p_tenant_id, '2102', 'Hutang Gaji Karyawan', 'pasiva', 'hutang_gaji', true),
    (p_tenant_id, '2103', 'Hutang Pajak', 'pasiva', 'hutang_pajak', true),
    (p_tenant_id, '2104', 'Pendapatan Diterima Dimuka', 'pasiva', 'pendapatan_dimuka', true),
    (p_tenant_id, '2105', 'Hutang Lainnya', 'pasiva', 'hutang_lain', true),
    (p_tenant_id, '2201', 'Hutang Bank / Pinjaman', 'pasiva', 'hutang_bank', true),
    (p_tenant_id, '3101', 'Modal Pemilik', 'pasiva', 'modal', true),
    (p_tenant_id, '3102', 'Tambahan Modal', 'pasiva', 'modal', true),
    (p_tenant_id, '3103', 'Simpanan / Cadangan', 'pasiva', 'simpanan', true),
    (p_tenant_id, '3104', 'Laba Ditahan', 'pasiva', 'laba_ditahan', true),
    (p_tenant_id, '3105', 'Laba Periode Berjalan', 'pasiva', 'laba', true),
    (p_tenant_id, '4101', 'Pendapatan Kamar', 'pendapatan', 'pendapatan', true),
    (p_tenant_id, '4102', 'Pendapatan Extra Charges', 'pendapatan', 'pendapatan', true),
    (p_tenant_id, '4103', 'Pendapatan Late Checkout', 'pendapatan', 'pendapatan', true),
    (p_tenant_id, '4104', 'Pendapatan F&B', 'pendapatan', 'pendapatan', true),
    (p_tenant_id, '4105', 'Pendapatan Laundry', 'pendapatan', 'pendapatan', true),
    (p_tenant_id, '4199', 'Pendapatan Lainnya', 'pendapatan', 'pendapatan', true),
    (p_tenant_id, '5101', 'Beban Gaji & Tunjangan', 'beban', 'beban', true),
    (p_tenant_id, '5102', 'Beban Utilitas', 'beban', 'beban', true),
    (p_tenant_id, '5103', 'Beban Kebersihan', 'beban', 'beban', true),
    (p_tenant_id, '5104', 'Beban Perlengkapan', 'beban', 'beban', true),
    (p_tenant_id, '5105', 'Beban Payment Gateway', 'beban', 'beban', true),
    (p_tenant_id, '5106', 'Beban Maintenance', 'beban', 'beban', true),
    (p_tenant_id, '5107', 'Beban Marketing', 'beban', 'beban', true),
    (p_tenant_id, '5108', 'Beban Administrasi', 'beban', 'beban', true),
    (p_tenant_id, '5109', 'Beban Penyusutan', 'beban', 'beban', true),
    (p_tenant_id, '5199', 'Beban Lainnya', 'beban', 'beban', true),
    (p_tenant_id, '5201', 'Beban Bunga', 'beban', 'beban', true),
    (p_tenant_id, '5202', 'Beban Pajak', 'beban', 'beban', true),
    (p_tenant_id, '5203', 'Retur Pendapatan / Refund', 'beban', 'beban', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
