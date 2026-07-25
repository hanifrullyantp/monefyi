-- Neraca (balance sheet) tables for Monefyi PWA
-- Offline-first; RLS per user

BEGIN;

CREATE TABLE IF NOT EXISTS public.neraca_chart_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code        text NOT NULL,
  name        text NOT NULL,
  side        text NOT NULL CHECK (side IN ('aktiva', 'pasiva')),
  category    text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  is_system   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, code)
);

CREATE TABLE IF NOT EXISTS public.neraca_assets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    text NOT NULL CHECK (category IN (
    'stok', 'properti', 'pra_bayar', 'investasi', 'aset_lainnya'
  )),
  name        text NOT NULL,
  amount      numeric NOT NULL DEFAULT 0,
  notes       text DEFAULT '',
  acquired_at date,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.neraca_debts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    text NOT NULL CHECK (category IN (
    'hutang_dagang', 'hutang_pajak', 'hutang_lainnya', 'kewajiban_lainnya'
  )),
  name        text NOT NULL,
  amount      numeric NOT NULL DEFAULT 0,
  due_date    date,
  notes       text DEFAULT '',
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.neraca_receivables (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  amount      numeric NOT NULL DEFAULT 0,
  due_date    date,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'paid')),
  notes       text DEFAULT '',
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.neraca_equity_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('modal', 'simpanan')),
  name        text NOT NULL DEFAULT '',
  amount      numeric NOT NULL DEFAULT 0,
  event_date  date NOT NULL DEFAULT CURRENT_DATE,
  notes       text DEFAULT '',
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id  text,
  entry_date      date NOT NULL,
  account_code    text NOT NULL,
  sub_account     text DEFAULT '',
  debit           numeric NOT NULL DEFAULT 0,
  credit          numeric NOT NULL DEFAULT 0,
  memo            text DEFAULT '',
  source          text NOT NULL DEFAULT 'auto'
    CHECK (source IN ('auto', 'manual', 'opening', 'suspense', 'rebuild')),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date
  ON public.journal_entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tx
  ON public.journal_entries (user_id, transaction_id);
CREATE INDEX IF NOT EXISTS idx_neraca_assets_user
  ON public.neraca_assets (user_id, category);
CREATE INDEX IF NOT EXISTS idx_neraca_debts_user
  ON public.neraca_debts (user_id, category);
CREATE INDEX IF NOT EXISTS idx_neraca_receivables_user
  ON public.neraca_receivables (user_id);
CREATE INDEX IF NOT EXISTS idx_neraca_equity_user
  ON public.neraca_equity_events (user_id, kind);

CREATE TABLE IF NOT EXISTS public.balance_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month       text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, month)
);

CREATE TABLE IF NOT EXISTS public.suspense_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  as_of       date NOT NULL,
  side        text NOT NULL CHECK (side IN ('aktiva', 'pasiva')),
  amount      numeric NOT NULL DEFAULT 0,
  reasons     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.neraca_chart_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neraca_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neraca_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neraca_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neraca_equity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspense_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own neraca chart" ON public.neraca_chart_accounts;
CREATE POLICY "Users manage own neraca chart" ON public.neraca_chart_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own neraca assets" ON public.neraca_assets;
CREATE POLICY "Users manage own neraca assets" ON public.neraca_assets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own neraca debts" ON public.neraca_debts;
CREATE POLICY "Users manage own neraca debts" ON public.neraca_debts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own neraca receivables" ON public.neraca_receivables;
CREATE POLICY "Users manage own neraca receivables" ON public.neraca_receivables
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own neraca equity" ON public.neraca_equity_events;
CREATE POLICY "Users manage own neraca equity" ON public.neraca_equity_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own journal entries" ON public.journal_entries;
CREATE POLICY "Users manage own journal entries" ON public.journal_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own balance snapshots" ON public.balance_snapshots;
CREATE POLICY "Users manage own balance snapshots" ON public.balance_snapshots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own suspense log" ON public.suspense_log;
CREATE POLICY "Users manage own suspense log" ON public.suspense_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMIT;
