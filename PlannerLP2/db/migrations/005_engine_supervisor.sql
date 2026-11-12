-- Supervisor: laporan penilaian dan lock job.
create table if not exists engine_supervisor_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  score int,
  grade text not null,
  findings jsonb not null default '[]',
  metrics jsonb not null default '{}',
  suggestions jsonb not null default '[]',
  kill_switch_engaged boolean not null default false
);
create index if not exists engine_supervisor_reports_created on engine_supervisor_reports (created_at desc);
alter table engine_supervisor_reports enable row level security;
revoke update, delete on engine_supervisor_reports from anon, authenticated;

insert into engine_run_lock (id) values ('supervisor') on conflict (id) do nothing;
