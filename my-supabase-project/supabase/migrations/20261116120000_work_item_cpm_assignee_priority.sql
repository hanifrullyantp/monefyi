-- ============================================================
-- Planner Work Items: Assignee, Priority (incl. critical), Notes, Attachments & updated_at trigger
-- NOTE: Local migration file only.
-- ============================================================

ALTER TABLE public.planner_work_items
  ADD COLUMN IF NOT EXISTS assigned_member_id UUID REFERENCES public.planner_org_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
DECLARE
  v_constraint RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.planner_work_items'::regclass
      AND conname = 'planner_work_items_priority_check'
      AND pg_get_constraintdef(oid) ILIKE '%critical%'
  ) THEN
    FOR v_constraint IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.planner_work_items'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%priority%'
    LOOP
      EXECUTE format('ALTER TABLE public.planner_work_items DROP CONSTRAINT IF EXISTS %I', v_constraint.conname);
    END LOOP;

    ALTER TABLE public.planner_work_items
      ADD CONSTRAINT planner_work_items_priority_check
      CHECK (priority IN ('low', 'medium', 'high', 'critical'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_items_assigned_member
  ON public.planner_work_items(assigned_member_id);

CREATE OR REPLACE FUNCTION public.planner_work_items_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planner_work_items_set_updated_at_biu ON public.planner_work_items;
CREATE TRIGGER planner_work_items_set_updated_at_biu
  BEFORE UPDATE ON public.planner_work_items
  FOR EACH ROW
  EXECUTE FUNCTION public.planner_work_items_set_updated_at();
