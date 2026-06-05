-- Pricelist: product name + selling price per unit
ALTER TABLE planner_pricelist_items
  ADD COLUMN IF NOT EXISTS product TEXT,
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(15,2) NOT NULL DEFAULT 0;

UPDATE planner_pricelist_items
SET selling_price = ROUND(base_cost * (1 + COALESCE(default_margin_pct, 20) / 100), 2)
WHERE selling_price = 0;
