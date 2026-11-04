-- Fase 1: peran bertingkat, angka turunan di server, tutup self-insert.
-- Pembatalan: supabase/rollbacks/20261104130000_planner_phase1_safety.sql
-- Peran hidup: worker < manager < owner. Tidak menghidupkan kembali viewer.

CREATE OR REPLACE FUNCTION public.planner_role_rank(p_role text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_role
    WHEN 'owner' THEN 30
    WHEN 'manager' THEN 20
    WHEN 'worker' THEN 10
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid, p_min_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM planner_org_members m
    WHERE m.org_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND public.planner_role_rank(m.role) >= public.planner_role_rank(p_min_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.planner_can_write_project(p_project_id uuid, p_min_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_member(
    (SELECT p.org_id FROM planner_projects p WHERE p.id = p_project_id),
    p_min_role
  );
$$;

REVOKE ALL ON FUNCTION public.planner_role_rank(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_member(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planner_can_write_project(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_role_rank(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_can_write_project(uuid, text) TO authenticated;

-- Self-insert tetap tertutup. Manager hanya boleh menambah/mengubah worker.
DROP POLICY IF EXISTS planner_members_self_insert ON planner_org_members;
DROP POLICY IF EXISTS planner_members_manage ON planner_org_members;
DROP POLICY IF EXISTS planner_members_owner_write ON planner_org_members;
DROP POLICY IF EXISTS planner_members_manager_insert_worker ON planner_org_members;
DROP POLICY IF EXISTS planner_members_manager_update_worker ON planner_org_members;

CREATE POLICY planner_members_owner_write ON planner_org_members
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'owner'))
  WITH CHECK (public.is_org_member(org_id, 'owner'));

CREATE POLICY planner_members_manager_insert_worker ON planner_org_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id, 'manager')
    AND NOT public.is_org_member(org_id, 'owner')
    AND role = 'worker'
    AND user_id <> auth.uid()
  );

CREATE POLICY planner_members_manager_update_worker ON planner_org_members
  FOR UPDATE TO authenticated
  USING (
    public.is_org_member(org_id, 'manager')
    AND NOT public.is_org_member(org_id, 'owner')
    AND role = 'worker'
  )
  WITH CHECK (
    public.is_org_member(org_id, 'manager')
    AND NOT public.is_org_member(org_id, 'owner')
    AND role = 'worker'
  );

-- RAP: baca siapa pun yang boleh melihat proyek, tulis manager ke atas.
DROP POLICY IF EXISTS planner_rap_all ON planner_rap_items;
DROP POLICY IF EXISTS planner_rap_read ON planner_rap_items;
DROP POLICY IF EXISTS planner_rap_insert ON planner_rap_items;
DROP POLICY IF EXISTS planner_rap_update ON planner_rap_items;
DROP POLICY IF EXISTS planner_rap_delete ON planner_rap_items;

CREATE POLICY planner_rap_read ON planner_rap_items
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()));

CREATE POLICY planner_rap_insert ON planner_rap_items
  FOR INSERT TO authenticated
  WITH CHECK (public.planner_can_write_project(project_id, 'manager'));

CREATE POLICY planner_rap_update ON planner_rap_items
  FOR UPDATE TO authenticated
  USING (public.planner_can_write_project(project_id, 'manager'))
  WITH CHECK (public.planner_can_write_project(project_id, 'manager'));

CREATE POLICY planner_rap_delete ON planner_rap_items
  FOR DELETE TO authenticated
  USING (public.planner_can_write_project(project_id, 'manager'));

-- Pekerjaan: worker boleh mengubah progres di proyek yang boleh ia baca.
DROP POLICY IF EXISTS planner_work_all ON planner_work_items;
DROP POLICY IF EXISTS planner_work_read ON planner_work_items;
DROP POLICY IF EXISTS planner_work_insert ON planner_work_items;
DROP POLICY IF EXISTS planner_work_update ON planner_work_items;
DROP POLICY IF EXISTS planner_work_delete ON planner_work_items;

CREATE POLICY planner_work_read ON planner_work_items
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()));

