-- Fase 3: Skema RAB (Rencana Anggaran Biaya) — akses hanya super admin hanif.rullyant@gmail.com
-- Terapkan via: supabase db push  /  supabase migration deploy
-- Tabel planner_projects adalah entitas host yang sudah ada; hanya direferensikan (tidak menduplikasi).

-- Entitas host planner_projects (no-op jika sudah tersedia di host)
CREATE TABLE IF NOT EXISTS planner_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  name TEXT NOT NULL,
  slug TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daftar super admin RAB (opsional; di edge function diutamakan env RAB_SUPERADMIN_EMAILS)
CREATE TABLE IF NOT EXISTS app_super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_super_admins (email, email_verified)
VALUES ('hanif.rullyant@gmail.com', true)
ON CONFLICT (email) DO NOTHING;

-- Fungsi SQL: super admin diturunkan dari JWT (auth.jwt()->>'email' + email_verified = 'true')
-- Cocok exact hanif.rullyant@gmail.com, atau daftar di tabel app_super_admins.
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (
    lower(coalesce(auth.jwt()->>'email', '')) = lower('hanif.rullyant@gmail.com')
    AND coalesce(auth.jwt()->>'email_verified', 'false') = 'true'
  )
  OR EXISTS (
    SELECT 1 FROM app_super_admins a
    WHERE lower(a.email) = lower(coalesce(auth.jwt()->>'email', ''))
      AND a.email_verified = true
  );
$$;

-- ============================ TABEL RAB ============================

CREATE TABLE IF NOT EXISTS rab_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'locked', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rab_projects(id) ON DELETE CASCADE,
  version_no INT NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES rab_project_versions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_catalog_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rab_projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_catalog_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES rab_catalog_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  uom TEXT,
  quantity NUMERIC(12,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_catalog_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES rab_catalog_analyses(id) ON DELETE CASCADE,
  job_code TEXT,
  name TEXT NOT NULL,
  crew TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_catalog_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES rab_catalog_jobs(id) ON DELETE CASCADE,
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  source TEXT,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_catalog_indices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC(14,6) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_catalog_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id TEXT NOT NULL,
  version_no INT NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rab_projects(id) ON DELETE CASCADE,
  ref_table TEXT NOT NULL,
  ref_id UUID NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rab_projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  occurred_at DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rab_projects(id) ON DELETE CASCADE,
  parameter TEXT NOT NULL,
  value NUMERIC(14,6) NOT NULL DEFAULT 0,
  basis TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  row_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================ RLS ============================
-- Semua tabel RAB: hanya super admin (is_super_admin()) yang boleh ACCES.
-- Bukan super admin (termasuk anon) -> 0 baris pada SELECT, ditolak pada INSERT/UPDATE/DELETE.

ALTER TABLE rab_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_catalog_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_catalog_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_catalog_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_catalog_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_catalog_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_catalog_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'rab_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS rab_super_admin_only ON %I;', t);
    EXECUTE format(
      'CREATE POLICY rab_super_admin_only ON %I FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());',
      t
    );
  END LOOP;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rab_projects_org ON rab_projects(org_id);
CREATE INDEX IF NOT EXISTS idx_rab_project_versions_project ON rab_project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_rab_scenarios_version ON rab_scenarios(version_id);
CREATE INDEX IF NOT EXISTS idx_rab_catalog_components_project ON rab_catalog_components(project_id);
CREATE INDEX IF NOT EXISTS idx_rab_corrections_project ON rab_corrections(project_id);
CREATE INDEX IF NOT EXISTS idx_rab_actuals_project ON rab_actuals(project_id);
CREATE INDEX IF NOT EXISTS idx_rab_calibrations_project ON rab_calibrations(project_id);

-- Comment dokumentasi
COMMENT ON FUNCTION is_super_admin() IS 'Super admin RAB: email hanif.rullyant@gmail.com (terverifikasi) dari JWT, atau daftar app_super_admins.';
