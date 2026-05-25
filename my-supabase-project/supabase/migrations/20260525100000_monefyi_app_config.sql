-- Global app configuration (branding, checkout URLs, tutorial metadata)
-- Writable by service role / Edge Functions; readable by anon+authenticated.
-- Idempotent: legacy databases may already have app_config with fewer columns.

create table if not exists public.app_config (
  id text primary key,
  logo_url text,
  checkout_monthly_url text,
  checkout_lifetime_url text,
  affiliate_commission integer default 100000,
  tutorial jsonb default '{}'::jsonb,
  notif_threshold integer default 80,
  updated_at timestamptz default now()
);

alter table public.app_config add column if not exists logo_url text;
alter table public.app_config add column if not exists checkout_monthly_url text;
alter table public.app_config add column if not exists checkout_lifetime_url text;
alter table public.app_config add column if not exists affiliate_commission integer default 100000;
alter table public.app_config add column if not exists tutorial jsonb default '{}'::jsonb;
alter table public.app_config add column if not exists notif_threshold integer default 80;
alter table public.app_config add column if not exists updated_at timestamptz default now();

insert into public.app_config (id, affiliate_commission, notif_threshold, tutorial)
values ('global', 100000, 80, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.app_config enable row level security;

drop policy if exists "app_config_select_public" on public.app_config;
create policy "app_config_select_public"
  on public.app_config
  for select
  to anon, authenticated
  using (true);
