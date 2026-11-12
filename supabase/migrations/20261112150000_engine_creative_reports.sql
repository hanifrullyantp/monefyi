-- Laporan analisa kreatif (satu baris per run).
create table if not exists engine_creative_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  trigger text not null default 'manual',
  summary jsonb not null default '{}',
  ads jsonb not null default '[]',
  actions jsonb not null default '[]',
  critiques jsonb not null default '[]',
  warnings jsonb not null default '[]'
);
create index if not exists engine_creative_reports_created on engine_creative_reports (created_at desc);
alter table engine_creative_reports enable row level security;
revoke update, delete on engine_creative_reports from anon, authenticated;

insert into engine_run_lock (id) values ('creatives') on conflict (id) do nothing;

