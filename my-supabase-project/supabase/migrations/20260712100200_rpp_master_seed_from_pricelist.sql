-- One-time seed: copy active pricelist items → rpp_materials (skip duplicates per org+name).

INSERT INTO rpp_materials (org_id, name, category, unit, price, last_price, vendor, trend)
SELECT
  p.org_id,
  p.name,
  COALESCE(NULLIF(p.category, ''), 'Umum'),
  COALESCE(NULLIF(p.unit, ''), 'Pcs'),
  COALESCE(p.base_cost::bigint, 0),
  COALESCE(p.base_cost::bigint, 0),
  '',
  'stable'
FROM planner_pricelist_items p
WHERE p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM rpp_materials m
    WHERE m.org_id = p.org_id
      AND lower(m.name) = lower(p.name)
  );

-- Default job templates JSON for orgs without job_templates config.
INSERT INTO rpp_app_config (org_id, key, payload)
SELECT o.id, 'job_templates', '[]'::jsonb
FROM planner_organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM rpp_app_config c
  WHERE c.org_id = o.id AND c.key = 'job_templates'
);

INSERT INTO rpp_app_config (org_id, key, payload)
SELECT o.id, 'database_meta', '{"tools":[],"vendors":[],"clients":[]}'::jsonb
FROM planner_organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM rpp_app_config c
  WHERE c.org_id = o.id AND c.key = 'database_meta'
);
