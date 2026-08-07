-- Financial targets (TASK 2.4)
BEGIN;

CREATE TABLE IF NOT EXISTS public.financial_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric NOT NULL CHECK (target_amount > 0),
  current_amount numeric NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date date,
  monthly_contribution numeric CHECK (monthly_contribution IS NULL OR monthly_contribution >= 0),
  is_primary boolean NOT NULL DEFAULT false,
  category_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_targets_user
  ON public.financial_targets (user_id);

CREATE INDEX IF NOT EXISTS idx_financial_targets_primary
  ON public.financial_targets (user_id, is_primary)
  WHERE is_primary = true;

ALTER TABLE public.financial_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_targets_self ON public.financial_targets;
CREATE POLICY financial_targets_self ON public.financial_targets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
