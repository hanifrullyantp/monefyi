/**
 * DDL for planner-prompt tables — prefixed rpp_ to avoid Monefyi schema collisions.
 */
export const RPP_SETUP_SQL = `
CREATE TABLE IF NOT EXISTS rpp_materials (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  price INTEGER NOT NULL,
  last_price INTEGER,
  trend TEXT DEFAULT 'stable',
  stock NUMERIC DEFAULT 0,
  used_in INTEGER DEFAULT 0,
  icon TEXT DEFAULT 'package',
  vendor TEXT
);

CREATE TABLE IF NOT EXISTS rpp_workers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  rate INTEGER NOT NULL,
  contact TEXT,
  rating INTEGER DEFAULT 5
);

CREATE TABLE IF NOT EXISTS rpp_projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  contract_value INTEGER NOT NULL,
  saldo INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ok',
  progress_plan INTEGER DEFAULT 0,
  progress_actual INTEGER DEFAULT 0,
  rap_data JSONB,
  timeline_data JSONB,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS rpp_transactions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES rpp_projects(id),
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  time TEXT,
  icon TEXT DEFAULT 'arrow-right-circle',
  note TEXT
);

CREATE TABLE IF NOT EXISTS rpp_business_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  balance INTEGER NOT NULL,
  icon TEXT DEFAULT 'landmark'
);

CREATE TABLE IF NOT EXISTS rpp_app_config (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL
);
`;
