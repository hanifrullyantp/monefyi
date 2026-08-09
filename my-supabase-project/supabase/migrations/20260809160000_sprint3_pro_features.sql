-- Sprint 3: Pro+ features — weekly digests, debts, monthly reports
BEGIN;

CREATE TABLE IF NOT EXISTS public.weekly_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number smallint NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
  year smallint NOT NULL CHECK (year >= 2020 AND year <= 2100),
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  action_taken text,
  UNIQUE (user_id, year, week_number)
);

CREATE INDEX IF NOT EXISTS idx_weekly_digests_user ON public.weekly_digests (user_id, year DESC, week_number DESC);

CREATE TABLE IF NOT EXISTS public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  original_amount numeric NOT NULL DEFAULT 0 CHECK (original_amount >= 0),
  current_balance numeric NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  interest_rate numeric NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  minimum_payment numeric NOT NULL DEFAULT 0 CHECK (minimum_payment >= 0),
  due_date_day smallint CHECK (due_date_day IS NULL OR (due_date_day >= 1 AND due_date_day <= 31)),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'paused')),
  priority_order smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debts_user ON public.debts (user_id, status);

CREATE TABLE IF NOT EXISTS public.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_type text NOT NULL DEFAULT 'regular'
    CHECK (payment_type IN ('regular', 'extra', 'payoff')),
  transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON public.debt_payments (debt_id, payment_date DESC);

CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL,
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  health_score smallint CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
  generated_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  UNIQUE (user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_user ON public.monthly_reports (user_id, period DESC);

ALTER TABLE public.weekly_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_digests_self ON public.weekly_digests;
CREATE POLICY weekly_digests_self ON public.weekly_digests
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS debts_self ON public.debts;
CREATE POLICY debts_self ON public.debts
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS debt_payments_self ON public.debt_payments;
CREATE POLICY debt_payments_self ON public.debt_payments
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS monthly_reports_self ON public.monthly_reports;
CREATE POLICY monthly_reports_self ON public.monthly_reports
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMIT;
