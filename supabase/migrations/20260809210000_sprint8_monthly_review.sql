-- Growth Sprint 8: Monthly review journal sync
BEGIN;

CREATE TABLE IF NOT EXISTS public.monthly_review_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL,
  proud text,
  improve text,
  surprise text,
  allocation_choice text,
  allocation_note text,
  intentions jsonb NOT NULL DEFAULT '[]',
  patterns jsonb NOT NULL DEFAULT '[]',
  content_json jsonb NOT NULL DEFAULT '{}',
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_monthly_review_user ON public.monthly_review_entries (user_id, period DESC);

ALTER TABLE public.monthly_review_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS monthly_review_self ON public.monthly_review_entries;
CREATE POLICY monthly_review_self ON public.monthly_review_entries
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
