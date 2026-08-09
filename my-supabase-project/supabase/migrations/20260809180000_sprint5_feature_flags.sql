-- Sprint 5: Feature flags DB + marketing test queue
BEGIN;

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  rollout_pct smallint NOT NULL DEFAULT 100 CHECK (rollout_pct >= 0 AND rollout_pct <= 100),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'beta', 'testing', 'off')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_flag_overrides (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_key text NOT NULL REFERENCES public.feature_flags(key) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, flag_key)
);

CREATE TABLE IF NOT EXISTS public.marketing_test_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.marketing_offers(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_marketing_test_offers_user ON public.marketing_test_offers (user_id, consumed_at);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_test_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_flags_read ON public.feature_flags;
CREATE POLICY feature_flags_read ON public.feature_flags
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS feature_flags_admin ON public.feature_flags;
CREATE POLICY feature_flags_admin ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS feature_flag_overrides_self ON public.feature_flag_overrides;
CREATE POLICY feature_flag_overrides_self ON public.feature_flag_overrides
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS feature_flag_overrides_admin ON public.feature_flag_overrides;
CREATE POLICY feature_flag_overrides_admin ON public.feature_flag_overrides
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS marketing_test_offers_self ON public.marketing_test_offers;
CREATE POLICY marketing_test_offers_self ON public.marketing_test_offers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS marketing_test_offers_admin ON public.marketing_test_offers;
CREATE POLICY marketing_test_offers_admin ON public.marketing_test_offers
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

INSERT INTO public.feature_flags (key, name, description, enabled, rollout_pct, status) VALUES
  ('household_mode', 'Household / Couple Mode', 'Shared finance & invite flow', true, 100, 'active'),
  ('weekly_ai_digest', 'Weekly AI Digest', 'Weekly recap & insights', true, 100, 'active'),
  ('debt_payoff_planner', 'Debt Payoff Planner', 'Snowball/avalanche planner', true, 100, 'active'),
  ('multiple_goals', 'Multiple Goals', 'More than one financial goal', true, 100, 'active'),
  ('in_app_marketing', 'In-App Marketing', 'Offer modals & banners', true, 100, 'active'),
  ('monthly_auto_report', 'Monthly Auto Report', 'Auto-generated monthly reports', true, 100, 'active'),
  ('neraca_advanced', 'Neraca Advanced', 'Full balance sheet features', true, 100, 'active'),
  ('ai_coach_pro', 'AI Coach Pro', 'Monevisor advanced coaching', true, 100, 'beta')
ON CONFLICT (key) DO NOTHING;

COMMIT;
