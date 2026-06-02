-- Helper for direct member creation: find auth user by email safely.
create or replace function public.planner_find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;
$$;

revoke all on function public.planner_find_user_id_by_email(text) from public;
grant execute on function public.planner_find_user_id_by_email(text) to service_role;
