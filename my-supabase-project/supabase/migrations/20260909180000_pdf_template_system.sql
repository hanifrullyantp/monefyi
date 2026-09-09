-- 5 template penawaran + 5 template invoice, stamp, watermark

ALTER TABLE planner_pdf_settings DROP CONSTRAINT IF EXISTS planner_pdf_settings_default_pdf_template_check;
ALTER TABLE planner_estimations DROP CONSTRAINT IF EXISTS planner_estimations_pdf_template_check;

UPDATE planner_pdf_settings SET default_pdf_template = 'formal' WHERE default_pdf_template = 'classic';
UPDATE planner_pdf_settings SET default_pdf_template = 'clean' WHERE default_pdf_template = 'minimal';
UPDATE planner_pdf_settings SET default_pdf_template = 'fullcolor' WHERE default_pdf_template = 'bold';

UPDATE planner_estimations SET pdf_template = 'formal' WHERE pdf_template = 'classic';
UPDATE planner_estimations SET pdf_template = 'clean' WHERE pdf_template = 'minimal';
UPDATE planner_estimations SET pdf_template = 'fullcolor' WHERE pdf_template = 'bold';

ALTER TABLE planner_pdf_settings
  ADD COLUMN IF NOT EXISTS default_invoice_template TEXT,
  ADD COLUMN IF NOT EXISTS watermark_text TEXT,
  ADD COLUMN IF NOT EXISTS stamp_url TEXT;

UPDATE planner_pdf_settings
SET default_invoice_template = COALESCE(default_invoice_template, default_pdf_template, 'modern')
WHERE default_invoice_template IS NULL;

ALTER TABLE planner_pdf_settings
  ALTER COLUMN default_invoice_template SET DEFAULT 'modern';

ALTER TABLE planner_pdf_settings
  ALTER COLUMN default_invoice_template SET NOT NULL;

ALTER TABLE planner_estimations
  ADD COLUMN IF NOT EXISTS pdf_invoice_template TEXT;

UPDATE planner_estimations
SET pdf_invoice_template = COALESCE(pdf_invoice_template, pdf_template, 'modern')
WHERE pdf_invoice_template IS NULL;

ALTER TABLE planner_pdf_settings
  ADD CONSTRAINT planner_pdf_settings_default_pdf_template_check
  CHECK (default_pdf_template IN ('formal', 'modern', 'clean', 'fullcolor', 'futuristic'));

ALTER TABLE planner_pdf_settings
  ADD CONSTRAINT planner_pdf_settings_default_invoice_template_check
  CHECK (default_invoice_template IN ('formal', 'modern', 'clean', 'fullcolor', 'futuristic'));

ALTER TABLE planner_estimations
  ADD CONSTRAINT planner_estimations_pdf_template_check
  CHECK (pdf_template IN ('formal', 'modern', 'clean', 'fullcolor', 'futuristic'));

ALTER TABLE planner_estimations
  ADD CONSTRAINT planner_estimations_pdf_invoice_template_check
  CHECK (pdf_invoice_template IS NULL OR pdf_invoice_template IN ('formal', 'modern', 'clean', 'fullcolor', 'futuristic'));
