-- Global app configuration (branding, checkout URLs, tutorial metadata)
-- Writable by service role / Edge Functions; readable by anon+authenticated.

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
