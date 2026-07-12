-- RPP master tables (production) — multi-tenant, org-scoped.
-- Handles upgrade from sandbox tables that lack org_id.

-- Materials
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rpp_materials') THEN
    CREATE TABLE rpp_materials (
      id BIGSERIAL PRIMARY KEY,
      org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Umum',
      unit TEXT NOT NULL DEFAULT 'Pcs',
      price BIGINT NOT NULL DEFAULT 0,
      last_price BIGINT,
      trend TEXT DEFAULT 'stable',
      stock NUMERIC DEFAULT 0,
      used_in INTEGER DEFAULT 0,
      icon TEXT DEFAULT 'package',
      vendor TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rpp_materials' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE rpp_materials ADD COLUMN org_id UUID REFERENCES planner_organizations(id) ON DELETE CASCADE;
    UPDATE rpp_materials SET org_id = (
      SELECT id FROM planner_organizations ORDER BY created_at LIMIT 1
    ) WHERE org_id IS NULL;
    ALTER TABLE rpp_materials ALTER COLUMN org_id SET NOT NULL;
    ALTER TABLE rpp_materials ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE rpp_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rpp_materials_org ON rpp_materials(org_id);
CREATE INDEX IF NOT EXISTS idx_rpp_materials_org_name ON rpp_materials(org_id, name);

-- Workers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rpp_workers') THEN
    CREATE TABLE rpp_workers (
      id BIGSERIAL PRIMARY KEY,
      org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'Menengah',
      rate BIGINT NOT NULL DEFAULT 0,
      contact TEXT,
      rating INTEGER DEFAULT 5,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rpp_workers' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE rpp_workers ADD COLUMN org_id UUID REFERENCES planner_organizations(id) ON DELETE CASCADE;
    UPDATE rpp_workers SET org_id = (
      SELECT id FROM planner_organizations ORDER BY created_at LIMIT 1
    ) WHERE org_id IS NULL;
    ALTER TABLE rpp_workers ALTER COLUMN org_id SET NOT NULL;
    ALTER TABLE rpp_workers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE rpp_workers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rpp_workers_org ON rpp_workers(org_id);

-- App config (org-scoped key-value)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rpp_app_config') THEN
    CREATE TABLE rpp_app_config (
      org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (org_id, key)
    );
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rpp_app_config' AND column_name = 'org_id'
  ) THEN
    -- Sandbox had global key PK — recreate with org scope
    CREATE TABLE rpp_app_config_v2 (
      org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (org_id, key)
    );
    INSERT INTO rpp_app_config_v2 (org_id, key, payload, created_at, updated_at)
    SELECT (SELECT id FROM planner_organizations ORDER BY created_at LIMIT 1), key, payload, now(), now()
    FROM rpp_app_config
    ON CONFLICT DO NOTHING;
    DROP TABLE rpp_app_config;
    ALTER TABLE rpp_app_config_v2 RENAME TO rpp_app_config;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rpp_app_config_org ON rpp_app_config(org_id);

-- Job templates
CREATE TABLE IF NOT EXISTS rpp_job_templates (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  base_unit TEXT NOT NULL DEFAULT 'unit',
  payload JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_rpp_job_templates_org ON rpp_job_templates(org_id, is_active);
