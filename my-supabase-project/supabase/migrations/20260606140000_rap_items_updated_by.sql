-- Track who last edited a RAP line (spreadsheet / inline edit).
ALTER TABLE planner_rap_items
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_rap_items_updated_by ON planner_rap_items(updated_by);
