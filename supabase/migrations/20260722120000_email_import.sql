-- Email Transaction Auto-Import
-- Tables: email_import_config, email_imports, email_import_templates

BEGIN;

CREATE TABLE IF NOT EXISTS public.email_import_config (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  import_address  text UNIQUE NOT NULL,
  is_active       boolean DEFAULT true,
  auto_confirm    boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_imports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_from      text NOT NULL,
  email_subject   text,
  email_hash      text NOT NULL,
  bank_id         text,
  parsed_type     text DEFAULT 'expense',
  parsed_amount   numeric NOT NULL DEFAULT 0,
  parsed_merchant text,
  parsed_date     date,
  parsed_account  text,
  parsed_category text,
  parsed_notes    text,
  parse_confidence numeric(4,3) DEFAULT 0.80,
  parse_method    text DEFAULT 'template',
  template_id     text,
  status          text DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'rejected', 'duplicate', 'error'
  )),
  confirmed_at    timestamptz,
  -- text to match public.transactions.id (not uuid in this project)
  transaction_id  text,
  raw_snippet     text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_imports_user
  ON public.email_imports (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_imports_hash
  ON public.email_imports (email_hash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_imports_hash_unique
  ON public.email_imports (email_hash);

CREATE TABLE IF NOT EXISTS public.email_import_templates (
  id          text PRIMARY KEY,
  bank        text NOT NULL,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active   boolean DEFAULT true,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.email_import_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_import_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own config" ON public.email_import_config;
CREATE POLICY "Users manage own config" ON public.email_import_config
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own imports" ON public.email_imports;
CREATE POLICY "Users manage own imports" ON public.email_imports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated read templates" ON public.email_import_templates;
CREATE POLICY "Authenticated read templates" ON public.email_import_templates
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.cleanup_email_snippets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_imports
  SET raw_snippet = NULL
  WHERE raw_snippet IS NOT NULL
    AND created_at < now() - interval '7 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_import_address(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_short_id text;
  v_address text;
  v_caller uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_short_id := substr(replace(p_user_id::text, '-', ''), 1, 8);
  v_address := 'tx-' || v_short_id || '@import.monefyi.com';

  INSERT INTO public.email_import_config (user_id, import_address, is_active, updated_at)
  VALUES (p_user_id, v_address, true, now())
  ON CONFLICT (user_id) DO UPDATE
    SET updated_at = now(),
        is_active = true,
        import_address = COALESCE(email_import_config.import_address, EXCLUDED.import_address)
  RETURNING import_address INTO v_address;

  RETURN v_address;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_import_address(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_email_snippets() TO service_role;

-- Seed bank templates (dollar-quoted JSON; edge compiles patterns to RegExp).
-- Update rows here (or via SQL) without redeploying the Edge Function.
INSERT INTO public.email_import_templates (id, bank, config, is_active) VALUES
('bca_debit', 'BCA', $json${
  "account_type": "BCA",
  "from_patterns": ["noreply@klikbca\\.com", ".*@bca\\.co\\.id", "bca"],
  "subject_patterns": ["notifikasi", "transaksi", "alert"],
  "parsers": [
    {
      "pattern": "(?:transaksi|trx)\\s*(?:DEBIT|DB)\\s*(?:sebesar\\s*)?Rp\\.?\\s*([\\d.,]+)",
      "type": "expense",
      "merchant_patterns": ["(?:ke|di|pada|merchant)\\s*[:\\-]?\\s*(.+?)(?:\\.|$|\\n)"]
    },
    {
      "pattern": "(?:transaksi|trx)\\s*(?:KREDIT|CR)\\s*(?:sebesar\\s*)?Rp\\.?\\s*([\\d.,]+)",
      "type": "income",
      "merchant_patterns": ["(?:dari|from)\\s*[:\\-]?\\s*(.+?)(?:\\.|$|\\n)"]
    }
  ]
}$json$::jsonb, true),
('mandiri_notif', 'Mandiri', $json${
  "account_type": "Mandiri",
  "from_patterns": ["mandiri", "@bankmandiri\\.co\\.id"],
  "subject_patterns": ["notifikasi", "transaksi"],
  "parsers": [
    {"pattern": "(?:DB|Debit)\\s*(?:sebesar\\s*)?(?:IDR|Rp\\.?)\\s*([\\d.,]+)", "type": "expense", "merchant_patterns": ["(?:di|pada|merchant)\\s*(.+?)(?:\\.|$|\\n)"]},
    {"pattern": "(?:CR|Credit|Kredit)\\s*(?:sebesar\\s*)?(?:IDR|Rp\\.?)\\s*([\\d.,]+)", "type": "income", "merchant_patterns": ["(?:dari|from)\\s*(.+?)(?:\\.|$|\\n)"]}
  ]
}$json$::jsonb, true),
('bni_notif', 'BNI', $json${
  "account_type": "BNI",
  "from_patterns": ["bni", "@bni\\.co\\.id"],
  "subject_patterns": ["notifikasi", "transaksi", "alert"],
  "parsers": [
    {"pattern": "(?:DB|Debit|Tarikan)\\s*(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "expense", "merchant_patterns": ["(?:di|pada|ke)\\s*(.+?)(?:\\.|$|\\n)"]}
  ]
}$json$::jsonb, true),
('bri_notif', 'BRI', $json${
  "account_type": "BRI",
  "from_patterns": ["bri", "@bri\\.co\\.id"],
  "subject_patterns": ["notifikasi", "transaksi"],
  "parsers": [
    {"pattern": "(?:DEBET|DB)\\s*(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "expense", "merchant_patterns": ["(?:di|pada|ke)\\s*(.+?)(?:\\.|$|\\n)"]}
  ]
}$json$::jsonb, true),
('gopay_notif', 'GoPay', $json${
  "account_type": "GoPay",
  "from_patterns": ["gopay", "gojek", "@go-jek\\.com"],
  "subject_patterns": ["payment", "transaksi", "receipt", "pembayaran"],
  "parsers": [
    {"pattern": "(?:Rp\\.?|IDR)\\s*([\\d.,]+)\\s*(?:telah|berhasil|pembayaran)", "type": "expense", "merchant_patterns": ["(?:merchant|toko|di)\\s*[:\\-]?\\s*(.+?)(?:\\.|$|\\n)"]},
    {"pattern": "(?:top\\s*up|isi\\s*saldo)\\s*(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "income", "merchant": "Top Up GoPay", "category": "Transfer"}
  ]
}$json$::jsonb, true),
('ovo_notif', 'OVO', $json${
  "account_type": "OVO",
  "from_patterns": ["ovo", "@ovo\\.id"],
  "subject_patterns": ["transaksi", "payment", "receipt"],
  "parsers": [
    {"pattern": "(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "expense", "merchant_patterns": ["(?:di|merchant|ke)\\s*(.+?)(?:\\.|$|\\n)"]}
  ]
}$json$::jsonb, true),
('dana_notif', 'DANA', $json${
  "account_type": "DANA",
  "from_patterns": ["dana", "@dana\\.id"],
  "subject_patterns": ["transaksi", "payment", "berhasil"],
  "parsers": [
    {"pattern": "(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "expense", "merchant_patterns": ["(?:di|merchant|ke|untuk)\\s*(.+?)(?:\\.|$|\\n)"]}
  ]
}$json$::jsonb, true),
('shopee_receipt', 'Shopee', $json${
  "account_type": "ShopeePay",
  "from_patterns": ["shopee", "@shopee\\.co\\.id"],
  "subject_patterns": ["order", "pesanan", "pembayaran"],
  "parsers": [
    {"pattern": "(?:total|pembayaran)\\s*(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "expense", "merchant": "Shopee", "category": "Shopping"}
  ]
}$json$::jsonb, true),
('tokopedia_receipt', 'Tokopedia', $json${
  "account_type": "Tokopedia",
  "from_patterns": ["tokopedia", "@tokopedia\\.com"],
  "subject_patterns": ["pesanan", "order", "pembayaran", "invoice"],
  "parsers": [
    {"pattern": "(?:total|pembayaran|tagihan)\\s*(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "expense", "merchant": "Tokopedia", "category": "Shopping"}
  ]
}$json$::jsonb, true),
('grab_receipt', 'Grab', $json${
  "account_type": "GrabPay",
  "from_patterns": ["grab", "@grab\\.com"],
  "subject_patterns": ["receipt", "trip", "order", "invoice"],
  "parsers": [
    {"pattern": "(?:total|fare|amount)\\s*(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "expense", "merchant": "Grab", "category_from_body": true}
  ]
}$json$::jsonb, true)
ON CONFLICT (id) DO UPDATE
  SET config = EXCLUDED.config,
      bank = EXCLUDED.bank,
      is_active = EXCLUDED.is_active,
      updated_at = now();

-- Realtime for client notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.email_imports;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

COMMIT;
