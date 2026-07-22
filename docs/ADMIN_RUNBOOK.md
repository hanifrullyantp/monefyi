# Admin Runbook — Monefyi Finance

## Ganti Mode Bisnis

### Mode A: Bayar 1x saja (Lifetime Only)

1. Super Admin → **Plans**
2. Disable **Trial** toggle
3. Disable **Monthly** toggle
4. Enable **Lifetime** toggle
5. Simpan Plans — landing CTA mengikuti SKU aktif

### Mode B: Langganan + Trial

1. Super Admin → **Plans**
2. Enable **Monthly** + **Trial** (set hari, mis. 7)
3. Optional: Enable **Lifetime**
4. Simpan Plans

### Mode A+B

Enable Trial + Monthly + Lifetime sekaligus.

---

## Grant Trial Manual

1. Super Admin → **User** → Refresh
2. Cari email
3. Klik **Grant Trial** (default 7 hari)
4. User dapat akses trial; email welcome terkirim jika lewat `start-trial` (manual grant sync plan saja)

## Extend / Revoke Plan

1. User → pilih plan (`none` / `trial` / `monthly` / `lifetime`)
2. Set tanggal expiry (kosongkan untuk lifetime)
3. **Simpan** — memanggil `monefyi-admin-update-user` (sync `profiles` + `user_plans`)

## Ubah Harga

1. Lynk.id → edit produk → ubah harga checkout
2. Admin → Plans → update **price_display**
3. Admin → Config → pastikan URL checkout monthly/lifetime benar

## Troubleshoot: User Tidak Bisa Login / Plan Salah

1. Cek `user_plans` (plan_type, expires_at)
2. Cek `profiles.plan_type` / `plan_expires_at` — harus sama
3. Jika tidak sinkron: Admin → User → Simpan plan ulang (force sync)
4. Jika tidak ada record: Grant Trial / set Monthly manual, atau re-trigger Lynk webhook (idempotent)

## Revenue & Funnel

1. Super Admin → **Revenue** → Refresh
2. Lihat MRR, ARR, trial/monthly/lifetime counts, funnel 30 hari
3. Edge Function: `monefyi-admin-revenue`

## Webhook Lynk

- Env wajib production: `LYNK_SIGNATURE_TOKEN`, `REQUIRE_LYNK_SIGNATURE=true`, `APP_URL=https://app.monefyi.com`
- Idempotency: `lynk_webhook_events`
- Setelah bayar: sync `user_plans` + `profiles` + email konfirmasi

## Trial self-serve

- Landing form → `start-trial`
- Anti-abuse: disposable email, domain rate limit, device hash, cooldown 90 hari
- Drip: tabel `drip_schedule` + cron `email-drip` (`x-cron-secret`)

## Preview Phase 0

Lihat [docs/preview/index.html](preview/index.html) dan [ENTITLEMENT_MATRIX.md](preview/ENTITLEMENT_MATRIX.md).

## Monitoring (ops)

- Alert jika MRR turun tajam atau churn spike (bandingkan Revenue tab week-over-week)
- Cek gagal webhook / drip `status=failed` di Supabase
