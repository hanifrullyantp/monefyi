-- Product-Marketing Sync — Sprint 1 foundation
-- Household mode + in-app marketing engine tables

BEGIN;

-- ─── Household ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_members smallint NOT NULL DEFAULT 2 CHECK (max_members >= 2 AND max_members <= 6),
  subscription_type text DEFAULT 'couple',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_households_owner ON public.households (owner_user_id);

CREATE TABLE IF NOT EXISTS public.household_members (
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'left')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_household_members_user ON public.household_members (user_id);

CREATE TABLE IF NOT EXISTS public.household_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_household_invites_code ON public.household_invitations (invite_code);

-- ─── Marketing ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'conversion'
    CHECK (type IN ('conversion', 'upsell', 'retention', 'reactivation', 'announcement')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  start_date timestamptz,
  end_date timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  offer_type text NOT NULL,
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_audience_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority smallint NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  max_shows_per_user smallint NOT NULL DEFAULT 3,
  cooldown_days smallint NOT NULL DEFAULT 7,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_offers_active ON public.marketing_offers (active, priority DESC);

CREATE TABLE IF NOT EXISTS public.user_offer_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.marketing_offers(id) ON DELETE CASCADE,
  shown_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL DEFAULT 'viewed'
    CHECK (action IN ('viewed', 'clicked', 'dismissed', 'converted', 'not_interested')),
  session_id text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_offer_interactions_user ON public.user_offer_interactions (user_id, offer_id, shown_at DESC);

CREATE TABLE IF NOT EXISTS public.marketing_global_rules (
  key text PRIMARY KEY,
  value text NOT NULL,
  data_type text NOT NULL DEFAULT 'string',
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_marketing_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  marketing_enabled boolean NOT NULL DEFAULT true,
  milestone_enabled boolean NOT NULL DEFAULT true,
  educational_enabled boolean NOT NULL DEFAULT true,
  frequency text NOT NULL DEFAULT 'normal' CHECK (frequency IN ('normal', 'minimal', 'off')),
  quiet_hours_start time DEFAULT '22:00',
  quiet_hours_end time DEFAULT '07:00',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_offer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_global_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_marketing_preferences ENABLE ROW LEVEL SECURITY;

-- Household: members read own household
DROP POLICY IF EXISTS households_member_select ON public.households;
CREATE POLICY households_member_select ON public.households
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = households.id
        AND hm.user_id = auth.uid()
        AND hm.status = 'active'
    )
  );

DROP POLICY IF EXISTS households_owner_insert ON public.households;
CREATE POLICY households_owner_insert ON public.households
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS households_owner_update ON public.households;
CREATE POLICY households_owner_update ON public.households
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS household_members_select ON public.household_members;
CREATE POLICY household_members_select ON public.household_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_members.household_id
        AND hm.user_id = auth.uid()
        AND hm.status = 'active'
    )
  );

