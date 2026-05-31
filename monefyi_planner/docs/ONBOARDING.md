# Multi-Role Onboarding — Monefyi Planner

## Overview

Production onboarding with secure role assignment:

- **Owner**: registers and creates organization via edge function (no self-assigned roles)
- **Manager/Worker**: join via invitation link, code, email invite, domain auto-join, or join request

## Flows

### Owner
1. `/signup` → **Buat Perusahaan** → `/signup/owner`
2. Email verification (Supabase)
3. Edge function `planner-create-owner-org`
4. `/onboarding/owner` wizard
5. `/app`

### Member (invite link)
1. `/join?token=...`
2. Register or login
3. Edge function `planner-accept-invitation`
4. `/onboarding/member`

### Member (code)
1. `/join-by-code` → enter `XXX-NNN`
2. Same as link flow

### Member (request join)
1. `/find-company` → search public orgs
2. Submit request → owner approves in **Tim → Join Requests**

## Team management

Owners/Managers: **Tim** tab in app sidebar

- Invite modal: link (QR + WA share), email (bulk CSV), join code
- Role changes (owner only)
- Remove members (owner; manager can remove workers)
- Transfer ownership (owner → manager)
- Audit log (owner)
- Access settings: join request, public directory, email domain auto-join

## Database

Apply migrations in order:

```
my-supabase-project/supabase/migrations/20260531120000_planner_onboarding.sql
my-supabase-project/supabase/migrations/20260531120100_planner_onboarding_seed.sql
```

## Edge functions

Deploy from `my-supabase-project/supabase/functions/`:

| Function | Auth | Purpose |
|----------|------|---------|
| planner-create-owner-org | JWT | Create org + owner membership |
| planner-validate-invitation | Public | Preview invite |
| planner-create-invitation | JWT | Generate link/code |
| planner-accept-invitation | JWT | Join org |
| planner-send-invitation-email | JWT | Resend emails |
| planner-revoke-invitation | JWT | Revoke invite |
| planner-submit-join-request | JWT | Submit join request + email admins (Resend) |
| planner-approve-join-request | JWT | Approve request |
| planner-reject-join-request | JWT | Reject request |
| planner-change-member-role | JWT | Role change |
| planner-remove-member | JWT | Soft remove |
| planner-transfer-ownership | JWT | Transfer owner |
| planner-search-companies | Public | Find company |
| planner-try-domain-join | JWT | Domain auto-join |
| planner-analyze | JWT | AI analysis |
| planner-parse-command | JWT | AI command parser |

### Deploy (CLI)

Project ref: **Settings → General → Reference ID** (contoh repo: `zzwqfmdyncxbolestkqp`).

```bash
# 1. Buat token: https://supabase.com/dashboard/account/tokens

# 2. Login (pilih salah satu)
npx supabase@latest login --token "sbp_YOUR_TOKEN"
# atau interaktif (buka browser):
npx supabase@latest login

# 3. Deploy migrasi + semua function Planner
export SUPABASE_ACCESS_TOKEN="sbp_YOUR_TOKEN"
export SUPABASE_PROJECT_REF="your-project-ref"
./scripts/deploy-planner-supabase.sh

# Hanya function (tanpa db push):
SKIP_DB_PUSH=1 ./scripts/deploy-planner-supabase.sh
```

Alternatif: GitHub Actions → **Supabase Planner migrate & deploy** (butuh secrets `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF`).

### Email (semua via Resend + domain monefyi.com)

| Jenis email | Mekanisme | Pengirim |
|-------------|-----------|----------|
| Daftar, verifikasi, reset password, magic link | **Auth Send Email Hook** → `auth-send-email` → Resend API | `Monefyi <noreply@monefyi.com>` |
| Undangan tim, welcome, join request, approve/reject, role, remove | Edge Functions → `_shared/email.ts` | `RESEND_FROM_EMAIL` (default `Monefyi <noreply@monefyi.com>`) |
| Konfirmasi pembayaran Lynk | `lynk-webhook` → shared Resend | sama |

**Auth email (daftar / reset):** Supabase SMTP sering gagal meski Resend API sudah benar. Pakai **Send Email Hook**:

1. Deploy function `auth-send-email`
2. Supabase Dashboard → **Authentication** → **Hooks** → **Send Email** → Enable
3. URL: `https://zzwqfmdyncxbolestkqp.supabase.co/functions/v1/auth-send-email`
4. Copy **Hook Secret** → Edge secret `SEND_EMAIL_HOOK_SECRET` (format `v1,whsec_...`)
5. Redirect URLs: `https://planner.monefyi.com/**`, `http://localhost:5173/**`

SMTP Auth bisa tetap aktif sebagai fallback, tapi hook menggantikan pengiriman email Auth.

**Edge secrets (wajib production):**

```
RESEND_API_KEY
RESEND_FROM_EMAIL=Monefyi <noreply@monefyi.com>
SEND_EMAIL_HOOK_SECRET=v1,whsec_...   # dari Auth → Hooks → Send Email
APP_URL=https://planner.monefyi.com
```

User bisa mematikan email transaksional di **Pengaturan → Notifikasi** (`profiles.email_notifications`).

### Edge env vars

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
APP_URL
APP_CORS_ORIGIN
SKIP_EMAIL_VERIFY=true  # dev only
```

## Frontend env

See `.env.example`. Dev bypass:

```
VITE_SKIP_EMAIL_VERIFY=true
```

## Seed test users

Password: `TestOnboard2026!`

- `owner-onboard@test.monefyi.app` (owner)
- `mgr1-onboard@test.monefyi.app` (manager)
- `worker1-onboard@test.monefyi.app` (worker)

## Security

- RLS: no client-side `planner_org_members` INSERT
- Rate limits: 10 invites/day, 5 join requests/day
- Password: min 8, uppercase, digit, symbol
- Email verification required before join (configurable in dev)

## Manual QA checklist

- [ ] Owner signup → org created → onboarding → team page
- [ ] Generate invite link → join as worker
- [ ] Email invite (if Resend configured)
- [ ] Join code flow
- [ ] Find company → request → approve
- [ ] Domain auto-join toggle + test
- [ ] Role change / remove / transfer ownership
- [ ] Audit log entries visible
