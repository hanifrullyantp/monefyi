-- Admin test run history + expanded preset scenario seeds
BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_test_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_label  text,
  preset_key      text,
  pass_count      int NOT NULL DEFAULT 0,
  fail_count      int NOT NULL DEFAULT 0,
  total_count     int NOT NULL DEFAULT 0,
  result_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_test_runs_created
  ON public.admin_test_runs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_test_runs_admin
  ON public.admin_test_runs (admin_user_id, created_at DESC);

ALTER TABLE public.admin_test_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage test runs" ON public.admin_test_runs;
CREATE POLICY "Admins manage test runs" ON public.admin_test_runs
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

-- Preset metadata (bundle generated at runtime by edge function)
INSERT INTO public.test_scenarios (name, description, kind, preset_key, config, expected_values, default_month)
SELECT * FROM (VALUES
  ('Bulan Normal (On Track)'::text, 'Income 8jt, expense ~5.5jt, saving ~31%'::text, 'preset'::text, 'bulan-normal'::text, '{"monthlyIncome":8000000,"paydayDay":25,"months":["2026-08"],"expenseMultiplier":1,"includeHpAnomaly":false}'::jsonb, '{}'::jsonb, '2026-08'::text),
  ('Bulan Awal (Beginner)'::text, 'Income 5jt, pengeluaran ringan'::text, 'preset'::text, 'bulan-awal'::text, '{"monthlyIncome":5000000,"paydayDay":25,"months":["2026-08"],"expenseMultiplier":0.65,"includeHpAnomaly":false}'::jsonb, '{}'::jsonb, '2026-08'::text),
  ('Bulan Waspada (Over Budget)'::text, 'Expense > budget, beberapa kategori over'::text, 'preset'::text, 'bulan-waspada'::text, '{"monthlyIncome":8000000,"paydayDay":25,"months":["2026-08"],"expenseMultiplier":1.35,"includeHpAnomaly":false}'::jsonb, '{}'::jsonb, '2026-08'::text),
  ('Bulan Krisis (Cash Flow Negative)'::text, 'Expense > income, emergency mode'::text, 'preset'::text, 'bulan-krisis'::text, '{"monthlyIncome":5000000,"paydayDay":25,"months":["2026-08"],"expenseMultiplier":1.6,"includeHpAnomaly":false}'::jsonb, '{}'::jsonb, '2026-08'::text),
  ('Bulan Bonus (Surplus)'::text, 'Income 12jt bonus, expense normal'::text, 'preset'::text, 'bulan-bonus'::text, '{"monthlyIncome":12000000,"paydayDay":25,"months":["2026-08"],"expenseMultiplier":0.7,"includeHpAnomaly":false}'::jsonb, '{}'::jsonb, '2026-08'::text),
  ('Anomaly HP Pending'::text, 'Beli HP besar pending classification'::text, 'preset'::text, 'anomaly-hp'::text, '{"monthlyIncome":8000000,"paydayDay":25,"months":["2026-08"],"expenseMultiplier":0.7,"includeHpAnomaly":true,"hpAmount":7988000}'::jsonb, '{}'::jsonb, '2026-08'::text),
  ('Debt Heavy'::text, 'Multiple active debts'::text, 'preset'::text, 'debt-heavy'::text, '{"monthlyIncome":8000000,"paydayDay":25,"months":["2026-08"],"expenseMultiplier":0.85,"includeDebts":true}'::jsonb, '{}'::jsonb, '2026-08'::text),
  ('Multi-Goals'::text, '4 financial goals active'::text, 'preset'::text, 'multi-goals'::text, '{"monthlyIncome":8000000,"paydayDay":25,"months":["2026-08"],"expenseMultiplier":0.8,"includeGoals":true}'::jsonb, '{}'::jsonb, '2026-08'::text),
  ('Empty State'::text, 'No transactions — onboarding UX'::text, 'preset'::text, 'empty-state'::text, '{"empty":true}'::jsonb, '{}'::jsonb, '2026-08'::text),
  ('3 Months History'::text, 'Mei–Agu trend data'::text, 'preset'::text, '3-month-history'::text, '{"monthlyIncome":8000000,"paydayDay":25,"months":["2026-06","2026-07","2026-08"],"expenseMultiplier":0.9,"includeHpAnomaly":false,"incomeEveryMonth":true}'::jsonb, '{}'::jsonb, '2026-08'::text)
) AS v(name, description, kind, preset_key, config, expected_values, default_month)
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_scenarios ts WHERE ts.preset_key = v.preset_key AND ts.kind = 'preset'
);

COMMIT;
