-- Funnel + monetization foundations (Finance)
-- profiles onboarding, trial support, drip, acquisition, abuse, affiliate

-- profiles: onboarding + ensure plan columns exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id);

-- user_plans: allow trial
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_plans' AND column_name = 'plan_type'
  ) THEN
    -- Drop old check if present and recreate loosely
    BEGIN
      ALTER TABLE public.user_plans DROP CONSTRAINT IF EXISTS user_plans_plan_type_check;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.user_plans
  DROP CONSTRAINT IF EXISTS user_plans_plan_type_check;

ALTER TABLE public.user_plans
  ADD CONSTRAINT user_plans_plan_type_check
  CHECK (plan_type IN ('none', 'trial', 'monthly', 'lifetime'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_type_check
  CHECK (plan_type IS NULL OR plan_type IN ('none', 'trial', 'monthly', 'lifetime'));

-- Plan catalog in app_config.platform_settings (JSON); ensure column exists
ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS platform_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Acquisition / funnel events
CREATE TABLE IF NOT EXISTS public.acquisition_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  ref_code text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS acquisition_events_event_created_idx
  ON public.acquisition_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS acquisition_events_utm_idx
  ON public.acquisition_events (utm_source, created_at DESC);

ALTER TABLE public.acquisition_events ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated insert for funnel tracking (no select for public)
DROP POLICY IF EXISTS acquisition_events_insert_public ON public.acquisition_events;
CREATE POLICY acquisition_events_insert_public
  ON public.acquisition_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Drip schedule
CREATE TABLE IF NOT EXISTS public.drip_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  send_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_id)
);

CREATE INDEX IF NOT EXISTS drip_schedule_due_idx
  ON public.drip_schedule (status, send_at)
  WHERE status = 'pending';

ALTER TABLE public.drip_schedule ENABLE ROW LEVEL SECURITY;

-- Trial abuse signals
CREATE TABLE IF NOT EXISTS public.trial_abuse_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  email_domain text,
  device_hash text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trial_abuse_domain_idx
  ON public.trial_abuse_signals (email_domain, created_at DESC);
CREATE INDEX IF NOT EXISTS trial_abuse_device_idx
  ON public.trial_abuse_signals (device_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS trial_abuse_email_idx
  ON public.trial_abuse_signals (email, created_at DESC);

ALTER TABLE public.trial_abuse_signals ENABLE ROW LEVEL SECURITY;

-- Affiliate commissions
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_ref text,
  amount_idr numeric NOT NULL DEFAULT 0,
  commission_idr numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_commissions_aff_idx
  ON public.affiliate_commissions (affiliate_id, created_at DESC);

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- Seed default plan catalog into app_config if missing
UPDATE public.app_config
SET platform_settings = COALESCE(platform_settings, '{}'::jsonb) || jsonb_build_object(
  'plans', jsonb_build_object(
    'trial', jsonb_build_object(
      'enabled', true,
      'duration_days', 7,
      'price_display', 'Gratis',
      'max_transactions', 50,
      'max_accounts', 2,
      'max_budgets', 3,
      'max_ocr_scans', 5
    ),
    'monthly', jsonb_build_object(
      'enabled', true,
      'duration_days', 30,
      'price_display', 'Rp 49rb/bln',
      'lynk_url', null
    ),
    'lifetime', jsonb_build_object(
      'enabled', true,
      'duration_days', null,
      'price_display', 'Rp 499rb',
      'lynk_url', null
    )
  )
)
WHERE id = 'global'
  AND (platform_settings->'plans') IS NULL;
