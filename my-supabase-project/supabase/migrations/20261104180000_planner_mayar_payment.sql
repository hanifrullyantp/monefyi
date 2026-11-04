-- Mayar payment provider: checkout sessions + webhook idempotency

CREATE TABLE IF NOT EXISTS public.planner_checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('lynk', 'mayar')),
  external_id TEXT,
  org_id UUID REFERENCES public.planner_organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product TEXT NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS planner_checkout_sessions_provider_external_uniq
  ON public.planner_checkout_sessions (provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS planner_checkout_sessions_user_idx
  ON public.planner_checkout_sessions (user_id, created_at DESC);

ALTER TABLE public.planner_checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.mayar_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  ref_id TEXT,
  email TEXT,
  payload JSONB NOT NULL,
  product_line TEXT DEFAULT 'planner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mayar_webhook_events_message_id_uniq
  ON public.mayar_webhook_events (message_id)
  WHERE message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mayar_webhook_events_ref_id_uniq
  ON public.mayar_webhook_events (ref_id)
  WHERE ref_id IS NOT NULL;

ALTER TABLE public.mayar_webhook_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lynk_orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT;

UPDATE public.app_config
SET platform_settings = COALESCE(platform_settings, '{}'::jsonb) || jsonb_build_object(
  'planner_payment_provider', COALESCE(platform_settings->>'planner_payment_provider', 'lynk')
)
WHERE id = 'global'
  AND (platform_settings->>'planner_payment_provider') IS NULL;
