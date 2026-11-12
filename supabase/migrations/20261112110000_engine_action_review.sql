-- Jalankan sekali di Supabase SQL Editor setelah 001.

-- Hasil evaluasi setiap aksi scale. Dipisah dari engine_action_log agar log tetap append-only.
create table if not exists engine_action_review (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  log_id bigint not null unique,
  verdict text not null,
  rolled_back boolean not null default false,
  details jsonb
);
create index if not exists engine_action_review_created on engine_action_review (created_at desc);

alter table engine_action_review enable row level security;
revoke update, delete on engine_action_review from anon, authenticated;

-- Lock untuk job evaluasi
insert into engine_run_lock (id) values ('review') on conflict (id) do nothing;
