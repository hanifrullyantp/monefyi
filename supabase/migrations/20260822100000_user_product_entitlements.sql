-- Per-product registration: monefyi | planner | stay
-- Shared auth.users; each app requires an explicit entitlement row.
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_product_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product text NOT NULL CHECK (product IN ('monefyi', 'planner', 'stay')),
  source text NOT NULL DEFAULT 'registration',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product)
);

CREATE INDEX IF NOT EXISTS idx_user_product_entitlements_user
  ON public.user_product_entitlements (user_id);

CREATE INDEX IF NOT EXISTS idx_user_product_entitlements_product
  ON public.user_product_entitlements (product);

ALTER TABLE public.user_product_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_product_entitlements_self_select ON public.user_product_entitlements;
CREATE POLICY user_product_entitlements_self_select ON public.user_product_entitlements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.user_has_product(p_product text)
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
      AND e.product = p_product
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_product(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_product(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_product(text) TO service_role;

CREATE OR REPLACE FUNCTION public.grant_product_entitlement(
  p_user_id uuid,
  p_product text,
  p_source text DEFAULT 'registration',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_product NOT IN ('monefyi', 'planner', 'stay') THEN
    RAISE EXCEPTION 'invalid product: %', p_product;
  END IF;

  INSERT INTO public.user_product_entitlements (user_id, product, source, metadata)
  VALUES (p_user_id, p_product, COALESCE(NULLIF(trim(p_source), ''), 'registration'), COALESCE(p_metadata, '{}'::jsonb))
  ON CONFLICT (user_id, product) DO UPDATE SET
    source = EXCLUDED.source,
    metadata = public.user_product_entitlements.metadata || EXCLUDED.metadata,
    granted_at = CASE
      WHEN public.user_product_entitlements.granted_at IS NULL THEN EXCLUDED.granted_at
      ELSE public.user_product_entitlements.granted_at
    END;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_product_entitlement(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_product_entitlement(uuid, text, text, jsonb) TO service_role;

-- Backfill existing product users (do not grant from profiles alone — auto-created on cross-app login)
INSERT INTO public.user_product_entitlements (user_id, product, source)
SELECT DISTINCT up.user_id, 'monefyi', 'migration'
FROM public.user_plans up
WHERE up.user_id IS NOT NULL
ON CONFLICT (user_id, product) DO NOTHING;

INSERT INTO public.user_product_entitlements (user_id, product, source)
SELECT DISTINCT pom.user_id, 'planner', 'migration'
FROM public.planner_org_members pom
WHERE pom.user_id IS NOT NULL
  AND pom.status = 'active'
ON CONFLICT (user_id, product) DO NOTHING;

INSERT INTO public.user_product_entitlements (user_id, product, source)
SELECT DISTINCT su.auth_user_id, 'stay', 'migration'
FROM public.stay_users su
WHERE su.auth_user_id IS NOT NULL
ON CONFLICT (user_id, product) DO NOTHING;

COMMIT;
