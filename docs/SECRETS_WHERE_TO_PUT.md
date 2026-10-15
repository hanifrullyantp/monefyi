# Di mana menaruh token & secret (jangan di chat / jangan di Git)

**Jangan** tempel merchant key, `VERCEL_TOKEN`, atau `SUPABASE_SERVICE_ROLE_KEY` di chat Cursor, issue GitHub, atau commit.

Gunakan lokasi di bawah. File **contoh** (`.env.example`) hanya berisi placeholder; file **asli** sudah di-ignore Git.

---

## Ringkas: 3 tempat

| Tempat | Untuk apa |
|--------|-----------|
| **Supabase Dashboard** | Secret production Edge Functions (Lynk, Resend, email) |
| **GitHub → repo → Settings → Secrets → Actions** | CI deploy & tes otomatis |
| **File lokal di laptop** (gitignored) | Develop & script `./scripts/verify-product-funnel.sh` |

---

## 1. Production — Supabase (wajib untuk order Lynk)

**Dashboard:** [Supabase project](https://supabase.com/dashboard/project/zzwqfmdyncxbolestkqp) → **Project Settings → Edge Functions → Secrets**

| Nama secret | Isi |
|-------------|-----|
| `LYNK_MERCHANT_KEY` | Merchant key dari Lynk (setelah simpan webhook URL) |
| `REQUIRE_LYNK_SIGNATURE` | `true` |
| `REQUIRE_PURCHASE_EMAIL` | `true` |
| `RESEND_API_KEY` | API key Resend |
| `RESEND_FROM_EMAIL` | Contoh: `Monefyi Estimator <noreply@support.monefyi.com>` |
| `APP_URL` | Finance: `https://app.monefyi.com` |
| `ESTIMATOR_SITE_URL` / `ESTIMATOR_APP_URL` | Estimator |
| `SEND_EMAIL_HOOK_SECRET` | Dari Auth → Hooks (function `auth-send-email`) |

Set via CLI (dari folder `my-supabase-project`, isi nilai asli di terminal Anda):

```bash
npx supabase secrets set LYNK_MERCHANT_KEY="..." REQUIRE_PURCHASE_EMAIL=true
```

Detail: [`planner/LYNK_WEBHOOK.md`](planner/LYNK_WEBHOOK.md).

---

## 2. CI GitHub Actions

**GitHub:** repo **monefyi** → **Settings → Secrets and variables → Actions**

| Secret | Fungsi |
|--------|--------|
| `SUPABASE_ACCESS_TOKEN` | Deploy Edge Functions / db push |
| `SUPABASE_PROJECT_REF` | `zzwqfmdyncxbolestkqp` |
| `LYNK_MERCHANT_KEY` | Tes `./scripts/verify-product-funnel.sh` di CI |
| `VERCEL_TOKEN` | Deploy front-end (perbarui jika CI Vercel gagal) |
| `VERCEL_ORG_ID`, `VERCEL_*_PROJECT_ID` | Sudah ada di repo |

Anda **tidak** perlu copy secret ini ke file lokal kecuali mau deploy manual dari laptop.

---

## 3. File lokal di laptop (develop & tes)

### A. Supabase CLI — **`my-supabase-project/.env`**

Salin dari contoh:

```bash
cp my-supabase-project/.env.example my-supabase-project/.env
```

Isi minimal:

- `SUPABASE_ACCESS_TOKEN` — https://supabase.com/dashboard/account/tokens  
- `SUPABASE_PROJECT_REF` — `zzwqfmdyncxbolestkqp`  

Opsional (hanya untuk script tes Lynk di laptop):

- `LYNK_MERCHANT_KEY` — sama dengan di Supabase Dashboard  

File ini **gitignored** (`my-supabase-project/.env`).

### B. Frontend Planner/Estimator — **`monefyi_planner/.env.local`**

Sudah dipakai untuk `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (bukan secret server).

### C. Opsional — **`my-supabase-project/secrets.local.env`**

Jika ingin pisah token Lynk dari `.env`:

```bash
cp my-supabase-project/secrets.local.env.example my-supabase-project/secrets.local.env
# edit secrets.local.env
source my-supabase-project/secrets.local.env
./scripts/verify-product-funnel.sh
```

File `secrets.local.env` **gitignored**.

---

## Apakah boleh taruh token di chat Cursor?

**Tidak.** Chat bisa tersimpan/terlihat; merchant key sebaiknya **rotate** di Lynk jika pernah pernah dikirim di chat.

Yang aman:

1. Paste hanya ke **Supabase Secrets** atau **GitHub Secrets** atau **file `.env` lokal** di atas.  
2. Di Cursor, cukup bilang: “sudah saya set di Supabase / di `.env`” — tanpa menempel nilainya.

---

## Checklist sekali

- [ ] Lynk webhook URL tersimpan di dashboard Lynk  
- [ ] `LYNK_MERCHANT_KEY` di **Supabase Edge secrets** (production)  
- [ ] `my-supabase-project/.env` berisi `SUPABASE_ACCESS_TOKEN` (untuk deploy dari laptop)  
- [ ] Opsional: `LYNK_MERCHANT_KEY` di `.env` lokal untuk `./scripts/verify-product-funnel.sh`  
- [ ] GitHub `VERCEL_TOKEN` valid (hanya jika pakai deploy Vercel otomatis)
