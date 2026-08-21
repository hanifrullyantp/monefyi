# Lynk.id + Resend — Setup Manual (Planner)

## Lynk store Planner (terpisah dari Finance)

1. Buat store baru di [Lynk.id](https://lynk.id) (jangan pakai store `asfin-ai` Finance).
2. Buat **3 produk**:

| Slug | Title (exact) | Harga |
|------|---------------|-------|
| `estimator-standard` | `Monefyi Estimator Standard` | Rp 99.000 |
| `estimator-pro` | `Monefyi Estimator Pro` | Rp 199.000 |
| `planner-pro-monthly` | `Monefyi Planner Pro Bulanan` | Rp 199.000 |

3. **Webhook URL** (store Planner):

```
https://YOUR_PROJECT.supabase.co/functions/v1/planner-lynk-webhook
```

4. Set header signature `X-Lynk-Signature` = nilai env `PLANNER_LYNK_SIGNATURE_TOKEN`.

5. Salin checkout URL tiap produk ke env Vercel landing + SPA:

- `NEXT_PUBLIC_LYNK_ESTIMATOR_STANDARD`
- `NEXT_PUBLIC_LYNK_ESTIMATOR_PRO`
- `NEXT_PUBLIC_LYNK_PLANNER_PRO`
- `VITE_LYNK_*` (same values di project `monefyi_planner`)

Query params yang dikirim client (harus diteruskan ke webhook jika Lynk mendukung):

```
org_id, user_id, product, customer_email, return_url
```

## Supabase Edge — env `planner-lynk-webhook`

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PLANNER_LYNK_SIGNATURE_TOKEN=
REQUIRE_LYNK_SIGNATURE=true
RESEND_API_KEY=
RESEND_FROM_EMAIL="Monefyi Planner <noreply@support.monefyi.com>"
APP_URL=https://planner.monefyi.com
PLANNER_APP_URL=https://planner.monefyi.com/app
MONTHLY_DAYS=30
ESTIMATOR_STANDARD_PRICE=99000
ESTIMATOR_PRO_PRICE=199000
PLANNER_PRO_MONTHLY_PRICE=199000
```

Deploy:

```bash
cd my-supabase-project
supabase functions deploy planner-lynk-webhook --no-verify-jwt
```

## Resend + Supabase Auth

1. Verifikasi domain `support.monefyi.com` di Resend (SPF/DKIM).
2. Supabase Dashboard → **Authentication** → **SMTP**: host `smtp.resend.com`, user `resend`, password = Resend API key.
3. **Auth Hooks** → Send Email hook → `auth-send-email` edge function.
4. Set `APP_URL=https://planner.monefyi.com` on `auth-send-email` function.

## Post-payment user baru

Webhook **tidak** mengirim password plain-text. User baru menerima email konfirmasi + tombol **Atur password & masuk** (Supabase `generateLink` recovery).
