# Monefyi.com — Analisis, Rekomendasi & Master Prompt

> **Scope:** Hanya aplikasi **monefyi.com** (PWA vanilla JS di root repo).  
> **Diabaikan:** `monefyi_planner/`, `planner/`, planner.monefyi.com.

---

## 1. Ringkasan Eksekutif

**Monefyi** adalah PWA keuangan pribadi berbasis AI dengan stack:

| Layer | Teknologi |
|-------|-----------|
| Frontend | HTML + vanilla JS (`index.html`, `js/app.js`, `css/app.css`) |
| Styling | Tailwind CDN + CSS variables |
| Backend | Supabase (Auth, Postgres, RLS, Edge Functions) |
| AI | Gemini 1.5 Flash via Edge Functions |
| Deploy | Vercel → `dist/` (branch `main` → monefyi.vercel.app) |

**Kekuatan saat ini:**
- Input transaksi multi-modal: Quick Add (teks), Batch WhatsApp, Receipt OCR, Manual
- Parser batch WhatsApp canggih (split akun, qty, project tag, fuzzy account)
- Monevisor (Advisor) + AI Financial Coach chat
- Budget per kategori + rekomendasi heuristik
- i18n ID/EN (154 keys), dark/light theme
- PWA mobile-first dengan sidebar desktop

**Peluang utama:**
- AI belum konsisten (Advisor "Generate" = heuristik, bukan LLM)
- Input transaksi AI memerlukan user Gemini key manual
- OCR receipt hanya Tesseract `eng`, tanpa vision AI
- i18n ~40% UI masih hardcoded Indonesia
- Design system belum unified (slate vs spec emerald/white)

---

## 2. Peta Arsitektur Saat Ini

```
┌─────────────────────────────────────────────────────────────────┐
│                        monefyi.com (PWA)                        │
├─────────────────────────────────────────────────────────────────┤
│  index.html          Shell UI, sheets, sidebar, bottom nav      │
│  js/app.js           STATE, render, CRUD, i18n, AI client        │
│  css/app.css         Theme tokens, components                    │
│  js/config.js        Supabase URL, edge function names           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ JWT + REST/RPC
┌───────────────────────────▼─────────────────────────────────────┐
│                     Supabase                                     │
│  profiles, transactions, budgets, user_plans, ai_usage         │
├─────────────────────────────────────────────────────────────────┤
│  asfin-parse-transaction   Quick/batch/receipt text parsing      │
│  ai-user-coach             Financial coach chat (Gemini)         │
│  ai-quota-status           Daily AI quota                        │
│  lynk-webhook              Subscription activation               │
└─────────────────────────────────────────────────────────────────┘
```

### Alur Input Transaksi

| Mode | Entry | AI? | Keterangan |
|------|-------|-----|------------|
| Quick Add | `#quickText` → `#btnParse` | Opsional (user key) | Satu baris per parse, auto-save |
| Batch | `#batchText` → `#btnBatchParse` | Server-side untuk low-confidence | Format WhatsApp, review queue |
| Receipt | `#rFile` → Tesseract OCR | Opsional setelah OCR | Tidak ada vision API |
| Manual | Form `#mAmount`, `#mCategory` | Tidak | Full control |
| Mobile FAB | Camera / AI / Manual popup | Sama | `#btnMainAction` |

### Alur Financial Assistant

| Fitur | Fungsi JS | AI? |
|-------|-----------|-----|
| Monevisor Generate | `generateInsights()` | ❌ Heuristik lokal |
| Budget rekomendasi | `computeAIBudgetRecommendationForMonth()` | ❌ Matematika 3 bulan |
| AI Coach Chat | `sendCoachMessage()` → `ai-user-coach` | ✅ Gemini |
| Cetak laporan PDF | `printReport()` | ❌ Chart + data |

---

## 3. Gap Analysis & Rekomendasi Strategis

### A. Input Transaksi — Jadikan "Superpower" Monefyi

