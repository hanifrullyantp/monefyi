-- Daftar kampanye yang relevan untuk dibaca dan dikelola Expert. NULL atau array kosong = semua kampanye.
alter table winning_engine_config add column if not exists tracked_campaign_ids jsonb;

