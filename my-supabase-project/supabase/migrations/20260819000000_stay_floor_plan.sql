-- Floor plan layout metadata for STAY rooms
-- floor_number mirrors existing floor column; floor_plan_position stores SVG rect

ALTER TABLE stay_rooms
  ADD COLUMN IF NOT EXISTS floor_plan_position JSONB;

COMMENT ON COLUMN stay_rooms.floor_plan_position IS
  'SVG layout: {"x": number, "y": number, "width": number, "height": number}';

-- Backfill from existing position_x/y where available
UPDATE stay_rooms
SET floor_plan_position = jsonb_build_object(
  'x', position_x,
  'y', position_y,
  'width', 120,
  'height', 88
)
WHERE position_x IS NOT NULL
  AND position_y IS NOT NULL
  AND floor_plan_position IS NULL;

-- Index for floor filtering on front desk
CREATE INDEX IF NOT EXISTS idx_stay_rooms_tenant_floor
  ON stay_rooms (tenant_id, floor);
