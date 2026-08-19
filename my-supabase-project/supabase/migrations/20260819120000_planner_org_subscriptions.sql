-- Estimator Phase 5: org subscription tiers & checkout activation

CREATE TABLE IF NOT EXISTS planner_org_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,

  tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'estimator', 'pro', 'enterprise')),

  payment_provider TEXT,
  external_payment_id TEXT,
  amount_paid BIGINT,
  currency TEXT NOT NULL DEFAULT 'IDR',

  purchased_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  estimator_credit_available BOOLEAN NOT NULL DEFAULT false,
  estimator_credit_used_at TIMESTAMPTZ,
  estimator_credit_amount BIGINT NOT NULL DEFAULT 99000,

  max_active_projects INT NOT NULL DEFAULT 0,
  max_members INT NOT NULL DEFAULT 1,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT planner_org_subscriptions_org_unique UNIQUE (org_id)
);

CREATE INDEX IF NOT EXISTS idx_planner_org_subscriptions_org
  ON planner_org_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_planner_org_subscriptions_tier
  ON planner_org_subscriptions(tier);

CREATE OR REPLACE FUNCTION public.set_planner_subscription_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  CASE NEW.tier
    WHEN 'free' THEN
      NEW.max_active_projects := 0;
      NEW.max_members := 1;
    WHEN 'estimator' THEN
      NEW.max_active_projects := 1;
      NEW.max_members := 1;
      IF TG_OP = 'INSERT' OR (OLD.tier IS DISTINCT FROM 'estimator') THEN
        NEW.estimator_credit_available := true;
      END IF;
    WHEN 'pro' THEN
      NEW.max_active_projects := 10;
      NEW.max_members := 5;
    WHEN 'enterprise' THEN
      NEW.max_active_projects := 999;
      NEW.max_members := 20;
  END CASE;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_planner_subscription_limits ON planner_org_subscriptions;
CREATE TRIGGER trg_set_planner_subscription_limits
BEFORE INSERT OR UPDATE OF tier ON planner_org_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_planner_subscription_limits();

ALTER TABLE planner_org_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_org_subscriptions_select ON planner_org_subscriptions;
CREATE POLICY planner_org_subscriptions_select ON planner_org_subscriptions
FOR SELECT USING (
  org_id IN (
    SELECT org_id FROM planner_org_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_org_id UUID,
  p_tier TEXT,
  p_payment_provider TEXT,
  p_external_payment_id TEXT,
  p_amount BIGINT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS planner_org_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row planner_org_subscriptions;
  v_had_credit BOOLEAN := false;
BEGIN
  IF p_tier NOT IN ('free', 'estimator', 'pro', 'enterprise') THEN
    RAISE EXCEPTION 'Tier tidak valid';
  END IF;

  SELECT estimator_credit_available INTO v_had_credit
  FROM planner_org_subscriptions
  WHERE org_id = p_org_id;

  INSERT INTO planner_org_subscriptions (
    org_id,
    tier,
    payment_provider,
    external_payment_id,
    amount_paid,
    purchased_at,
    activated_at,
    expires_at,
    estimator_credit_used_at
  ) VALUES (
    p_org_id,
    p_tier,
    p_payment_provider,
    p_external_payment_id,
    p_amount,
    now(),
    now(),
    p_expires_at,
    CASE
      WHEN p_tier IN ('pro', 'enterprise') AND COALESCE(v_had_credit, false) THEN now()
      ELSE NULL
    END
  )
  ON CONFLICT (org_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    payment_provider = EXCLUDED.payment_provider,
    external_payment_id = EXCLUDED.external_payment_id,
    amount_paid = EXCLUDED.amount_paid,
    purchased_at = EXCLUDED.purchased_at,
    activated_at = EXCLUDED.activated_at,
    expires_at = EXCLUDED.expires_at,
    estimator_credit_available = CASE
      WHEN EXCLUDED.tier = 'estimator' THEN true
      WHEN EXCLUDED.tier IN ('pro', 'enterprise') THEN false
      ELSE planner_org_subscriptions.estimator_credit_available
    END,
    estimator_credit_used_at = CASE
      WHEN EXCLUDED.tier IN ('pro', 'enterprise')
        AND planner_org_subscriptions.estimator_credit_available
      THEN COALESCE(planner_org_subscriptions.estimator_credit_used_at, now())
      ELSE planner_org_subscriptions.estimator_credit_used_at
    END,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_subscription(UUID, TEXT, TEXT, TEXT, BIGINT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, TEXT, TEXT, BIGINT, TIMESTAMPTZ) TO service_role;

-- Grandfather orgs that already have estimations
INSERT INTO planner_org_subscriptions (
  org_id, tier, payment_provider, purchased_at, activated_at
)
SELECT DISTINCT e.org_id, 'estimator', 'grandfather', now(), now()
FROM planner_estimations e
WHERE NOT EXISTS (
  SELECT 1 FROM planner_org_subscriptions s WHERE s.org_id = e.org_id
)
ON CONFLICT (org_id) DO NOTHING;