CREATE POLICY planner_work_insert ON planner_work_items
  FOR INSERT TO authenticated
  WITH CHECK (public.planner_can_write_project(project_id, 'manager'));

CREATE POLICY planner_work_update ON planner_work_items
  FOR UPDATE TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

CREATE POLICY planner_work_delete ON planner_work_items
  FOR DELETE TO authenticated
  USING (public.planner_can_write_project(project_id, 'manager'));

-- Biaya dan log harian: mandor (worker) mencatat pada proyek yang boleh ia baca.
DROP POLICY IF EXISTS planner_cost_all ON planner_cost_realizations;
DROP POLICY IF EXISTS planner_cost_read ON planner_cost_realizations;
DROP POLICY IF EXISTS planner_cost_write ON planner_cost_realizations;

CREATE POLICY planner_cost_read ON planner_cost_realizations
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()));

CREATE POLICY planner_cost_write ON planner_cost_realizations
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_logs_all ON planner_daily_logs;
DROP POLICY IF EXISTS planner_logs_read ON planner_daily_logs;
DROP POLICY IF EXISTS planner_logs_write ON planner_daily_logs;

CREATE POLICY planner_logs_read ON planner_daily_logs
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()));

CREATE POLICY planner_logs_write ON planner_daily_logs
  FOR ALL TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()))
  WITH CHECK (project_id IN (SELECT public.planner_auth_project_ids()));

DROP POLICY IF EXISTS planner_analysis_all ON planner_analysis_snapshots;
DROP POLICY IF EXISTS planner_analysis_read ON planner_analysis_snapshots;
DROP POLICY IF EXISTS planner_analysis_write ON planner_analysis_snapshots;

CREATE POLICY planner_analysis_read ON planner_analysis_snapshots
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT public.planner_auth_project_ids()));

CREATE POLICY planner_analysis_write ON planner_analysis_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.planner_can_write_project(project_id, 'manager'));

-- Keuangan: worker baca, manager tulis. Policy FOR ALL lama di-drop supaya tidak tertumpuk OR.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'planner_finance_accounts',
    'planner_journal_entries',
    'planner_opex_categories',
    'planner_opex_budgets',
    'planner_opex_realizations',
    'planner_inventory_items',
    'planner_fixed_assets',
    'planner_prepaid_items',
    'planner_receivables',
    'planner_payables',
    'planner_investors'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_all', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_read', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_write', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (public.is_org_member(org_id, ''worker''))',
      tbl || '_read', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (public.is_org_member(org_id, ''manager'')) WITH CHECK (public.is_org_member(org_id, ''manager''))',
      tbl || '_write', tbl
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS planner_journal_lines_all ON planner_journal_lines;
DROP POLICY IF EXISTS planner_journal_lines_read ON planner_journal_lines;
DROP POLICY IF EXISTS planner_journal_lines_write ON planner_journal_lines;

CREATE POLICY planner_journal_lines_read ON planner_journal_lines
  FOR SELECT TO authenticated
  USING (
    journal_id IN (
      SELECT e.id FROM planner_journal_entries e
      WHERE public.is_org_member(e.org_id, 'worker')
    )
  );

CREATE POLICY planner_journal_lines_write ON planner_journal_lines
  FOR ALL TO authenticated
  USING (
    journal_id IN (
      SELECT e.id FROM planner_journal_entries e
      WHERE public.is_org_member(e.org_id, 'manager')
    )
  )
  WITH CHECK (
    journal_id IN (
      SELECT e.id FROM planner_journal_entries e
      WHERE public.is_org_member(e.org_id, 'manager')
    )
  );

DROP POLICY IF EXISTS planner_investor_transactions_all ON planner_investor_transactions;
DROP POLICY IF EXISTS planner_investor_transactions_read ON planner_investor_transactions;
DROP POLICY IF EXISTS planner_investor_transactions_write ON planner_investor_transactions;

