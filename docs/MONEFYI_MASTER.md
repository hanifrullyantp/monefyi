# Monefyi — Dokumentasi Master

> **Dokumen referensi lengkap** ekosistem Monefyi: produk, arsitektur, data, fitur, backend, deploy, dan panduan pengembangan.  
> **Terakhir diperbarui:** Juli 2026  
> **Indeks navigasi:** [`README.md`](README.md)

---

## Daftar isi

1. [Ringkasan eksekutif](#1-ringkasan-eksekutif)
2. [Ekosistem produk](#2-ekosistem-produk)
3. [Tech stack](#3-tech-stack)
4. [Struktur repository](#4-struktur-repository)
5. [Arsitektur aplikasi PWA](#5-arsitektur-aplikasi-pwa)
6. [Model data](#6-model-data)
7. [Fitur utama](#7-fitur-utama)
8. [Parsing transaksi](#8-parsing-transaksi)
9. [Backend Supabase](#9-backend-supabase)
10. [Offline, sync & PWA](#10-offline-sync--pwa)
11. [Monetisasi & entitlement](#11-monetisasi--entitlement)
12. [Deploy & operasional](#12-deploy--operasional)
13. [Pengembangan lokal](#13-pengembangan-lokal)
14. [Testing & QA](#14-testing--qa)
15. [Roadmap & status](#15-roadmap--status)
16. [Indeks dokumen terkait](#16-indeks-dokumen-terkait)

---

## 1. Ringkasan eksekutif

**Monefyi** adalah platform keuangan pribadi berbasis **Progressive Web App (PWA)** dengan diferensiasi **input transaksi AI-first** dan **asisten keuangan (Monevisor)**.

| Aspek | Deskripsi |
|-------|-----------|
| **Janji produk** | *"Catat transaksi semudah chat. Pahami keuanganmu dengan AI."* |
| **Target user** | Individu/keluarga Indonesia (primary), bilingual ID/EN |
| **Platform utama** | `monefyi.com/app/` — vanilla JS PWA |
| **Backend** | Supabase (Auth, PostgreSQL + RLS, Edge Functions, Storage) |
| **AI** | Google Gemini via Edge Functions (+ BYOK user key) |
| **Deploy** | Vercel → `dist/` (branch `main` = production) |

### Kekuatan inti

- Input multi-modal: teks natural, batch WhatsApp, OCR struk, suara, form manual
- Budget per kategori dengan item, rincian pengeluaran, drag-drop urutan, jadwal & pengingat
- Monevisor: diagnosis keuangan + chat AI + one-tap apply rekomendasi budget
- Offline-first: IndexedDB + sync engine + antrian pending
- i18n ID/EN, dark/light theme, mobile-first + sidebar desktop

### Peluang / gap aktif

- Parser masih **AI-first** di quick add (target: deterministik-first L0–L5)
- ~40% string UI masih hardcoded Indonesia
- OCR receipt: Tesseract `eng`, belum vision AI penuh
- Design system belum 100% unified (emerald brand vs legacy slate)

Detail analisis produk: [`MONEFYI_PRODUCT_PROMPT.md`](MONEFYI_PRODUCT_PROMPT.md).

---

## 2. Ekosistem produk

Monefyi bukan satu aplikasi — repo ini memuat **beberapa frontend** dengan backend Supabase bersama:

```
monefyi.com/
├── /                    → landing/          Marketing
└── /app/                → app/              PWA keuangan pribadi ★ UTAMA

planner.monefyi.com      → monefyi_planner/  Planner React (SaaS bisnis/proyek)
[planner deploy terpisah]→ planner/           Planner vanilla PWA (legacy/alternatif)
```

| Produk | URL | Stack | Fokus |
|--------|-----|-------|-------|
| **Monefyi PWA** | `/app/` | HTML + vanilla JS + Vite | Keuangan pribadi, transaksi, budget, Monevisor |
| **Landing** | `/` | HTML statis | Marketing, CTA signup |
| **Planner (React)** | subdomain terpisah | React + Vite + Tailwind | Manajemen proyek/bisnis, multitenant org |
| **Planner (vanilla)** | deploy Vercel `planner/` | Vite + HTML/JS | Versi alternatif planner |

**Dokumen ini fokus pada PWA Monefyi** (`app/`). Planner: [`../planner/README.md`](../planner/README.md), [`../monefyi_planner/README.md`](../monefyi_planner/README.md), [`../PLANNER_PRODUCTION_PLAN.md`](../PLANNER_PRODUCTION_PLAN.md).

---

## 3. Tech stack

### Frontend (PWA)

| Layer | Teknologi |
|-------|-----------|
| UI | HTML5, vanilla JavaScript (ES6+), no React/Vue |
| Styling | Tailwind CDN + CSS custom properties (`app/css/app.css`, `budget-enhanced.css`, dll.) |
| Build | Vite (`npm run build` → `dist/`) |
| Storage lokal | IndexedDB via Dexie (`offline-db.js`) |
| PWA | Service worker (`sw.js`), manifest, install prompt |
| Chart | Chart.js (CDN) |
| OCR | Tesseract.js (CDN) |
| i18n | `js/i18n.js` + locale keys (migrasi dari inline `I18N`) |

### Backend

| Layer | Teknologi |
|-------|-----------|
| BaaS | Supabase |
| DB | PostgreSQL 15 + Row Level Security |
| Auth | Supabase Auth (email/password) |
| Serverless | Supabase Edge Functions (Deno) |
| Storage | Supabase Storage (logo, tutorial media) |
| AI | Gemini 1.5 Flash (structured output) |
| Email | Resend (auth, drip, email import) |
| Payment | Lynk.id webhook → aktivasi plan |

### DevOps

| Layer | Teknologi |
|-------|-----------|
| Hosting frontend | Vercel |
| CI smoke | `npm run smoke` |
| DNS | Rumahweb → Vercel |

Dependensi detail: [`../DEPENDENCY_MAP.md`](../DEPENDENCY_MAP.md).

---

## 4. Struktur repository

```
monefyi/
├── app/                    ★ Source PWA (index.html, js/, css/, sw.js)
│   ├── js/
│   │   ├── app.js          Monolith utama (~12k baris): STATE, auth, nav, CRUD
│   │   ├── config.js       Supabase URL, keys, function names, admin emails
│   │   ├── components/     Modul UI (budget, transaksi, notifikasi, …)
│   │   ├── services/       Logika bisnis & data
│   │   ├── parsers/        Pipeline parse client-side (L0, L2)
│   │   └── pages/          Halaman penuh (home, monevisor, settings, admin)
│   └── public/             Mirror build (sync setelah edit app/)
├── landing/                Landing page production
├── my-supabase-project/    ★ Backend kanonik (functions + migrations)
├── docs/                   Dokumentasi (indeks: docs/README.md)
├── .monefyi/               Konteks AI Cursor (parser migration)
├── scripts/                Utilitas build/refactor
├── tests/                  Unit test (Deno/Vitest)
├── shared/                 Brand tokens CSS
├── dist/                   Output Vite build
├── planner/                Planner vanilla (deploy terpisah)
└── monefyi_planner/        Planner React (deploy terpisah)
```

> **Penting:** Migrasi DB & Edge Functions **hanya** di `my-supabase-project/`. Folder `supabase/` di root adalah legacy (4 file lama).

---

## 5. Arsitektur aplikasi PWA

### Diagram high-level

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (PWA)                                │
├─────────────────────────────────────────────────────────────────────┤
│  app/index.html    Shell: nav, sheets, sidebar, bottom bar          │
│  app/js/app.js     STATE, routing, auth, render orchestration       │
│  components/*      Feature UI modules (lazy import)                 │
│  services/*        Domain logic, sync, notifications               │
│  parsers/*         Client parse L0–L2                               │
│  offline-db.js     IndexedDB cache                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │ JWT + REST + Edge Functions
┌────────────────────────────▼────────────────────────────────────────┐
│                         Supabase                                     │
│  PostgreSQL (RLS)  │  Auth  │  Storage  │  Edge Functions           │
└─────────────────────────────────────────────────────────────────────┘
```

### STATE global (`app/js/app.js`)

Objek `STATE` (juga `window.STATE`) adalah single source of truth runtime:

| Key | Isi |
|-----|-----|
| `STATE.transactions` | Daftar transaksi periode aktif |
| `STATE.budgetsByMonth` | Map `YYYY-MM` → `{ income, categories: { rows[] } }` |
| `STATE.budgetDraft` | Draft budget saat edit halaman budget |
| `STATE.period` / `STATE.selectedMonth` | Periode filter |
| `STATE.settings` | Lang, theme, Gemini key, preferensi |
| `STATE.ui` | Flag UI (`budgetPageOpen`, sheets, dll.) |
| `STATE.db.user` | User Supabase terautentikasi |

### Navigasi utama

| Tab / Nav | Modul | File kunci |
|-----------|-------|------------|
| Beranda | Dashboard KPI, chart, recent tx | `pages/home-page.js` |
| Transaksi | List, filter, edit | `app.js` + `tx-page-widgets.js` |
| Budget | Full-page budget UI | `components/budget-page.js` |
| Monevisor | AI advisor | `pages/monevisor-page.js` |
| Settings | Akun, notifikasi, email import | `pages/settings-page.js` |
| Admin | Console super-admin | `pages/admin-page.js` |

### Pola modularisasi

- **Komponen** (`components/`): render HTML, wire event, export fungsi `render*` / `show*`
- **Service** (`services/`): pure logic, Supabase/IndexedDB, no DOM
- **Lazy import**: `await import('./components/...')` untuk code splitting ringan
- **Mirror `app/public/`**: setelah edit `app/js/` atau `app/css/`, sync ke `app/public/`

---

## 6. Model data

### Transaksi (`transactions`)

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `id` | uuid | ✅ | Primary key |
| `user_id` | uuid | ✅ | RLS isolation |
| `date` | date | ✅ | ISO `YYYY-MM-DD` |
| `amount` | number | ✅ | Positif; type menentukan arah |
| `type` | enum | ✅ | `expense` \| `income` \| `transfer` |
| `category` | string | | Kategori bebas |
| `merchant` | string | | Nama merchant |
| `account` | string | | Nama akun (BCA, GoPay, …) |
| `notes` | string | | Catatan |
| `linked_budget_item_id` | string | | Link ke item budget |

### Budget bulanan (`budgets`)

Satu baris per `(user_id, month)`:

```json
{
  "month": "2026-07",
  "income": 15000000,
  "categories": {
    "rows": [ /* BudgetRow[] */ ]
  }
}
```

### BudgetRow (kategori budget)

| Field | Keterangan |
|-------|------------|
| `id`, `name`, `amount` | Identitas & total kategori |
| `priority` | `harus` \| `penting` \| `mau` \| `simpan` |
| `items[]` | Detail item budget |
| `target_start`, `target_end`, `target_type` | Jadwal kategori |
| `notification_thresholds` | Milestone % (default `[75, 100]`) |
| `auto_link_keywords[]` | Auto-link transaksi |

### BudgetItem (item dalam kategori)

| Field | Keterangan |
|-------|------------|
| `id`, `name`, `qty`, `price` | Identitas & nominal |
| `line_items[]` | Rincian pengeluaran opsional (qty, unit, amount) |
| `target_date` | ISO `YYYY-MM-DD` — jadwal realisasi |
| `target_date_day` | Hari bulan (`"15"`) — untuk pengingat recurring |
| `status` | `planned` \| `pending` \| `done` \| `skipped` |
| `notes` | Catatan item |
| `linked_transactions[]` | ID transaksi terlink |

**Total item:** jika `line_items` aktif → sum kolom `amount`; else `qty × price`.

Model kanonik: `app/js/services/budget-model.js` — `createBudgetRow`, `createBudgetItem`, `createBudgetLineItem`, `serializeBudgetRows`.

### Profil & plan

| Tabel | Isi |
|-------|-----|
| `profiles` | User metadata, role, settings JSON |
| `user_plans` | Plan aktif (trial, monthly, lifetime) |
| `ai_usage` | Kuota AI harian |

---

## 7. Fitur utama

### 7.1 Input transaksi

| Mode | Entry | Parser | File |
|------|-------|--------|------|
| Quick Add | Textarea satu baris | Client L0–L2 → server AI fallback | `app.js`, `parser-orchestrator.js` |
| Batch WhatsApp | Paste chat export | Edge `asfin-parse-transaction` | `app.js` |
| Receipt OCR | Foto struk | Tesseract → parse | `receipt-scanner.js`, `ocr-extractor.js` |
| Voice | Mikrofon | Whisper edge → parse | `voice-input.js` |
| Manual | Form lengkap | — | `app.js` |

Alur ideal: **input → preview card → Simpan** (≤2 tap).

### 7.2 Halaman Budget (full-page)

File utama: `app/js/components/budget-page.js`

| Fitur | Keterangan |
|-------|------------|
| **Summary hero** | Realisasi vs budget, stabil saat edit draft |
| **Income strip** | Alokasi income vs total budget |
| **Daftar kategori** | Accordion expand, sort (urgent/prioritas/progress/nominal/nama/urutan sendiri) |
| **Item inline edit** | Nama, slider nominal, rincian pengeluaran |
| **Rincian pengeluaran** | Tabel: item, qty, satuan, jumlah; total derived |
| **Drag & drop** | Reorder kategori (mode urutan sendiri), item, baris rincian |
| **Toolbar** | Undo/redo, simpan, cancel, duplikat, hapus item, auto budget, template |
| **Double-click item** | Modal detail: status, jadwal realisasi, catatan, tx terlink |
| **Draft sync** | `window.STATE.budgetDraft` ↔ `mirrorDraftToState()` |
| **Save** | `handleSaveBudget()` di `app.js` → Supabase upsert |

CSS: `app/css/budget-enhanced.css`.

Modul terkait:
- `budget-summary-hero.js`, `budget-form-modal.js`, `budget-item-detail-modal.js`
- `budget-generator-modal.js`, `budget-template-modal.js`, `budget-changes-tracker.js`
- `income-manager.js`, `budget-evaluation.js`

### 7.3 Monevisor (AI Advisor)

Full-page tab dengan laporan keuangan + chat AI collapsible.

| Komponen | File / Edge Function |
|----------|---------------------|
| UI page | `pages/monevisor-page.js` |
| Client | `services/monevisor-client.js` |
| Offline fallback | `services/monevisor-heuristic.js` |
| Laporan | `services/financial-report.js` |
| Generate insight | Edge `monefyi-generate-insights` |
| Chat | Edge `ai-user-coach` |
| Apply aksi | Edge `monevisor-apply-action` |

Dokumentasi lengkap: [`MONEVISOR.md`](MONEVISOR.md).

### 7.4 Notifikasi & pengingat

| Layer | File | Fungsi |
|-------|------|--------|
| In-app inbox | `notification-center.js` | Bell UI, IndexedDB notifications |
| OS push | `push-notification.js`, `notification-scheduler.js` | Browser push, cron checks |
| Budget due date | `checkBudgetDueDates()` | H-3, H-1, H-0 dari `target_date_day` |
| Bill reminders | `checkBillReminders()` | Push tagihan item budget |
| Milestone | `checkBudgetMilestones()` | Alert % budget kategori |

Jadwal item di-set via modal detail item (double-click) → `syncItemTargetDate()`.

### 7.5 Fitur pendukung

| Fitur | Modul |
|-------|-------|
| Email import bank | `email-import-setup.js`, edge `email-import` |
| Offline/sync | `sync-engine.js`, `pending-queue.js`, `offline-indicator.js` |
| Entitlement/upgrade | `entitlements.js`, `upgrade-sheet.js`, Lynk webhook |
| Tutorial | `tutorial-page.js`, `tutorial-service.js` |
| Onboarding | `onboarding-wizard.js`, `product-tour.js` |
| Global filter | `global-filter.js` — period/account across views |
| Undo/redo tx | `undo-redo.js`, `tx-edit-session.js` |
| Admin console | `admin-page.js` + edge `monefyi-admin-*` |

---

## 8. Parsing transaksi

### Status saat ini (Juli 2026)

| Lokasi | Perilaku |
|--------|----------|
| **PWA `parseQuickText()`** | Masih AI-first; heuristic client sebagai fallback |
| **Edge `asfin-parse-transaction`** | Parser manual kuat (WhatsApp, regex) + Gemini fallback |
| **Client `parsers/`** | L0 normalize + L2 rules (Phase 1 partial) |
| **Planner** | Pipeline 4-layer lengkap (referensi target) |

### Target arsitektur (L0–L5)

```
INPUT → L0 Preprocess → L1 Memory → L2 Rules → L3 Fuzzy → L4 AI → L5 Review
         normalize      IndexedDB    grammar     entity     Gemini   manual
Confidence:              ≥0.95        ≥0.75       ≥0.65      ≥0.60    <0.60
```

| Layer | File (target/planned) | Offline? |
|-------|----------------------|----------|
| L0 | `parsers/normalize.js` | ✅ |
| L1 | `services/memory.js` | ✅ IndexedDB |
| L2 | `parsers/rules.js`, `reference/GRAMMAR_RULES.ts` | ✅ |
| L3 | Entity resolver (server) | ❌ |
| L4 | `asfin-parse-transaction` Gemini | ❌ |
| L5 | Review queue UI | ✅ |

Dokumentasi lengkap:
- [`ARSITEKTUR_PARSING_MONEFYI.md`](ARSITEKTUR_PARSING_MONEFYI.md)
- [`.monefyi/PARSE_MIGRATION_CONTEXT.md`](../.monefyi/PARSE_MIGRATION_CONTEXT.md)
- [`phases/PHASE_1_FOUNDATION.md`](phases/PHASE_1_FOUNDATION.md)
- [`.monefyi/DECISION_LOG.md`](../.monefyi/DECISION_LOG.md)
- [`reference/GRAMMAR_RULES.ts`](reference/GRAMMAR_RULES.ts)
- [`testing/GOLDEN_DATASET.json`](testing/GOLDEN_DATASET.json)

---

## 9. Backend Supabase

**Lokasi kanonik:** `my-supabase-project/supabase/`

### Edge Functions — PWA Finance

| Function | Peran |
|----------|-------|
| `asfin-parse-transaction` | Parse teks/batch transaksi |
| `ai-user-coach` | Chat Monevisor |
| `monefyi-generate-insights` | Insight & diagnosis AI |
| `monevisor-apply-action` | Apply rekomendasi budget |
| `monefyi-voice-transcribe` | Voice → teks |
| `email-import` | Webhook email bank |
| `ai-quota-status` | Kuota AI harian |
| `lynk-webhook` | Aktivasi subscription |
| `start-trial` | Trial signup |
| `auth-send-email` | Email auth custom |
| `monefyi-admin-*` | Admin CRUD (users, config, revenue, …) |
| `monefyi-landing-config` | Config landing publik |

Mapping frontend ↔ function: [`../EDGE_FUNCTION_AUDIT.md`](../EDGE_FUNCTION_AUDIT.md).

Shared helpers: `functions/_shared/` (`cors.ts`, `auth.ts`, `gemini.ts`, `rateLimit.ts`).

### Keamanan

- **RLS** wajib di semua tabel user-facing
- **Anon key** di client (normal); **service_role** hanya di edge/server
- CORS: env `APP_CORS_ORIGIN` (mis. `https://monefyi.com`)
- Admin: `profiles.role = 'admin'` + edge auth check

Panduan deploy Supabase: [`../my-supabase-project/README.md`](../my-supabase-project/README.md).

---

## 10. Offline, sync & PWA

### IndexedDB (Dexie)

Database lokal: transaksi, budget, notifications, pending queue, parse memory.

| Service | Peran |
|---------|-------|
| `offline-db.js` | Schema Dexie |
| `data-store.js` | Mirror STATE ↔ IndexedDB |
| `sync-engine.js` | Push/pull Supabase |
| `pending-queue.js` | Antrian operasi offline |

### Service Worker

- File: `app/sw.js`
- Cache strategi: app shell + runtime GET same-origin
- Header `Cache-Control` on `sw.js` di `vercel.json` untuk update cepat

### Indikator UI

`sync-indicator.js`, `offline-indicator.js`, `pending-badge.js`

---

## 11. Monetisasi & entitlement

| Plan | Mekanisme |
|------|-----------|
| Trial | `start-trial` edge, anti-abuse |
| Monthly / Lifetime | Lynk.id checkout → `lynk-webhook` |
| BYOK Gemini | User key di `profiles.settings` |

Modul: `entitlements.js`, `upgrade-sheet.js`.  
Matrix preview: [`preview/ENTITLEMENT_MATRIX.md`](preview/ENTITLEMENT_MATRIX.md).  
Admin plans: [`ADMIN_RUNBOOK.md`](ADMIN_RUNBOOK.md) § Plans & Pricing.

---

## 12. Deploy & operasional

### URL production

| URL | Folder | Build output |
|-----|--------|--------------|
| `monefyi.com/` | `landing/` | `dist/index.html` |
| `monefyi.com/app/` | `app/` | `dist/app/` |

Detail: [`DEPLOY_STRUCTURE.md`](DEPLOY_STRUCTURE.md).

### Vercel

- Build: `npm run build`
- Output: `dist`
- Rewrite: `/app/*` → `/app/index.html`
- Branch `main` → production

### Supabase Auth redirect

- Site URL: `https://monefyi.com/app/`
- Redirect URLs: `https://monefyi.com/app/**`

### Admin operasional

[`ADMIN_RUNBOOK.md`](ADMIN_RUNBOOK.md) — mode bisnis, plans, feedback, tutorial CMS.

### Migrasi & risiko

- [`../MIGRATION_VERCEL_PLAN.md`](../MIGRATION_VERCEL_PLAN.md)
- [`../RISK_ANALYSIS.md`](../RISK_ANALYSIS.md)

---

## 13. Pengembangan lokal

```bash
npm install
npm run dev          # http://localhost:5173/app/
npm run dev:landing  # http://localhost:5174/
npm run build        # dist/
npm run smoke        # build + static checks
```

### Konfigurasi

| File | Isi |
|------|-----|
| `app/js/config.js` | Supabase URL, anon key, edge function names, checkout URLs, `adminEmails`, `basePath` |

### Konvensi kode

Lihat [`.cursorrules`](../.cursorrules):
- ES6+, `const` > `let`, camelCase functions, kebab-case files
- Error pattern: `{ success, data/error }` + Sentry
- Commit: `type(scope): description`

### Sync mirror

Setelah edit `app/js/` atau `app/css/`:
```powershell
Copy-Item app\js\... app\public\js\... -Force
Copy-Item app\css\... app\public\css\... -Force
```

### Attach Cursor

[`../README_SPLIT_FILES.md`](../README_SPLIT_FILES.md) — file mana yang di-attach per jenis task.

---

## 14. Testing & QA

| Asset | Lokasi | Peran |
|-------|--------|-------|
| Golden dataset | [`testing/GOLDEN_DATASET.json`](testing/GOLDEN_DATASET.json) | Kasus uji parser |
| E2E checklist | [`testing/FUNNEL_E2E_CHECKLIST.md`](testing/FUNNEL_E2E_CHECKLIST.md) | Funnel QA |
| Unit tests | [`../tests/`](../tests/) | Memory, parser |
| Smoke | `npm run smoke` | Build + guard checks |

Target coverage: 70% (`.cursorrules`).

---

## 15. Roadmap & status

### Fase produk (dari product prompt)

| Fase | Fokus | Status |
|------|-------|--------|
| 1 Foundation | Design tokens, i18n JSON, platform Gemini fallback | Partial |
| 2 AI Input | Unified input bar, vision receipt, voice | Partial (voice ada) |
| 3 AI Assistant | `monefyi-generate-insights`, Monevisor redesign | Partial (insights ada) |
| 4 Polish | Onboarding, push, keyboard shortcuts | Partial |

### Parser migration (Phase 1)

| Task | Status |
|------|--------|
| L0 normalize.js | ✅ Implemented |
| L2 rules.js | ✅ Partial |
| L1 memory | ✅ Partial |
| Wire orchestrator ke app.js | 🔄 In progress |
| AI rate < 60% | 🔄 Target |

### Budget UI (Juli 2026)

| Fitur | Status |
|-------|--------|
| Full-page budget + draft sync | ✅ |
| Item breakdown + derived total | ✅ |
| Drag-drop reorder | ✅ |
| Item detail modal + jadwal pengingat | ✅ |
| Mobile layout rincian | ✅ |

---

## 16. Indeks dokumen terkait

### Wajib baca

| Dokumen | Topik |
|---------|-------|
| [`README.md`](README.md) | Indeks navigasi docs |
| [`MONEFYI_PRODUCT_PROMPT.md`](MONEFYI_PRODUCT_PROMPT.md) | Spec produk + AI master prompt |
| [`../README.md`](../README.md) | Dev setup & deploy singkat |

### Arsitektur & teknis

| Dokumen | Topik |
|---------|-------|
| [`ARSITEKTUR_PARSING_MONEFYI.md`](ARSITEKTUR_PARSING_MONEFYI.md) | Parsing L0–L5 |
| [`../DEPENDENCY_MAP.md`](../DEPENDENCY_MAP.md) | Dependensi |
| [`../EDGE_FUNCTION_AUDIT.md`](../EDGE_FUNCTION_AUDIT.md) | Edge function map |
| [`DEPLOY_STRUCTURE.md`](DEPLOY_STRUCTURE.md) | Deploy URL & build |

### Fitur

| Dokumen | Topik |
|---------|-------|
| [`MONEVISOR.md`](MONEVISOR.md) | AI advisor |
| [`ADMIN_RUNBOOK.md`](ADMIN_RUNBOOK.md) | Admin ops |

### Parser implementation

| Dokumen | Topik |
|---------|-------|
| [`phases/PHASE_1_FOUNDATION.md`](phases/PHASE_1_FOUNDATION.md) | Task breakdown Phase 1 |
| [`../.monefyi/PARSE_MIGRATION_CONTEXT.md`](../.monefyi/PARSE_MIGRATION_CONTEXT.md) | Migration master context |
| [`../.monefyi/DECISION_LOG.md`](../.monefyi/DECISION_LOG.md) | ADR keputusan arsitektur |

### Planner (terpisah)

| Dokumen | Topik |
|---------|-------|
| [`../PLANNER_PRODUCTION_PLAN.md`](../PLANNER_PRODUCTION_PLAN.md) | Spec produksi planner |
| [`../planner/README.md`](../planner/README.md) | Planner vanilla |
| [`../monefyi_planner/README.md`](../monefyi_planner/README.md) | Planner React |

---

## Changelog dokumen

| Tanggal | Perubahan |
|---------|-----------|
| Juli 2026 | Dokumen master dibuat; budget UI, notifikasi item, mobile rincian |
| Juni 2026 | Product prompt & arsitektur parsing |
| Jan 2025 | Parse migration context & Phase 1 |

---

*Maintainer: update dokumen ini saat fitur arsitektur major berubah. Indeks lengkap: [`docs/README.md`](README.md).*
