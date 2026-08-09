-- Growth advanced: live cohort stats RPC + buddy message read + forum reports
BEGIN;

CREATE OR REPLACE FUNCTION public.get_benchmark_cohort_stats(
  p_income_bracket text,
  p_month text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'sample_size', COUNT(*)::int,
    'saving_rate', COALESCE(
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY saving_rate))::int,
      0
    ),
    'food_pct', COALESCE(
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (category_distribution_json->>'food_pct')::numeric))::int,
      0
    ),
    'transport_pct', COALESCE(
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (category_distribution_json->>'transport_pct')::numeric))::int,
      0
    )
  )
  FROM public.user_benchmark_snapshots
  WHERE income_bracket = p_income_bracket
    AND month = p_month;
$$;

GRANT EXECUTE ON FUNCTION public.get_benchmark_cohort_stats(text, text) TO authenticated;

DROP POLICY IF EXISTS buddy_messages_pair ON public.buddy_messages;
DROP POLICY IF EXISTS buddy_messages_read ON public.buddy_messages;
DROP POLICY IF EXISTS buddy_messages_insert ON public.buddy_messages;

CREATE POLICY buddy_messages_read ON public.buddy_messages
  FOR SELECT TO authenticated
  USING (
    sender_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.buddy_pairs bp
      WHERE bp.id = pair_id AND bp.buddy_user_id = auth.uid()
    )
  );

CREATE POLICY buddy_messages_insert ON public.buddy_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.buddy_pairs bp
      WHERE bp.id = pair_id AND bp.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.community_content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('question', 'answer')),
  content_id text NOT NULL,
  reason text CHECK (char_length(reason) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_reports_content
  ON public.community_content_reports (content_type, content_id);

ALTER TABLE public.community_content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_reports_self ON public.community_content_reports;
CREATE POLICY community_reports_self ON public.community_content_reports
  FOR ALL TO authenticated
  USING (reporter_user_id = auth.uid())
  WITH CHECK (reporter_user_id = auth.uid());

COMMIT;
