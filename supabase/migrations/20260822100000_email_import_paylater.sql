-- Fase 7.1 — paylater & linkaja email import templates
BEGIN;

INSERT INTO public.email_import_templates (id, bank, config, is_active) VALUES
('linkaja_notif', 'LinkAja', $json${
  "account_type": "LinkAja",
  "from_patterns": ["linkaja", "@linkaja\\.id"],
  "subject_patterns": ["transaksi", "payment", "pembayaran", "berhasil"],
  "parsers": [
    {"pattern": "(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "expense", "merchant_patterns": ["(?:di|merchant|ke|untuk)\\s*(.+?)(?:\\.|$|\\n)"]}
  ]
}$json$::jsonb, true),
('kredivo_notif', 'Kredivo', $json${
  "account_type": "Kredivo",
  "from_patterns": ["kredivo", "@kredivo\\.com"],
  "subject_patterns": ["cicilan", "payment", "tagihan", "transaksi"],
  "parsers": [
    {"pattern": "(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "expense", "merchant": "Kredivo", "category": "Cicilan"},
    {"pattern": "(?:cicilan|angsuran)\\s*(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "expense", "merchant": "Kredivo", "category": "Cicilan"}
  ]
}$json$::jsonb, true),
('akulaku_notif', 'Akulaku', $json${
  "account_type": "Akulaku",
  "from_patterns": ["akulaku", "@akulaku\\.com"],
  "subject_patterns": ["cicilan", "payment", "tagihan", "invoice"],
  "parsers": [
    {"pattern": "(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "expense", "merchant": "Akulaku", "category": "Cicilan"},
    {"pattern": "(?:total|tagihan)\\s*(?:Rp\\.?|IDR)\\s*([\\d.,]+)", "type": "expense", "merchant": "Akulaku", "category": "Cicilan"}
  ]
}$json$::jsonb, true)
ON CONFLICT (id) DO UPDATE
  SET config = EXCLUDED.config,
      bank = EXCLUDED.bank,
      is_active = EXCLUDED.is_active,
      updated_at = now();

COMMIT;
