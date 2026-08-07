-- Daily financial situation snapshots (Hero Card history)
BEGIN;

CREATE TABLE IF NOT EXISTS public.daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  safe_to_spend numeric,
  runway_days numeric,
  days_to_payday int,
  predicted_end_balance numeric,
  status text CHECK (status IS NULL OR status IN ('aman', 'waspada', 'bahaya', 'incomplete')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_user_date
  ON public.daily_snapshots (user_id, snapshot_date DESC);

ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_snapshots_self ON public.daily_snapshots;
CREATE POLICY daily_snapshots_self ON public.daily_snapshots
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
