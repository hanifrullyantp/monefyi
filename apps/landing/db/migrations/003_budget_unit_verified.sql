-- Jalankan sekali di Supabase SQL Editor setelah 002.
-- Otonomi (scale/pause otomatis) tertahan sampai satuan budget IDR dikonfirmasi lewat /api/engine/budget-check.
alter table winning_engine_config add column if not exists budget_unit_verified boolean not null default false;
