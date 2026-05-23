# Monefyi Planner — Production Plan

> **Subdomain:** `planner.monefyi.com`
> **Tipe:** SaaS Multitenant Project Planner PWA
> **Stack:** Vite + Vanilla JS → React (migration path) · Vercel · Supabase · Supabase Auth
> **Bahasa UI:** Indonesia (default), English (i18n)

---

## Daftar Isi

1. [Ringkasan Produk](#1-ringkasan-produk)
2. [Arsitektur Sistem](#2-arsitektur-sistem)
3. [Database Schema](#3-database-schema)
4. [Fitur & Modul](#4-fitur--modul)
5. [UI/UX Design System](#5-uiux-design-system)
6. [Smart Monefyi Button — Command Center](#6-smart-monefyi-button--command-center)
7. [Algoritma & Logika Bisnis](#7-algoritma--logika-bisnis)
8. [Halaman Admin](#8-halaman-admin)
9. [Fase Pengembangan](#9-fase-pengembangan)
10. [Struktur Kode](#10-struktur-kode)
11. [Deployment & DevOps](#11-deployment--devops)
12. [Keamanan & Multitenancy](#12-keamanan--multitenancy)
13. [Integrasi dengan Monefyi Finance](#13-integrasi-dengan-monefyi-finance)

---

## 1. Ringkasan Produk

### Visi
Monefyi Planner adalah asisten manajemen proyek cerdas yang membuat user merasa memiliki **asisten pribadi**. User tidak perlu ribet melakukan setting kompleks — cukup buat planning, lalu berinteraksi dengan satu tombol untuk mencatat, melaporkan, dan mendapat rekomendasi.

### Value Proposition
| Level | Deskripsi |
|-------|-----------|
| **Level 1 (MVP)** | User membuat planning → menggunakan Smart Button untuk mencatat progress & biaya → app otomatis menganalisa, melapor, dan memberi rekomendasi. Seperti punya asisten pribadi. |
| **Level 2 (Future)** | App mempelajari pola project user → auto-suggest RAP, material list, timeline → user hanya perlu update progress. |

### Target User
- Kontraktor / pemborong bangunan skala kecil-menengah
- Project manager freelance
- Tim kecil yang mengelola multiple project
- Bisnis jasa yang butuh tracking biaya & progress

---

## 2. Arsitektur Sistem

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    planner.monefyi.com                   │
│                   (Vercel — Static SPA)                  │
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  Vite   │  │   PWA    │  │ Service  │  │  Web    │  │
│  │  Build  │  │ Manifest │  │  Worker  │  │  Audio  │  │
│  └─────────┘  └──────────┘  └──────────┘  │   API   │  │
│                                           └─────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase Backend                       │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │   Auth   │  │ Postgres │  │ Realtime │  │Storage │  │
│  │(Email/PW)│  │   + RLS  │  │  (WS)    │  │(Files) │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Edge Functions (Deno)                │   │
│  │                                                   │   │
│  │  planner-parse-command   → Smart Button parsing   │   │
│  │  planner-analyze         → Project analysis/reco  │   │
│  │  planner-voice-transcribe→ Whisper/Gemini STT     │   │
│  │  planner-report          → Report generation      │   │
│  │  planner-admin-users     → Admin user management  │   │
│  │  planner-webhook         → Payment webhook        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack Detail

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Frontend** | Vite 7 + Vanilla JS (Phase 1), migrasi ke React/Preact (Phase 2+) | Konsisten dengan Monefyi Finance, cepat untuk MVP |
| **CSS** | Tailwind CSS 4 (CDN → build plugin) | Rapid prototyping, mobile-first utilities |
| **Charts** | Chart.js 4 (Kurva S, Gantt-like, budget vs actual) | Sudah proven di Monefyi Finance |
| **State** | Global state object (Phase 1), Zustand (Phase 2+) | Simple → scalable |
| **PWA** | Service Worker + Web Manifest | Offline-capable, installable |
| **Voice** | Web Speech API (browser STT) + Whisper API fallback | Free tier first, accuracy fallback |
| **Backend** | Supabase (same instance as Monefyi Finance) | Shared auth, cross-app data potential |
| **AI/Parsing** | Gemini API via Edge Function | Parsing command, analysis, recommendations |
| **Hosting** | Vercel (static deploy) | CDN, edge, zero-config |
| **Payments** | Lynk.id (shared with Monefyi Finance) | Existing infrastructure |

### Shared Supabase Instance Strategy

Monefyi Planner dan Monefyi Finance menggunakan Supabase instance yang sama. Keuntungan:
- **Shared Auth** — user login sekali, akses kedua app (SSO via Supabase session)
- **Cross-app data** — transaksi project di Planner bisa muncul di Finance
- **Single billing** — satu Supabase project

Isolasi data via:
- Schema prefix: tabel Planner menggunakan prefix `planner_`
- RLS policy per app context
- `app_context` column di shared tables

---

## 3. Database Schema

### Core Tables

```sql
-- ============================================================
-- TENANT & ORGANIZATION
-- ============================================================

CREATE TABLE planner_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free','pro','enterprise')),
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE planner_org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','manager','member','viewer')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(org_id, user_id)
);

-- ============================================================
-- PROJECT
-- ============================================================

CREATE TABLE planner_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  client_contact JSONB DEFAULT '{}',
  location TEXT,
  
  -- Timeline
  planned_start DATE NOT NULL,
  planned_end DATE NOT NULL,
  actual_start DATE,
  actual_end DATE,
  
  -- Status
  status TEXT DEFAULT 'planning' 
    CHECK (status IN ('planning','active','paused','completed','cancelled')),
  progress_pct NUMERIC(5,2) DEFAULT 0,
  
  -- Budget summary (denormalized for quick read)
  total_budget NUMERIC(15,2) DEFAULT 0,
  total_spent NUMERIC(15,2) DEFAULT 0,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_planner_projects_org ON planner_projects(org_id);
CREATE INDEX idx_planner_projects_status ON planner_projects(status);

-- ============================================================
-- PLANNING: RAP (Rencana Anggaran Pelaksanaan)
-- ============================================================

-- Kategori RAP: Bahan & Tenaga
CREATE TABLE planner_rap_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('material','labor','equipment','overhead','other')),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE planner_rap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES planner_rap_categories(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,          -- satuan: m³, kg, orang/hari, ls, dll
  quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  -- Metadata untuk analisa
  supplier TEXT,
  notes TEXT,
  is_critical BOOLEAN DEFAULT false,  -- item kritis yang mempengaruhi timeline
  
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rap_items_project ON planner_rap_items(project_id);

-- ============================================================
-- PLANNING: WORK BREAKDOWN / TIMELINE
-- ============================================================

CREATE TABLE planner_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES planner_work_items(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Timeline
  planned_start DATE NOT NULL,
  planned_end DATE NOT NULL,
  planned_duration_days INT GENERATED ALWAYS AS (planned_end - planned_start + 1) STORED,
  actual_start DATE,
  actual_end DATE,
  
  -- Progress
  weight NUMERIC(5,2) DEFAULT 0,      -- bobot pekerjaan (% dari total project)
  progress_pct NUMERIC(5,2) DEFAULT 0,
  
  -- Resources
  planned_workers INT DEFAULT 1,
  actual_workers INT,
  
  -- Dependencies (predecessor IDs)
  dependencies UUID[] DEFAULT '{}',
  dependency_type TEXT DEFAULT 'FS' CHECK (dependency_type IN ('FS','FF','SS','SF')),
  
  -- Status
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending','in_progress','completed','delayed','blocked')),
  
  -- Link to RAP items consumed by this work
  rap_item_ids UUID[] DEFAULT '{}',
  
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_work_items_project ON planner_work_items(project_id);
CREATE INDEX idx_work_items_parent ON planner_work_items(parent_id);

-- ============================================================
-- REALISASI: BIAYA
-- ============================================================

CREATE TABLE planner_cost_realizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  rap_item_id UUID REFERENCES planner_rap_items(id) ON DELETE SET NULL,
  
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,3),
  unit_price NUMERIC(15,2),
  total_amount NUMERIC(15,2) NOT NULL,
  
  -- Payment info
  payment_method TEXT,
  receipt_url TEXT,           -- foto struk di Supabase Storage
  supplier TEXT,
  
  -- Status
  status TEXT DEFAULT 'recorded' CHECK (status IN ('recorded','verified','disputed')),
  verified_by UUID REFERENCES auth.users(id),
  
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cost_real_project ON planner_cost_realizations(project_id);
CREATE INDEX idx_cost_real_date ON planner_cost_realizations(date);

-- ============================================================
-- REALISASI: PROGRESS HARIAN
-- ============================================================

CREATE TABLE planner_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES planner_work_items(id) ON DELETE SET NULL,
  
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  
  -- Progress
  progress_increment NUMERIC(5,2) DEFAULT 0,  -- berapa % progress hari ini
  workers_present INT,
  weather TEXT CHECK (weather IN ('sunny','cloudy','rainy','stormy')),
  
  -- Evidence
  photo_urls TEXT[] DEFAULT '{}',
  
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_daily_logs_project_date ON planner_daily_logs(project_id, date);

-- ============================================================
-- ANALISA: SNAPSHOT & REKOMENDASI
-- ============================================================

CREATE TABLE planner_analysis_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Earned Value Management metrics
  pv NUMERIC(15,2),   -- Planned Value
  ev NUMERIC(15,2),   -- Earned Value
  ac NUMERIC(15,2),   -- Actual Cost
  sv NUMERIC(15,2),   -- Schedule Variance (EV - PV)
  cv NUMERIC(15,2),   -- Cost Variance (EV - AC)
  spi NUMERIC(8,4),   -- Schedule Performance Index (EV / PV)
  cpi NUMERIC(8,4),   -- Cost Performance Index (EV / AC)
  eac NUMERIC(15,2),  -- Estimate at Completion
  etc NUMERIC(15,2),  -- Estimate to Complete
  
  -- Progress
  planned_progress NUMERIC(5,2),
  actual_progress NUMERIC(5,2),
  
  -- S-Curve data points
  s_curve_data JSONB DEFAULT '{}',
  
  -- AI Recommendations
  recommendations JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analysis_project ON planner_analysis_snapshots(project_id, snapshot_date);

-- ============================================================
-- SMART BUTTON: COMMAND LOG
-- ============================================================

CREATE TABLE planner_command_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID NOT NULL REFERENCES planner_organizations(id),
  
  -- Input
  input_type TEXT NOT NULL CHECK (input_type IN ('voice','text')),
  raw_input TEXT NOT NULL,
  
  -- Parsing result
  parsed_intent TEXT,         -- 'record_cost', 'update_progress', 'open_project', dll
  parsed_params JSONB,        -- parameter hasil parsing
  confidence NUMERIC(5,4),    -- confidence score
  
  -- Execution
  execution_status TEXT DEFAULT 'pending' 
    CHECK (execution_status IN ('pending','executed','failed','needs_review')),
  execution_result JSONB,
  error_message TEXT,
  
  -- Learning: jika parsing gagal dan AI fix
  was_corrected BOOLEAN DEFAULT false,
  correction_data JSONB,      -- data koreksi untuk improve parser
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_command_logs_user ON planner_command_logs(user_id, created_at DESC);

-- ============================================================
-- SMART BUTTON: PARSING RULES (self-improving)
-- ============================================================

CREATE TABLE planner_parsing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES planner_organizations(id),  -- NULL = global rule
  
  intent TEXT NOT NULL,
  patterns JSONB NOT NULL,        -- regex/keyword patterns
  extraction_rules JSONB NOT NULL, -- how to extract params
  examples JSONB DEFAULT '[]',    -- training examples
  
  version INT DEFAULT 1,
  accuracy_score NUMERIC(5,4) DEFAULT 0,
  usage_count INT DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE planner_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID REFERENCES planner_organizations(id),
  project_id UUID REFERENCES planner_projects(id),
  
  type TEXT NOT NULL,          -- 'deadline','budget_alert','progress','recommendation'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON planner_notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- RLS POLICIES (semua tabel)
-- ============================================================

-- Pattern: user hanya bisa akses data dari org yang dia member
-- Contoh untuk planner_projects:

ALTER TABLE planner_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY planner_projects_select ON planner_projects
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM planner_org_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY planner_projects_insert ON planner_projects
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM planner_org_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner','admin','manager')
    )
  );

CREATE POLICY planner_projects_update ON planner_projects
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM planner_org_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner','admin','manager')
    )
  );

-- (Pattern serupa diterapkan ke semua tabel planner_*)

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================

-- Enable realtime for tables yang butuh live update
ALTER PUBLICATION supabase_realtime ADD TABLE planner_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE planner_daily_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE planner_cost_realizations;
ALTER PUBLICATION supabase_realtime ADD TABLE planner_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE planner_work_items;

-- ============================================================
-- VIEWS & FUNCTIONS
-- ============================================================

-- View: Project summary dengan perhitungan real-time
CREATE OR REPLACE VIEW planner_project_summary AS
SELECT 
  p.id,
  p.org_id,
  p.name,
  p.status,
  p.planned_start,
  p.planned_end,
  p.actual_start,
  (p.planned_end - p.planned_start + 1) AS planned_duration_days,
  CASE WHEN p.actual_start IS NOT NULL 
    THEN CURRENT_DATE - p.actual_start + 1 
    ELSE 0 
  END AS elapsed_days,
  
  -- Budget
  COALESCE(rap.total_budget, 0) AS total_budget,
  COALESCE(cr.total_spent, 0) AS total_spent,
  COALESCE(rap.total_budget, 0) - COALESCE(cr.total_spent, 0) AS budget_remaining,
  
  -- Progress
  COALESCE(wi.weighted_progress, 0) AS overall_progress,
  
  -- Health indicators
  CASE 
    WHEN COALESCE(cr.total_spent, 0) > COALESCE(rap.total_budget, 0) THEN 'over_budget'
    WHEN COALESCE(cr.total_spent, 0) > COALESCE(rap.total_budget, 0) * 0.9 THEN 'warning'
    ELSE 'healthy'
  END AS budget_health,
  
  CASE
    WHEN p.planned_end < CURRENT_DATE AND p.status != 'completed' THEN 'overdue'
    WHEN p.planned_end - CURRENT_DATE <= 7 AND p.status != 'completed' THEN 'deadline_near'
    ELSE 'on_track'
  END AS schedule_health

FROM planner_projects p
LEFT JOIN (
  SELECT project_id, SUM(total_price) AS total_budget 
  FROM planner_rap_items GROUP BY project_id
) rap ON rap.project_id = p.id
LEFT JOIN (
  SELECT project_id, SUM(total_amount) AS total_spent 
  FROM planner_cost_realizations GROUP BY project_id
) cr ON cr.project_id = p.id
LEFT JOIN (
  SELECT project_id, 
    SUM(weight * progress_pct) / NULLIF(SUM(weight), 0) AS weighted_progress
  FROM planner_work_items WHERE parent_id IS NULL GROUP BY project_id
) wi ON wi.project_id = p.id;

-- Function: Calculate EVM metrics for a project
CREATE OR REPLACE FUNCTION planner_calculate_evm(p_project_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
  v_total_budget NUMERIC;
  v_total_duration INT;
  v_elapsed_days INT;
  v_planned_progress NUMERIC;
  v_actual_progress NUMERIC;
  v_actual_cost NUMERIC;
  v_pv NUMERIC;
  v_ev NUMERIC;
  v_ac NUMERIC;
  v_result JSONB;
BEGIN
  -- Get project data
  SELECT 
    COALESCE(SUM(ri.total_price), 0),
    (p.planned_end - p.planned_start + 1),
    LEAST(p_date - p.planned_start + 1, p.planned_end - p.planned_start + 1)
  INTO v_total_budget, v_total_duration, v_elapsed_days
  FROM planner_projects p
  LEFT JOIN planner_rap_items ri ON ri.project_id = p.id
  WHERE p.id = p_project_id
  GROUP BY p.planned_start, p.planned_end;

  -- Planned progress (linear atau berdasarkan weight)
  SELECT COALESCE(SUM(
    CASE 
      WHEN wi.planned_end <= p_date THEN wi.weight
      WHEN wi.planned_start <= p_date THEN 
        wi.weight * (p_date - wi.planned_start + 1)::NUMERIC / 
        NULLIF(wi.planned_end - wi.planned_start + 1, 0)
      ELSE 0
    END
  ) / NULLIF(SUM(wi.weight), 0) * 100, 0)
  INTO v_planned_progress
  FROM planner_work_items wi
  WHERE wi.project_id = p_project_id AND wi.parent_id IS NULL;

  -- Actual progress (weighted)
  SELECT COALESCE(
    SUM(wi.weight * wi.progress_pct) / NULLIF(SUM(wi.weight), 0), 0
  )
  INTO v_actual_progress
  FROM planner_work_items wi
  WHERE wi.project_id = p_project_id AND wi.parent_id IS NULL;

  -- Actual cost
  SELECT COALESCE(SUM(total_amount), 0) 
  INTO v_actual_cost
  FROM planner_cost_realizations 
  WHERE project_id = p_project_id AND date <= p_date;

  -- EVM Calculations
  v_pv := v_total_budget * v_planned_progress / 100;
  v_ev := v_total_budget * v_actual_progress / 100;
  v_ac := v_actual_cost;

  v_result := jsonb_build_object(
    'planned_value', v_pv,
    'earned_value', v_ev,
    'actual_cost', v_ac,
    'schedule_variance', v_ev - v_pv,
    'cost_variance', v_ev - v_ac,
    'spi', CASE WHEN v_pv > 0 THEN ROUND(v_ev / v_pv, 4) ELSE NULL END,
    'cpi', CASE WHEN v_ac > 0 THEN ROUND(v_ev / v_ac, 4) ELSE NULL END,
    'eac', CASE WHEN v_ev > 0 THEN ROUND(v_total_budget * v_ac / v_ev, 2) ELSE NULL END,
    'etc', CASE WHEN v_ev > 0 THEN ROUND((v_total_budget - v_ev) * v_ac / v_ev, 2) ELSE NULL END,
    'planned_progress', v_planned_progress,
    'actual_progress', v_actual_progress,
    'total_budget', v_total_budget,
    'elapsed_days', v_elapsed_days,
    'total_duration', v_total_duration
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Fitur & Modul

### 4.1 Module: Planning

#### 4.1.1 RAP (Rencana Anggaran Pelaksanaan)

```
┌────────────────────────────────────────────┐
│           RAP — Project Rumah A            │
├────────────────────────────────────────────┤
│                                            │
│  📦 BAHAN                      Rp 45.000.000│
│  ├─ Semen (50 sak × Rp 65.000)  3.250.000 │
│  ├─ Pasir (12 m³ × Rp 350.000)  4.200.000 │
│  ├─ Besi ø10 (200 btg × ...)   12.000.000 │
│  ├─ Bata merah (5000 × ...)     3.500.000 │
│  └─ ... +15 item lagi                     │
│                                            │
│  👷 TENAGA                     Rp 28.000.000│
│  ├─ Tukang batu (2 org × 60hr)  14.400.000│
│  ├─ Kuli (2 org × 60 hari)      9.600.000 │
│  ├─ Tukang kayu (1 org × 30hr)  4.500.000 │
│  └─ ... +3 item lagi                      │
│                                            │
│  🔧 PERALATAN                  Rp  5.000.000│
│  ├─ Sewa molen (2 bln)          3.000.000 │
│  └─ Alat kerja                  2.000.000 │
│                                            │
│  ──────────────────────────────────────    │
│  TOTAL RAP                   Rp 78.000.000 │
│                                            │
│  [+ Tambah Item]  [📊 Analisa]  [📤 Export]│
└────────────────────────────────────────────┘
```

**Fitur RAP:**
- Input cepat: nama item, satuan, volume, harga satuan → auto-hitung total
- Kategori: Bahan, Tenaga, Peralatan, Overhead, Lainnya
- Duplicate dari project lain (template)
- Import dari Excel/CSV
- Mark item sebagai "kritis" (mempengaruhi timeline)
- Realtime total calculation

#### 4.1.2 Timeline / Work Breakdown

```
┌────────────────────────────────────────────┐
│        TIMELINE — Project Rumah A          │
├────────────────────────────────────────────┤
│                                            │
│  Durasi: 60 hari (1 Mar - 30 Apr 2026)    │
│  Pekerja: 4 orang                          │
│                                            │
│  ┌─ Persiapan Lahan (Minggu 1)            │
│  │  ├─ Pembersihan   ████░░  2 hr  80%    │
│  │  └─ Pengukuran    ██████  1 hr  100%   │
│  │                                         │
│  ├─ Pondasi (Minggu 2-3)                  │
│  │  ├─ Galian        ████░░  5 hr  70%    │
│  │  ├─ Pasang besi   ░░░░░░  3 hr  0%    │
│  │  └─ Cor           ░░░░░░  2 hr  0%    │
│  │                                         │
│  ├─ Struktur (Minggu 4-7)                 │
│  │  ├─ Dinding       ░░░░░░  10 hr 0%    │
│  │  ├─ Kolom & Balok ░░░░░░  7 hr  0%    │
│  │  └─ Atap          ░░░░░░  5 hr  0%    │
│  │                                         │
│  └─ Finishing (Minggu 8-9)                 │
│     ├─ Plester/Aci   ░░░░░░  5 hr  0%    │
│     ├─ Lantai        ░░░░░░  3 hr  0%    │
│     └─ Cat           ░░░░░░  3 hr  0%    │
│                                            │
│  [+ Tambah Tahap]  [📊 Kurva S]           │
└────────────────────────────────────────────┘
```

**Fitur Timeline:**
- Hierarchical work items (WBS — Work Breakdown Structure)
- Dependency antar item (FS, FF, SS, SF)
- Bobot per item (untuk weighted progress)
- Drag to reorder
- Auto-calculate critical path
- Gantt chart view (desktop)
- Visual timeline view (mobile)

#### 4.1.3 Analisa Planning & Rekomendasi

App otomatis menganalisa planning dan memberikan rekomendasi sebelum project dimulai:

**Analisa Biaya:**
- Benchmark unit price terhadap data historis user
- Deteksi harga tidak realistis (terlalu tinggi/rendah)
- Estimasi contingency yang disarankan (biasanya 5-10% dari total)
- Analisa komposisi biaya (% bahan vs tenaga vs peralatan)

**Analisa Waktu:**
- Critical Path Method (CPM) — identifikasi jalur kritis
- Resource leveling — optimasi alokasi pekerja
- Crash analysis — "Jika tambah 2 pekerja, hemat 10 hari, biaya tambah Rp X"
- Buffer analysis — identifikasi dimana perlu buffer waktu

**Contoh Output Rekomendasi:**

```
┌────────────────────────────────────────────┐
│      🧠 ANALISA & REKOMENDASI              │
├────────────────────────────────────────────┤
│                                            │
│  ⚠️  Harga semen Rp 65.000/sak lebih      │
│     tinggi 15% dari rata-rata project      │
│     Anda sebelumnya (Rp 56.500)            │
│     → Potensi penghematan: Rp 425.000     │
│                                            │
│  📊 Jalur Kritis:                          │
│     Pondasi → Struktur → Atap              │
│     Total: 32 hari (dari 60 hari)          │
│     Float tersedia: 28 hari                │
│                                            │
│  👷 Optimasi Tenaga:                       │
│     Saat ini: 4 pekerja, 60 hari           │
│     Opsi A: 6 pekerja → 45 hari (-15 hr)  │
│             Biaya tambah: +Rp 7.200.000    │
│     Opsi B: 5 pekerja → 52 hari (-8 hr)   │
│             Biaya tambah: +Rp 3.840.000    │
│                                            │
│  💰 Saran Contingency:                     │
│     RAP: Rp 78.000.000                     │
│     Contingency 7%: +Rp 5.460.000         │
│     Total disarankan: Rp 83.460.000        │
│                                            │
│  ✅ Komposisi biaya sehat:                  │
│     Bahan 58% | Tenaga 36% | Lain 6%      │
│     (Normal range: Bahan 50-65%)           │
│                                            │
└────────────────────────────────────────────┘
```

### 4.2 Module: Realisasi

#### 4.2.1 Realisasi Biaya

```
┌────────────────────────────────────────────┐
│     REALISASI BIAYA — Project Rumah A      │
├────────────────────────────────────────────┤
│                                            │
│  📦 Semen Portland                         │
│  RAP: 50 sak × Rp 65.000 = Rp 3.250.000  │
│  ┌─────────────────────────────────────┐   │
│  │ 5 Mar  20 sak × Rp 62.000  1.240.000│   │
│  │ 12 Mar 15 sak × Rp 63.000    945.000│   │
│  │ 20 Mar 18 sak × Rp 64.000  1.152.000│   │
│  └─────────────────────────────────────┘   │
│  Real: 53 sak = Rp 3.337.000              │
│  Selisih: -Rp 87.000 (over 2.7%) ⚠️       │
│                                            │
│  👷 Tukang Batu                            │
│  RAP: 2 org × 60 hr × Rp 120.000          │
│  Real: 2 org × 45 hr = Rp 10.800.000      │
│  Selisih: +Rp 3.600.000 (hemat 25%) ✅     │
│                                            │
│  ──────────────────────────────────────    │
│  Total RAP:    Rp 78.000.000               │
│  Total Real:   Rp 52.340.000               │
│  Sisa Budget:  Rp 25.660.000               │
│  Progress:     67%                          │
│                                            │
│  [🎤 Catat via Suara]  [+ Manual]          │
└────────────────────────────────────────────┘
```

**Fitur Realisasi Biaya:**
- Quick entry dari RAP items (tap item → isi jumlah & harga beli)
- Foto struk/nota (upload ke Supabase Storage)
- Running selisih per item dan total
- Color coding: hijau (hemat), kuning (mendekati limit), merah (over)
- Voice input via Smart Button: "beli semen 20 sak harga 62 ribu"

#### 4.2.2 Realisasi Progress (Daily Log)

```
┌────────────────────────────────────────────┐
│     LOG HARIAN — 15 Mar 2026               │
├────────────────────────────────────────────┤
│                                            │
│  Project: Rumah A                          │
│  Cuaca: ☀️ Cerah                            │
│  Pekerja hadir: 4 orang                    │
│                                            │
│  Apa yang dikerjakan hari ini?             │
│  ┌─────────────────────────────────────┐   │
│  │ ☑ Galian pondasi (lanjutan)        │   │
│  │   Progress: +15% (total 85%)       │   │
│  │                                     │   │
│  │ ☑ Pasang besi pondasi (mulai)      │   │
│  │   Progress: +10% (total 10%)       │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  📸 Foto dokumentasi: [+Tambah]            │
│  🖼 🖼 🖼 (3 foto)                          │
│                                            │
│  📝 Catatan:                               │
│  "Tanah keras di sisi timur, perlu         │
│   sewa jack hammer besok"                  │
│                                            │
│  [Simpan Log]                              │
│                                            │
│  ── Status vs Target ──                    │
│  Target hari ini: Galian 90%, Besi 20%     │
│  Aktual:          Galian 85%, Besi 10%     │
│  Status: ⚠️ Sedikit di bawah target        │
└────────────────────────────────────────────┘
```

**Fitur Daily Log:**
- Checklist work items yang dikerjakan hari ini
- Increment progress per work item
- Foto dokumentasi
- Cuaca dan jumlah pekerja hadir
- Auto-compare dengan target (dari timeline)
- Notifikasi jika behind schedule

### 4.3 Module: Laporan & Dashboard

#### 4.3.1 Kurva S (S-Curve)

```
Progress (%)
100│                                    ╭──── Target
   │                               ╭───╯
 80│                          ╭────╯
   │                     ╭───╯
 60│                ╭───╯
   │           ╭───╯         ╭── Aktual
 40│      ╭───╯         ╭───╯
   │  ╭──╯         ╭───╯
 20│╭─╯        ╭──╯
   │╯     ╭───╯
  0├─────┼─────┼─────┼─────┼─────┼───
   W1    W2    W3    W4    W5    W6
                  Minggu
```

**Dashboard Charts:**
1. **S-Curve** — planned vs actual progress over time
2. **Budget Burndown** — sisa budget vs waktu
3. **Cost Variance Chart** — bar chart per kategori RAP
4. **EVM Dashboard** — SPI, CPI gauges
5. **Worker Utilization** — pekerja hadir vs planned
6. **Daily Progress Trend** — line chart progress harian

#### 4.3.2 Laporan Otomatis

App men-generate laporan berkala (mingguan/on-demand):

```
┌────────────────────────────────────────────┐
│   LAPORAN MINGGUAN — Minggu ke-3           │
│   Project Rumah A                          │
├────────────────────────────────────────────┤
│                                            │
│  📊 RINGKASAN                              │
│  Progress: 35% (target 40%) ⚠️ -5%         │
│  Budget terpakai: Rp 28.5jt / 78jt (37%)  │
│  SPI: 0.88 | CPI: 1.05                    │
│                                            │
│  📈 PROGRESS MINGGU INI                    │
│  • Galian pondasi: 100% ✅ (selesai)        │
│  • Pasang besi: 60% → 85% (+25%)          │
│  • Cor pondasi: 0% → 30% (+30%)           │
│                                            │
│  💰 PENGELUARAN MINGGU INI                  │
│  • Besi ø10: Rp 4.200.000                 │
│  • Ready mix: Rp 3.600.000                │
│  • Upah: Rp 3.360.000                     │
│  Total: Rp 11.160.000                      │
│                                            │
│  🧠 REKOMENDASI                            │
│  1. Progress behind schedule 5%.           │
│     Tambah 1 pekerja untuk cor pondasi     │
│     bisa mengejar keterlambatan.            │
│  2. Budget cor lebih hemat 8% dari RAP.    │
│     Pertimbangkan supplier yang sama        │
│     untuk tahap selanjutnya.               │
│  3. Minggu depan masuk jalur kritis        │
│     (Dinding). Pastikan bata merah          │
│     sudah ready stock.                     │
│                                            │
│  [📤 Share PDF]  [📤 WhatsApp]              │
└────────────────────────────────────────────┘
```

---

## 5. UI/UX Design System

### 5.1 Mobile-First Layout

```
┌──────────────────────────┐
│  ▔▔▔▔▔▔ Status Bar ▔▔▔▔ │
│                          │
│  ┌──────────────────────┐│
│  │                      ││
│  │                      ││
│  │    CONTENT AREA      ││
│  │                      ││
│  │   (scrollable)       ││
│  │                      ││
│  │                      ││
│  │                      ││
│  │                      ││
│  │                      ││
│  │                      ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │ 🏠   📋   (M)   💰  ⚙️││
│  │Home Proj  ⬆️   Fin  Set││
│  └──────────────────────┘│
└──────────────────────────┘

(M) = Monefyi Smart Button (menonjol, floating above navbar)
```

### 5.2 Bottom Navigation Bar

```
┌──────────────────────────────────────────┐
│                                          │
│   🏠        📋       ◉       💰       ⚙️  │
│  Home    Project   ───    Finance   Settings│
│                    │M│                    │
│                    ───                    │
│          Monefyi Smart Button             │
│          (elevated, accent color,         │
│           pulse animation idle)           │
└──────────────────────────────────────────┘
```

**5 Tab Navigation:**

| Tab | Icon | Fungsi |
|-----|------|--------|
| **Home** | 🏠 | Dashboard overview, notifikasi, quick stats semua project |
| **Project** | 📋 | List project, detail project, planning, timeline, progress |
| **Monefyi** | ◉ (logo) | Smart Button — voice/text command center (menonjol, elevated) |
| **Finance** | 💰 | RAP, realisasi biaya, laporan keuangan, cross-link ke Monefyi Finance |
| **Settings** | ⚙️ | Profil, organisasi, member management, tema, bahasa |

### 5.3 Desktop Layout

```
┌──────────────────────────────────────────────────────┐
│  Monefyi Planner          🔍 Search    👤 Profile    │
├─────────┬────────────────────────────────────────────┤
│         │                                            │
│  🏠 Home │   MAIN CONTENT AREA                       │
│         │                                            │
│  📋 Proj │   (responsive grid layout)                │
│         │                                            │
│  💰 Fin  │   ┌──────────┐ ┌──────────┐              │
│         │   │  Card 1   │ │  Card 2  │              │
│  ⚙️ Set  │   └──────────┘ └──────────┘              │
│         │                                            │
│         │   ┌──────────────────────┐                 │
│  ──────  │   │     Chart Area       │                 │
│  Recent │   └──────────────────────┘                 │
│  Projects│                                           │
│  • Rmh A │                                           │
│  • Rmh B │                                           │
│         │                                            │
├─────────┴────────────────────────────────────────────┤
│              [◉ Monefyi Command] (floating bottom)   │
└──────────────────────────────────────────────────────┘
```

### 5.4 Design Tokens

```css
:root {
  /* Primary — Monefyi brand */
  --color-primary: #2563EB;        /* Blue 600 */
  --color-primary-light: #3B82F6;  /* Blue 500 */
  --color-primary-dark: #1D4ED8;   /* Blue 700 */
  
  /* Smart Button */
  --color-accent: #8B5CF6;         /* Violet 500 */
  --color-accent-glow: rgba(139, 92, 246, 0.3);
  
  /* Status */
  --color-success: #10B981;        /* Green */
  --color-warning: #F59E0B;        /* Amber */
  --color-danger: #EF4444;         /* Red */
  --color-info: #06B6D4;           /* Cyan */
  
  /* Neutral */
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #0F172A;
  --color-text-secondary: #64748B;
  --color-border: #E2E8F0;
  
  /* Dark mode */
  --dark-bg: #0F172A;
  --dark-surface: #1E293B;
  --dark-text: #F1F5F9;
  --dark-border: #334155;
  
  /* Typography */
  --font-family: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  
  /* Border radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;
  
  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  --shadow-glow: 0 0 20px var(--color-accent-glow);
}
```

### 5.5 Screen Flow Map

```
                    ┌─────────┐
                    │  Auth    │
                    │(Login/  │
                    │Register)│
                    └────┬────┘
                         │
                    ┌────▼────┐
              ┌─────┤  Home   ├─────┐
              │     │Dashboard│     │
              │     └────┬────┘     │
              │          │          │
        ┌─────▼───┐ ┌───▼────┐ ┌──▼──────┐
        │ Project │ │Finance │ │Settings │
        │  List   │ │Overview│ │         │
        └────┬────┘ └───┬────┘ └─────────┘
             │          │
        ┌────▼────┐ ┌───▼────┐
        │ Project │ │  RAP   │
        │ Detail  │ │ Detail │
        └────┬────┘ └───┬────┘
             │          │
    ┌────────┼──────┐   │
    │        │      │   │
┌───▼──┐ ┌──▼──┐ ┌─▼───▼──┐
│Plan  │ │Real │ │Report  │
│ning  │ │isasi│ │& Reco  │
│(RAP+ │ │(Cost│ │mmend   │
│ WBS) │ │+Log)│ │        │
└──────┘ └─────┘ └────────┘

   ◉ Smart Button accessible from ANY screen
   (opens as bottom sheet / full-screen overlay)
```

---

## 6. Smart Monefyi Button — Command Center

### 6.1 Konsep Arsitektur

Smart Button adalah **single entry point** untuk semua interaksi. Arsitektur parsing menggunakan **layered approach**:

```
┌────────────────────────────────────────┐
│           USER INPUT                    │
│   (Voice → STT → Text) atau (Text)     │
└──────────────────┬─────────────────────┘
                   │
          ┌────────▼────────┐
          │  Layer 1:       │
          │  Rule-based     │
          │  Parser         │
          │  (fast, local)  │
          └────────┬────────┘
                   │
          Confidence ≥ 0.85?
          ┌──Yes───┴───No──┐
          │                │
   ┌──────▼──────┐  ┌─────▼───────┐
   │  Execute    │  │  Layer 2:   │
   │  Command    │  │  AI Parser  │
   │             │  │  (Gemini)   │
   └─────────────┘  └──────┬──────┘
                           │
                  ┌────────▼────────┐
                  │  AI understands? │
                  │  Returns intent  │
                  │  + params        │
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │  Layer 3:       │
                  │  Self-improve   │
                  │  Update rules   │
                  │  in Layer 1     │
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │  Execute        │
                  │  Command        │
                  └─────────────────┘
```

### 6.2 Supported Intents

| Intent | Contoh Input | Aksi |
|--------|-------------|------|
| `record_cost` | "beli semen 20 sak 62 ribu project rumah A" | Insert ke `planner_cost_realizations` |
| `update_progress` | "hari ini galian pondasi selesai 85 persen" | Update `planner_work_items.progress_pct` + insert `daily_log` |
| `add_worker_log` | "hari ini hadir 4 orang, cuaca cerah" | Insert `planner_daily_logs` |
| `check_budget` | "berapa sisa budget project rumah A" | Query & return summary |
| `check_progress` | "progress project rumah A berapa" | Query & return progress |
| `open_project` | "buka project rumah A" | Navigate to project detail |
| `open_report` | "lihat laporan mingguan" | Navigate to report |
| `add_rap_item` | "tambah bahan pasir 10 kubik harga 350 ribu" | Insert `planner_rap_items` |
| `add_work_item` | "tambah pekerjaan plester dinding 5 hari mulai senin" | Insert `planner_work_items` |
| `ask_recommendation` | "rekomendasi untuk project rumah A" | Trigger analysis engine |
| `general_query` | "kapan deadline project rumah A" | Query & return info |
| `record_finance` | "bayar tukang 2 juta cash" | Cross-app: insert ke Monefyi Finance |

### 6.3 Rule-Based Parser (Layer 1)

```javascript
// Parsing Rules Structure
const PARSING_RULES = {
  record_cost: {
    patterns: [
      /(?:beli|bayar|byr|bl)\s+(.+?)\s+(\d+)\s*(?:sak|kg|m3|kubik|btg|batang|buah|unit|ls|lot)\s*(?:@|harga|hrg|x)?\s*(?:rp\.?\s*)?(\d[\d.,]*)/i,
      /(?:beli|bayar)\s+(.+?)\s+(?:rp\.?\s*)?(\d[\d.,]*)/i,
    ],
    extractors: {
      item_name: '$1',
      quantity: '$2',
      unit_price: '$3',
      total: 'quantity * unit_price',
      project: 'context.active_project OR extract_project_name(input)',
    },
    confidence_base: 0.90,
  },
  update_progress: {
    patterns: [
      /(?:progress|proses|kerjaan|hari ini)\s+(.+?)\s+(?:selesai\s+)?(\d+)\s*(?:%|persen|prosen)/i,
      /(.+?)\s+(?:sudah|sdh|udah)\s+(\d+)\s*(?:%|persen)/i,
    ],
    extractors: {
      work_item: 'fuzzy_match($1, active_work_items)',
      progress_value: '$2',
    },
    confidence_base: 0.85,
  },
  // ... more rules
};
```

### 6.4 AI Parser (Layer 2) — Edge Function

```javascript
// Edge Function: planner-parse-command
// Dipanggil ketika Layer 1 confidence < 0.85

const SYSTEM_PROMPT = `Kamu adalah parser perintah untuk aplikasi manajemen proyek.
Konteks user:
- Project aktif: {active_projects}
- Work items aktif: {active_work_items}
- RAP items: {rap_items}

Parse input user menjadi JSON dengan format:
{
  "intent": "record_cost|update_progress|...",
  "params": { ... sesuai intent ... },
  "confidence": 0.0-1.0,
  "explanation": "penjelasan singkat"
}

Jika tidak yakin, tanyakan klarifikasi dengan confidence rendah.`;
```

### 6.5 Self-Improving Parser (Layer 3)

Ketika Layer 1 gagal tapi Layer 2 berhasil:
1. AI menganalisa mengapa Layer 1 gagal
2. AI generate pattern regex baru atau perbaikan
3. Pattern baru disimpan di `planner_parsing_rules`
4. Layer 1 reload rules
5. Next time input serupa → Layer 1 bisa handle

```javascript
async function selfImproveParser(rawInput, aiResult, failedRule) {
  const improvement = await callEdgeFunction('planner-parse-command', {
    mode: 'improve_parser',
    raw_input: rawInput,
    ai_result: aiResult,
    failed_rule: failedRule,
    request: 'Generate improved regex pattern for this intent'
  });
  
  // Save new pattern to DB
  await supabase.from('planner_parsing_rules').upsert({
    intent: aiResult.intent,
    patterns: improvement.new_patterns,
    examples: [...existingExamples, { input: rawInput, expected: aiResult }],
    version: currentVersion + 1,
  });
}
```

### 6.6 Voice Input Flow

```
User taps 🎤 → Web Speech API starts listening
                    │
              ┌─────▼─────┐
              │  Browser   │    (Free, instant, works offline)
              │  STT       │
              └─────┬─────┘
                    │
              Speech → Text
                    │
              ┌─────▼─────┐
              │  Accuracy  │    (Check if transcription makes sense)
              │  Check     │
              └──┬────┬───┘
                 │    │
            Good │    │ Poor / unsupported language
                 │    │
                 │  ┌─▼───────┐
                 │  │ Whisper  │  (Fallback: send audio to server)
                 │  │ via Edge │
                 │  │ Function │
                 │  └────┬────┘
                 │       │
              ┌──▼───────▼──┐
              │   Text       │
              │   Parser     │
              │   Pipeline   │
              └──────────────┘
```

### 6.7 UI Smart Button

```
┌──────────────────────────────────┐
│                                  │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │   "beli semen 20 sak      │  │
│  │    harga 62 ribu           │  │
│  │    project rumah A"        │  │
│  │                            │  │
│  │   ✅ Tercatat!              │  │
│  │   Semen 20 sak × Rp62.000 │  │
│  │   = Rp 1.240.000          │  │
│  │   → Project Rumah A       │  │
│  │                            │  │
│  │   [Benar] [Koreksi]       │  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │  Ketik perintah atau...   │  │
│  │                        🎤  │  │
│  └────────────────────────────┘  │
│                                  │
│  Quick Commands:                 │
│  [📦 Catat Beli] [👷 Log Hari]  │
│  [📊 Cek Progress] [💰 Budget]  │
│                                  │
└──────────────────────────────────┘
```

---

## 7. Algoritma & Logika Bisnis

### 7.1 Earned Value Management (EVM)

EVM adalah metode standar internasional (PMI) untuk mengukur performa project:

```
Planned Value (PV)    = Budget × Planned % Complete
Earned Value (EV)     = Budget × Actual % Complete  
Actual Cost (AC)      = Total biaya aktual yang sudah keluar

Schedule Variance (SV) = EV - PV
  → Positif = ahead of schedule
  → Negatif = behind schedule

Cost Variance (CV)     = EV - AC
  → Positif = under budget
  → Negatif = over budget

Schedule Performance Index (SPI) = EV / PV
  → > 1.0 = ahead    → < 1.0 = behind

Cost Performance Index (CPI)     = EV / AC
  → > 1.0 = hemat    → < 1.0 = boros

Estimate at Completion (EAC)     = Budget / CPI
Estimate to Complete (ETC)       = EAC - AC
Variance at Completion (VAC)     = Budget - EAC
```

### 7.2 Critical Path Method (CPM)

```javascript
function calculateCriticalPath(workItems) {
  // 1. Build dependency graph
  const graph = buildDependencyGraph(workItems);
  
  // 2. Forward pass — earliest start & finish
  for (const item of topologicalSort(graph)) {
    item.earlyStart = Math.max(
      ...item.predecessors.map(p => p.earlyFinish), 
      item.plannedStart
    );
    item.earlyFinish = item.earlyStart + item.duration;
  }
  
  // 3. Backward pass — latest start & finish
  const projectEnd = Math.max(...workItems.map(i => i.earlyFinish));
  for (const item of topologicalSort(graph).reverse()) {
    item.lateFinish = Math.min(
      ...item.successors.map(s => s.lateStart),
      projectEnd
    );
    item.lateStart = item.lateFinish - item.duration;
  }
  
  // 4. Calculate float
  for (const item of workItems) {
    item.totalFloat = item.lateStart - item.earlyStart;
    item.isCritical = item.totalFloat === 0;
  }
  
  // 5. Critical path = items with zero float
  return workItems.filter(i => i.isCritical);
}
```

### 7.3 Resource Optimization (Crash Analysis)

```javascript
function crashAnalysis(project, workItems, rapItems) {
  const criticalPath = calculateCriticalPath(workItems);
  const recommendations = [];
  
  for (const item of criticalPath) {
    if (item.type === 'labor_intensive') {
      const currentWorkers = item.plannedWorkers;
      const currentDuration = item.duration;
      
      // Hukum produktivitas: adding workers has diminishing returns
      // Menggunakan Brooks-like adjustment: 
      // effective_productivity = base × (1 - communication_overhead)
      // communication_overhead ≈ n(n-1)/20 untuk tim kecil
      
      for (let addWorkers = 1; addWorkers <= 3; addWorkers++) {
        const newTotal = currentWorkers + addWorkers;
        const commOverhead = (newTotal * (newTotal - 1)) / 20;
        const effectiveProductivity = newTotal * (1 - Math.min(commOverhead, 0.4));
        const newDuration = Math.ceil(
          currentDuration * currentWorkers / effectiveProductivity
        );
        const timeSaved = currentDuration - newDuration;
        const additionalCost = addWorkers * newDuration * getDailyRate(item);
        
        if (timeSaved > 0) {
          recommendations.push({
            type: 'resource_optimization',
            work_item: item.name,
            current: { workers: currentWorkers, duration: currentDuration },
            proposed: { workers: newTotal, duration: newDuration },
            time_saved_days: timeSaved,
            additional_cost: additionalCost,
            cost_per_day_saved: additionalCost / timeSaved,
            priority: timeSaved >= 5 ? 'high' : 'medium',
          });
        }
      }
    }
  }
  
  return recommendations.sort((a, b) => 
    b.time_saved_days / b.additional_cost - a.time_saved_days / a.additional_cost
  );
}
```

### 7.4 Budget Anomaly Detection

```javascript
function detectBudgetAnomalies(project) {
  const anomalies = [];
  
  // 1. Compare unit prices with historical data
  for (const item of project.rapItems) {
    const historicalPrices = await getHistoricalPrices(
      project.orgId, item.name, item.unit
    );
    
    if (historicalPrices.length > 0) {
      const avgPrice = mean(historicalPrices);
      const stdDev = standardDeviation(historicalPrices);
      const zScore = (item.unitPrice - avgPrice) / stdDev;
      
      if (Math.abs(zScore) > 1.5) {
        anomalies.push({
          type: 'price_anomaly',
          item: item.name,
          current_price: item.unitPrice,
          avg_price: avgPrice,
          deviation_pct: ((item.unitPrice - avgPrice) / avgPrice * 100).toFixed(1),
          direction: zScore > 0 ? 'higher' : 'lower',
          potential_saving: zScore > 0 
            ? (item.unitPrice - avgPrice) * item.quantity 
            : 0,
          severity: Math.abs(zScore) > 2.5 ? 'high' : 'medium',
        });
      }
    }
  }
  
  // 2. Budget composition analysis
  const totalBudget = sum(project.rapItems.map(i => i.totalPrice));
  const materialCost = sum(project.rapItems.filter(i => i.type === 'material').map(i => i.totalPrice));
  const laborCost = sum(project.rapItems.filter(i => i.type === 'labor').map(i => i.totalPrice));
  
  const materialRatio = materialCost / totalBudget;
  const laborRatio = laborCost / totalBudget;
  
  // Typical construction: material 50-65%, labor 25-40%
  if (materialRatio < 0.40 || materialRatio > 0.75) {
    anomalies.push({
      type: 'composition_anomaly',
      category: 'material',
      current_ratio: materialRatio,
      expected_range: [0.50, 0.65],
      severity: 'medium',
    });
  }
  
  // 3. Contingency check
  // Recommend 5-10% contingency
  if (!project.rapItems.some(i => i.name.toLowerCase().includes('contingency'))) {
    anomalies.push({
      type: 'missing_contingency',
      recommended_amount: totalBudget * 0.07,
      severity: 'low',
    });
  }
  
  return anomalies;
}
```

### 7.5 S-Curve Generation

```javascript
function generateSCurveData(project, workItems) {
  const startDate = new Date(project.plannedStart);
  const endDate = new Date(project.plannedEnd);
  const totalDays = daysBetween(startDate, endDate);
  
  const plannedCurve = [];
  const actualCurve = [];
  
  // Generate weekly data points
  for (let week = 0; week <= Math.ceil(totalDays / 7); week++) {
    const date = addDays(startDate, week * 7);
    
    // Planned progress at this date
    let plannedProgress = 0;
    for (const item of workItems) {
      if (item.plannedStart <= date) {
        const itemDuration = daysBetween(item.plannedStart, item.plannedEnd);
        const elapsed = Math.min(daysBetween(item.plannedStart, date), itemDuration);
        const itemProgress = (elapsed / itemDuration) * item.weight;
        plannedProgress += itemProgress;
      }
    }
    
    plannedCurve.push({
      date: date.toISOString().split('T')[0],
      week: week + 1,
      progress: Math.min(plannedProgress, 100),
    });
    
    // Actual progress (from daily logs)
    if (date <= new Date()) {
      const actualProgress = await calculateActualProgressAtDate(project.id, date);
      actualCurve.push({
        date: date.toISOString().split('T')[0],
        week: week + 1,
        progress: actualProgress,
      });
    }
  }
  
  return { planned: plannedCurve, actual: actualCurve };
}
```

### 7.6 Smart Recommendation Engine

```javascript
async function generateRecommendations(projectId) {
  const project = await getProjectWithDetails(projectId);
  const evm = await calculateEVM(projectId);
  const criticalPath = calculateCriticalPath(project.workItems);
  const budgetAnomalies = detectBudgetAnomalies(project);
  const crashOptions = crashAnalysis(project, project.workItems, project.rapItems);
  
  const recommendations = [];
  
  // Schedule recommendations
  if (evm.spi < 0.95) {
    const behindDays = Math.ceil(
      (evm.planned_progress - evm.actual_progress) / 100 * project.totalDuration
    );
    
    recommendations.push({
      category: 'schedule',
      priority: evm.spi < 0.85 ? 'critical' : 'warning',
      title: `Project terlambat ${behindDays} hari`,
      description: `SPI ${evm.spi.toFixed(2)}. Progress aktual ${evm.actual_progress.toFixed(1)}% vs target ${evm.planned_progress.toFixed(1)}%.`,
      actions: crashOptions.slice(0, 3).map(opt => ({
        label: `Tambah ${opt.proposed.workers - opt.current.workers} pekerja di "${opt.work_item}"`,
        detail: `Hemat ${opt.time_saved_days} hari, biaya tambah Rp ${formatNumber(opt.additional_cost)}`,
      })),
    });
  }
  
  // Cost recommendations
  if (evm.cpi < 0.95) {
    const projectedOverrun = evm.eac - project.totalBudget;
    recommendations.push({
      category: 'cost',
      priority: evm.cpi < 0.85 ? 'critical' : 'warning',
      title: `Budget berisiko over Rp ${formatNumber(projectedOverrun)}`,
      description: `CPI ${evm.cpi.toFixed(2)}. Estimasi total biaya: Rp ${formatNumber(evm.eac)} vs budget Rp ${formatNumber(project.totalBudget)}.`,
      actions: budgetAnomalies
        .filter(a => a.potential_saving > 0)
        .map(a => ({
          label: `Review harga ${a.item}`,
          detail: `${a.deviation_pct}% di atas rata-rata. Potensi hemat Rp ${formatNumber(a.potential_saving)}`,
        })),
    });
  }
  
  // Material readiness
  const upcomingWork = getWorkItemsStartingWithin(project.workItems, 7);
  for (const item of upcomingWork) {
    const requiredMaterials = getRequiredMaterials(item, project.rapItems);
    const purchasedMaterials = await getPurchasedQuantities(project.id, requiredMaterials);
    
    for (const mat of requiredMaterials) {
      const purchased = purchasedMaterials[mat.id] || 0;
      if (purchased < mat.quantity * 0.8) {
        recommendations.push({
          category: 'material',
          priority: 'warning',
          title: `${mat.name} belum cukup untuk "${item.name}"`,
          description: `Butuh ${mat.quantity} ${mat.unit}, baru beli ${purchased} ${mat.unit}. Pekerjaan dimulai ${formatDate(item.plannedStart)}.`,
          actions: [{ label: 'Catat pembelian', intent: 'record_cost', params: { item: mat.name } }],
        });
      }
    }
  }
  
  return recommendations;
}
```

---

## 8. Halaman Admin

### 8.1 Admin Dashboard

```
┌────────────────────────────────────────────────┐
│  ADMIN PANEL — Monefyi Planner                 │
├────────────────────────────────────────────────┤
│                                                │
│  📊 OVERVIEW                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Total    │ │ Active   │ │ Revenue  │       │
│  │ Users    │ │ Projects │ │ (MRR)    │       │
│  │   1,234  │ │     567  │ │  12.5jt  │       │
│  └──────────┘ └──────────┘ └──────────┘       │
│                                                │
│  📋 ORGANIZATIONS                              │
│  ┌────────────────────────────────────────┐    │
│  │ Search: [_______________] [Filter ▼]  │    │
│  │                                        │    │
│  │ PT ABC Construction    12 members  Pro │    │
│  │   └─ 8 projects, 3 active             │    │
│  │                                        │    │
│  │ CV Maju Jaya           5 members  Free │    │
│  │   └─ 3 projects, 1 active             │    │
│  │                                        │    │
│  │ Toko Bangunan XYZ      2 members  Pro │    │
│  │   └─ 15 projects, 5 active            │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  📈 ANALYTICS                                  │
│  • User growth chart (daily/weekly/monthly)    │
│  • Retention cohort analysis                   │
│  • Feature usage heatmap                       │
│  • Smart Button accuracy rate                  │
│  • Parser improvement log                      │
│                                                │
│  ⚙️ SYSTEM CONFIG                               │
│  • Subscription plans & pricing                │
│  • Global parsing rules management             │
│  • Feature flags                               │
│  • Announcement / notification broadcast       │
│  • AI model configuration                      │
│                                                │
│  🔍 MONITORING                                  │
│  • Active sessions (realtime)                  │
│  • Edge function performance                   │
│  • Error logs                                  │
│  • Smart Button failure rate                   │
│  • Parser accuracy trends                      │
│                                                │
└────────────────────────────────────────────────┘
```

### 8.2 Admin Capabilities

| Fitur | Deskripsi |
|-------|-----------|
| **User Management** | Lihat semua user, organisasi, subscription status |
| **Project Monitoring** | Overview semua project aktif (aggregate stats) |
| **Subscription Management** | Manage plans, upgrade/downgrade manual |
| **Parsing Rules** | Manage global parsing rules, lihat accuracy metrics |
| **System Config** | Checkout URLs, feature flags, AI config |
| **Analytics** | User growth, retention, feature usage |
| **Broadcast** | Send notification ke semua/filtered users |
| **Audit Log** | Semua admin actions tercatat |

---

## 9. Fase Pengembangan

### Phase 1 — Foundation & Core Planning (Target: Rilis MVP)

**Scope:**
- Project scaffolding (Vite + PWA + Supabase)
- Authentication (login, register, forgot password)
- Organization & member setup (single org per user)
- Project CRUD
- RAP (Rencana Anggaran Pelaksanaan) — material & labor
- Work Breakdown Structure (timeline planning)
- Basic bottom navbar (5 tabs)
- Mobile-first responsive layout
- Dark/light theme

**Database:** Core tables (organizations, projects, rap_items, work_items)
**Deliverable:** User bisa buat project, input RAP, dan plan timeline

---

### Phase 2 — Realization & Smart Button v1

**Scope:**
- Realisasi biaya (cost tracking vs RAP)
- Daily progress log
- Smart Button — text input parsing (Layer 1: rule-based)
- Basic intent: record_cost, update_progress, open_project
- Cost variance display (RAP vs actual)
- Progress tracking per work item
- Photo upload untuk daily log & receipt

**Database:** cost_realizations, daily_logs, command_logs
**Deliverable:** User bisa mencatat biaya & progress, basic text command

---

### Phase 3 — Analytics & Recommendations

**Scope:**
- S-Curve chart generation
- EVM (Earned Value Management) calculation
- Critical Path Method
- Budget anomaly detection
- Resource optimization recommendations
- Crash analysis
- Dashboard with multiple charts
- Weekly report generation (PDF/share)

**Database:** analysis_snapshots, views, EVM function
**Deliverable:** App memberikan analisa dan rekomendasi cerdas

---

### Phase 4 — Voice & AI Parser

**Scope:**
- Smart Button — voice input (Web Speech API + Whisper fallback)
- AI Parser (Layer 2: Gemini via Edge Function)
- Self-improving parser (Layer 3)
- Parsing rules management
- Confidence scoring & user confirmation flow
- Quick command suggestions
- Expanded intents (all listed intents)

**Database:** parsing_rules, command_logs enhancement
**Deliverable:** Full Smart Button functionality (voice + text + self-improve)

---

### Phase 5 — Admin & Multi-tenancy

**Scope:**
- Admin panel (full dashboard)
- Multi-org support (user bisa punya/join multiple org)
- Role-based access control (owner, admin, manager, member, viewer)
- Subscription management (free/pro/enterprise tiers)
- Realtime collaboration (live update via Supabase Realtime)
- Notification system
- Invite members via email/link

**Database:** RLS policies complete, notifications, org_members enhancement
**Deliverable:** Full SaaS multitenant dengan admin panel

---

### Phase 6 — Integration & Polish

**Scope:**
- Cross-integration dengan Monefyi Finance (shared transactions)
- WhatsApp report sharing
- Excel/CSV export & import
- Offline mode (Service Worker enhanced)
- Onboarding tour
- Performance optimization
- Advanced charts (Gantt chart desktop view)
- Template project (duplicate dari project sebelumnya)

**Deliverable:** Production-ready polished application

---

### Phase 7 — Level 2: Learning System (Future)

**Scope:**
- ML-based material suggestion (dari historical data)
- Auto-generate RAP draft dari project type
- Smart scheduling (auto-assign duration based on history)
- Predictive analytics (prediksi completion date)
- Natural language report generation
- User tidak perlu planning manual — app suggest everything

**Deliverable:** Intelligent auto-planning assistant

---

## 10. Struktur Kode

### Project Structure (Phase 1 — Vanilla JS, konsisten dengan Monefyi Finance)

```
planner/
├── index.html                 # Main SPA shell
├── css/
│   └── app.css                # Styles + design tokens
├── js/
│   ├── config.js              # Supabase URL, keys, settings
│   ├── app.js                 # Main app logic
│   ├── modules/
│   │   ├── auth.js            # Authentication
│   │   ├── project.js         # Project CRUD
│   │   ├── rap.js             # RAP management
│   │   ├── timeline.js        # Work items & WBS
│   │   ├── realization.js     # Cost & progress tracking
│   │   ├── analysis.js        # EVM, CPM, recommendations
│   │   ├── smart-button.js    # Command center
│   │   ├── parser.js          # Rule-based parser
│   │   ├── voice.js           # Voice input handler
│   │   ├── charts.js          # Chart.js configurations
│   │   ├── reports.js         # Report generation
│   │   ├── admin.js           # Admin panel
│   │   ├── notifications.js   # Notification system
│   │   └── i18n.js            # Internationalization
│   └── utils/
│       ├── format.js          # Number/date formatting
│       ├── storage.js         # Supabase storage helpers
│       └── realtime.js        # Supabase realtime helpers
├── sw.js                      # Service worker
├── manifest.webmanifest       # PWA manifest
├── icons/
│   ├── icon-192.svg
│   ├── icon-512.svg
│   └── favicon.ico
├── public/                    # Static assets
├── package.json
├── vite.config.js
├── vercel.json
└── my-supabase-project/
    └── supabase/
        ├── config.toml
        ├── migrations/
        │   ├── 001_core_tables.sql
        │   ├── 002_rap_tables.sql
        │   ├── 003_realization_tables.sql
        │   ├── 004_analysis_tables.sql
        │   ├── 005_command_tables.sql
        │   ├── 006_rls_policies.sql
        │   └── 007_views_functions.sql
        └── functions/
            ├── planner-parse-command/
            ├── planner-analyze/
            ├── planner-voice-transcribe/
            ├── planner-report/
            ├── planner-admin-users/
            └── planner-webhook/
```

### Migration Path (Phase 2+)

Jika codebase terlalu besar untuk vanilla JS:

```
planner/
├── src/
│   ├── main.jsx               # React entry
│   ├── App.jsx                # Root component
│   ├── routes/                # React Router pages
│   │   ├── Home.jsx
│   │   ├── ProjectList.jsx
│   │   ├── ProjectDetail.jsx
│   │   ├── Finance.jsx
│   │   └── Settings.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── AppShell.jsx
│   │   ├── smart-button/
│   │   │   ├── SmartButton.jsx
│   │   │   ├── CommandInput.jsx
│   │   │   └── VoiceRecorder.jsx
│   │   ├── project/
│   │   ├── rap/
│   │   ├── timeline/
│   │   ├── realization/
│   │   ├── charts/
│   │   └── ui/                # Shared UI components
│   ├── hooks/
│   ├── stores/                # Zustand stores
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── parser.js
│   │   └── algorithms/
│   │       ├── evm.js
│   │       ├── cpm.js
│   │       └── crash.js
│   └── styles/
├── ...
```

---

## 11. Deployment & DevOps

### Vercel Configuration

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [
        { "key": "Content-Type", "value": "application/manifest+json" }
      ]
    }
  ]
}
```

### Domain Setup

```
planner.monefyi.com  →  Vercel (frontend)
app.monefyi.com      →  Vercel (Monefyi Finance)
*.supabase.co        →  Supabase (shared backend)
```

### Environment Variables (Vercel)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Planner
on:
  push:
    branches: [main]
    paths: ['planner/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 12. Keamanan & Multitenancy

### Row Level Security (RLS) Pattern

Semua tabel `planner_*` menggunakan pattern yang sama:

```sql
-- User hanya bisa akses data dari org yang dia member
CREATE POLICY "{table}_tenant_isolation" ON {table}
  FOR ALL TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid()
    )
  );

-- Write access berdasarkan role
CREATE POLICY "{table}_write_access" ON {table}
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );
```

### Security Checklist

- [x] RLS on semua tabel
- [x] Anon key hanya di client (no service_role)
- [x] Edge Functions validate JWT
- [x] Rate limiting di Edge Functions
- [x] Input sanitization (SQL injection prevention via parameterized queries)
- [x] File upload validation (type, size)
- [x] CORS configuration strict
- [x] CSP headers via Vercel
- [x] API key rotation capability

### Subscription Tiers

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Projects | 3 | Unlimited | Unlimited |
| Members per org | 3 | 15 | Unlimited |
| Smart Button commands/day | 20 | 200 | Unlimited |
| AI recommendations | Basic | Full | Full + custom |
| Report export | PDF only | PDF + Excel | All + API |
| Storage | 100MB | 2GB | 20GB |
| Voice commands | No | Yes | Yes |
| Admin panel | No | Basic | Full |
| Support | Community | Email | Priority |

---

## 13. Integrasi dengan Monefyi Finance

### Shared Data Flow

```
┌─────────────────┐         ┌─────────────────┐
│ Monefyi Planner │         │ Monefyi Finance  │
│ (planner.       │         │ (app.            │
│  monefyi.com)   │         │  monefyi.com)    │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │   Shared Supabase DB      │
         │         │                 │
         ▼         ▼                 ▼
    planner_*    profiles       transactions
    tables       app_config     budgets
                 user_plans
```

### Cross-App Scenarios

1. **Biaya project → Transaksi bisnis**
   - Saat user mencatat biaya di Planner, opsi untuk sync ke Finance sebagai expense
   - `planner_cost_realizations` → `transactions` (dengan tag project)

2. **Shared Auth**
   - Login di satu app → session valid di app lain (same Supabase instance)
   - User profile shared

3. **Finance tab di Planner**
   - Tab Finance di Planner bisa menampilkan ringkasan dari Monefyi Finance
   - Deep link ke app.monefyi.com untuk detail

4. **Smart Button cross-app**
   - "Catat pengeluaran bisnis 5 juta" → route ke Finance
   - "Beli semen project rumah A" → route ke Planner cost

---

## Appendix A: Glossary

| Term | Arti |
|------|------|
| **RAP** | Rencana Anggaran Pelaksanaan — budget plan untuk project |
| **WBS** | Work Breakdown Structure — hierarki pekerjaan |
| **EVM** | Earned Value Management — metode pengukuran performa project |
| **CPM** | Critical Path Method — analisa jalur kritis |
| **SPI** | Schedule Performance Index — indeks kinerja jadwal |
| **CPI** | Cost Performance Index — indeks kinerja biaya |
| **Kurva S** | S-Curve — grafik kumulatif planned vs actual progress |
| **Crash Analysis** | Analisa trade-off waktu vs biaya saat percepatan project |

## Appendix B: API Endpoints (Edge Functions)

| Function | Method | Auth | Purpose |
|----------|--------|------|---------|
| `planner-parse-command` | POST | Bearer | Parse text/voice command via AI |
| `planner-analyze` | POST | Bearer | Generate EVM + recommendations |
| `planner-voice-transcribe` | POST | Bearer | Transcribe audio via Whisper |
| `planner-report` | POST | Bearer | Generate formatted report |
| `planner-admin-users` | GET/POST | Bearer (admin) | User & org management |
| `planner-webhook` | POST | Lynk signature | Payment processing |

---

*Document Version: 1.0*
*Last Updated: May 2026*
*Author: Monefyi Engineering*
