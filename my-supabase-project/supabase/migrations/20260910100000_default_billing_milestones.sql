-- Default jadwal tagihan lengkap (DP + termin + pelunasan) per organisasi

ALTER TABLE planner_pdf_settings
  ADD COLUMN IF NOT EXISTS default_billing_milestones JSONB;

COMMENT ON COLUMN planner_pdf_settings.default_billing_milestones IS
  'Template milestone tagihan default: [{key,label,pct,enabled}]';
