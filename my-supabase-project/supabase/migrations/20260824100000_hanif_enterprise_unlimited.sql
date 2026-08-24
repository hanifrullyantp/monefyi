-- Platform admin hanif: enterprise + estimator pro + tanpa batas proyek

UPDATE profiles
SET role = 'admin', plan_type = 'lifetime', updated_at = now()
WHERE lower(email) = lower('hanif.rullyant@gmail.com');

UPDATE user_plans
SET ai_daily_limit = 999, updated_at = now()
WHERE user_id IN (
  SELECT id FROM auth.users WHERE lower(email) = lower('hanif.rullyant@gmail.com')
);

DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower('hanif.rullyant@gmail.com');
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User hanif.rullyant@gmail.com not found — skip org subscription';
    RETURN;
  END IF;

  SELECT om.org_id INTO v_org_id
  FROM planner_org_members om
  WHERE om.user_id = v_user_id AND om.status = 'active'
  ORDER BY om.created_at ASC
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No active org for hanif — skip subscription';
    RETURN;
  END IF;

  UPDATE planner_organizations
  SET plan_type = 'enterprise', updated_at = now()
  WHERE id = v_org_id;

  INSERT INTO planner_org_subscriptions (
    org_id,
    tier,
    estimator_variant,
    max_active_projects,
    max_members,
    activated_at,
    metadata
  )
  VALUES (
    v_org_id,
    'enterprise',
    'pro',
    999,
    999,
    now(),
    '{"platform_admin":true,"unlimited":true}'::jsonb
  )
  ON CONFLICT (org_id) DO UPDATE SET
    tier = 'enterprise',
    estimator_variant = 'pro',
    max_active_projects = 999,
    max_members = 999,
    activated_at = COALESCE(planner_org_subscriptions.activated_at, now()),
    metadata = planner_org_subscriptions.metadata || '{"platform_admin":true,"unlimited":true}'::jsonb,
    updated_at = now();
END $$;
