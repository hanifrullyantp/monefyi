-- Monefyi Expert: heartbeat, riwayat run, kebijakan otonomi, langganan push PWA, dan perbaikan scheduler.

-- 1. Riwayat setiap siklus kerja Expert
create table if not exists engine_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null default 'manual',      -- cron | manual | supervisor
  phase text,                                  -- observe | diagnose | decide | act | verify | done
  outcome text,                                -- running | ok | partial | blocked | error
  blockers jsonb not null default '[]',        -- [{code,message,fix}]
  stats jsonb not null default '{}',
  duration_ms int
);
create index if not exists engine_runs_started on engine_runs (started_at desc);

-- 2. Denyut terakhir (satu baris)
create table if not exists engine_heartbeat (
  id text primary key default 'expert',
  last_tick_at timestamptz,
  last_ok_at timestamptz,
  current_activity text,
  current_phase text,
  next_run_at timestamptz,
  consecutive_failures int not null default 0,
  updated_at timestamptz not null default now()
);
insert into engine_heartbeat (id) values ('expert') on conflict (id) do nothing;

-- 3. Langganan notifikasi push PWA admin
create table if not exists admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table engine_runs enable row level security;
alter table engine_heartbeat enable row level security;
alter table admin_push_subscriptions enable row level security;
-- Tanpa policy: hanya service role (server) yang dapat membaca/menulis.

-- 4. Pengaturan otonomi yang bisa diubah dari dashboard
alter table winning_engine_config add column if not exists autonomous boolean not null default true;
alter table winning_engine_config add column if not exists autonomy_policy jsonb not null default '{}';
alter table winning_engine_config add column if not exists tick_interval_minutes int not null default 30;

-- 5. Perbaikan scheduler: header harus x-engine-secret, tanpa secret bawaan,
--    dan kegagalan konfigurasi dicatat (tidak lagi diam).
create or replace function public.trigger_monefyi_winning_engine_tick()
returns void
language plpgsql
security definer
as $$
declare
  target_url text;
  cron_secret text;
begin
  target_url := current_setting('app.settings.winning_engine_tick_url', true);
  cron_secret := current_setting('app.settings.winning_engine_cron_secret', true);

  if target_url is null or target_url = '' or cron_secret is null or cron_secret = '' then
    insert into engine_runs (trigger, outcome, phase, finished_at, blockers)
    values ('cron', 'blocked', 'observe', now(), jsonb_build_array(jsonb_build_object(
      'code', 'PGCRON_NOT_CONFIGURED',
      'message', 'pg_cron aktif tetapi URL tick atau secret belum diset di database.',
      'fix', 'Set app.settings.winning_engine_tick_url dan app.settings.winning_engine_cron_secret, atau andalkan Vercel Cron.'
    )));
    return;
  end if;

  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-engine-secret', cron_secret
    ),
    body := jsonb_build_object('source', 'supabase_pg_cron', 'timestamp', now())
  );
end;
$$;

