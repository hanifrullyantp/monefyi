-- Financial goals — full goal tracker (Fase 2.3)
BEGIN;

CREATE TABLE IF NOT EXISTS public.financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT '🎯',
  color text DEFAULT '#10b981',
  target_amount numeric NOT NULL CHECK (target_amount > 0),
  current_amount numeric NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date date,
  priority smallint NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused')),
  linked_category_id text,
  monthly_contribution numeric CHECK (monthly_contribution IS NULL OR monthly_contribution >= 0),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_goals_user
  ON public.financial_goals (user_id);

CREATE INDEX IF NOT EXISTS idx_financial_goals_status
  ON public.financial_goals (user_id, status);

ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_goals_self ON public.financial_goals;
CREATE POLICY financial_goals_self ON public.financial_goals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
