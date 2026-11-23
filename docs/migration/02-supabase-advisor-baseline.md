# 02 — Baseline advisor keamanan Supabase

**Project:** `zzwqfmdyncxbolestkqp` (status `ACTIVE_HEALTHY`)
**Sumber:** `get_advisors` tipe `security`, 2026-11-23. Hanya membaca. Tidak ada perubahan database.
**Catatan:** isi kredensial tidak disalin ke dokumen ini.

## Temuan prioritas

### 1. ERROR — RLS tidak aktif di tabel publik (8 tabel)
Tabel ini bisa dibaca dan ditulis lewat REST memakai anon key, dan anon key ada di sisi klien.
- `orders`
- `lynk_webhook_events`
- `rpp_projects`
- `rpp_transactions`
- `rpp_business_accounts`
- `planner_finance_period_snapshots`
- `planner_finance_report_runs`
- `planner_finance_revenue_forecasts`

**Tindakan yang disarankan:** verifikasi dulu apakah tabel ini dipakai klien. Lalu aktifkan RLS dan tambahkan policy yang sesuai.

### 2. WARN — fungsi SECURITY DEFINER bisa dipanggil anon (51 fungsi)
Dari daftar advisor, fungsi berisiko tinggi yang bisa dipanggil role `anon` lewat `/rest/v1/rpc/`:
- `activate_subscription` (mengaktifkan langganan)
- `grant_product_entitlement` (memberi akses produk)
- `grant_refund_request_access` (memberi akses refund)
- `planner_issue_channel_link`, `planner_channel_status` (role `authenticated`)
- fungsi `planner_*` lain yang memodifikasi data organisasi

**Tindakan yang disarankan:** cabut `EXECUTE` dari `anon` untuk fungsi yang tidak seharusnya publik. Pastikan fungsi yang dipanggil dari webhook atau edge function tetap berjalan dengan service role.
**Catatan:** dokumen ini belum memverifikasi isi fungsi. Verifikasi dulu sebelum mencabut akses, supaya alur pembayaran tidak putus.

### 3. WARN — proteksi password bocor nonaktif
Aktifkan Leaked Password Protection di pengaturan Auth.

### 4. WARN — search_path fungsi tidak diset (19 fungsi)
Set `search_path` pada fungsi yang tercantum di advisor, terutama fungsi SECURITY DEFINER.

### 5. INFO — RLS aktif tanpa policy (23 tabel)
Biasanya disengaja untuk tabel yang hanya diakses service role. Verifikasi satu per satu.

## Kredensial tertanam (lihat 01-rebrand-audit.md)
Service role key masih tertanam sebagai fallback di `PlannerLP2/src/lib/engine/engineDb.ts` (sekitar baris 13) dan route CRM terkait. Key ini harus dirotasi sebelum Tahap 2. Setelah dirotasi, hapus fallback dari kode.

## Edge functions (ringkas)
Project ini menjalankan lebih dari 80 edge function dari tiga produk: `monefyi-*`, `planner-*`, dan `stay-*`, ditambah `lynk-webhook`, `auth-send-email`, `tg-*`, dan `email-drip`. Semuanya berstatus ACTIVE. Daftar lengkap bisa diambil lagi lewat `list_edge_functions`.

## Langkah berikutnya (belum dikerjakan)
1. Rotasi service role key dan password database.
2. Verifikasi pemakaian tabel dan fungsi di poin 1 dan 2.
3. Buat migrasi terpisah untuk RLS dan revoke, lalu uji di branch Supabase sebelum produksi.
