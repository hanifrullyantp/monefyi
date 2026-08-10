# PROMPT: ADMIN CONSOLE OVERHAUL v2 (COMPLETE)

Simpan sebagai: `MONEFYI_ADMIN_CONSOLE_V2.md`

```markdown
# MONEFYI — ADMIN CONSOLE COMPLETE OVERHAUL
## Panel Super Admin dengan Testing Lab, Marketing Analytics, dan Cross-App Integration

---

## KONTEKS DAN TUJUAN

Admin Console harus jadi command center untuk:
1. Memahami semua data dengan konteks jelas
2. Mengedit semua konten tanpa developer (tutorial, campaign, landing)
3. Testing menyeluruh dengan Testing Lab (impersonate + custom scenario)
4. Monitoring funnel penjualan end-to-end
5. Mengambil keputusan berdasarkan AI recommendations
6. Terkoneksi dengan Landing Page (dibangun terpisah) via shared config

Prinsip:
- Setiap section punya keterangan (apa ini, kenapa penting)
- Setiap data punya insight dan actionable next step
- UI konsisten, clean, scannable
- Landing page dan admin panel share config via API/database

---

## ARSITEKTUR CROSS-APP INTEGRATION

### Konsep

Admin Panel dan Landing Page adalah 2 aplikasi terpisah yang share:
1. Database Supabase yang sama
2. Config table sebagai single source of truth
3. API endpoints untuk read/write config
4. Media library shared (Supabase Storage)

### Shared Data Model

Table: `app_config`
- id (UUID)
- key (unique, string) — misal: 'landing.hero.headline'
- value (JSONB)
- category (string) — landing, pricing, marketing, notification, dll
- updated_by (UUID)
- updated_at (timestamp)
- environment (draft/live)

Table: `media_library`
- id (UUID)
- filename
- url (Supabase storage)
- uploaded_by
- uploaded_at
- tags (array)
- usage_context (array) — [landing_hero, tutorial_img, dll]

Table: `campaigns` (shared)
- id (UUID)
- name
- type
- status
- config_json
- created_by
- performance_metrics

### API Endpoints (untuk landing page consume)

```
GET  /api/config/landing        - Get all landing config
GET  /api/config/pricing        - Get pricing tiers
GET  /api/config/campaigns      - Get active campaigns
GET  /api/media                 - List media library

