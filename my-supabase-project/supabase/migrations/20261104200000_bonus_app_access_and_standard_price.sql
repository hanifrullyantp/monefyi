-- Bonus mini apps: akses untuk pembeli Lifetime (monefyi) atau Estimator/Planner paid.
-- Harga Standard: list = promo Rp 93.000 (selaras checkout).

CREATE OR REPLACE FUNCTION public.user_has_bonus_app_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_product_entitlements e
    WHERE e.user_id = auth.uid()
      AND e.product = 'monefyi'
  )
  OR EXISTS (
    SELECT 1
    FROM public.planner_org_members pom
    INNER JOIN public.planner_org_subscriptions s ON s.org_id = pom.org_id
    WHERE pom.user_id = auth.uid()
      AND pom.status = 'active'
      AND (
        s.tier IN ('pro', 'enterprise')
        OR (
          s.tier = 'estimator'
          AND COALESCE(s.amount_paid, 0) > 0
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_bonus_app_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_bonus_app_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_bonus_app_access() TO service_role;

COMMENT ON FUNCTION public.user_has_bonus_app_access() IS
  'True jika user boleh membuka mini app bonus Lite (Lifetime monefyi atau Estimator/Planner berbayar).';

CREATE OR REPLACE FUNCTION public.get_estimator_standard_launch_promo()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  used int;
  lim int := 100;
  price int := 93000;
BEGIN
  SELECT count(*)::int INTO used
  FROM (
    SELECT DISTINCT org_id
    FROM lynk_orders
    WHERE product = 'estimator_standard'
      AND org_id IS NOT NULL
  ) distinct_orgs;

  RETURN jsonb_build_object(
    'used', used,
    'limit', lim,
    'remaining', greatest(0, lim - used),
    'promoActive', used < lim,
    'promoPrice', price,
    'listPrice', price
  );
END;
$$;

-- Patch activate_subscription default credit to Rp 93.000
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
    estimator_credit_amount,
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
    CASE WHEN p_tier = 'estimator' AND p_amount > 0 THEN p_amount ELSE 93000 END,
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
    estimator_credit_amount = CASE
      WHEN EXCLUDED.tier = 'estimator' AND EXCLUDED.amount_paid > 0 THEN EXCLUDED.amount_paid
      ELSE planner_org_subscriptions.estimator_credit_amount
    END,
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