| Gap | Rekomendasi | Prioritas |
|-----|-------------|-----------|
| User wajib set Gemini key sendiri | Platform fallback key + quota gratis (10/hari) via `_shared/gemini.ts` yang sudah ada | P0 |
| Quick Add satu baris, tidak natural | **Unified AI Input Bar** — satu textarea/voice: "beli kopi 45rb gojek kemarin" | P0 |
| OCR Tesseract `eng` only | Tambah `ind` + **Gemini Vision** untuk foto struk | P1 |
| Tidak ada voice input | Web Speech API → teks → `asfin-parse-transaction` | P1 |
| Receipt mode edge bug | Fix `mode: 'receipt'` di edge function agar return single tx | P1 |
| Tidak ada smart duplicate | Extend `findPotentialDuplicate()` dengan UI merge/skip | P2 |
| Tidak ada learning dari koreksi user | Simpan koreksi kategori ke `profiles.settings.category_aliases` | P2 |

**Visi input ideal:**
> User bicara, ketik, foto, atau paste WhatsApp → AI parse → preview 1 kartu → tap Simpan.  
> Maksimal 2 tap setelah input.

### B. Financial Assistant — Dari Heuristik ke AI Nyata

| Gap | Rekomendasi | Prioritas |
|-----|-------------|-----------|
| "Generate" Advisor bukan LLM | Edge function baru `monefyi-generate-insights` dengan structured JSON output | P0 |
| Coach & Advisor terpisah | **Monevisor Panel** unified: Ringkasan AI + Chat + Rekomendasi | P0 |
| Laporan PDF statis | **AI Narrative Report** — paragraf insight + chart (EN/ID) | P1 |
| Tidak ada health score AI | Skor kesehatan keuangan 0–100 dengan penjelasan | P1 |
| Tidak ada proactive alerts | "Pengeluaran makan 40% over budget minggu ini" push/in-app | P2 |
| Coach quota blokir free user | Izinkan BYOK (Bring Your Own Key) tanpa plan | P1 |

**Visi assistant ideal:**
> Monevisor tahu periode, budget, pola pengeluaran → generate laporan + 3 actionable tips + jawab pertanyaan follow-up dalam chat.

### C. Design System — Modern Minimalis

**Spec target (ganti token saat ini di `css/app.css`):**

```css
/* LIGHT MODE — putih + emerald */
--app-bg: #FFFFFF;
--app-surface: #F8FAFC;
--app-card: #FFFFFF;
--app-text: #0F172A;
--app-muted: #64748B;
--accent-primary: #10B981;      /* emerald-500 */
--accent-primary-hover: #059669;
--accent-danger: #EF4444;
--accent-info: #1E3A5F;        /* biru tua untuk header/brand */

/* DARK MODE — biru tua + emerald */
--app-bg: #0F1117;
--app-surface: #1A1D27;
--app-card: #1E2130;
--app-text: #E2E8F0;
--app-muted: #94A3B8;
--accent-primary: #00E5A0;     /* emerald terang */
--accent-info: #1E3A5F;
```

Prinsip UI:
- Minimalis, whitespace generous, hierarchy 3 level
- Border radius: 12px card, 8px button, 20px pill
- Glassmorphism subtle pada sidebar cards
- Animasi CSS only (stack vanilla JS, tanpa Framer Motion)
- Font: Inter (Google Fonts CDN)

### D. Internasionalisasi — EN + ID, Extensible

**Saat ini:** `I18N` object inline di `js/app.js`, 154 keys, reload on change.

**Rekomendasi refactor (P1):**

```
locales/
  id.json
  en.json
  _schema.json   ← daftar key wajib
js/i18n.js       ← t(), loadLocale(), formatCurrency(), formatDate()
```

Aturan:
1. **Zero hardcoded string** di `index.html` — gunakan `data-i18n="key"` + `applyLanguageToUI()`
2. `formatIDR()` → `formatMoney(amount, locale)` — `id-ID` / `en-US`
3. `formatCompactIDR()` → locale-aware (`rb/jt` vs `K/M`)
4. Edge function prompts: parameter `lang: 'id' | 'en'` di body request
5. Tambah bahasa = tambah file JSON + option di `#langSelect` + month names array

---

