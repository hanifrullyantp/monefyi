-- Sprint 6: Beta feedback flag seed
BEGIN;

INSERT INTO public.feature_flags (key, name, description, enabled, rollout_pct, status) VALUES
  ('beta_feedback', 'Beta Feedback Banner', 'Show beta tester banner on home dashboard', false, 0, 'testing')
ON CONFLICT (key) DO NOTHING;

COMMIT;
