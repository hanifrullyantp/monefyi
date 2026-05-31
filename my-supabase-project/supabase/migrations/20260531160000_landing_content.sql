-- CMS-style landing page content (read via Edge Function; write admin-only via service role)

create table if not exists public.landing_content (
  slug text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.landing_content enable row level security;

drop policy if exists "landing_content_select_public" on public.landing_content;
create policy "landing_content_select_public"
  on public.landing_content
  for select
  to anon, authenticated
  using (true);

insert into public.landing_content (slug, content)
values ('planner', '{}'::jsonb)
on conflict (slug) do nothing;
