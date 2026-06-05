-- Add pricelist category: borongan (material + jasa)
ALTER TABLE planner_pricelist_items
  DROP CONSTRAINT IF EXISTS planner_pricelist_items_category_check;

ALTER TABLE planner_pricelist_items
  ADD CONSTRAINT planner_pricelist_items_category_check
  CHECK (category IS NULL OR category IN ('material', 'upah', 'alat', 'jasa', 'borongan', 'other'));
