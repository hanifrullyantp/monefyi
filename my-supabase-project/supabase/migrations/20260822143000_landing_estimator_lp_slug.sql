-- CMS row for PlannerLP2 landing (planner.monefyi.com root)

insert into public.landing_content (slug, content)
values ('estimator-lp', '{}'::jsonb)
on conflict (slug) do nothing;
