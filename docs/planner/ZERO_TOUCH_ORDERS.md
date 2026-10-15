# Order Lynk — tanpa sentuh teknis (zero-touch)

Setelah setup **sekali**, setiap order masuk dari Lynk.id diproses otomatis: **akun → entitlement → tier → email → login**.

Anda **tidak** perlu: deploy manual per order, buat user di Supabase, kirim password, atau resend webhook kecuali Lynk benar-benar gagal connect (jarang).

---

## Setup sekali (sebelum go-live)

| # | Di mana | Apa |
|---|---------|-----|
| 1 | Lynk.id dashboard | Webhook URL: `https://zzwqfmdyncxbolestkqp.supabase.co/functions/v1/lynk-webhook` (store Estimator `asfin-ai` / Finance) |
| 2 | Lynk | Simpan URL → salin **merchant key** |
| 3 | Supabase → Edge secrets | `LYNK_MERCHANT_KEY`, `REQUIRE_LYNK_SIGNATURE=true`, `REQUIRE_PURCHASE_EMAIL=true`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL`, `ESTIMATOR_*` |
| 4 | Supabase Auth | Hook **Send Email** → `auth-send-email` (lupa password otomatis) |
| 5 | GitHub repo secrets | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `LYNK_MERCHANT_KEY` (opsional CI), perbaiki `VERCEL_TOKEN` jika deploy front-end otomatis |

Detail Lynk: [`LYNK_WEBHOOK.md`](./LYNK_WEBHOOK.md) · Email: [`../email/MONEFYI_TRANSACTIONAL_EMAIL.md`](../email/MONEFYI_TRANSACTIONAL_EMAIL.md).

---

## Alur otomatis per order

```text
Pelanggan bayar di Lynk
    → POST webhook + X-Lynk-Signature
    → lynk-webhook (verifikasi SHA256)
         ├─ judul/item Estimator/Planner → aktivasi org + tier + email Estimator
         └─ Finance (Bulanan/Lifetime)   → user_plans + entitlement monefyi + email Finance
    → User baru: email tombol "Atur password"
    → User lama: email konfirmasi + paket diperpanjang
```

**Retry Lynk:** Jika email Resend gagal, server membalas **HTTP 502** → Lynk mengirim ulang webhook (tanpa Anda).

**Webhook duplikat:** Aktivasi paket tidak dobel; **email konfirmasi tetap dikirim** (replay aman).

---

## Deploy otomatis (kode)

Push ke `main` yang mengubah `my-supabase-project/supabase/functions/**` memicu GitHub Actions:

**Supabase Lynk auto-deploy** → deploy `lynk-webhook`, `planner-lynk-webhook`, `auth-send-email` + script `./scripts/verify-product-funnel.sh`.

Front-end Vercel: workflow terpisah (`planner-spa-deploy`, `estimator-lp-deploy`) — pastikan `VERCEL_TOKEN` valid.

---

## Yang Anda lakukan saat ada order (operasional)

| Situasi | Tindakan |
|---------|----------|
| Normal | **Tidak ada** — cek email pelanggan / spam jika komplain |
| Pelanggan tidak terima email | Minta cek spam; jika perlu, **Resend webhook** sekali dari Lynk (otomatis lagi) |
| Komplain tidak bisa login | Pastikan app yang benar (Finance vs Estimator); **Lupa password** di app tersebut |

---

## Cek kesehatan (opsional, 1 menit)

```bash
export LYNK_MERCHANT_KEY='...'   # dari Lynk / Supabase secret
./scripts/verify-product-funnel.sh
```

---

## Isolasi produk

Pembeli Finance tidak otomatis masuk Planner/Estimator dan sebaliknya — lihat [`../MONEFYI_PRODUCT_ENTITLEMENTS.md`](../MONEFYI_PRODUCT_ENTITLEMENTS.md).