POST /api/analytics/pageview   - Track from landing
POST /api/analytics/event       - Track custom events
POST /api/checkout/initiate    - Log checkout start
POST /api/checkout/complete     - Log purchase completion
```

Landing page (built by other agent) hanya perlu:
- Fetch config saat load
- Send analytics events
- Trigger webhook untuk purchase completion

---

## DESIGN SYSTEM ADMIN CONSOLE

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Admin Console            [Env: LIVE ▼] [Admin ▼] [Logout]  │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ [Sidebar Menu]              [Main Content Area]                │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### Sidebar Menu

```
📊 Dashboard
👥 Users
💰 Plans & Pricing
🌐 Landing Page
📣 Marketing & Analytics
🔔 Notifications
🧪 Testing Lab          ← NEW
🚩 Feature Flags
💬 Feedback
💸 Refunds
📚 Tutorial
⚙️ Config
```

### Environment Switcher

Di header ada dropdown:
- LIVE (production data)
- STAGING (test data)
- Impersonate: [User Name] (kalau lagi impersonate)

### Design Principles

Colors:
- Primary: #2563EB (blue for actions)
- Success: #10B981 (green)
- Warning: #F59E0B (amber)
- Danger: #EF4444 (red)
- Muted: #64748B (gray for secondary text)

Typography:
- Section title: 20px bold
- Card title: 16px semibold
- Body: 14px regular
- Caption: 12px muted
- Metric big: 32px bold

Spacing:
- Section padding: 24px
- Card gap: 16px
- Element gap: 8-12px

Components pattern:
- Every card has: title + description + ℹ️ tooltip
- Every metric has: value + comparison + trend
- Every list has: search + filter + sort + pagination
- Every action has: confirmation dialog

---

## TAB 1: DASHBOARD

### Overview Content

```
┌────────────────────────────────────────────────────────────┐
│ 📊 Dashboard Overview                                       │
│ Ringkasan performa bisnis Monefyi                          │
│                                                              │
│ Periode: [30 hari ▼]  Last update: 2 menit lalu            │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ ═══ KEY METRICS ═══                                         │
│                                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │ USERS    │ │ ACTIVE   │ │ REVENUE  │ │ CONV     │       │
│ │          │ │ USERS    │ │ 30D      │ │ RATE     │       │
│ │ 1,234    │ │ 456      │ │ Rp 12.5jt│ │ 4.5%     │       │
│ │ ↗ +23    │ │ 37%      │ │ ↗ +15%   │ │ ↘ -0.3%  │       │
│ │ vs lalu  │ │ activation│ │ vs lalu  │ │ vs lalu  │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│ ℹ️ Tooltip on hover:                                        │
│ - Users: Total registered users                             │
│ - Active: Login minimal 1x dalam 30 hari                    │
│ - Revenue: Total confirmed payment 30 hari                  │
│ - Conv Rate: Visitor to buyer conversion                    │
│                                                              │
│ ═══ USER & REVENUE BREAKDOWN ═══                            │
│                                                              │
│ ┌────────────────────────┐ ┌────────────────────────┐      │
│ │ USER DISTRIBUTION      │ │ REVENUE DISTRIBUTION    │      │
│ │                        │ │                        │      │
│ │ Trial:    234 (19%)    │ │ Lifetime: 8.9jt (71%) │      │
│ │ Free:     567 (46%)    │ │ Couple:   2.4jt (19%) │      │
│ │ Lifetime: 345 (28%)    │ │ Pro+:     1.2jt (10%) │      │
│ │ Couple:    56 (5%)     │ │                        │      │
│ │ Pro+:      32 (3%)     │ │ Total: 12.5jt          │      │
│ │                        │ │                        │      │
│ │ [Pie chart visual]     │ │ [Pie chart visual]     │      │
│ └────────────────────────┘ └────────────────────────┘      │
│                                                              │
│ ═══ TREND 30 HARI ═══                                       │
│                                                              │
│ ┌─────────────────────────────────────────────────┐        │
│ │ [Line chart:                                     │        │
│ │  - New users per day (blue line)                 │        │
│ │  - Revenue per day (green line)                  │        │
│ │  - Purchases per day (orange bars)]              │        │
│ │                                                   │        │
│ │ Hover untuk detail per hari                       │        │
│ └─────────────────────────────────────────────────┘        │
│                                                              │
│ ═══ QUICK ACTIONS ═══                                       │
│                                                              │
│ ┌────────────────────────────────────────────────┐         │
│ │ [🔔 Kirim Notifikasi Global]                    │         │
│ │ [📣 Buat Campaign Baru]                          │         │
│ │ [🌐 Edit Landing Page]                           │         │
│ │ [💸 Lihat Refund Pending (3)]                    │         │
│ │ [🧪 Buka Testing Lab]                            │         │
│ └────────────────────────────────────────────────┘         │
│                                                              │
│ ═══ ALERTS & INSIGHTS ═══                                   │
│                                                              │
│ ┌────────────────────────────────────────────────┐         │
│ │ 🚨 URGENT (2)                                    │         │
│ │ ⚠ 3 refund requests pending review              │         │
│ │ ⚠ Payment webhook failed 2x hari ini            │         │
│ │                                                    │         │
│ │ ⚠️ WARNING (3)                                   │         │
│ │ • Trial conversion rate turun 5% (from 12%→7%)  │         │
│ │ • Feature Flag "AI Chat Coach" masih 10% rollout│         │
│ │ • 12 feedback unread                             │         │
│ │                                                    │         │
│ │ 💡 INSIGHTS (4)                                  │         │
│ │ ✅ Revenue bulan ini naik 15% vs lalu           │         │
│ │ 📈 Couple Pack conversion rendah — action needed│         │
│ │ 🎯 WhatsApp share conv rate tertinggi (6%)      │         │
│ │ 🕐 Peak buying hours: 19:00-21:00               │         │
│ └────────────────────────────────────────────────┘         │
│                                                              │
│ ═══ SYSTEM HEALTH ═══                                       │
│                                                              │
│ ┌────────────────────────────────────────────────┐         │
│ │ Database: ✅ Healthy    Storage: ✅ 45% used    │         │
│ │ API: ✅ 99.9% uptime    Webhook: ⚠ 1 failed    │         │
│ │ Landing Page: ✅ Sync   Testing Lab: ✅ Active │         │
│ └────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────┘
```

---

## TAB 2: USERS

### User Management

```
┌────────────────────────────────────────────────────────────┐
│ 👥 Users                                                    │
│ Kelola semua pengguna dan subscription                     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ ═══ SUMMARY ═══                                             │
│                                                              │
│ ┌────────────────────────────────────────────────┐         │
│ │ Total: 1,234    Active: 456 (37%)              │         │
│ │ New today: 12   New this week: 89              │         │
│ │ Trial: 234      Paid: 445                       │         │
│ │ Churn rate: 12%  Avg LTV: Rp 156rb              │         │
│ │ Test users: 8   (managed via Testing Lab)      │         │
│ └────────────────────────────────────────────────┘         │
│                                                              │
│ ═══ FILTERS ═══                                             │
│                                                              │
│ [🔍 Cari nama/email]                                        │
│ Plan: [All ▼] Status: [Active ▼] Sort: [Last Login ▼]      │
│ [Show test users: ☐]                                        │
│                                                              │
│ ═══ USERS LIST ═══                                          │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Name         Email        Plan     Status  Last     │   │
│ │                                             Login    │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ 👤 Hanif R.  hanif@..    Lifetime  Active  2h ago  │   │
│ │    Kondisi: On track  Health: 87  Streak: 45d      │   │
│ │    [View] [Impersonate] [Message] [More ⋮]         │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ 👤 Sari W.   sari@..     Trial     Active  1d ago  │   │
│ │    Trial ends: 5 days  Transactions: 23            │   │
│ │    [View] [Impersonate] [Extend Trial] [More ⋮]    │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ 🧪 TestUser1 test1@..    Lifetime  Test    Never   │   │
│ │    Type: Test User  Scenario: Bulan Krisis          │   │
│ │    [Open Testing Lab] [Reset] [Delete]              │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ [◀ Prev]  Page 1 of 25  [Next ▶]                            │
│                                                              │
│ ═══ USER DETAIL VIEW (saat klik user) ═══                   │
│                                                              │
│ ┌────────────────────────────────────────────────┐         │
│ │ 👤 Hanif Rullyant                               │         │
│ │ hanif.rullyant@gmail.com                        │         │
│ │ Member since: 3 bulan lalu                      │         │
│ │                                                  │         │
│ │ ┌─ Profile ────────────────────────────────┐   │         │
│ │ │ Plan: Lifetime + Couple + Pro+           │   │         │
│ │ │ Status: Active                           │   │         │
│ │ │ Subscription: Never expires              │   │         │
│ │ │ Total spent: Rp 397.000                   │   │         │
│ │ │                                          │   │         │
│ │ │ Household: Yes (2 members)               │   │         │
│ │ │ Payment method: Lynk.id                  │   │         │
│ │ └──────────────────────────────────────────┘   │         │
│ │                                                  │         │
│ │ ┌─ Activity Stats ─────────────────────────┐   │         │
│ │ │ Transactions: 456                        │   │         │
│ │ │ Categories: 12                           │   │         │
│ │ │ Goals: 3 (1 achieved)                    │   │         │
│ │ │ Streak: 45 days                          │   │         │
│ │ │ Health Score: 87 (Excellent)             │   │         │
│ │ │ Financial condition: On track            │   │         │
│ │ └──────────────────────────────────────────┘   │         │
│ │                                                  │         │
│ │ ┌─ Marketing History ──────────────────────┐   │         │
│ │ │ Offers shown: 12                         │   │         │
│ │ │ Offers clicked: 3                        │   │         │
│ │ │ Offers dismissed: 5                      │   │         │
│ │ │ Referrals: 2 (both converted)            │   │         │
│ │ └──────────────────────────────────────────┘   │         │
│ │                                                  │         │
│ │ ┌─ Admin Actions ──────────────────────────┐   │         │
│ │ │ [🎭 Impersonate User]                    │   │         │
│ │ │ [📧 Send Custom Notification]            │   │         │
│ │ │ [⏰ Extend Trial]                        │   │         │
│ │ │ [🔄 Override Plan]                       │   │         │
│ │ │ [💸 Process Refund]                      │   │         │
│ │ │ [⏸ Suspend Account]                      │   │         │
│ │ │ [🗑 Delete Account]                      │   │         │
│ │ └──────────────────────────────────────────┘   │         │
│ └────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────┘
```

---

## TAB 3: PLANS & PRICING

Sama dengan versi sebelumnya dengan tambahan:

```
┌────────────────────────────────────────────────────────────┐
│ 💰 Plans & Pricing                                          │
│ Kelola paket, harga, dan sync dengan landing page           │
│                                                              │
│ ℹ️ Perubahan otomatis sync ke landing page dan checkout.   │
│ User existing tetap di plan mereka.                         │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ ═══ SYNC STATUS ═══                                         │
│                                                              │
│ ✅ Landing page synced: 2 menit lalu                        │
│ ✅ Checkout page synced: 2 menit lalu                       │
│ ℹ️ Sync otomatis setiap perubahan disimpan                  │
│                                                              │
│ ═══ TRIAL CONFIG ═══                                        │
│ (same as before, editable)                                  │
│                                                              │
│ ═══ LIFETIME ═══                                            │
│ (same as before)                                            │
│                                                              │
│ ═══ COUPLE PACK BUMP ═══                                    │
│ (same as before)                                            │
│                                                              │
│ ═══ PRO+ ADD-ON ═══                                         │
│ (same as before)                                            │
│                                                              │
│ ═══ POST-PURCHASE OTO ═══                                   │
│ (same as before)                                            │
│                                                              │
│ ═══ SALES STATS ═══                                         │
│                                                              │
│ ┌──────────────────────────────────────────────────┐       │
│ │ PRODUCT                Total  Month  MoM   Rev  │       │
│ │ ────────────────────────────────────────────────│       │
│ │ Lifetime Solo           245     23   +8%  15.4jt│       │
│ │ Lifetime + Couple        56      5   -3%   5.0jt│       │
│ │ Lifetime + Pro+          32      4    0%   4.5jt│       │
│ │ Lifetime + Couple+Pro+   12      1  -50%   1.2jt│       │
│ │ Pro+ Yearly (existing)   18      3  +20%   0.7jt│       │
│ │ Pro+ Monthly              8      2    0%   0.2jt│       │
│ │ OTO Conversion           15      2   +5%   0.4jt│       │
│ │                                                   │       │
│ │ Total Revenue: Rp 45.8jt (all time)              │       │
│ │ This month: Rp 12.5jt                             │       │
│ │ AOV: Rp 124.000                                   │       │
│ │ AOV with add-ons: Rp 151.000                     │       │
│ │ Add-on lift: +21.7%                              │       │
│ └──────────────────────────────────────────────────┘       │
│                                                              │
│ 💡 AI Recommendation:                                        │
│ "Couple Pack take rate rendah. Test turunkan harga bump    │
│ ke Rp 39.000 atau perbaiki copy positioning."               │
│                                                              │
│ [Sync ke Landing Page] [Preview Changes] [Publish]          │
└────────────────────────────────────────────────────────────┘
```

---

## TAB 4: LANDING PAGE

### Editor + Cross-App Bridge

```
┌────────────────────────────────────────────────────────────┐
│ 🌐 Landing Page Editor                                      │
│ Edit konten landing page. Perubahan sync via API.           │
│                                                              │
│ ℹ️ Landing page dibangun terpisah tapi share config.        │
│ Semua perubahan di sini otomatis available untuk landing.   │
│                                                              │
│ Landing URL: monefyi.com                                     │
│ API Sync: ✅ Connected                                       │
│ Last sync: 2 menit lalu                                     │
│                                                              │
│ [Preview Draft] [Publish to Live] [Reset to Default]        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ ═══ SECTIONS ═══                                            │
│                                                              │
│ Semua section berikut disimpan sebagai app_config           │
│ dan bisa dikonsumsi landing page via API.                   │
│                                                              │
│ ┌────────────────────────────────────────────────┐         │
│ │ 📢 Announcement Bar                    [Edit ▼]│         │
│ │ Key: landing.announcement                       │         │
│ │ Enabled: ✅  Preview: "🔥 Beli sekali..."      │         │
│ ├────────────────────────────────────────────────┤         │
│ │ 🏠 Hero Section                        [Edit ▼]│         │
│ │ Key: landing.hero                                │         │
│ │ Headline: "Gaji Sering Habis..."               │         │
│ │ CTA Primary: "Coba Gratis Sekarang"            │         │
│ │ CTA Secondary: "Lihat Demo"                    │         │
│ │ Hero image: [Upload/Select from library]        │         │
│ ├────────────────────────────────────────────────┤         │
│ │ 🧮 Calculator Section                  [Edit ▼]│         │
│ │ Key: landing.calculator                          │         │
│ │ Enabled: ✅  Fields: 4                          │         │
│ ├────────────────────────────────────────────────┤         │
│ │ ❓ Problems Section                    [Edit ▼]│         │
│ │ Key: landing.problems                            │         │
│ │ Items: 3 cards                                   │         │
│ ├────────────────────────────────────────────────┤         │
│ │ 🔄 How It Works                        [Edit ▼]│         │
│ │ Key: landing.how_it_works                        │         │
│ │ Steps: 3                                         │         │
│ ├────────────────────────────────────────────────┤         │
│ │ 🎬 Demo Section                        [Edit ▼]│         │
│ │ Key: landing.demo                                │         │
│ │ Type: Video / Screenshots                        │         │
│ ├────────────────────────────────────────────────┤         │
│ │ 👥 Use Cases                           [Edit ▼]│         │
│ │ Key: landing.use_cases                           │         │
│ │ Tabs: 4                                          │         │
│ ├────────────────────────────────────────────────┤         │
│ │ ⭐ Features Simple                     [Edit ▼]│         │
│ │ Key: landing.features                            │         │
│ │ Items: 6                                         │         │
│ ├────────────────────────────────────────────────┤         │
│ │ 💰 Pricing                             [Auto ▼]│         │
│ │ Key: landing.pricing                             │         │
│ │ ℹ️ Auto-sync dari Plans & Pricing tab           │         │
│ ├────────────────────────────────────────────────┤         │
│ │ 🔒 Trust Section                       [Edit ▼]│         │
│ │ Key: landing.trust                               │         │
│ │ Items: 6                                         │         │
│ ├────────────────────────────────────────────────┤         │
│ │ ❓ FAQ                                 [Edit ▼]│         │
│ │ Key: landing.faq                                 │         │
│ │ Q&A: 9                                           │         │
│ ├────────────────────────────────────────────────┤         │
│ │ 📌 Footer                              [Edit ▼]│         │
│ │ Key: landing.footer                              │         │
│ ├────────────────────────────────────────────────┤         │
│ │ 💬 Floating Elements                   [Edit ▼]│         │
│ │ Key: landing.floating                            │         │
│ │ WA + Exit Intent                                 │         │
│ ├────────────────────────────────────────────────┤         │
│ │ 🛒 Checkout Page                       [Edit ▼]│         │
│ │ Key: landing.checkout                            │         │
│ ├────────────────────────────────────────────────┤         │
│ │ 🎁 Thank You Page                      [Edit ▼]│         │
│ │ Key: landing.thankyou                            │         │
│ └────────────────────────────────────────────────┘         │
│                                                              │
│ ═══ MEDIA LIBRARY ═══                                       │
│                                                              │
│ Upload dan kelola gambar untuk landing page & tutorial      │
│                                                              │
│ [Upload New Image] [Bulk Upload]                            │
│                                                              │
│ Filter: [All ▼] [Landing ▼] [Tutorial ▼]                   │
│                                                              │
│ ┌────┬────┬────┬────┬────┐                                 │
│ │[img]│[img]│[img]│[img]│[img]│                             │
│ │hero1│hero2│step1│step2│step3│                             │
│ └────┴────┴────┴────┴────┘                                 │
│                                                              │
│ Storage used: 45MB / 1GB                                     │
│                                                              │
│ ═══ ANALYTICS INTEGRATION ═══                               │
│                                                              │
│ Meta Pixel ID: [_______________]                             │
│ Google Tag Manager: [_______________]                        │
│ WhatsApp Business: [_______________]                         │
│                                                              │
│ ℹ️ IDs ini di-inject otomatis ke landing page via config    │
│                                                              │
│ ═══ API ENDPOINTS FOR LANDING ═══                           │
│                                                              │
│ Landing page bisa fetch config via:                          │
│                                                              │
│ GET /api/config/landing                                      │
│ Response: All landing config as JSON                         │
│                                                              │
│ GET /api/config/pricing                                      │
│ Response: All pricing tiers                                  │
│                                                              │
│ POST /api/analytics/event                                    │
│ Body: { event: 'page_view', data: {...} }                    │
│                                                              │
│ POST /api/checkout/complete                                  │
│ Body: { user_email, plan, amount, addons }                   │
│                                                              │
│ [View Full API Documentation]                                │
│ [Generate API Key for Landing]                               │
│                                                              │
│ ═══ WEBHOOK CONFIG ═══                                      │
│                                                              │
│ Payment Webhook URL (Lynk.id):                               │
│ https://api.monefyi.com/webhook/payment                      │
│                                                              │
│ Webhook Secret: [•••••••] [Show] [Regenerate]                │
│                                                              │
│ Last webhook received: 5 menit lalu ✅                       │
│ Failed webhooks: 0 (last 24h)                               │
└────────────────────────────────────────────────────────────┘
```

---

## TAB 5: MARKETING & ANALYTICS

### Full Marketing Dashboard

```
┌────────────────────────────────────────────────────────────┐
│ 📣 Marketing & Sales Analytics                              │
│ Monitor funnel, campaign, dan insight untuk keputusan      │
│                                                              │
│ Periode: [7d] [30d ✓] [90d] [Custom]                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ ═══ SECTION 1: SALES FUNNEL ═══                             │
│                                                              │
│ ℹ️ Funnel dari landing visit sampai purchase complete.      │
│ Drop-off tinggi = area yang perlu optimasi.                 │
│                                                              │
│ ┌────────────────────────────────────────────────────┐     │
│ │                                                     │     │
│ │ STAGE            COUNT   %      DROP-OFF   STATUS  │     │
│ │ ─────────────────────────────────────────────────  │     │
│ │ Page View        5,234   100%      -        ✅     │     │
│ │ CTA Click        1,234    23.6%   -76.4%   ⚠️      │     │
│ │ Form Open          890    17.0%   -27.9%   ✅     │     │
│ │ Initiate CO        456     8.7%   -48.8%   ⚠️      │     │
│ │ Add Payment        312     6.0%   -31.6%   ✅     │     │
│ │ Purchase Done      234     4.5%   -25.0%   ✅     │     │
│ │                                                     │     │
│ │ VISUAL FUNNEL:                                      │     │
│ │ ████████████████████████████████████████ 5,234     │     │
│ │ █████████████████                        1,234     │     │
│ │ ████████████                               890     │     │
│ │ ██████                                     456     │     │
│ │ ████                                       312     │     │
│ │ ███                                        234     │     │
│ │                                                     │     │
│ │ Overall conversion: 4.5%                            │     │
│ │ Benchmark: 3-5% (SaaS)                              │     │
│ │ Status: ✅ Above benchmark                          │     │
│ │                                                     │     │
│ │ 💡 INSIGHTS & RECOMMENDATIONS:                      │     │
│ │                                                     │     │
│ │ 🔴 HIGH PRIORITY:                                   │     │
│ │ Page → CTA drop-off 76%                             │     │
│ │ - Headline mungkin kurang menarik                   │     │
│ │ - CTA button kurang prominent                       │     │
│ │ - Social proof kurang di above-the-fold             │     │
│ │ Action:                                             │     │
│ │ • A/B test headline (2-3 variants)                  │     │
│ │ • Tambahkan user count ("Dipercaya 5,000+ user")   │     │
│ │ • Pindahkan calculator ke atas                       │     │
│ │ Expected impact: +15-25% CTR                        │     │
│ │ [Start A/B Test]                                    │     │
│ │                                                     │     │
│ │ 🟡 MEDIUM PRIORITY:                                 │     │
│ │ Form → Initiate drop-off 49%                        │     │
│ │ - Form terlalu panjang?                             │     │
│ │ - Trust kurang di form?                             │     │
│ │ Action:                                             │     │
│ │ • Kurangi fields (cukup email + nama + WA)          │     │
│ │ • Tambah security badge                             │     │
│ │ Expected impact: +20-30% form completion            │     │
│ │ [Edit Form]                                         │     │
│ │                                                     │     │
│ │ ✅ WORKING WELL:                                    │     │
│ │ Purchase completion 75%                             │     │
│ │ Payment integration smooth                          │     │
│ └────────────────────────────────────────────────────┘     │
│                                                              │
│ ═══ SECTION 2: PRODUCT SALES BREAKDOWN ═══                  │
│                                                              │
│ ℹ️ Detail penjualan per tipe produk dan add-on              │
│                                                              │
│ ┌────────────────────────────────────────────────────┐     │
│ │                                                     │     │
│ │ MAIN PRODUCT PERFORMANCE:                           │     │
│ │                                                     │     │
│ │ PRODUCT             QTY    REVENUE   % TOTAL TREND │     │
│ │ ─────────────────────────────────────────────────  │     │
│ │ Lifetime Solo       156    Rp 15.4jt   62%    ↗+12│     │
│ │ Couple Pack          34    Rp 5.0jt    20%    ↘-5 │     │
│ │ Pro+ Yearly          18    Rp 4.5jt    18%    ↗+8 │     │
│ │ Pro+ Monthly          8    Rp 200rb     1%     →  │     │
│ │ ─────────────────────────────────────────────────  │     │
│ │ TOTAL               216    Rp 25.1jt  100%         │     │
│ │                                                     │     │
│ │                                                     │     │
│ │ ADD-ON PERFORMANCE:                                 │     │
│ │                                                     │     │
│ │ ORDER BUMP (Couple Pack di checkout):               │     │
│ │ Impressions: 156                                    │     │
│ │ Taken: 34                                            │     │
│ │ Take Rate: 21.8%                                     │     │
│ │ Extra Revenue: Rp 1.632.000                          │     │
│ │ Benchmark: 25-35%                                    │     │
│ │ Status: ⚠️ Below benchmark                          │     │
│ │                                                     │     │
│ │ UPSELL (Pro+ saat checkout):                        │     │
│ │ Impressions: 156                                    │     │
│ │ Taken: 12                                            │     │
│ │ Take Rate: 7.7%                                      │     │
│ │ Extra Revenue: Rp 3.000.000                          │     │
│ │ Benchmark: 10-15%                                    │     │
│ │ Status: ⚠️ Below benchmark                          │     │
│ │                                                     │     │
│ │ POST-PURCHASE OTO (Pro+ diskon):                    │     │
│ │ Impressions: 144                                    │     │
│ │ Taken: 15                                            │     │
│ │ Take Rate: 10.4%                                     │     │
│ │ Extra Revenue: Rp 2.985.000                          │     │
│ │ Benchmark: 10-20%                                    │     │
│ │ Status: ✅ Within benchmark                          │     │
│ │                                                     │     │
│ │ ────────────────────────────────────────────        │     │
│ │ TOTAL ADD-ON REVENUE: Rp 7.617.000                  │     │
│ │ Add-on lift: +30.3% vs base                         │     │
│ │                                                     │     │
│ │ METRICS OVERVIEW:                                   │     │
│ │ AOV: Rp 116.204                                      │     │
│ │ AOV with add-ons: Rp 151.389                        │     │
│ │ Refund rate: 2.3%                                    │     │
│ │ Net revenue: Rp 24.6jt                              │     │
│ │                                                     │     │
│ │ 💡 REVENUE OPTIMIZATION:                            │     │
│ │ Couple bump conversion 21.8% (target 30%)           │     │
│ │ Potential extra revenue kalau naik ke 30%:          │     │
│ │ +13 orders × Rp 48rb = Rp 624rb/bulan               │     │
│ │                                                     │     │
│ │ Upsell conversion 7.7% (target 12%)                 │     │
│ │ Potential extra revenue kalau naik ke 12%:          │     │
│ │ +7 orders × Rp 250rb = Rp 1.750rb/bulan             │     │
│ │                                                     │     │
│ │ Total potential: +Rp 2.4jt/bulan                     │     │
│ └────────────────────────────────────────────────────┘     │
│                                                              │
│ ═══ SECTION 3: CONVERSION ANALYSIS ═══                      │
│                                                              │
│ ┌────────────────────────────────────────────────────┐     │
│ │                                                     │     │
│ │ CONVERSION BY SOURCE:                               │     │
│ │                                                     │     │
│ │ Source            Visitors  Buyers  Rate    ROI    │     │
│ │ ─────────────────────────────────────────────────  │     │
│ │ Direct              2,100     89    4.2%    -      │     │
│ │ Google Search       1,500     67    4.5%   High   │     │
│ │ Facebook Ads          800     45    5.6%   3.2x  🏆│     │
│ │ Instagram             500     18    3.6%   1.8x   │     │
│ │ WhatsApp Share        200     12    6.0%   Free 🏆│     │
│ │ Referral              134      3    2.2%   Low    │     │
│ │                                                     │     │
│ │ 💡 INSIGHTS:                                        │     │
│ │ 🏆 Facebook Ads: ROI 3.2x — SCALE UP budget         │     │
│ │ 🏆 WhatsApp Share: 6% conv — invest in referral    │     │
│ │ ⚠️ Referral: 2.2% conv — review program            │     │
│ │                                                     │     │
│ │                                                     │     │
│ │ CONVERSION BY DEVICE:                               │     │
│ │                                                     │     │
│ │ Device        Traffic   Conv Rate    Bounce         │     │
│ │ ─────────────────────────────────────────────────  │     │
│ │ Mobile         68%        3.8%       45%           │     │
│ │ Desktop        32%        5.2%       32%           │     │
│ │                                                     │     │
│ │ 💡 Mobile mayoritas traffic tapi conv lebih rendah │     │
│ │ Action: Audit mobile UX, terutama checkout         │     │
│ │                                                     │     │
│ │                                                     │     │
│ │ CONVERSION BY TIME:                                 │     │
│ │                                                     │     │
│ │ [Bar chart: Day of week]                            │     │
│ │ Best: Tuesday 5.8%                                  │     │
│ │ Worst: Saturday 2.1%                                │     │
│ │                                                     │     │
│ │ [Heatmap: 0-23 hours]                               │     │
│ │ Peak: 19:00-21:00 (7.2%)                           │     │
│ │ Low: 02:00-06:00 (0.5%)                            │     │
│ │                                                     │     │
│ │ 💡 Ad Scheduling Recommendation:                    │     │
│ │ - Focus Selasa-Kamis                                │     │
│ │ - Peak hours 18:00-22:00                            │     │
│ │ - Skip Sabtu-Minggu untuk ads (conv rendah)         │     │
│ └────────────────────────────────────────────────────┘     │
│                                                              │
│ ═══ SECTION 4: IN-APP MARKETING ═══                         │
│                                                              │
│ ┌────────────────────────────────────────────────────┐     │
│ │                                                     │     │
│ │ IN-APP OFFER PERFORMANCE:                           │     │
│ │                                                     │     │
│ │ Offer                 Shown View  Click Conv Rate  │     │
│ │ ─────────────────────────────────────────────────  │     │
│ │ Trial→Lifetime         234  189    45    23  12.2%│     │
│ │ Lifetime→Couple         89   67    12     5   7.5%│     │
│ │ Lifetime→Pro+           78   56    15     8  14.3%│     │
│ │ Couple Activation       34   28     8     6  21.4%│     │
│ │ Feature Discovery      456  345    89    --  25.8%│     │
│ │ Reactivation            23   18     5     2  11.1%│     │
│ │                                                     │     │
│ │ Overall metrics:                                    │     │
│ │ Avg CTR: 19.7%                                      │     │
│ │ Avg Conversion: 12.4%                               │     │
│ │ Dismiss rate: 34% (target <40%)                     │     │
│ │ "Not interested" rate: 8% (target <15%)             │     │
│ │                                                     │     │
│ │ 💡 INSIGHTS:                                        │     │
│ │ ✅ Trial→Lifetime performing well (12.2%)           │     │
│ │ ⚠️ Couple upsell weak (7.5%) — improve messaging   │     │
│ │ 🏆 Feature Discovery excellent (25.8% CTR)          │     │
│ │ ✅ Reactivation OK (11.1%) — continue               │     │
│ │                                                     │     │
│ │ [Manage Campaigns] [View Global Rules]              │     │
│ └────────────────────────────────────────────────────┘     │
│                                                              │
│ ═══ SECTION 5: CAMPAIGNS ═══                                │
│                                                              │
│ ┌────────────────────────────────────────────────────┐     │
│ │ [+ New Campaign]                                    │     │
│ │                                                     │     │
│ │ Campaign          Status  Views CTR   Conv  Rev   │     │
│ │ ─────────────────────────────────────────────────  │     │
│ │ Trial to Basic    Active   234  19%  12.2%  2.3jt│     │
│ │ Couple Upsell     Active    89  14%   7.5%   240rb│     │
│ │ Pro+ Upgrade      Active    78  19%  14.3%  2.0jt│     │
│ │ Feature Discovery Active   456  26%    --      -  │     │
│ │ Reactivation      Paused    23  28%  11.1%   198rb│     │
│ │                                                     │     │
│ │ Actions per row: [Edit] [Pause/Resume] [Clone]     │     │
│ │                  [Analytics] [Delete]               │     │
│ └────────────────────────────────────────────────────┘     │
│                                                              │
│ ═══ SECTION 6: GLOBAL MARKETING RULES ═══                   │
│                                                              │
│ (Same as before — editable rules dengan keterangan)         │
│                                                              │
│ ═══ SECTION 7: AI SALES ADVISOR ═══                         │
│                                                              │
│ ┌────────────────────────────────────────────────────┐     │
│ │ 🤖 AI-generated recommendations updated hourly     │     │
│ │                                                     │     │
│ │ 🎯 HIGH PRIORITY (3):                               │     │
│ │                                                     │     │
│ │ 1. Optimize Landing Hero                            │     │
│ │    Impact: +15-25% CTR                              │     │
│ │    Effort: Medium (A/B test)                        │     │
│ │    [Details] [Create Test]                          │     │
│ │                                                     │     │
│ │ 2. Reduce Checkout Fields                           │     │
│ │    Impact: +20-30% form completion                  │     │
│ │    Effort: Low (edit form)                          │     │
│ │    [Details] [Edit Now]                             │     │
│ │                                                     │     │
│ │ 3. Improve Couple Pack Copy                         │     │
│ │    Impact: +5-10% bump take rate                    │     │
│ │    Effort: Low (edit copy)                          │     │
│ │    [Details] [Edit Now]                             │     │
│ │                                                     │     │
│ │ 💰 REVENUE OPPORTUNITIES (2):                       │     │
│ │                                                     │     │
│ │ 4. Test lower bump price                            │     │
│ │    Rp 48k → Rp 39k                                  │     │
│ │    Expected: +7% take rate                          │     │
│ │    Net impact: +Rp 400rb/month                      │     │
│ │                                                     │     │
│ │ 5. Behavior-based Trial Trigger                     │     │
│ │    Currently: Day 3 timer                           │     │
│ │    Better: After 10 transactions                    │     │
│ │    Expected: +3-5% conversion                       │     │
│ │                                                     │     │
│ │ 📊 PREDICTION:                                      │     │
│ │ Current trajectory: Rp 12.8jt next month            │     │
│ │ With all recommendations: Rp 15.2jt (+22%)          │     │
│ │                                                     │     │
│ │ [Export All Recommendations]                        │     │
│ └────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────┘
```

---

## TAB 6: NOTIFICATIONS

(Same as previous prompt — template manager, global rules, custom sender)

Detail dengan tambahan:

```
┌────────────────────────────────────────────────────────────┐
│ 🔔 Notifications Manager                                    │
│ Kelola semua notifikasi push, email, in-app                │
│                                                              │
│ ℹ️ Kategori:                                                │
│ 📨 Transactional: bill reminder, budget alert               │
│ 📣 Marketing: upgrade offer, feature discovery              │
│ 🎯 Engagement: weekly digest, achievement                   │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ (Same as previous — send custom, templates, rules, stats)   │
│                                                              │
│ Tambahan: TESTING NOTIFICATIONS                             │
│                                                              │
│ ┌────────────────────────────────────────────────┐         │
│ │ 🧪 TEST NOTIFICATION                            │         │
│ │                                                  │         │
│ │ Kirim notifikasi test ke:                        │         │
│ │ ○ Diri sendiri (admin)                          │         │
│ │ ○ Test user (dari Testing Lab)                  │         │
│ │ ○ Specific user (input email)                   │         │
│ │                                                  │         │
│ │ Template: [Select ▼]                             │         │
│ │ Preview: [content]                               │         │
│ │                                                  │         │
│ │ [Send Test]                                      │         │
│ └──────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────┘
```

---

## TAB 7: TESTING LAB (NEW - HIGHLIGHT)

### Testing Lab dengan Impersonate + Custom Builder

```
┌────────────────────────────────────────────────────────────┐
│ 🧪 Testing Lab                                              │
│ Buat test user, generate skenario, impersonate untuk QA    │
│                                                              │
│ ℹ️ Data test user terisolasi di database yang sama.         │
│ Impersonate memungkinkan admin lihat app dari perspektif   │
│ test user tanpa logout dari admin session.                  │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ ═══ CURRENT STATUS ═══                                      │
│                                                              │
│ ┌────────────────────────────────────────────────┐         │
│ │ 📊 Testing Overview                             │         │
│ │                                                  │         │
│ │ Total test users: 8                              │         │
│ │ Active impersonations: 0                         │         │
│ │ Scenarios in library: 12                         │         │
│ │ Last test session: 2 jam lalu                    │         │
│ └──────────────────────────────────────────────────┘         │
│                                                              │
│ ═══ SECTION 1: TEST USERS MANAGEMENT ═══                    │
│                                                              │
│ [+ Create New Test User]                                    │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Test User Name    Plan       Scenario         Actions │ │
│ │ ─────────────────────────────────────────────────────  │ │
│ │ 🧪 TestUser #1    Lifetime   Bulan Normal     ⋮       │ │
│ │    test.user1@monefyi.test                             │ │
│ │    Created: 3 hari lalu | Last used: 2 jam lalu        │ │
│ │    Transactions: 45 | Categories: 12 | Goals: 2        │ │
│ │    [Impersonate] [Apply Scenario] [Reset] [Delete]     │ │
│ │                                                         │ │
│ │ 🧪 TestUser #2    Trial      Bulan Krisis    ⋮       │ │
│ │    test.user2@monefyi.test                             │ │
│ │    Created: 1 minggu lalu | Never used                 │ │
│ │    Transactions: 20 | Categories: 8 | Goals: 1         │ │
│ │    [Impersonate] [Apply Scenario] [Reset] [Delete]     │ │
│ │                                                         │ │
│ │ 🧪 TestUser #3    Couple     Bulan Optimal   ⋮       │ │
│ │    test.user3@monefyi.test                             │ │
│ │    Household: Yes (2 members)                          │ │
│ │    [Impersonate] [Apply Scenario] [Reset] [Delete]     │ │
│ │                                                         │ │
│ │ 🧪 TestUser #4    Pro+       Anomaly Test     ⋮       │ │
│ │    Has HP purchase Rp 7.988.000                        │ │
│ │    [Impersonate] [Apply Scenario] [Reset] [Delete]     │ │
│ │                                                         │ │
│ │ 🧪 TestUser #5    Free       Empty State      ⋮       │ │
│ │    No transactions yet                                 │ │
│ │    [Impersonate] [Apply Scenario] [Reset] [Delete]     │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ Bulk actions: [Delete Selected] [Reset Selected]            │
│                                                              │
│ ═══ SECTION 2: SCENARIO LIBRARY ═══                         │
│                                                              │
│ ℹ️ Preset skenario untuk testing berbagai kondisi           │
│                                                              │
│ [+ Create Custom Scenario]                                  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ PRESET SCENARIOS:                                       │ │
│ │                                                          │ │
│ │ 📊 Bulan Normal (On Track)                              │ │
│ │    Income: Rp 8jt | Expense: Rp 5.5jt | Saving: 31%    │ │
│ │    Financial Health expected: 85+ (Excellent)           │ │
│ │    Use case: Test optimal state                         │ │
│ │    [Preview] [Apply to Test User] [Edit] [Clone]        │ │
│ │                                                          │ │
│ │ 🌱 Bulan Awal (Beginner)                                │ │
│ │    Income: Rp 5jt | Expense: Rp 3jt | Saving: 40%      │ │
│ │    Financial Health expected: 75+ (Good)                │ │
│ │    Use case: Test new user experience                   │ │
│ │    [Preview] [Apply] [Edit] [Clone]                     │ │
│ │                                                          │ │
│ │ ⚠️ Bulan Waspada (Over Budget)                          │ │
│ │    Income: Rp 8jt | Expense: Rp 9.5jt                  │ │
│ │    Multiple categories over budget                      │ │
│ │    Financial Health expected: 45-55 (Fair)              │ │
│ │    Use case: Test warning states & recommendations      │ │
│ │    [Preview] [Apply] [Edit] [Clone]                     │ │
│ │                                                          │ │
│ │ 🚨 Bulan Krisis (Cash Flow Negative)                    │ │
│ │    Income: Rp 5jt | Expense: Rp 8jt                    │ │
│ │    Emergency mode should trigger                        │ │
│ │    Financial Health expected: 20-30 (Critical)          │ │
│ │    Use case: Test emergency features                    │ │
│ │    [Preview] [Apply] [Edit] [Clone]                     │ │
│ │                                                          │ │
│ │ 💰 Bulan Bonus (Surplus Besar)                          │ │
│ │    Income: Rp 12jt (bonus) | Expense: Rp 5jt           │ │
│ │    Test allocation suggestions                          │ │
│ │    [Preview] [Apply] [Edit] [Clone]                     │ │
│ │                                                          │ │
│ │ 🛒 Anomaly Test (Beli Aset Besar)                       │ │
│ │    Includes: Beli HP Rp 7.988.000                       │ │
│ │    Should trigger anomaly detection                     │ │
│ │    Use case: Test asset vs consumption logic            │ │
│ │    [Preview] [Apply] [Edit] [Clone]                     │ │
│ │                                                          │ │
│ │ 💳 Debt Heavy (Multiple Utang)                          │ │
│ │    5 active debts, various amounts                      │ │
│ │    Test debt payoff planner                             │ │
│ │    [Preview] [Apply] [Edit] [Clone]                     │ │
│ │                                                          │ │
│ │ 🎯 Multi-Goals User                                     │ │
│ │    Has 4 active goals with different priorities         │ │
│ │    Test goal simulator                                  │ │
│ │    [Preview] [Apply] [Edit] [Clone]                     │ │
│ │                                                          │ │
│ │ 👥 Couple/Household                                     │ │
│ │    2 users linked, shared categories                    │ │
│ │    Test household features                              │ │
│ │    [Preview] [Apply] [Edit] [Clone]                     │ │
│ │                                                          │ │
│ │ 📅 3 Months History                                     │ │
│ │    Full data 3 bulan lalu + bulan berjalan              │ │
│ │    Test trends & comparisons                            │ │
│ │    [Preview] [Apply] [Edit] [Clone]                     │ │
│ │                                                          │ │
│ │ 🎁 Referral & Engagement                                │ │
│ │    High engagement metrics, referrals made              │ │
│ │    Test achievement system                              │ │
│ │    [Preview] [Apply] [Edit] [Clone]                     │ │
│ │                                                          │ │
│ │ 🔄 Recurring User                                       │ │
│ │    5 recurring transactions set up                      │ │
│ │    Test recurring flow                                  │ │
│ │    [Preview] [Apply] [Edit] [Clone]                     │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ═══ SECTION 3: CUSTOM SCENARIO BUILDER ═══                  │
│                                                              │
│ [+ Build Custom Scenario]                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🛠️ Custom Scenario Builder                             │ │
│ │                                                          │ │
│ │ Scenario Name: [_______________________]                 │ │
│ │ Description: [_______________________]                   │ │
│ │                                                          │ │
│ │ ═══ TIMEFRAME ═══                                        │ │
│ │                                                          │ │
│ │ Data untuk berapa bulan?                                │ │
│ │ ○ 1 bulan (current only)                                │ │
│ │ ○ 3 bulan (with history)                                │ │
│ │ ○ 6 bulan                                               │ │
│ │ ○ 12 bulan                                              │ │
│ │                                                          │ │
│ │ Set current month:                                       │ │
│ │ [Agustus 2026 ▼]                                         │ │
│ │                                                          │ │
│ │ Current day of month: [15]                              │ │
│ │                                                          │ │
│ │ ═══ USER PROFILE ═══                                     │ │
│ │                                                          │ │
│ │ Payday: [25]                                             │ │
│ │ Income type: [Fixed salary ▼]                            │ │
│ │ Monthly income: Rp [8.000.000]                           │ │
│ │ Plan: [Lifetime ▼]                                       │ │
│ │ Household: [No ▼] / [Yes, 2 members]                     │ │
│ │                                                          │ │
│ │ ═══ ACCOUNTS ═══                                         │ │
│ │                                                          │ │
│ │ [+ Add Account]                                          │ │
│ │                                                          │ │
│ │ Account Name    Type       Opening Balance               │ │
│ │ BCA             Bank       Rp [5.000.000]  [X]           │ │
│ │ Cash            Cash       Rp [500.000]    [X]           │ │
│ │ GoPay           E-wallet   Rp [300.000]    [X]           │ │
│ │ Tabungan DD     Saving     Rp [3.000.000]  [X]           │ │
│ │                                                          │ │
│ │ ═══ CATEGORIES & BUDGET ═══                              │ │
│ │                                                          │ │
│ │ Use template: [Default 4-Pillar ▼]                       │ │
│ │ Or [Custom Categories]                                   │ │
│ │                                                          │ │
│ │ Budget items:                                            │ │
│ │ Category         Pillar       Type      Amount           │ │
│ │ Kost             Wajib        Fixed     [1.200.000]  [X] │ │
│ │ Listrik          Wajib        Fixed     [150.000]    [X] │ │
│ │ Internet         Wajib        Fixed     [150.000]    [X] │ │
│ │ Cicilan HP       Wajib        Fixed     [250.000]    [X] │ │
│ │ Makan            Kebutuhan    Flexible  [1.500.000]  [X] │ │
│ │ Transport        Kebutuhan    Flexible  [600.000]    [X] │ │
│ │ Belanja          Kebutuhan    Flexible  [500.000]    [X] │ │
│ │ Kesehatan        Kebutuhan    Flexible  [250.000]    [X] │ │
│ │ Nongkrong        Keinginan    Flexible  [400.000]    [X] │ │
│ │ Hiburan          Keinginan    Flexible  [500.000]    [X] │ │
│ │ Tabungan         Simpan       Saving    [1.500.000]  [X] │ │
│ │ Dana Darurat     Simpan       Saving    [1.000.000]  [X] │ │
│ │                                                          │ │
│ │ [+ Add Category]                                         │ │
│ │                                                          │ │
│ │ Total: Rp 8.000.000 ✓ (matches income)                   │ │
│ │                                                          │ │
│ │ ═══ TRANSACTIONS GENERATION ═══                          │ │
│ │                                                          │ │
│ │ Mode: [Auto Generate ▼] / [Manual List]                  │ │
│ │                                                          │ │
│ │ AUTO GENERATE OPTIONS:                                   │ │
│ │                                                          │ │
│ │ Spending pattern:                                        │ │
│ │ ○ Under budget (conservative)                            │ │
│ │ ○ On budget (normal) ✓                                   │ │
│ │ ○ Over budget (spendy)                                   │ │
│ │ ○ Custom per category                                    │ │
│ │                                                          │ │
│ │ Fixed bills: [All paid on time ▼]                        │ │
│ │                                                          │ │
│ │ Category-specific settings:                              │ │
│ │ Makan Sehari-hari:                                       │ │
│ │   Target: [1.500.000 / 100% of budget]                   │ │
│ │   Frequency: [Daily ▼]                                    │ │
│ │   Avg amount: [Rp 50.000]                                │ │
│ │   Merchants: [GoFood, ShopeeFood, Warteg ▼]              │ │
│ │                                                          │ │
│ │ Nongkrong & Kopi:                                        │ │
│ │   Target: [400.000 / 100%]                               │ │
│ │   Frequency: [3x per week]                               │ │
│ │   Merchants: [Kopi Kenangan, Starbucks ▼]                │ │
│ │                                                          │ │
│ │ [Configure all categories...]                            │ │
│ │                                                          │ │
│ │ ANOMALY INJECTION:                                       │ │
│ │ ☐ Add large purchase (asset)                             │ │
│ │   Amount: Rp [_______]                                   │ │
│ │   Category: [_______]                                    │ │
│ │   Day: [_]                                               │ │
│ │                                                          │ │
│ │ ☐ Add unexpected expense                                 │ │
│ │   Amount: Rp [_______]                                   │ │
│ │   Category: [_______]                                    │ │
│ │                                                          │ │
│ │ ═══ DEBTS ═══                                            │ │
│ │                                                          │ │
│ │ [+ Add Debt]                                             │ │
│ │                                                          │ │
│ │ Debt Name        Amount      Rate    Payment            │ │
│ │ Cicilan HP       Rp 2jt      12%     Rp 250rb  [X]     │ │
│ │                                                          │ │
│ │ ═══ GOALS ═══                                            │ │
│ │                                                          │ │
│ │ [+ Add Goal]                                             │ │
│ │                                                          │ │
│ │ Goal Name           Target       Current    Target Date  │ │
│ │ Dana Darurat        Rp 24jt      Rp 3jt    Jun 2027 [X]│ │
│ │ DP Motor            Rp 5jt       Rp 1jt    Mar 2027 [X]│ │
│ │                                                          │ │
│ │ ═══ EXPECTED VALUES (untuk pass/fail test) ═══           │ │
│ │                                                          │ │
│ │ ℹ️ Sistem akan compare hasil real dengan expected       │ │
│ │ values ini untuk validasi otomatis.                     │ │
│ │                                                          │ │
│ │ Expected metrics per akhir bulan:                        │ │
│ │ Total Income: Rp [8.000.000]                             │ │
│ │ Total Expense: Rp [5.500.000]                            │ │
│ │ Saving Rate: [31] %                                       │ │
│ │ Financial Health Score: [85-90]                          │ │
│ │ Cash Flow: [Positive]                                    │ │
│ │ Categories over budget: [0]                              │ │
│ │ Prediction status: [On track]                            │ │
│ │                                                          │ │
│ │ Expected recommendations (should appear):                │ │
│ │ ☑ "Pertahankan pola bagus"                              │ │
│ │ ☑ "Sisihkan bonus untuk goal"                           │ │
│ │ ☐ "Kurangi kategori X"                                   │ │
│ │                                                          │ │
│ │ Expected recommendations (should NOT appear):            │ │
│ │ ☑ "Bekukan tagihan tetap"                               │ │
│ │ ☑ "Emergency mode"                                       │ │
│ │                                                          │ │
│ │ [Save Scenario] [Save & Apply to Test User]              │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ═══ SECTION 4: IMPERSONATION MODE ═══                       │
│                                                              │
│ ℹ️ Impersonate memungkinkan admin melihat app dari         │
│ perspektif test user, tanpa logout dari admin session.     │
│ Banner floating akan muncul untuk exit mode.               │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🎭 Start Impersonation                                  │ │
│ │                                                          │ │
│ │ Select test user:                                        │ │
│ │ [TestUser #1 - Bulan Normal ▼]                           │ │
│ │                                                          │ │
│ │ Impersonation options:                                   │ │
│ │ ☑ Show impersonation banner (recommended)               │ │
│ │ ☑ Log all actions (audit trail)                         │ │
│ │ ☐ Enable notifications (test user's)                    │ │
│ │ ☑ Auto-exit after 30 minutes                             │ │
│ │                                                          │ │
│ │ [Start Impersonation]                                   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ Once impersonating:                                          │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🎭 IMPERSONATION ACTIVE                                 │ │
│ │ Viewing as: TestUser #1                                 │ │
│ │ Duration: 5 min 23 sec                                  │ │
│ │ [Exit Impersonation]                                    │ │
│ │                                                          │ │
│ │ [App content — appears exactly like user's view]        │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ═══ SECTION 5: TEST RESULTS & VALIDATION ═══                │
│                                                              │
│ ℹ️ Automatic pass/fail based on expected values             │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Latest Test Session                                     │ │
│ │ User: TestUser #4 (Anomaly Test)                        │ │
│ │ Scenario: Anomaly Test (Beli Aset Besar)                │ │
│ │ Applied: 15 menit lalu                                  │ │
│ │                                                          │ │
│ │ VALIDATION RESULTS:                                     │ │
│ │                                                          │ │
│ │ ✅ PASSED (7):                                          │ │
│ │ ✅ Income Rp 5.000.000 (expected: Rp 5.000.000)         │ │
│ │ ✅ Fixed bills = Rp 1.750.000                            │ │
│ │ ✅ Anomaly detected: Beli HP Rp 7.988.000               │ │
│ │ ✅ Modal asset/consumption appeared                     │ │
│ │ ✅ Category "Menunggu proses" NOT in breakdown          │ │
│ │ ✅ Cicilan HP correctly Rp 250.000 (not Rp 8jt)         │ │
│ │ ✅ Prediction realistic (surplus setelah asset excluded)│ │
│ │                                                          │ │
│ │ ❌ FAILED (2):                                          │ │
│ │ ❌ Financial Health Score: 28 (expected: 65-75)         │ │
│ │    Issue: Score belum exclude asset dari calculation    │ │
│ │    [Report Bug] [Debug]                                 │ │
│ │                                                          │ │
│ │ ❌ Recommendation "Review Beli HP" not shown            │ │
│ │    Issue: Rekomendasi masih target "Makan Sehari-hari"  │ │
│ │    [Report Bug] [Debug]                                 │ │
│ │                                                          │ │
│ │ ⚠️ WARNINGS (1):                                        │ │
│ │ ⚠ Notification count: 76 (should be < 20)              │ │
│ │   Auto-cleanup belum berjalan optimal                   │ │
│ │                                                          │ │
│ │ [Re-run Validation] [Export Report] [Fix All]           │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ═══ SECTION 6: TEST HISTORY ═══                             │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Date       User        Scenario         Result   Action│ │
│ │ ─────────────────────────────────────────────────────  │ │
│ │ 20 Agu 14:30 TestUser4 Anomaly Test    7P 2F 1W [View]│ │
│ │ 20 Agu 10:15 TestUser1 Bulan Normal    12P 0F   [View]│ │
│ │ 19 Agu 16:45 TestUser2 Bulan Krisis    5P 3F    [View]│ │
│ │ 19 Agu 09:20 TestUser3 Couple Test     8P 1F    [View]│ │
│ │ 18 Agu 15:00 TestUser1 Bulan Optimal   10P 0F  [View]│ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ [Export All Test Data] [Generate QA Report]                 │
└────────────────────────────────────────────────────────────┘
```

### Impersonation Implementation Notes

Technical requirements:
- Admin session tetap active (JWT tetap admin)
- App load data untuk test user (session context switched)
- All API calls check test user context
- All writes go to test user's isolated data
- Analytics events tagged as "test" (tidak masuk production analytics)
- Auto-exit setelah timeout untuk keamanan
- Audit log semua action selama impersonate

Data isolation:
- Test users pakai flag `is_test_user = TRUE`
- All queries filter out test users dari production reports
- Test data tidak counted di dashboard metrics (kecuali di Testing Lab)

Security:
- Only super_admin bisa impersonate
- All impersonation logged untuk audit
- User real tidak bisa di-impersonate (safety)
- Test users tidak bisa punya real payment info

---

## TAB 8: FEATURE FLAGS

(Same as previous prompt — feature toggles dengan rollout percentage)

---

## TAB 9: FEEDBACK

(Same as previous prompt — user feedback management)

---

## TAB 10: REFUNDS

(Same as previous prompt — refund request handling)

---

## TAB 11: TUTORIAL

(Same as previous prompt — tutorial content manager dengan Markdown)

---

## TAB 12: CONFIG

Extended dengan cross-app integration settings:

```
┌────────────────────────────────────────────────────────────┐
│ ⚙️ Configuration                                            │
│ Pengaturan global aplikasi dan integrasi                    │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ (Same as previous — app, payment, AI, data, supabase)       │
│                                                              │
│ ═══ CROSS-APP INTEGRATION ═══                               │
│                                                              │
│ ℹ️ Landing page dibangun terpisah tapi terhubung           │
│ via API dan shared database.                                │
│                                                              │
│ ┌────────────────────────────────────────────────┐         │
│ │ LANDING PAGE INTEGRATION                        │         │
│ │                                                  │         │
│ │ Landing Domain: [monefyi.com]                    │         │
│ │ API Base URL: [api.monefyi.com]                  │         │
│ │                                                  │         │
│ │ API Keys:                                        │         │
│ │ Public Key: [monefyi_pk_...] [Copy]              │         │
│ │ ℹ️ Untuk landing page fetch config              │         │
│ │                                                  │         │
│ │ Secret Key: [•••••••] [Show] [Regenerate]        │         │
│ │ ℹ️ Untuk backend operations                     │         │
│ │                                                  │         │
│ │ Webhook Endpoints:                               │         │
│ │ /webhook/payment - Payment confirmations         │         │
│ │ /webhook/lead - New form submissions             │         │
│ │                                                  │         │
│ │ CORS Allowed Origins:                            │         │
│ │ [monefyi.com]                                    │         │
│ │ [*.monefyi.com]                                  │         │
│ │ [+ Add Origin]                                   │         │
│ │                                                  │         │
│ │ Rate Limiting:                                   │         │
│ │ Public API: [100] requests/minute                │         │
│ │ Webhook: [Unlimited]                              │         │
│ └──────────────────────────────────────────────────┘         │
│                                                              │
│ ┌────────────────────────────────────────────────┐         │
│ │ SHARED CONFIG AVAILABLE VIA API                 │         │
│ │                                                  │         │
│ │ Endpoints yang bisa dipanggil landing:           │         │
│ │                                                  │         │
│ │ GET /api/config/landing                          │         │
│ │ Returns: all landing page sections               │         │
│ │                                                  │         │
│ │ GET /api/config/pricing                          │         │
│ │ Returns: pricing tiers, bumps, upsells           │         │
│ │                                                  │         │
│ │ GET /api/config/campaigns/active                 │         │
│ │ Returns: active campaigns for landing            │         │
│ │                                                  │         │
│ │ POST /api/analytics/pageview                     │         │
│ │ POST /api/analytics/event                        │         │
│ │ POST /api/checkout/initiate                      │         │
│ │ POST /api/checkout/complete                      │         │
│ │ POST /api/lead/capture                           │         │
│ │                                                  │         │
│ │ [View Full API Documentation]                    │         │
│ │ [Download OpenAPI Spec]                          │         │
│ └──────────────────────────────────────────────────┘         │
│                                                              │
│ ┌────────────────────────────────────────────────┐         │
│ │ MEDIA LIBRARY SYNC                              │         │
│ │                                                  │         │
│ │ Storage: Supabase Storage                        │         │
│ │ Bucket: monefyi-shared-assets                    │         │
│ │ Public URL Pattern:                              │         │
│ │ [supabase-url]/storage/monefyi-shared-assets/*   │         │
│ │                                                  │         │
│ │ Landing page bisa akses semua media:             │         │
│ │ - Landing images                                 │         │
│ │ - Tutorial images                                │         │
│ │ - Logo variations                                │         │
│ │ - Product screenshots                            │         │
│ └──────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────┘
```

---

## GENERAL STYLING FOR TESTING LAB

Testing Lab harus terlihat professional dan clear:

```
Colors specific to Testing Lab:
- Test badge: 🧪 icon dengan background purple soft
- Pass status: green (#10B981)
- Fail status: red (#EF4444)
- Warning status: amber (#F59E0B)
- Impersonation banner: bright orange (#F97316) with pulse animation

Impersonation banner:
Fixed position top of screen
Height: 40px
Background: gradient orange
Text: white bold
Content: "🎭 IMPERSONATION MODE | Viewing as [User] | [Exit]"

Test scenario cards:
Border-left thick colored bar (indicating type)
Green bar: passing tests
Red bar: has failures
Yellow bar: warnings
Blue bar: not yet tested

Custom builder form:
Multi-step wizard style
Progress indicator at top
Save draft anytime
Preview before applying
```

---

## SUCCESS CRITERIA

Admin Console dianggap complete kalau:

✅ Semua tab render dengan clear description dan info tooltips
✅ Testing Lab bisa create/manage test users dengan isolated data
✅ Impersonation flow bekerja (admin session preserved, app view switches)
✅ Custom scenario builder komprehensif dan easy to use
✅ Preset scenarios cover major test cases
✅ Auto pass/fail validation berfungsi
✅ Marketing analytics show full funnel + insights
✅ AI Sales Advisor generate actionable recommendations
✅ Landing Page cross-app integration documented dan working
✅ All content (tutorial, campaign, landing) editable without code
✅ Media library shared antara admin dan landing
✅ Config changes sync ke landing page real-time
✅ Notification manager complete dengan test capability
✅ Refund, feedback, feature flags manageable

---

## EXECUTION ORDER

**Sprint 1 (Week 1): Foundation**
1. Design system setup (colors, typography, components)
2. Sidebar navigation dengan environment switcher
3. Dashboard tab (overview + alerts)
4. Config tab (dengan cross-app integration setup)

**Sprint 2 (Week 2): Content Management**
5. Landing Page editor tab
6. Plans & Pricing tab
7. Tutorial manager tab
8. Media library

**Sprint 3 (Week 3): Marketing & Analytics**
9. Marketing tab (full analytics)
10. Notifications manager
11. Campaign editor
12. AI Sales Advisor integration

**Sprint 4 (Week 4): Testing Lab**
13. Test users management
14. Scenario library dengan presets
15. Custom scenario builder
16. Impersonation flow
17. Auto validation system

**Sprint 5 (Week 5): Operations**
18. Users management
19. Feedback tab
20. Refunds tab
21. Feature flags manager
22. Testing & QA

---

## LANDING PAGE INTEGRATION NOTES

Untuk agent yang akan build landing page terpisah:

### Data Fetching Pattern

Landing page harus:
1. Fetch config on load dari `/api/config/landing`
2. Cache config di client-side dengan TTL 5 menit
3. Render dari config, jangan hardcode content

Example:
```javascript
async function loadLandingConfig() {
  const cached = localStorage.getItem('monefyi_landing_config');
  if (cached && !isExpired(cached)) return JSON.parse(cached);
  
  const response = await fetch('https://api.monefyi.com/api/config/landing', {
    headers: {
      'X-API-Key': 'monefyi_pk_...'
    }
  });
  const config = await response.json();
  
  localStorage.setItem('monefyi_landing_config', JSON.stringify({
    data: config,
    fetchedAt: Date.now()
  }));
  
  return config;
}
```

### Analytics Tracking

Semua event penting di landing page harus track ke admin:
- Page view
- CTA clicks
- Form opens
- Form submissions
- Checkout initiations
- Purchase completions
- Exit intents

### Media Library Access

Landing page bisa langsung akses media library:
```
Image URL: {SUPABASE_URL}/storage/v1/object/public/monefyi-shared-assets/{filename}
```

### Pricing Sync

Pricing di landing page HARUS fetch dari API, jangan hardcode:
```javascript
const pricing = await fetch('/api/config/pricing');
// Render pricing cards dari data ini
```

Kalau admin ubah harga di admin panel, landing page otomatis update.

### Feature Flags Awareness

Landing page bisa show/hide sections berdasarkan feature flags:
```javascript
const flags = await fetch('/api/config/feature-flags/public');
if (flags.household_mode) {
  // Show Family/Couple pack section
}
```

### Webhook untuk Purchase

Setelah user complete purchase di Lynk.id:
1. Lynk.id webhook ke admin backend
2. Admin backend confirm payment
3. Admin backend push event ke landing analytics
4. Landing thank you page fetch confirmation
```

---

## Ringkasan Perubahan dari V1

### Yang Baru di V2:

1. **Testing Lab Tab** (Highlight utama)
   - Test users management
   - Scenario library dengan 12 presets
   - Custom scenario builder komprehensif
   - Impersonation flow yang aman
   - Auto pass/fail validation
   - Test history & reporting

2. **Cross-App Integration**
   - API endpoints documented
   - Media library sharing
   - Config sync ke landing page
   - Webhook system
   - CORS & rate limiting

3. **Enhanced Marketing Tab**
   - Full funnel monitoring lebih detail
   - Add-on performance (bump, upsell, OTO)
   - Conversion analysis (source, device, time)
   - AI Sales Advisor dengan predictions

4. **Environment Switcher**
   - LIVE / STAGING / Impersonate mode di header

5. **Improved Documentation Everywhere**
   - Setiap tab, section, dan field punya ℹ️ tooltip
   - Insights actionable di semua analytics
   - Clear terminology explanation

### Landing Page Agent Bisa Build:

Dengan admin panel yang punya API endpoints, landing page yang dibangun terpisah bisa:
- Fetch semua konten dari admin (headline, features, pricing, FAQ)
- Send analytics events ke admin
- Access media library shared
- Get real-time pricing updates
- Show/hide sections berdasarkan feature flags
- Track full funnel yang muncul di marketing analytics

Ini memungkinkan **decoupled architecture** — landing page dan admin bisa dibangun oleh tim/agent berbeda, tapi tetap terintegrasi sempurna.