## 4. Roadmap Implementasi (Fase)

### Fase 1 — Foundation (2–3 minggu)
- [ ] Update design tokens light/dark (emerald + white / biru tua)
- [ ] Refactor i18n ke `locales/*.json`, hapus hardcoded ID di index.html
- [ ] Unified toast dengan undo delete
- [ ] Fix receipt mode edge function
- [ ] Platform Gemini fallback untuk parse (tanpa wajib user key)

### Fase 2 — AI Input Excellence (3–4 minggu)
- [ ] Unified AI Input Bar (homepage + mobile FAB)
- [ ] Gemini Vision untuk receipt photo
- [ ] Voice-to-transaction (Web Speech API)
- [ ] Optimistic UI + skeleton loading transaksi
- [ ] Smart duplicate detection UI

### Fase 3 — AI Financial Assistant (3–4 minggu)
- [ ] Edge function `monefyi-generate-insights` (LLM structured output)
- [ ] Monevisor panel redesign (sidebar desktop, unified insights + chat)
- [ ] AI narrative di laporan PDF
- [ ] Health score + budget alerts
- [ ] Coach multilingual (system prompt EN/ID)

### Fase 4 — Polish & Growth (ongoing)
- [ ] Onboarding 3-step dengan sample data
- [ ] Keyboard shortcuts (Cmd+K search, Cmd+N new tx)
- [ ] PWA push notifications (budget alert)
- [ ] Analytics funnel (input method usage)

---

## 5. MASTER PROMPT (Copy-Paste untuk AI Developer)

Gunakan prompt di bawah ini saat mengembangkan atau redesign Monefyi.com:

---

