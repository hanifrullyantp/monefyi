-- Seed row for Monefyi marketing landing CMS (slug: monefyi)

insert into public.landing_content (slug, content)
values ('monefyi', '{"version":1,"settings":{},"textOverrides":{}}'::jsonb)
on conflict (slug) do nothing;
