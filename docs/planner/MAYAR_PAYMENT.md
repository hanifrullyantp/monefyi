# Planner / Estimator — Mayar + switch Lynk

Gateway checkout Planner & Estimator bisa **Lynk** (default) atau **Mayar**, tanpa ubah alur entitlement (webhook → `activate_subscription` → email).

## Switch provider

| Layer | Lynk | Mayar |
| --- | --- | --- |
| **App (Vite)** | `VITE_PLANNER_PAYMENT_PROVIDER=lynk` | `VITE_PLANNER_PAYMENT_PROVIDER=mayar` |
| **Landing (Next)** | `NEXT_PUBLIC_PLANNER_PAYMENT_PROVIDER=lynk` | `NEXT_PUBLIC_PLANNER_PAYMENT_PROVIDER=mayar` |
| **Supabase (edge)** | `PLANNER_PAYMENT_PROVIDER=lynk` | `PLANNER_PAYMENT_PROVIDER=mayar` |
| **CMS** | `/admin/pricing` → Gateway **Lynk** | `/admin/pricing` → Gateway **Mayar** |
| **DB default** | `app_config.platform_settings.planner_payment_provider` | sama |

Env **meng-override** CMS. Public config (`monefyi-public-config`) expose `pricing.planner_payment_provider` untuk landing.

## Mayar — setup

1. **API key** — [web.mayar.id](https://web.mayar.id) → Integration → API Key.
2. **Supabase secrets** (functions `planner-checkout`, `planner-mayar-webhook`):

   - `MAYAR_API_KEY`
   - `MAYAR_API_URL` — opsional (`https://api.mayar.id` prod, `https://api.mayar.club` sandbox)
   - `MAYAR_CHECKOUT_DEFAULT_MOBILE` — nomor placeholder jika checkout tanpa HP (default `081234567890`)

3. **Webhook Mayar** (CLI skill / terminal):

   ```bash
   npx -y mayar@latest webhook register \
     "https://<PROJECT_REF>.supabase.co/functions/v1/planner-mayar-webhook"
   npx -y mayar@latest webhook test \
     "https://<PROJECT_REF>.supabase.co/functions/v1/planner-mayar-webhook"
   ```

4. **Deploy**:

   ```bash
   cd my-supabase-project
   supabase db push   # migration planner_checkout_sessions, mayar_webhook_events
   supabase functions deploy planner-checkout planner-mayar-webhook --no-verify-jwt
   ```

5. **Migrasi SQL**: `20261104180000_planner_mayar_payment.sql`

## Alur checkout Mayar

1. User klik Beli → app memanggil edge **`planner-checkout`** (`provider: mayar`).
2. Server membuat payment via `POST /hl/v2/payments/create` dengan metadata `monefyi:{org_id,user_id,product,...}` di `description`.
3. Sesi disimpan di `planner_checkout_sessions`.
4. User bayar di Mayar → redirect `return_url?payment=success`.
5. Webhook **`planner-mayar-webhook`** → aktivasi sama seperti Lynk (`payment_provider=mayar`).

## Lynk (tetap)

Tanpa Mayar, checkout langsung ke URL Lynk (`VITE_LYNK_*` / CMS `lynkCheckoutUrls`). Webhook: `planner-lynk-webhook`.

## Skill Mayar CLI (Cursor / agent)

Untuk eksplorasi API & operasi admin:

```bash
npx -y mayar@latest whoami --json
npx -y mayar@latest docs openapi
npx -y mayar@latest payment list --limit 5
```

Repo skill: [mayarid/mayar-cli](https://github.com/mayarid/mayar-cli) — integrasi app pakai HTTP native; CLI untuk webhook register, test payment, dll.

## QA singkat

- [ ] `VITE_PLANNER_PAYMENT_PROVIDER=lynk` → redirect Lynk, webhook Lynk aktif subscription
- [ ] Switch `mayar` → redirect URL Mayar, webhook Mayar, `payment_provider=mayar` di subscription
- [ ] Return URL `?payment=success` → entitlement refresh
- [ ] User baru Mayar → email set password (sama seperti Lynk)

Lihat juga: [LYNK_WEBHOOK.md](./LYNK_WEBHOOK.md), [PLANNER_LYNK_QA_CHECKLIST.md](./PLANNER_LYNK_QA_CHECKLIST.md).
