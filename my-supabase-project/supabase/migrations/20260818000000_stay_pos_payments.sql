-- STAY POS, Payments, Xendit audit tables
-- Chart of accounts & journal use stay_finance_v2 schema (20260803100000)

-- ==================== PAYMENT METHODS & POS ====================

CREATE TABLE IF NOT EXISTS stay_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'cash', 'transfer', 'xendit_va', 'xendit_ewallet', 'xendit_qris', 'xendit_card', 'xendit_retail', 'xendit_invoice'
  )),
  is_active BOOLEAN DEFAULT true,
  fee_type TEXT DEFAULT 'none' CHECK (fee_type IN ('none', 'fixed', 'percent', 'mixed')),
  fee_amount NUMERIC(12,2) DEFAULT 0,
  fee_percent NUMERIC(6,4) DEFAULT 0,
  fee_bearer TEXT DEFAULT 'hotel' CHECK (fee_bearer IN ('hotel', 'guest', 'split')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS stay_pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES stay_users(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opening_balance NUMERIC(14,2) DEFAULT 0,
  closed_by UUID REFERENCES stay_users(id),
  closed_at TIMESTAMPTZ,
  expected_balance NUMERIC(14,2),
  actual_balance NUMERIC(14,2),
  variance NUMERIC(14,2),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

CREATE TABLE IF NOT EXISTS stay_pos_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES stay_pos_sessions(id),
  transaction_number TEXT NOT NULL,
  booking_id UUID REFERENCES stay_bookings(id),
  guest_id UUID REFERENCES stay_guests(id),
  cashier_id UUID REFERENCES stay_users(id),
  transaction_type TEXT NOT NULL DEFAULT 'sale' CHECK (transaction_type IN (
    'sale', 'refund', 'expense', 'deposit', 'settlement'
  )),
  subtotal NUMERIC(14,2) DEFAULT 0,
  discount_amount NUMERIC(14,2) DEFAULT 0,
  discount_percent NUMERIC(6,2) DEFAULT 0,
  tax_amount NUMERIC(14,2) DEFAULT 0,
  service_charge_amount NUMERIC(14,2) DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending', 'paid', 'partial', 'refunded', 'void'
  )),
  notes TEXT,
  split_bill_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, transaction_number)
);

CREATE TABLE IF NOT EXISTS stay_pos_transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES stay_pos_transactions(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'room' CHECK (item_type IN ('room', 'extra', 'product', 'fee', 'discount')),
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL,
  booking_charge_id UUID
);

CREATE TABLE IF NOT EXISTS stay_pos_transaction_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES stay_pos_transactions(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES stay_payment_methods(id),
  amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'paid', 'verified', 'failed', 'refunded'
  )),
  cash_received NUMERIC(14,2),
  change_amount NUMERIC(14,2),
  reference_number TEXT,
  proof_url TEXT,
  verified_by UUID REFERENCES stay_users(id),
  verified_at TIMESTAMPTZ,
  external_id TEXT,
  payment_url TEXT,
  expiry_at TIMESTAMPTZ,
  xendit_channel TEXT,
  xendit_fee NUMERIC(14,2) DEFAULT 0,
  guest_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_booking_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES stay_bookings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
    'room', 'laundry', 'minibar', 'food', 'other'
  )),
  posted_at TIMESTAMPTZ DEFAULT now(),
  pos_transaction_id UUID REFERENCES stay_pos_transactions(id)
);

ALTER TABLE stay_payments ADD COLUMN IF NOT EXISTS pos_transaction_id UUID REFERENCES stay_pos_transactions(id);
ALTER TABLE stay_payments ADD COLUMN IF NOT EXISTS pos_payment_id UUID REFERENCES stay_pos_transaction_payments(id);

ALTER TABLE stay_tenants ADD COLUMN IF NOT EXISTS min_deposit_percent NUMERIC(5,2) DEFAULT 50;
ALTER TABLE stay_tenants ADD COLUMN IF NOT EXISTS cancel_refund_percent NUMERIC(5,2) DEFAULT 50;
ALTER TABLE stay_room_types ADD COLUMN IF NOT EXISTS min_deposit_percent NUMERIC(5,2);

-- ==================== BANK & XENDIT CONFIG ====================

