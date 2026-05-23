# Planner — Supabase (source)

- **SQL:** `migrations/001_planner_core_schema.sql` — salinan yang dipakai CLI untuk production ada di `../../my-supabase-project/supabase/migrations/20260523120000_planner_core_schema.sql`. Ubah skema di satu tempat lalu sinkronkan ke file berversi di `my-supabase-project` sebelum `db push`.
- **Edge Functions:** `functions/planner-analyze`, `functions/planner-parse-command` — salinan deploy ada di `../../my-supabase-project/supabase/functions/` dengan nama folder yang sama.

Lihat [`../README.md`](../README.md) bagian Supabase untuk perintah deploy.
