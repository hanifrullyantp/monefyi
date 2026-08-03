-- STAY Finance extensions: cash register sessions + journal RPC helper

CREATE TABLE IF NOT EXISTS stay_cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  shift_name TEXT NOT NULL DEFAULT 'Shift 1',
  opened_by UUID REFERENCES stay_users(id),
  closed_by UUID REFERENCES stay_users(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(15,2),
  expected_balance NUMERIC(15,2),
  variance NUMERIC(15,2),
  total_in NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_out NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stay_register_tenant ON stay_cash_register_sessions(tenant_id, status);

ALTER TABLE stay_cash_register_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY stay_register_tenant ON stay_cash_register_sessions FOR ALL USING (tenant_id = stay_current_tenant_id());

-- RPC: seed chart of accounts for tenant (callable from client)
CREATE OR REPLACE FUNCTION stay_seed_finance_for_tenant(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM stay_seed_default_chart_of_accounts(p_tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: post balanced journal entry server-side (used by Xendit webhook)
CREATE OR REPLACE FUNCTION stay_post_journal(
  p_tenant_id UUID,
  p_entry_number TEXT,
  p_entry_date DATE,
  p_description TEXT,
  p_source TEXT,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_lines JSONB
)
RETURNS UUID AS $$
DECLARE
  v_journal_id UUID;
  v_line JSONB;
  v_account_id UUID;
  v_debit NUMERIC(15,2);
  v_credit NUMERIC(15,2);
  v_total_debit NUMERIC(15,2) := 0;
  v_total_credit NUMERIC(15,2) := 0;
  v_account_type TEXT;
  v_delta NUMERIC(15,2);
BEGIN
  -- Validate balance
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::NUMERIC, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::NUMERIC, 0);
  END LOOP;

  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal not balanced: debit % != credit %', v_total_debit, v_total_credit;
  END IF;

  INSERT INTO stay_journal_entries (
    tenant_id, entry_number, entry_date, description, source,
    reference_type, reference_id, status, total_amount
  ) VALUES (
    p_tenant_id, p_entry_number, p_entry_date, p_description, p_source,
    p_reference_type, p_reference_id, 'posted', v_total_debit
  ) RETURNING id INTO v_journal_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_account_id := (v_line->>'account_id')::UUID;
    v_debit := COALESCE((v_line->>'debit')::NUMERIC, 0);
    v_credit := COALESCE((v_line->>'credit')::NUMERIC, 0);

    INSERT INTO stay_journal_entry_lines (journal_id, account_id, debit, credit, notes)
    VALUES (v_journal_id, v_account_id, v_debit, v_credit, v_line->>'notes');

    SELECT account_type INTO v_account_type FROM stay_chart_of_accounts WHERE id = v_account_id;

    IF v_account_type IN ('aktiva', 'beban') THEN
      v_delta := v_debit - v_credit;
    ELSE
      v_delta := v_credit - v_debit;
    END IF;

    UPDATE stay_chart_of_accounts
    SET current_balance = current_balance + v_delta, updated_at = now()
    WHERE id = v_account_id;
  END LOOP;

  -- Roll P&L into laba periode berjalan (3105)
  UPDATE stay_chart_of_accounts coa
  SET current_balance = coa.current_balance + COALESCE(delta.net, 0), updated_at = now()
  FROM (
    SELECT SUM(
      CASE
        WHEN a.account_type = 'pendapatan' THEN (l.credit - l.debit)
        WHEN a.account_type = 'beban' THEN -(l.debit - l.credit)
        ELSE 0
      END
    ) AS net
    FROM stay_journal_entry_lines l
    JOIN stay_chart_of_accounts a ON a.id = l.account_id
    WHERE l.journal_id = v_journal_id AND a.account_type IN ('pendapatan', 'beban')
  ) delta
  WHERE coa.tenant_id = p_tenant_id AND coa.code = '3105';

  RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