CREATE POLICY planner_investor_transactions_read ON planner_investor_transactions
  FOR SELECT TO authenticated
  USING (
    investor_id IN (
      SELECT i.id FROM planner_investors i
      WHERE public.is_org_member(i.org_id, 'worker')
    )
  );

CREATE POLICY planner_investor_transactions_write ON planner_investor_transactions
  FOR ALL TO authenticated
  USING (
    investor_id IN (
      SELECT i.id FROM planner_investors i
      WHERE public.is_org_member(i.org_id, 'manager')
    )
  )
  WITH CHECK (
    investor_id IN (
      SELECT i.id FROM planner_investors i
      WHERE public.is_org_member(i.org_id, 'manager')
    )
  );

-- Angka turunan proyek. Penulisan klien ditimpa di sini.
CREATE OR REPLACE FUNCTION public.planner_fill_derived_project_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_rap boolean;
  v_has_work boolean;
  v_progress numeric;
BEGIN
  SELECT EXISTS (SELECT 1 FROM planner_rap_items r WHERE r.project_id = NEW.id) INTO v_has_rap;
  IF v_has_rap THEN
    SELECT COALESCE(SUM(r.quantity * r.unit_price), 0)
      INTO NEW.total_budget
    FROM planner_rap_items r
    WHERE r.project_id = NEW.id;
  END IF;

  SELECT COALESCE(SUM(c.total_amount), 0)
    INTO NEW.total_spent
  FROM planner_cost_realizations c
  WHERE c.project_id = NEW.id;

  SELECT COALESCE(SUM(i.amount), 0)
    INTO NEW.total_received
  FROM planner_project_incomes i
  WHERE i.project_id = NEW.id
    AND i.status = 'received';

  SELECT EXISTS (SELECT 1 FROM planner_work_items w WHERE w.project_id = NEW.id) INTO v_has_work;
  IF v_has_work THEN
    SELECT ROUND(
      SUM((CASE WHEN COALESCE(w.weight, 0) > 0 THEN w.weight ELSE 1 END) * COALESCE(w.progress_pct, 0))
      / NULLIF(SUM(CASE WHEN COALESCE(w.weight, 0) > 0 THEN w.weight ELSE 1 END), 0)
    , 2)
      INTO v_progress
    FROM planner_work_items w
    WHERE w.project_id = NEW.id;
    NEW.progress_pct := COALESCE(v_progress, 0);
  ELSIF TG_OP = 'INSERT' THEN
    NEW.progress_pct := 0;
  ELSE
    NEW.progress_pct := OLD.progress_pct;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planner_projects_derived_biu ON planner_projects;
CREATE TRIGGER planner_projects_derived_biu
  BEFORE INSERT OR UPDATE ON planner_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.planner_fill_derived_project_totals();

CREATE OR REPLACE FUNCTION public.planner_touch_project_derived()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  v_id := COALESCE(NEW.project_id, OLD.project_id);
  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;
  UPDATE planner_projects
  SET updated_at = now()
  WHERE id = v_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS planner_rap_touch_derived ON planner_rap_items;
CREATE TRIGGER planner_rap_touch_derived
  AFTER INSERT OR UPDATE OR DELETE ON planner_rap_items
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_project_derived();

DROP TRIGGER IF EXISTS planner_cost_touch_derived ON planner_cost_realizations;
CREATE TRIGGER planner_cost_touch_derived
  AFTER INSERT OR UPDATE OR DELETE ON planner_cost_realizations
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_project_derived();

DROP TRIGGER IF EXISTS planner_work_touch_derived ON planner_work_items;
CREATE TRIGGER planner_work_touch_derived
  AFTER INSERT OR UPDATE OR DELETE ON planner_work_items
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_project_derived();

DROP TRIGGER IF EXISTS planner_income_touch_derived ON planner_project_incomes;
CREATE TRIGGER planner_income_touch_derived
  AFTER INSERT OR UPDATE OR DELETE ON planner_project_incomes
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_project_derived();
