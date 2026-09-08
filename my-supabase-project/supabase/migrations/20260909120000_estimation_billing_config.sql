-- Estimator: jadwal tagihan per estimasi + default DP global

ALTER TABLE planner_estimations
  ADD COLUMN IF NOT EXISTS billing_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE planner_pdf_settings
  ADD COLUMN IF NOT EXISTS default_dp_pct NUMERIC(5,2) NOT NULL DEFAULT 50;