DROP POLICY IF EXISTS household_members_insert ON public.household_members;
CREATE POLICY household_members_insert ON public.household_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS household_invitations_owner ON public.household_invitations;
CREATE POLICY household_invitations_owner ON public.household_invitations
  FOR ALL TO authenticated
  USING (
    invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = household_invitations.household_id
        AND h.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (invited_by = auth.uid());

-- Marketing: users read active offers + campaigns
DROP POLICY IF EXISTS marketing_campaigns_read ON public.marketing_campaigns;
CREATE POLICY marketing_campaigns_read ON public.marketing_campaigns
  FOR SELECT TO authenticated
  USING (status = 'active' OR public.is_platform_admin());

DROP POLICY IF EXISTS marketing_campaigns_admin ON public.marketing_campaigns;
CREATE POLICY marketing_campaigns_admin ON public.marketing_campaigns
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS marketing_offers_read ON public.marketing_offers;
CREATE POLICY marketing_offers_read ON public.marketing_offers
  FOR SELECT TO authenticated
  USING (active = true OR public.is_platform_admin());

DROP POLICY IF EXISTS marketing_offers_admin ON public.marketing_offers;
CREATE POLICY marketing_offers_admin ON public.marketing_offers
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS user_offer_interactions_self ON public.user_offer_interactions;
CREATE POLICY user_offer_interactions_self ON public.user_offer_interactions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS marketing_global_rules_read ON public.marketing_global_rules;
CREATE POLICY marketing_global_rules_read ON public.marketing_global_rules
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS marketing_global_rules_admin ON public.marketing_global_rules;
CREATE POLICY marketing_global_rules_admin ON public.marketing_global_rules
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS user_marketing_prefs_self ON public.user_marketing_preferences;
CREATE POLICY user_marketing_prefs_self ON public.user_marketing_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Household RPC ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_household(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO households (name, owner_user_id)
  VALUES (COALESCE(NULLIF(trim(p_name), ''), 'Keluarga'), auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO household_members (household_id, user_id, role, status)
  VALUES (v_id, auth.uid(), 'owner', 'active');

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_household_invite(p_household_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM households h
    WHERE h.id = p_household_id AND h.owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not household owner';
  END IF;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO household_invitations (household_id, invited_by, invite_code, expires_at)
  VALUES (p_household_id, auth.uid(), v_code, now() + interval '7 days');

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_household_by_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv household_invitations%ROWTYPE;
  v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_inv
  FROM household_invitations
  WHERE upper(trim(invite_code)) = upper(trim(p_code))
    AND used_by IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  SELECT count(*) INTO v_count
  FROM household_members
  WHERE household_id = v_inv.household_id AND status = 'active';

  IF v_count >= (SELECT max_members FROM households WHERE id = v_inv.household_id) THEN
    RAISE EXCEPTION 'Household is full';
  END IF;

  INSERT INTO household_members (household_id, user_id, role, status)
  VALUES (v_inv.household_id, auth.uid(), 'member', 'active')
  ON CONFLICT (household_id, user_id) DO UPDATE
    SET status = 'active', joined_at = now();

  UPDATE household_invitations
  SET used_by = auth.uid(), used_at = now()
  WHERE id = v_inv.id;

  RETURN v_inv.household_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_household(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_household_invite(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_household_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_household(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_household_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household_by_code(text) TO authenticated;

-- ─── Seed global marketing rules ─────────────────────────────

INSERT INTO public.marketing_global_rules (key, value, data_type, description) VALUES
  ('max_offers_per_day', '1', 'number', 'Maksimum offer per hari per user'),
  ('allowed_hours_start', '9', 'number', 'Jam mulai boleh tampil offer'),
  ('allowed_hours_end', '21', 'number', 'Jam akhir boleh tampil offer'),
  ('skip_weekend', 'false', 'boolean', 'Skip weekend'),
  ('skip_when_danger', 'true', 'boolean', 'Jangan tampilkan saat kondisi keuangan danger'),
  ('default_cooldown_hours', '24', 'number', 'Cooldown default antar offer (jam)'),
  ('cooldown_after_dismiss_days', '7', 'number', 'Cooldown setelah dismiss (hari)'),
  ('cooldown_after_not_interested_days', '30', 'number', 'Cooldown setelah not interested (hari)'),
  ('max_dismiss_before_stop', '3', 'number', 'Max dismiss sebelum stop menampilkan'),
  ('show_only_first_login_of_day', 'true', 'boolean', 'Hanya login pertama hari itu'),
  ('startup_delay_seconds', '3', 'number', 'Delay setelah startup sebelum offer'),
  ('auto_dismiss_after_seconds', '60', 'number', 'Auto dismiss saat idle'),
  ('default_display_mode', 'non_blocking', 'string', 'Modal blocking atau non-blocking')
ON CONFLICT (key) DO NOTHING;

-- ─── Seed starter campaigns + offers ─────────────────────────

INSERT INTO public.marketing_campaigns (id, name, description, type, status)
VALUES
  ('a1000001-0000-4000-8000-000000000001', 'Trial to Basic', 'Konversi trial ke lifetime', 'conversion', 'active'),
  ('a1000001-0000-4000-8000-000000000002', 'Couple Activation', 'Aktivasi Couple Pack', 'upsell', 'active'),
  ('a1000001-0000-4000-8000-000000000003', 'Feature Discovery', 'Edukasi fitur', 'announcement', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO public.marketing_offers (
  id, campaign_id, offer_type, content_json, target_audience_json, display_rules_json,
  priority, max_shows_per_user, cooldown_days, active
) VALUES
(
  'b1000001-0000-4000-8000-000000000001',
  'a1000001-0000-4000-8000-000000000001',
  'trial_to_paid',
  '{"headline":"Trial berakhir segera","body":"Aktifkan Monefyi sekali bayar — data & budget kamu tetap aman.","cta_text":"Lihat Paket","cta_url":"#paket","display_format":"modal","dismiss_label":"Nanti Saja"}'::jsonb,
  '{"plans":["trial"],"min_days_since_registration":3}'::jsonb,
  '{"trigger":"app_startup","priority":8}'::jsonb,
  8, 5, 1, true
),
(
  'b1000001-0000-4000-8000-000000000002',
  'a1000001-0000-4000-8000-000000000002',
  'couple_not_activated',
  '{"headline":"Pasangan belum diundang","body":"Kamu sudah beli Couple Pack — undang pasangan sekarang agar bisa kelola keuangan bersama.","cta_text":"Undang Pasangan","cta_action":"open_settings_household","display_format":"banner","dismiss_label":"Nanti"}'::jsonb,
  '{"household_status":"couple_inactive"}'::jsonb,
  '{"trigger":"app_startup","priority":9}'::jsonb,
  9, 3, 10, true
),
(
  'b1000001-0000-4000-8000-000000000003',
  'a1000001-0000-4000-8000-000000000003',
  'feature_discovery_neraca',
  '{"headline":"Lihat Neraca Keuangan","body":"Selain cash flow, kamu bisa lihat total aset, utang, dan nilai bersih.","cta_text":"Buka Neraca","cta_action":"open_neraca","display_format":"card","dismiss_label":"Nanti"}'::jsonb,
  '{"hasnt_used_features":["neraca"]}'::jsonb,
  '{"trigger":"app_startup","priority":3}'::jsonb,
  3, 2, 14, true
)
ON CONFLICT DO NOTHING;

COMMIT;
