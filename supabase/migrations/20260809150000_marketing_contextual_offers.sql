-- Sprint 2: contextual marketing offers
BEGIN;

INSERT INTO public.marketing_offers (
  id, campaign_id, offer_type, content_json, target_audience_json, display_rules_json,
  priority, max_shows_per_user, cooldown_days, active
) VALUES
(
  'b1000001-0000-4000-8000-000000000004',
  'a1000001-0000-4000-8000-000000000001',
  'feature_blocker',
  '{"headline":"Multiple targets butuh Pro+","body":"Kamu sudah punya 1 target. Upgrade ke Pro+ untuk menambah target lain (DP rumah, liburan, dll) plus weekly AI digest & debt planner.","cta_text":"Upgrade Pro+","cta_url":"#paket","display_format":"sheet","dismiss_label":"Nanti Saja"}'::jsonb,
  '{"plans":["trial","monthly","lifetime","none"]}'::jsonb,
  '{"trigger":"goal_creation_attempted"}'::jsonb,
  9, 4, 7, true
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
