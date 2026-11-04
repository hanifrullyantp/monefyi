-- Pembatalan fase 6. Tidak menghapus jurnal, biaya, atau run SOP.

DROP TRIGGER IF EXISTS planner_company_profiles_safety ON public.planner_company_profiles;
DROP TRIGGER IF EXISTS planner_company_profile_versions_safety ON public.planner_company_profile_versions;
DROP FUNCTION IF EXISTS public.planner_reject_unsafe_profile();

DROP TABLE IF EXISTS public.planner_company_notes;
DROP TABLE IF EXISTS public.planner_company_glossary;
DROP TABLE IF EXISTS public.planner_company_policies;
DROP TABLE IF EXISTS public.planner_company_people_roles;
DROP TABLE IF EXISTS public.planner_company_roles;
DROP TABLE IF EXISTS public.planner_company_profile_versions;
DROP TABLE IF EXISTS public.planner_company_profiles;
