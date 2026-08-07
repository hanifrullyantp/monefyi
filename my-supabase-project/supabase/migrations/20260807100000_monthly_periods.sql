-- Monthly periods + account opening balances for Monefyi PWA
-- Period-boundary cash flow + monthly closing ritual

BEGIN;

CREATE TABLE IF NOT EXISTS public.monthly_periods (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period              text NOT NULL,
  opening_balance     numeric NOT NULL DEFAULT 0,
  total_income        numeric NOT NULL DEFAULT 0,
  total_expense       numeric NOT NULL DEFAULT 0,
  closing_balance     numeric NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed')),
  closed_at           timestamptz,
  carry_over_allocated jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_monthly_periods_user_status
  ON public.monthly_periods (user_id, status);

CREATE TABLE IF NOT EXISTS public.account_opening_balances (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name  text NOT NULL,
  as_of_date    date NOT NULL DEFAULT CURRENT_DATE,
  amount        numeric NOT NULL DEFAULT 0,
  source        text NOT NULL DEFAULT 'onboarding'
    CHECK (source IN ('onboarding', 'manual', 'rebuild', 'closing')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_name, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_account_opening_balances_user
  ON public.account_opening_balances (user_id, account_name);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS period text;

CREATE INDEX IF NOT EXISTS idx_transactions_user_period
  ON public.transactions (user_id, period)
  WHERE period IS NOT NULL;

ALTER TABLE public.monthly_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_opening_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own monthly periods" ON public.monthly_periods;
CREATE POLICY "Users manage own monthly periods" ON public.monthly_periods
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own opening balances" ON public.account_opening_balances;
CREATE POLICY "Users manage own opening balances" ON public.account_opening_balances
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMIT;
