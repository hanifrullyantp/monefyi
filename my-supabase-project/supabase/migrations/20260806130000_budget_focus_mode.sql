-- Budget focus mode (TASK 2.3)
BEGIN;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS budget_focus_mode text NOT NULL DEFAULT 'survive';

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_budget_focus_mode_check;

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_budget_focus_mode_check
  CHECK (budget_focus_mode IN ('survive', 'debt', 'emergency', 'irregular', 'family'));

COMMIT;
