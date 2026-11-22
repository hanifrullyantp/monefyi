-- ============================================================
-- Phase 6 Track 6B: RLS & Secrets Hardening (F-24 & Privilege Guards)
-- ============================================================
-- Local migration only — do not run remote push from agent sessions.

-- ------------------------------------------------------------
-- A. public.winning_engine_config: remove overly permissive USING (true)
--    Restrict client access strictly to platform admins and revoke anon.
-- ------------------------------------------------------------
ALTER TABLE public.winning_engine_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow winning_engine_config access" ON public.winning_engine_config;
DROP POLICY IF EXISTS winning_engine_config_platform_admin ON public.winning_engine_config;
CREATE POLICY winning_engine_config_platform_admin ON public.winning_engine_config
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

REVOKE ALL ON public.winning_engine_config FROM anon;

-- ------------------------------------------------------------
-- B. public.profiles: split write policy (disallow client DELETE)
--    and guard privileged columns against self-escalation.
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_self_write ON public.profiles;
DROP POLICY IF EXISTS profiles_self_insert ON public.profiles;
CREATE POLICY profiles_self_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.planner_guard_profile_privileged_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND auth.uid() IS NOT NULL THEN
    IF NOT public.is_platform_admin() THEN
      IF TG_OP = 'INSERT' THEN
        NEW.role := 'user';
        NEW.status := 'active';
        NEW.plan_type := 'none';
        NEW.plan_expires_at := NULL;
        NEW.admin_notes := NULL;
      ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.role IS DISTINCT FROM OLD.role
           OR NEW.status IS DISTINCT FROM OLD.status
           OR NEW.plan_type IS DISTINCT FROM OLD.plan_type
           OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at
           OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
          RAISE EXCEPTION 'Insufficient privileges to modify protected profile fields'
            USING ERRCODE = '42501';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planner_guard_profile_privileged_cols_biu ON public.profiles;
CREATE TRIGGER planner_guard_profile_privileged_cols_biu
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.planner_guard_profile_privileged_cols();

-- ------------------------------------------------------------
-- C. public.planner_organizations: guard plan_type, plan_expires_at, owner_id
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.planner_guard_org_privileged_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND auth.uid() IS NOT NULL THEN
    IF NOT public.is_platform_admin() THEN
      IF TG_OP = 'INSERT' THEN
        NEW.plan_type := 'free';
        NEW.plan_expires_at := NULL;
      ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.plan_type IS DISTINCT FROM OLD.plan_type
           OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at
           OR NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
          RAISE EXCEPTION 'Insufficient privileges to modify protected organization fields'
            USING ERRCODE = '42501';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planner_guard_org_privileged_cols_biu ON public.planner_organizations;
CREATE TRIGGER planner_guard_org_privileged_cols_biu
  BEFORE INSERT OR UPDATE ON public.planner_organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.planner_guard_org_privileged_cols();

-- ------------------------------------------------------------
-- D. public.runtime_traces & public.planner_org_custom_domains
-- ------------------------------------------------------------
ALTER TABLE public.runtime_traces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS runtime_traces_insert ON public.runtime_traces;
CREATE POLICY runtime_traces_insert ON public.runtime_traces
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND (tenant_id IS NULL OR tenant_id IN (SELECT public.planner_auth_org_ids()))
  );

ALTER TABLE public.planner_org_custom_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_org_custom_domains_member ON public.planner_org_custom_domains;
CREATE POLICY planner_org_custom_domains_member ON public.planner_org_custom_domains
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR org_id IN (SELECT public.planner_auth_owner_org_ids())
  )
  WITH CHECK (
    public.is_platform_admin()
    OR org_id IN (SELECT public.planner_auth_owner_org_ids())
  );

-- ------------------------------------------------------------
-- E. public.planner_user_ai_secrets (F-24 encrypted user BYOK AI vault)
--    Accessed exclusively via service_role in planner-ai-proxy.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planner_user_ai_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openrouter', 'gemini', 'groq', 'anthropic', 'openai')),
  ciphertext TEXT NOT NULL,
  key_hint TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_planner_user_ai_secrets_user
  ON public.planner_user_ai_secrets (user_id);

ALTER TABLE public.planner_user_ai_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.planner_user_ai_secrets FROM anon, authenticated;
GRANT ALL ON public.planner_user_ai_secrets TO service_role;