```
You are building Monefyi.com — an AI-powered personal finance PWA for 
Indonesian and international users. This is NOT planner.monefyi.com.

## PRODUCT VISION
Monefyi helps users track money effortlessly through AI-first transaction 
input, then acts as a personal financial assistant that evaluates spending 
patterns, budgets, and generates actionable recommendations.

Core promise: "Catat transaksi semudah chat. Pahami keuanganmu dengan AI."

## TECH STACK (DO NOT CHANGE without explicit approval)
- Frontend: Vanilla HTML + JavaScript (index.html, js/app.js, css/app.css)
- Styling: Tailwind CSS via CDN + CSS custom properties
- Build: Vite (npm run build → dist/)
- Backend: Supabase (Auth, Postgres RLS, Edge Functions)
- Deploy: Vercel, branch main → monefyi.vercel.app
- AI: Google Gemini via Supabase Edge Functions
- Key files:
  - js/app.js (~7500 lines) — all app logic, STATE, i18n, renders
  - js/config.js — Supabase URL, fnParse, fnCoach
  - my-supabase-project/supabase/functions/ — edge functions

## DESIGN SYSTEM

### Theme Modes
Light mode (default for new users in marketing, dark available):
- Background: #FFFFFF
- Card/Surface: #F8FAFC / #FFFFFF
- Text primary: #0F172A
- Text muted: #64748B
- Accent primary: #10B981 (emerald-500) — buttons, active states, positive amounts
- Brand header accent: #1E3A5F (dark blue) — logo area, nav highlights

Dark mode:
- Background: #0F1117
- Card: #1A1D27, Surface: #1E2130
- Text primary: #E2E8F0
- Accent primary: #00E5A0 (bright emerald)
- Brand: #1E3A5F + emerald gradient

Danger: #EF4444 / #FF4D6D (destructive actions only)
Typography: Inter, 3-level hierarchy (H1 28px, body 14px, caption 12px)
Radius: 12px cards, 8px buttons, 20px pills/badges
Style: Modern minimalist, generous whitespace, subtle glassmorphism on sidebar cards

Implement via CSS variables in css/app.css:
--app-bg, --app-card, --app-text, --accent-primary, etc.
Toggle: body.theme-light class (existing pattern).

## INTERNATIONALIZATION

Languages: Indonesian (id, default) + English (en). Architecture must make 
adding new languages trivial.

Rules:
1. ALL user-visible strings via t('key') — zero hardcoded text in HTML/JS
2. Locale files: locales/id.json, locales/en.json (extract from current I18N)
3. formatMoney(), formatDate(), formatCompactNumber() must respect locale
4. AI prompts must accept lang parameter and respond in user's language
5. html[lang] updated on locale switch; no full page reload (live swap)
6. Month names, relative dates ("Hari ini"/"Today") localized

Existing i18n: I18N object in js/app.js with 154 keys — migrate, don't rewrite.

## FEATURE 1: AI TRANSACTION INPUT (Primary Differentiator)

Goal: Fastest transaction logging in category — ≤2 taps after input.

Input channels (single unified entry point):
1. Natural language text: "makan siang 85rb bcaa gopay"
2. Voice: Web Speech API → text → parse
3. Photo: camera/gallery → Gemini Vision OCR + parse
4. Paste: WhatsApp export format → batch parser (existing)
5. Manual form: fallback with smart defaults

Parse pipeline:
Client → asfin-parse-transaction edge function → preview card → confirm/save
- Use platform Gemini key with daily free quota (10/day free tier)
- User BYOK (profiles.gemini_key) for unlimited
- Always show confidence score + allow inline edit before save
- Optimistic UI: show pending tx immediately, reconcile on API response
- Smart duplicate detection before save

Preview card shows: amount, type, category (editable), account, date, merchant
Single primary CTA: "Simpan" (Save). Secondary: "Edit detail"

Mobile: FAB opens unified input sheet (not separate camera/AI/manual)
Desktop: persistent input bar below page header OR Cmd+K command palette

## FEATURE 2: AI FINANCIAL ASSISTANT (Monevisor)

Goal: Replace static dashboards with intelligent, personalized guidance.

Components:
1. **AI Insights Generate** (replace local heuristics):
   - New edge function: monefyi-generate-insights
   - Input: period, transactions[], budget[], lang
   - Output JSON: { summary, healthScore, bullets[], budgetRecs[], alerts[] }
   - Render in Monevisor panel (desktop: right sidebar, mobile: sheet)

2. **AI Coach Chat** (enhance existing ai-user-coach):
   - Context-aware: knows current period, budget, recent transactions
   - Multilingual responses matching user locale
   - Suggested prompts localized
   - Chat history persisted to Supabase (not just localStorage)

3. **AI Report Narrative**:
   - PDF/print report includes AI-written executive summary paragraph
   - Charts remain deterministic; narrative is LLM-generated from data snapshot

4. **Proactive Recommendations**:
   - Budget overrun warnings
   - Unusual spending alerts (enhance detectAnomalies with AI explanation)
   - Monthly "financial health" score 0-100 with trend

Monevisor UI:
- Desktop: persistent right panel (already started with advisor-open class)
- Sections: Health Score ring → Key Insights bullets → Budget Recommendations 
  → Chat with AI
- "Generate" button triggers LLM (with loading skeleton)

## FEATURE 3: TRANSACTION PAGE UX

- Sidebar: 220px collapsible, saldo card with glow hover, filter card below
- Filter pills with sliding active indicator
- Transaction cards: icon 44px, 3-dot menu on hover, swipe delete mobile
- Card/Table segmented toggle
- Expandable search with Cmd+K hint
- Empty state with CTA
- Skeleton loading, staggered entrance animation (CSS)
- Toast bottom-right with undo on delete

## FEATURE 4: TRANSACTION FORM

- Slide-in panel from right (420px desktop), not centered modal
- Floating labels, large centered amount field
- AI category suggestion as user types merchant name
- Quick amount preset chips
- Real-time inline validation
- Save button disabled until valid, then animate active

## DATA & STATE (Preserve Existing Patterns)

STATE object in js/app.js — extend, don't replace:
- STATE.transactions, STATE.filters, STATE.period, STATE.budgetsByMonth
- STATE.settings.lang, STATE.settings.theme, STATE.settings.useGemini
- STATE.ui.* for UI flags

Supabase tables (existing): profiles, transactions, budgets, user_plans, ai_usage
Edge functions (extend): asfin-parse-transaction, ai-user-coach, ai-quota-status
New: monefyi-generate-insights, optionally monefyi-parse-receipt-vision

## ACCESSIBILITY & PERFORMANCE
- WCAG AA contrast 4.5:1 minimum
- Focus rings: 2px emerald outline
- prefers-reduced-motion respected
- Virtualized transaction list for >100 items
- Infinite scroll with "Load more" fallback
- Cache last viewed period in localStorage

## CONSTRAINTS
- Do NOT use React/Vue — stay vanilla JS
- Do NOT modify monefyi_planner/ or planner/
- Do NOT put service_role key in frontend
- Keep RLS on all tables
- Sync js/app.js changes to dist/ via npm run build before deploy
- Commit messages: clear, focused on "why"

## DEFINITION OF DONE (per feature)
1. Works on mobile + desktop
2. Both id and en locales complete
3. Both light and dark themes verified
4. Loading/error/empty states handled
5. Optimistic UI where applicable
6. No console errors, smoke test passes (npm run smoke)
```