CREATE TABLE IF NOT EXISTS stay_tenant_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  purpose TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_tenant_xendit_config (
  tenant_id UUID PRIMARY KEY REFERENCES stay_tenants(id) ON DELETE CASCADE,
  api_key_encrypted TEXT,
  callback_token TEXT,
  mode TEXT DEFAULT 'sandbox' CHECK (mode IN ('sandbox', 'production')),
  fee_config JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_xendit_webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES stay_tenants(id),
  event_type TEXT NOT NULL,
  external_id TEXT,
  raw_payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_xendit_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  balance_type TEXT NOT NULL CHECK (balance_type IN ('available', 'pending', 'fee', 'withdrawal')),
  amount NUMERIC(14,2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_xendit_disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  fee NUMERIC(14,2) DEFAULT 0,
  bank_account_id UUID REFERENCES stay_tenant_bank_accounts(id),
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  requested_by UUID REFERENCES stay_users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== REFUNDS, RECEIPTS, CASH REGISTER ====================

CREATE TABLE IF NOT EXISTS stay_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  original_transaction_id UUID NOT NULL REFERENCES stay_pos_transactions(id),
  original_payment_id UUID REFERENCES stay_pos_transaction_payments(id),
  amount NUMERIC(14,2) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected', 'failed')),
  approved_by UUID REFERENCES stay_users(id),
  xendit_refund_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES stay_pos_transactions(id),
  receipt_number TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'thermal' CHECK (format IN ('thermal', 'pdf')),
  content_json JSONB,
  sent_via TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS stay_cash_register_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES stay_pos_sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('open', 'close', 'handover', 'variance', 'cash_in', 'cash_out')),
  amount NUMERIC(14,2),
  denomination JSONB,
  user_id UUID REFERENCES stay_users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_transaction_counters (
  tenant_id UUID PRIMARY KEY REFERENCES stay_tenants(id) ON DELETE CASCADE,
  year INT NOT NULL,
  counter INT NOT NULL DEFAULT 0,
  UNIQUE(tenant_id, year)
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_stay_pos_sessions_tenant ON stay_pos_sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_stay_pos_tx_tenant ON stay_pos_transactions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stay_pos_tx_booking ON stay_pos_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_stay_pos_tx_payments_tx ON stay_pos_transaction_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_stay_booking_charges_booking ON stay_booking_charges(booking_id);
CREATE INDEX IF NOT EXISTS idx_stay_xendit_webhooks_key ON stay_xendit_webhooks_log(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_stay_refunds_tx ON stay_refunds(original_transaction_id);

-- ==================== RLS ====================

ALTER TABLE stay_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_pos_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_pos_transaction_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_booking_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_tenant_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_tenant_xendit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_xendit_webhooks_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_xendit_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_xendit_disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_cash_register_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_transaction_counters ENABLE ROW LEVEL SECURITY;

DO $rls$
BEGIN
  CREATE POLICY stay_payment_methods_tenant ON stay_payment_methods FOR ALL USING (tenant_id = stay_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$rls$;

DO $rls$ BEGIN CREATE POLICY stay_pos_sessions_tenant ON stay_pos_sessions FOR ALL USING (tenant_id = stay_current_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_pos_tx_tenant ON stay_pos_transactions FOR ALL USING (tenant_id = stay_current_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_pos_tx_items_tenant ON stay_pos_transaction_items FOR ALL USING (transaction_id IN (SELECT id FROM stay_pos_transactions WHERE tenant_id = stay_current_tenant_id())); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_pos_tx_payments_tenant ON stay_pos_transaction_payments FOR ALL USING (transaction_id IN (SELECT id FROM stay_pos_transactions WHERE tenant_id = stay_current_tenant_id())); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_booking_charges_tenant ON stay_booking_charges FOR ALL USING (tenant_id = stay_current_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_tenant_bank_accounts_tenant ON stay_tenant_bank_accounts FOR ALL USING (tenant_id = stay_current_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_xendit_config_tenant ON stay_tenant_xendit_config FOR ALL USING (tenant_id = stay_current_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_xendit_webhooks_tenant ON stay_xendit_webhooks_log FOR SELECT USING (tenant_id = stay_current_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_xendit_balance_tenant ON stay_xendit_balance_history FOR ALL USING (tenant_id = stay_current_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_xendit_disburse_tenant ON stay_xendit_disbursements FOR ALL USING (tenant_id = stay_current_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_refunds_tenant ON stay_refunds FOR ALL USING (tenant_id = stay_current_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_receipts_tenant ON stay_receipts FOR ALL USING (tenant_id = stay_current_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_cash_register_tenant ON stay_cash_register_logs FOR ALL USING (tenant_id = stay_current_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;
DO $rls$ BEGIN CREATE POLICY stay_tx_counters_tenant ON stay_transaction_counters FOR ALL USING (tenant_id = stay_current_tenant_id()); EXCEPTION WHEN duplicate_object THEN NULL; END; $rls$;

CREATE OR REPLACE FUNCTION stay_next_transaction_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_counter INT;
BEGIN
  INSERT INTO stay_transaction_counters (tenant_id, year, counter)
  VALUES (p_tenant_id, v_year, 1)
  ON CONFLICT (tenant_id, year) DO UPDATE SET counter = stay_transaction_counters.counter + 1
  RETURNING counter INTO v_counter;
  RETURN 'TRX-' || v_year || '-' || lpad(v_counter::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
