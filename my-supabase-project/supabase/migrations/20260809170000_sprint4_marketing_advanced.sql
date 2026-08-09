-- Sprint 4: Advanced marketing — A/B variants, notification templates, analytics support
BEGIN;

CREATE TABLE IF NOT EXISTS public.marketing_offer_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.marketing_offers(id) ON DELETE CASCADE,
  variant_key text NOT NULL DEFAULT 'A',
  weight smallint NOT NULL DEFAULT 50 CHECK (weight >= 0 AND weight <= 100),
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  impressions int NOT NULL DEFAULT 0,
  clicks int NOT NULL DEFAULT 0,
  conversions int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, variant_key)
);

CREATE INDEX IF NOT EXISTS idx_offer_variants_offer ON public.marketing_offer_variants (offer_id);

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'system'
    CHECK (category IN ('transaction', 'budget', 'analysis', 'marketing', 'milestone', 'system')),
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  title_template text NOT NULL DEFAULT '',
  body_template text NOT NULL DEFAULT '',
  deep_link text DEFAULT '/app/#home',
  trigger_type text NOT NULL DEFAULT 'schedule'
    CHECK (trigger_type IN ('event', 'schedule', 'condition')),
  trigger_config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  frequency text NOT NULL DEFAULT 'once'
    CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  rate_limit_per_day smallint NOT NULL DEFAULT 1,
  audience_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  send_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_global_rules (
  key text PRIMARY KEY,
  value text NOT NULL,
  data_type text NOT NULL DEFAULT 'string',
  category text NOT NULL DEFAULT 'general',
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_offer_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_global_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offer_variants_read ON public.marketing_offer_variants;
CREATE POLICY offer_variants_read ON public.marketing_offer_variants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketing_offers o
      WHERE o.id = marketing_offer_variants.offer_id AND o.active = true
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS offer_variants_admin ON public.marketing_offer_variants;
CREATE POLICY offer_variants_admin ON public.marketing_offer_variants
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS notification_templates_read ON public.notification_templates;
CREATE POLICY notification_templates_read ON public.notification_templates
  FOR SELECT TO authenticated
  USING (active = true OR public.is_platform_admin());

DROP POLICY IF EXISTS notification_templates_admin ON public.notification_templates;
CREATE POLICY notification_templates_admin ON public.notification_templates
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS notification_global_rules_read ON public.notification_global_rules;
CREATE POLICY notification_global_rules_read ON public.notification_global_rules
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS notification_global_rules_admin ON public.notification_global_rules;
CREATE POLICY notification_global_rules_admin ON public.notification_global_rules
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

INSERT INTO public.notification_global_rules (key, value, data_type, category, description) VALUES
  ('quiet_hours_start', '22:00', 'string', 'general', 'Jam mulai quiet hours'),
  ('quiet_hours_end', '07:00', 'string', 'general', 'Jam akhir quiet hours'),
  ('max_per_user_per_day', '5', 'number', 'general', 'Max notifikasi per user per hari'),
  ('max_per_user_per_hour', '2', 'number', 'general', 'Max notifikasi per user per jam'),
  ('max_marketing_per_week', '3', 'number', 'marketing', 'Max marketing notif per minggu'),
  ('transactional_bypass_quiet', 'true', 'boolean', 'transactional', 'Transactional bypass quiet hours')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.notification_templates (
  category, template_key, name, title_template, body_template, deep_link,
  trigger_type, trigger_config_json, frequency, rate_limit_per_day, active
) VALUES
  ('analysis', 'weekly_digest', 'Weekly Digest', 'Rekap Minggu Ini', 'Pengeluaran {week_total} ({change_label}). {highlight}', '/app/#home', 'schedule', '{"day_of_week":0,"hour":19}'::jsonb, 'weekly', 1, true),
  ('analysis', 'monthly_report', 'Monthly Report', 'Laporan {month_name}', 'Net bulan ini {net_amount}. Health score: {health_score}', '/app/#reports', 'schedule', '{"day_of_month":1,"hour":9}'::jsonb, 'monthly', 1, true),
  ('budget', 'budget_80', 'Approaching Limit 80%', 'Budget {category} 80%', 'Kategori {category} sudah {pct}% dari limit.', '/app/#budget', 'condition', '{"threshold":80}'::jsonb, 'daily', 2, true),
  ('budget', 'budget_over', 'Over Budget', 'Budget {category} terlampaui', 'Pengeluaran {category} melebihi budget.', '/app/#budget', 'condition', '{"threshold":100}'::jsonb, 'daily', 2, true),
  ('marketing', 'trial_ending', 'Trial Ending', 'Trial berakhir {days_left} hari', 'Aktifkan Monefyi agar data tetap aman.', '/app/#settings/account', 'condition', '{"plan":"trial","days_left_max":3}'::jsonb, 'once', 1, true),
  ('marketing', 'couple_not_activated', 'Couple Not Activated', 'Pasangan belum diundang', 'Undang pasangan untuk Couple Pack.', '/app/#settings/account', 'condition', '{"household":"couple_inactive"}'::jsonb, 'weekly', 1, true),
  ('milestone', 'streak_7', 'Streak 7 Days', '🔥 7 hari streak!', 'Kamu konsisten catat transaksi 7 hari.', '/app/#home', 'event', '{"event":"streak_milestone","days":7}'::jsonb, 'once', 1, true),
  ('milestone', 'streak_30', 'Streak 30 Days', '🔥 30 hari streak!', 'Kamu masuk user paling disiplin.', '/app/#home', 'event', '{"event":"streak_milestone","days":30}'::jsonb, 'once', 1, true),
  ('transaction', 'bill_reminder_h3', 'Bill Reminder H-3', 'Tagihan {bill_name} 3 hari lagi', 'Jumlah Rp {amount} jatuh tempo {due_date}.', '/app/#home', 'schedule', '{"days_before":3}'::jsonb, 'daily', 3, true)
ON CONFLICT (template_key) DO NOTHING;

COMMIT;