---

## 6. Prompt Singkat (Quick Tasks)

### Untuk redesign UI tema:
```
Update css/app.css design tokens for Monefyi.com:
Light: white bg #FFFFFF, emerald accent #10B981, dark blue brand #1E3A5F
Dark: bg #0F1117, card #1A1D27, emerald accent #00E5A0
Keep existing body.theme-light toggle. Update all hardcoded rgba colors 
in index.html and js/app.js to use CSS variables. Verify WCAG AA contrast.
Do not touch monefyi_planner/.
```

### Untuk AI input:
```
Enhance transaction input in js/app.js + asfin-parse-transaction:
1. Add unified input bar combining quick text + voice button
2. Wire platform Gemini fallback from _shared/gemini.ts when user has no key
3. Show parse preview card before auto-save (remove silent auto-save in btnParse)
4. Fix mode:receipt to return single transaction object
5. Add confidence badge on preview
All strings via t(), both id/en.
```

### Untuk i18n:
```
Refactor i18n in monefyi.com:
1. Extract I18N from js/app.js to locales/id.json and locales/en.json
2. Create js/i18n.js with async loadLocale(), t(), formatMoney()
3. Replace ALL hardcoded Indonesian strings in index.html with data-i18n
4. Fix ensureSelectOptions() overwriting translated filter labels
5. Language switch without page reload
Document how to add a new language in docs/I18N.md
```

### Untuk Monevisor AI:
```
Create edge function monefyi-generate-insights and wire to Advisor Generate button:
- Input: JWT, period start/end, lang
- Fetch transactions + budget server-side
- Call Gemini with structured JSON schema output
- Return: summary, healthScore (0-100), bullets[], budgetRecommendations[], alerts[]
Replace generateInsights() heuristic in js/app.js with edge call + fallback
Render health score ring in #advisorSheet
Multilingual: respond in lang parameter
```

---

## 7. Metrik Keberhasilan

| Metrik | Target |
|--------|--------|
| Waktu input transaksi (median) | < 15 detik |
| Parse accuracy (AI + confirm) | > 90% |
| % transaksi via AI input | > 60% |
| Advisor Generate usage / MAU | > 30% |
| i18n coverage | 100% keys, 0 hardcoded |
| Lighthouse Performance | > 85 |
| Retention D7 | +20% vs baseline |

---

## 8. File Referensi Utama

| File | Isi |
|------|-----|
| `index.html` | UI shell, sheets, sidebar |
| `js/app.js` | Logic, i18n, AI client, renders |
| `css/app.css` | Theme tokens, components |
| `js/config.js` | Supabase + function names |
| `my-supabase-project/supabase/functions/asfin-parse-transaction/` | Transaction parser |
| `my-supabase-project/supabase/functions/ai-user-coach/` | Coach chat |
| `my-supabase-project/supabase/functions/_shared/gemini.ts` | Shared Gemini helper |
| `vercel.json` | Deploy config (output: dist/) |

---

*Dokumen ini dibuat dari analisis codebase monefyi.com, Juni 2026.*  
*Perbarui setelah setiap fase selesai.*
