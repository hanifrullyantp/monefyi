-- Admin Testing Lab: test users, scenarios, impersonation sessions

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_test_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_scenario_label text;

CREATE INDEX IF NOT EXISTS idx_profiles_is_test_user
  ON public.profiles (is_test_user) WHERE is_test_user = true;

CREATE TABLE IF NOT EXISTS public.test_scenarios (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  description         text,
  kind                text NOT NULL DEFAULT 'custom'
    CHECK (kind IN ('preset', 'custom')),
  preset_key          text,
  config              jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_values     jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_month       text,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_scenarios_kind ON public.test_scenarios (kind);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_preset ON public.test_scenarios (preset_key) WHERE preset_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.admin_test_sessions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id             uuid REFERENCES public.test_scenarios(id) ON DELETE SET NULL,
  status                  text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'ended')),
  expires_at              timestamptz NOT NULL,
  verification_snapshot   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  ended_at                timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_test_sessions_admin
  ON public.admin_test_sessions (admin_user_id, status);
CREATE INDEX IF NOT EXISTS idx_admin_test_sessions_test_user
  ON public.admin_test_sessions (test_user_id, status);

ALTER TABLE public.test_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_test_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage test scenarios" ON public.test_scenarios;
CREATE POLICY "Admins manage test scenarios" ON public.test_scenarios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND lower(p.role) = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND lower(p.role) = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins manage test sessions" ON public.admin_test_sessions;
CREATE POLICY "Admins manage test sessions" ON public.admin_test_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND lower(p.role) = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND lower(p.role) = 'admin'
    )
  );

-- Seed preset scenario metadata (fixtures loaded by edge/CLI)
INSERT INTO public.test_scenarios (name, description, kind, preset_key, config, expected_values, default_month)
SELECT * FROM (VALUES
  (
    'Accuracy 8jt (4 bulan + HP)'::text,
    'Persona accuracy test Mei–Agu 2026, HP 7.988jt pending'::text,
    'preset'::text,
    'accuracy-4month'::text,
    '{"monthlyIncome":8000000,"paydayDay":25,"months":["2026-05","2026-06","2026-07","2026-08"]}'::jsonb,
    '{}'::jsonb,
    '2026-08'::text
  ),
  (
    'Demo August 5jt'::text,
    'Persona demo Agustus 2026 minggu 1'::text,
    'preset'::text,
    'demo-august'::text,
    '{"monthlyIncome":5000000,"paydayDay":25,"months":["2026-08"]}'::jsonb,
    '{}'::jsonb,
    '2026-08'::text
  )
) AS v(name, description, kind, preset_key, config, expected_values, default_month)
WHERE NOT EXISTS (SELECT 1 FROM public.test_scenarios ts WHERE ts.preset_key = v.preset_key);

-- Feature flag for admin test lab
INSERT INTO public.feature_flags (key, name, enabled, status, rollout_pct, description)
SELECT 'admin_test_lab', 'Admin Testing Lab', true, 'beta', 100, 'Impersonate test users in app'
WHERE NOT EXISTS (SELECT 1 FROM public.feature_flags WHERE key = 'admin_test_lab');

COMMIT;
