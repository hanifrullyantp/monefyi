-- User financial condition for contextual notifications (TASK 4.2)
BEGIN;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS financial_condition text;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS financial_condition_updated_at timestamptz;

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_financial_condition_check;

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_financial_condition_check
  CHECK (financial_condition IS NULL OR financial_condition IN ('aman', 'waspada', 'bahaya', 'incomplete'));

COMMIT;
