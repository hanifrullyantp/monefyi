-- Finance V2 Phase 3: amortization / depreciation tracking

ALTER TABLE planner_prepaid_items
  ADD COLUMN IF NOT EXISTS last_amortized_date date;

ALTER TABLE planner_fixed_assets
  ADD COLUMN IF NOT EXISTS last_depreciation_month text;

-- Server-side amortization helper (callable from edge cron)
CREATE OR REPLACE FUNCTION public.planner_finance_daily_amortize()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_days int;
  v_daily numeric(15,2);
  v_amt numeric(15,2);
  v_prabayar uuid;
  v_laba uuid;
  v_journal uuid;
  v_count int := 0;
  v_today date := CURRENT_DATE;
BEGIN
  FOR r IN
    SELECT p.*
    FROM planner_prepaid_items p
    WHERE p.remaining_value > 0
      AND p.start_date <= v_today
      AND p.end_date >= v_today
      AND (p.last_amortized_date IS NULL OR p.last_amortized_date < v_today)
  LOOP
    v_days := GREATEST(1, (r.end_date - GREATEST(r.start_date, COALESCE(r.last_amortized_date, r.start_date - 1))));
    v_daily := ROUND(r.remaining_value / v_days, 2);
    v_amt := LEAST(v_daily, r.remaining_value);
    IF v_amt <= 0 THEN CONTINUE; END IF;

    SELECT id INTO v_prabayar FROM planner_finance_accounts
      WHERE org_id = r.org_id AND type = 'prabayar' AND is_system = true LIMIT 1;
    SELECT id INTO v_laba FROM planner_finance_accounts
      WHERE org_id = r.org_id AND type = 'laba' AND is_system = true LIMIT 1;

    IF v_prabayar IS NULL OR v_laba IS NULL THEN CONTINUE; END IF;

    INSERT INTO planner_journal_entries (org_id, entry_date, description, reference_type, reference_id, total_amount)
    VALUES (r.org_id, v_today, 'Amortisasi: ' || r.name, 'amortize', r.id, v_amt)
    RETURNING id INTO v_journal;

    INSERT INTO planner_journal_lines (journal_id, account_id, debit, credit) VALUES
      (v_journal, v_laba, v_amt, 0),
      (v_journal, v_prabayar, 0, v_amt);

    -- pasiva debit + aktiva credit both reduce balance
    UPDATE planner_finance_accounts SET current_balance = current_balance - v_amt, updated_at = now()
      WHERE id IN (v_laba, v_prabayar);

    UPDATE planner_prepaid_items
    SET remaining_value = GREATEST(0, remaining_value - v_amt), last_amortized_date = v_today
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('amortized', v_count, 'date', v_today);
END;
$$;

REVOKE ALL ON FUNCTION public.planner_finance_daily_amortize() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_finance_daily_amortize() TO service_role;
