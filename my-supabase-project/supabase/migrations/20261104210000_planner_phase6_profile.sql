-- Fase 6: profil perusahaan. Kebijakan tidak menembus kunci platform.
-- Pembatalan: supabase/rollbacks/20261104210000_planner_phase6_profile.sql

CREATE OR REPLACE FUNCTION public.planner_reject_unsafe_profile()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  doc jsonb := NEW.document;
  pol jsonb;
BEGIN
  IF jsonb_typeof(doc) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'profil_bukan_objek' USING ERRCODE = 'check_violation';
  END IF;
  IF COALESCE((doc->>'version')::int, 0) < 1 THEN
    RAISE EXCEPTION 'versi_profil_tidak_valid' USING ERRCODE = 'check_violation';
  END IF;
  IF doc ? 'jurnal_seimbang' AND (doc->>'jurnal_seimbang') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'keselamatan_platform' USING ERRCODE = 'check_violation';
  END IF;
  IF doc ? 'isolasi_tenant' AND (doc->>'isolasi_tenant') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'keselamatan_platform' USING ERRCODE = 'check_violation';
  END IF;
  IF doc ? 'persetujuan_aksi_kritis' AND (doc->>'persetujuan_aksi_kritis') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'keselamatan_platform' USING ERRCODE = 'check_violation';
  END IF;
  IF doc ? 'jejak_audit' AND (doc->>'jejak_audit') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'keselamatan_platform' USING ERRCODE = 'check_violation';
  END IF;
  IF doc ? 'jurnal_boleh_diubah' AND (doc->>'jurnal_boleh_diubah') IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'keselamatan_platform' USING ERRCODE = 'check_violation';
  END IF;
  IF jsonb_typeof(doc->'policies') = 'array' THEN
    FOR pol IN SELECT value FROM jsonb_array_elements(doc->'policies')
    LOOP
      IF pol->>'key' IN (
        'jurnal_seimbang', 'isolasi_tenant', 'persetujuan_aksi_kritis', 'jejak_audit', 'jurnal_boleh_diubah'
      ) THEN
        RAISE EXCEPTION 'keselamatan_platform' USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.planner_company_profiles (
  org_id uuid PRIMARY KEY REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  document jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planner_company_profile_versions (
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version >= 1),
  document jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, version)
);

CREATE TABLE IF NOT EXISTS public.planner_company_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  title text NOT NULL,
  action_key text NOT NULL,
  approval_limit_rupiah bigint NOT NULL CHECK (approval_limit_rupiah >= 0),
  UNIQUE (org_id, role_key, action_key)
);

CREATE TABLE IF NOT EXISTS public.planner_company_people_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  person_label text NOT NULL,
  role_key text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.planner_company_policies (
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  policy_key text NOT NULL,
  domain text NOT NULL,
  value_integer bigint NOT NULL,
  min_value bigint NOT NULL,
  max_value bigint NOT NULL,
  PRIMARY KEY (org_id, policy_key),
  CHECK (policy_key NOT IN (
    'jurnal_seimbang', 'isolasi_tenant', 'persetujuan_aksi_kritis', 'jejak_audit', 'jurnal_boleh_diubah'
  )),
  CHECK (value_integer BETWEEN min_value AND max_value)
);

CREATE TABLE IF NOT EXISTS public.planner_company_glossary (
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  term text NOT NULL,
  maps_to text NOT NULL CHECK (maps_to IN ('satuan', 'jenis_kejadian', 'entitas')),
  mapped_value text NOT NULL,
  PRIMARY KEY (org_id, term)
);

CREATE TABLE IF NOT EXISTS public.planner_company_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'usulan' CHECK (status IN ('usulan', 'disetujui', 'ditolak')),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS planner_company_profiles_safety ON public.planner_company_profiles;
CREATE TRIGGER planner_company_profiles_safety
  BEFORE INSERT OR UPDATE ON public.planner_company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.planner_reject_unsafe_profile();

DROP TRIGGER IF EXISTS planner_company_profile_versions_safety ON public.planner_company_profile_versions;
CREATE TRIGGER planner_company_profile_versions_safety
  BEFORE INSERT OR UPDATE ON public.planner_company_profile_versions
  FOR EACH ROW EXECUTE FUNCTION public.planner_reject_unsafe_profile();

ALTER TABLE public.planner_company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_company_profile_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_company_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_company_people_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_company_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_company_glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_company_notes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'planner_company_profiles',
    'planner_company_profile_versions',
    'planner_company_roles',
    'planner_company_people_roles',
    'planner_company_policies',
    'planner_company_glossary',
    'planner_company_notes'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (public.is_org_member(org_id, ''worker''))',
      tbl, tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_write ON public.%I FOR ALL TO authenticated USING (public.is_org_member(org_id, ''owner'')) WITH CHECK (public.is_org_member(org_id, ''owner''))',
      tbl, tbl
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
  END LOOP;
END $$;
