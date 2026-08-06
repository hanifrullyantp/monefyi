-- Phase 3 engagement: streak achievements, weekly check-ins, home view mode
BEGIN;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS home_view_mode text NOT NULL DEFAULT 'auto';

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_home_view_mode_check;

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_home_view_mode_check
  CHECK (home_view_mode IN ('auto', 'simple', 'full'));

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  shown_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_type
  ON public.user_achievements (user_id, achievement_type, shown_at DESC);

CREATE TABLE IF NOT EXISTS public.weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'heuristic',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_checkins_user
  ON public.weekly_checkins (user_id, week_start DESC);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_achievements_self ON public.user_achievements;
CREATE POLICY user_achievements_self ON public.user_achievements
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS weekly_checkins_self ON public.weekly_checkins;
CREATE POLICY weekly_checkins_self ON public.weekly_checkins
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
