-- Jalankan sekali di Supabase SQL Editor.

-- Log aksi append-only: setiap perubahan ke Meta tercatat beserta nilai sebelum dan sesudah.
create table if not exists engine_action_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null check (source in ('cron', 'manual')),
  actor text,
  action_type text not null,
  plan_id text,
  idempotency_key text,
  campaign_id text,
  campaign_name text,
  ok boolean not null,
  live_executed boolean not null default false,
  before_value numeric,
  after_value numeric,
  summary text,
  response jsonb
);
create index if not exists engine_action_log_idem
  on engine_action_log (idempotency_key) where live_executed;
create index if not exists engine_action_log_created
  on engine_action_log (created_at desc);

-- Lock eksekusi agar dua run tidak berjalan bersamaan.
create table if not exists engine_run_lock (
  id text primary key,
  locked_until timestamptz not null default to_timestamp(0)
);
insert into engine_run_lock (id) values ('tick') on conflict (id) do nothing;

-- RLS aktif tanpa policy: hanya service role (server) yang bisa membaca/menulis.
alter table engine_action_log enable row level security;
alter table engine_run_lock enable row level security;

-- Append-only: cabut hak ubah dan hapus log dari role lain.
revoke update, delete on engine_action_log from anon, authenticated;
