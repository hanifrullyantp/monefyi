-- Onboarding v2: diagnostic wizard + first week plan
BEGIN;

-- profiles: version flag (null = legacy undecided, '1' = old wizard, '2' = diagnostic)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_version text DEFAULT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_onboarding_version_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_onboarding_version_check
  CHECK (onboarding_version IS NULL OR onboarding_version IN ('1', '2'));

-- User diagnostic answers from onboarding v2
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  financial_problems text[] NOT NULL DEFAULT '{}',
  payday_day int CHECK (payday_day IS NULL OR (payday_day >= 1 AND payday_day <= 31)),
  payday_irregular boolean NOT NULL DEFAULT false,
  fixed_bills jsonb NOT NULL DEFAULT '[]'::jsonb,
  has_debt boolean NOT NULL DEFAULT false,
  debt_amount numeric,
  debt_name text,
  near_term_goal text,
  near_term_goal_custom text,
  monthly_income numeric,
  income_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user
  ON public.user_preferences (user_id);

-- 7-day first week plan + progress
CREATE TABLE IF NOT EXISTS public.first_week_plans (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_problems text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_week_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_preferences_self ON public.user_preferences;
CREATE POLICY user_preferences_self ON public.user_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS first_week_plans_self ON public.first_week_plans;
CREATE POLICY first_week_plans_self ON public.first_week_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Existing completed users stay on v1 — do not force re-onboarding
UPDATE public.profiles
SET onboarding_version = '1'
WHERE onboarding_completed = true
  AND (onboarding_version IS NULL OR onboarding_version = '');

COMMIT;
