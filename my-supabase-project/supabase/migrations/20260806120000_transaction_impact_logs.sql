-- Transaction impact feedback logs (TASK 2.1)
BEGIN;

CREATE TABLE IF NOT EXISTS public.transaction_impact_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id text NOT NULL,
  impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tx_impact_user_created
  ON public.transaction_impact_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tx_impact_tx
  ON public.transaction_impact_logs (user_id, transaction_id);

ALTER TABLE public.transaction_impact_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tx_impact_logs_self ON public.transaction_impact_logs;
CREATE POLICY tx_impact_logs_self ON public.transaction_impact_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
