-- Estimator Phase 3: bidirectional estimation ↔ project bridge + atomic convert RPC

ALTER TABLE planner_projects
  ADD COLUMN IF NOT EXISTS source_estimation_id UUID REFERENCES planner_estimations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_planner_projects_source_estimation
  ON planner_projects(source_estimation_id)
  WHERE source_estimation_id IS NOT NULL;

ALTER TABLE planner_rap_items
  ADD COLUMN IF NOT EXISTS source_estimation_item_id UUID REFERENCES planner_estimation_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_planner_rap_items_source_estimation_item
  ON planner_rap_items(source_estimation_item_id)
  WHERE source_estimation_item_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.convert_estimation_to_project(
  p_estimation_id UUID,
  p_name TEXT,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_location TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_description TEXT,
  p_selected_item_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_est planner_estimations%ROWTYPE;
  v_project_id UUID;
  v_now TIMESTAMPTZ := now();
  v_item planner_estimation_items%ROWTYPE;
  v_budget NUMERIC := 0;
  v_line_total NUMERIC;
  v_sort INT := 0;
  v_rap_type TEXT;
BEGIN
  SELECT * INTO v_est
  FROM planner_estimations
  WHERE id = p_estimation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estimasi tidak ditemukan';
  END IF;

  IF v_est.status = 'converted' OR v_est.converted_project_id IS NOT NULL THEN
    RAISE EXCEPTION 'Estimasi sudah menjadi proyek';
  END IF;

  IF p_selected_item_ids IS NULL OR array_length(p_selected_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Pilih minimal satu item untuk RAP';
  END IF;

  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Nama proyek wajib diisi';
  END IF;

  INSERT INTO planner_projects (
    org_id,
    name,
    description,
    client_name,
    client_contact,
    location,
    planned_start,
    planned_end,
    status,
    total_budget,
    created_by,
    source_estimation_id,
    settings,
    finance_report_month,
    finance_report_month_manual
  ) VALUES (
    v_est.org_id,
    btrim(p_name),
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    NULLIF(btrim(COALESCE(p_client_name, '')), ''),
    CASE
      WHEN btrim(COALESCE(p_client_phone, '')) <> '' THEN jsonb_build_object('phone', btrim(p_client_phone))
      ELSE NULL
    END,
    NULLIF(btrim(COALESCE(p_location, '')), ''),
    p_start_date,
    p_end_date,
    'planning',
    0,
    auth.uid(),
    p_estimation_id,
    jsonb_build_object(
      'type', 'construction',
      'contract_value', COALESCE(v_est.total_selling_price, 0)
    ),
    date_trunc('month', p_end_date::timestamp)::date,
    false
  )
  RETURNING id INTO v_project_id;

  FOR v_item IN
    SELECT *
    FROM planner_estimation_items
    WHERE estimation_id = p_estimation_id
      AND id = ANY(p_selected_item_ids)
    ORDER BY sort_order
  LOOP
    v_rap_type := CASE lower(COALESCE(v_item.category, 'material'))
      WHEN 'material' THEN 'material'
      WHEN 'upah' THEN 'labor'
      WHEN 'borongan' THEN 'labor'
      WHEN 'alat' THEN 'equipment'
      WHEN 'jasa' THEN 'other'
      ELSE 'other'
    END;

    v_line_total := COALESCE(v_item.qty, 0) * COALESCE(v_item.hpp_per_unit, 0);
    v_budget := v_budget + v_line_total;
    v_sort := v_sort + 1;

    INSERT INTO planner_rap_items (
      project_id,
      type,
      name,
      unit,
      quantity,
      unit_price,
      notes,
      sort_order,
      updated_by,
      source_estimation_item_id
    ) VALUES (
      v_project_id,
      v_rap_type,
      v_item.name,
      COALESCE(NULLIF(btrim(v_item.unit), ''), 'pcs'),
      COALESCE(v_item.qty, 0),
      COALESCE(v_item.hpp_per_unit, 0),
      v_item.notes,
      v_sort,
      auth.uid(),
      v_item.id
    );
  END LOOP;

  IF v_sort = 0 THEN
    DELETE FROM planner_projects WHERE id = v_project_id;
    RAISE EXCEPTION 'Tidak ada item valid yang dipilih';
  END IF;

  UPDATE planner_projects
  SET total_budget = v_budget, updated_at = v_now
  WHERE id = v_project_id;

  UPDATE planner_estimations
  SET
    status = 'converted',
    converted_at = v_now,
    converted_project_id = v_project_id,
    project_id = v_project_id,
    updated_at = v_now
  WHERE id = p_estimation_id;

  RETURN v_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_estimation_to_project(
  UUID, TEXT, TEXT, TEXT, TEXT, DATE, DATE, TEXT, UUID[]
) TO authenticated;
