-- Planner Lynk.id integration: estimator variant, order tracking, webhook product line

ALTER TABLE public.planner_org_subscriptions
  ADD COLUMN IF NOT EXISTS estimator_variant TEXT
    CHECK (estimator_variant IS NULL OR estimator_variant IN ('standard', 'pro'));

ALTER TABLE public.lynk_webhook_events
  ADD COLUMN IF NOT EXISTS product_line TEXT DEFAULT 'finance';

ALTER TABLE public.lynk_orders
  ADD COLUMN IF NOT EXISTS product_line TEXT,
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES planner_organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product TEXT,
  ADD COLUMN IF NOT EXISTS plan_type TEXT;

CREATE INDEX IF NOT EXISTS idx_lynk_orders_org_id ON public.lynk_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_lynk_orders_product_line ON public.lynk_orders(product_line);

DROP FUNCTION IF EXISTS public.activate_subscription(UUID, TEXT, TEXT, TEXT, BIGINT, TIMESTAMPTZ);

-- Extend activate_subscription to persist estimator variant in metadata + column
CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_org_id UUID,
  p_tier TEXT,
  p_payment_provider TEXT,
  p_external_payment_id TEXT,
  p_amount BIGINT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_estimator_variant TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS planner_org_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row planner_org_subscriptions;
  v_had_credit BOOLEAN := false;
  v_variant TEXT;
BEGIN
  IF p_tier NOT IN ('free', 'estimator', 'pro', 'enterprise') THEN
    RAISE EXCEPTION 'Tier tidak valid';
  END IF;

  v_variant := CASE
    WHEN p_estimator_variant IN ('standard', 'pro') THEN p_estimator_variant
    ELSE NULL
  END;

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
    estimator_variant,
    metadata,
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
    v_variant,
    COALESCE(p_metadata, '{}'::jsonb),
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
    estimator_variant = COALESCE(EXCLUDED.estimator_variant, planner_org_subscriptions.estimator_variant),
    metadata = planner_org_subscriptions.metadata || EXCLUDED.metadata,
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

REVOKE ALL ON FUNCTION public.activate_subscription(UUID, TEXT, TEXT, TEXT, BIGINT, TIMESTAMPTZ, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, TEXT, TEXT, BIGINT, TIMESTAMPTZ, TEXT, JSONB) TO service_role;
