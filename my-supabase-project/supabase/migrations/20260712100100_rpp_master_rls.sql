-- RLS for rpp_* master tables — same pattern as planner_pricelist_items.

ALTER TABLE rpp_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpp_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpp_app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpp_job_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpp_materials_all ON rpp_materials;
CREATE POLICY rpp_materials_all ON rpp_materials
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS rpp_workers_all ON rpp_workers;
CREATE POLICY rpp_workers_all ON rpp_workers
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS rpp_app_config_all ON rpp_app_config;
CREATE POLICY rpp_app_config_all ON rpp_app_config
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS rpp_job_templates_all ON rpp_job_templates;
CREATE POLICY rpp_job_templates_all ON rpp_job_templates
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));
