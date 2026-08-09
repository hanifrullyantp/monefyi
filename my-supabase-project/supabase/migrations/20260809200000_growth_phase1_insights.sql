-- Growth Phase 1 Sprint 1: Smart insights + user habits
BEGIN;

CREATE TABLE IF NOT EXISTS public.insights_generated (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_key text NOT NULL,
  type text NOT NULL DEFAULT 'pattern'
    CHECK (type IN ('habit_detection', 'optimization', 'pattern', 'prediction', 'opportunity', 'trend', 'debt')),
  category_related text,
  title text NOT NULL,
  description text,
  data_json jsonb NOT NULL DEFAULT '{}',
  action_json jsonb NOT NULL DEFAULT '{}',
  priority smallint NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  impact_amount numeric(14, 2) DEFAULT 0,
  confidence smallint DEFAULT 70 CHECK (confidence >= 0 AND confidence <= 100),
  shown_at timestamptz,
  clicked_at timestamptz,
  dismissed_at timestamptz,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, insight_key)
);

CREATE TABLE IF NOT EXISTS public.user_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_type text NOT NULL DEFAULT 'frequency_based'
    CHECK (habit_type IN ('frequency_based', 'amount_based', 'time_based', 'merchant_based')),
  category text,
  merchant text,
  pattern_data_json jsonb NOT NULL DEFAULT '{}',
  detected_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by_user boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_insights_generated_user ON public.insights_generated (user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_generated_active ON public.insights_generated (user_id) WHERE dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_habits_user ON public.user_habits (user_id, active);

ALTER TABLE public.insights_generated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS insights_generated_self ON public.insights_generated;
CREATE POLICY insights_generated_self ON public.insights_generated
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_habits_self ON public.user_habits;
CREATE POLICY user_habits_self ON public.user_habits
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
