# Dokumentasi Monefyi

> **Mulai di sini:** [`MONEFYI_MASTER.md`](MONEFYI_MASTER.md) — dokumen referensi lengkap (produk, arsitektur, data, fitur, deploy, dev).  
> Terakhir diperbarui: **Agustus 2026**.

---

## Navigasi cepat

| Saya ingin… | Baca |
|-------------|------|
| **Menjelaskan apa itu Monefyi** (presentasi, stakeholder) | [`APA_ITU_MONEFYI.md`](APA_ITU_MONEFYI.md) |
| **Menjelaskan apa itu Monefyi Planner** (presentasi, stakeholder) | [`APA_ITU_PLANNER.md`](APA_ITU_PLANNER.md) |
| Gambaran lengkap seluruh ekosistem (dev & arsitektur) | [`MONEFYI_MASTER.md`](MONEFYI_MASTER.md) |
| Gambaran lengkap Planner (dev & arsitektur) | [`MONEFYI_PLANNER_MASTER.md`](MONEFYI_PLANNER_MASTER.md) |
| Memahami produk PWA & roadmap | [`MONEFYI_PRODUCT_PROMPT.md`](MONEFYI_PRODUCT_PROMPT.md) |
| Arsitektur parsing transaksi (L0–L5) | [`ARSITEKTUR_PARSING_MONEFYI.md`](ARSITEKTUR_PARSING_MONEFYI.md) |
| Fitur Monevisor / AI Advisor | [`MONEVISOR.md`](MONEVISOR.md) |
| Deploy & struktur URL | [`DEPLOY_STRUCTURE.md`](DEPLOY_STRUCTURE.md) |
| Menjalankan lokal & smoke test | [`../README.md`](../README.md) |
| Admin console & operasional | [`ADMIN_RUNBOOK.md`](ADMIN_RUNBOOK.md) |
| Implementasi parser Phase 1 | [`phases/PHASE_1_FOUNDATION.md`](phases/PHASE_1_FOUNDATION.md) |
| Konteks AI/Cursor untuk parser | [`../.monefyi/PARSE_MIGRATION_CONTEXT.md`](../.monefyi/PARSE_MIGRATION_CONTEXT.md) |

---

## Peta folder dokumentasi

```
docs/
├── README.md                      ← Indeks ini
├── APA_ITU_MONEFYI.md             ← ★ Penjelasan produk PWA (untuk perkenalan)
├── APA_ITU_PLANNER.md             ← ★ Penjelasan produk Planner (untuk perkenalan)
├── MONEFYI_MASTER.md              ← Referensi teknis lengkap PWA (dev)
├── MONEFYI_PLANNER_MASTER.md      ← Referensi teknis lengkap Planner (dev)
├── MONEFYI_PRODUCT_PROMPT.md      ← Spec produk PWA + master prompt AI dev
├── ARSITEKTUR_PARSING_MONEFYI.md  ← Arsitektur parsing (target L0–L5)
├── MONEVISOR.md                   ← AI financial advisor
├── DEPLOY_STRUCTURE.md            ← URL, build, Vercel
├── ADMIN_RUNBOOK.md               ← Operasional admin
│
├── phases/                        ← Panduan implementasi per fase
│   └── PHASE_1_FOUNDATION.md      ← Parser foundation (aktif)
├── reference/                     ← Referensi teknis parser
│   └── GRAMMAR_RULES.ts           ← Pola grammar L2
├── testing/                       ← QA & dataset uji
│   ├── GOLDEN_DATASET.json
│   └── FUNNEL_E2E_CHECKLIST.md
├── preview/                       ← Wireframe & entitlement preview
│   ├── index.html
│   └── ENTITLEMENT_MATRIX.md
└── archive/                       ← Dokumen arsip (spec lama)
    └── PLANNER_PRODUCTION_PLAN_v1.md

.monefyi/                          ← Konteks AI (Cursor) — jangan pindah
├── PARSE_MIGRATION_CONTEXT.md
└── DECISION_LOG.md

[Repo root — referensi ops]
├── README.md                      ← Entry dev & deploy
├── DEPENDENCY_MAP.md              ← Dependensi build/runtime
├── EDGE_FUNCTION_AUDIT.md         ← Mapping frontend ↔ edge functions
├── MIGRATION_VERCEL_PLAN.md       ← Rencana migrasi Vercel
├── RISK_ANALYSIS.md               ← Analisis risiko migrasi
└── README_SPLIT_FILES.md          ← Panduan attach file ke Cursor
```

---

## Dokumentasi per subsistem

| Subsistem | Folder kode | README |
|-----------|-------------|--------|
| **PWA Monefyi** (finance) | [`app/`](../app/) | [`../README.md`](../README.md) |
| **Landing** | [`landing/`](../landing/) | — |
| **Supabase backend** | [`my-supabase-project/`](../my-supabase-project/) | [`../my-supabase-project/README.md`](../my-supabase-project/README.md) |
| **Planner (vanilla)** | [`planner/`](../planner/) | [`../planner/README.md`](../planner/README.md) |
| **Planner (React)** | [`monefyi_planner/`](../monefyi_planner/) | [`../monefyi_planner/README.md`](../monefyi_planner/README.md) |

Dokumen Planner: [`MONEFYI_PLANNER_MASTER.md`](MONEFYI_PLANNER_MASTER.md) · [`APA_ITU_PLANNER.md`](APA_ITU_PLANNER.md) · [`../monefyi_planner/docs/`](../monefyi_planner/docs/).

---

## Konvensi pembaruan dokumen

1. **Perubahan produk/fitur besar** → update [`MONEFYI_MASTER.md`](MONEFYI_MASTER.md) § Fitur + changelog di footer.
2. **Perubahan parsing** → update [`ARSITEKTUR_PARSING_MONEFYI.md`](ARSITEKTUR_PARSING_MONEFYI.md) + [`phases/PHASE_1_FOUNDATION.md`](phases/PHASE_1_FOUNDATION.md).
3. **Keputusan arsitektur** → catat di [`.monefyi/DECISION_LOG.md`](../.monefyi/DECISION_LOG.md).
4. **Deploy/hosting** → update [`DEPLOY_STRUCTURE.md`](DEPLOY_STRUCTURE.md) + root [`README.md`](../README.md).
5. **Jangan pindah** path `.monefyi/*`, `docs/phases/*`, `docs/reference/*`, `docs/testing/*` — direferensikan `.cursorrules`.

---

## Attach ke Cursor (AI dev)

Saat mengerjakan fitur tertentu, attach file kontek relevan:

| Tugas | Attach |
|-------|--------|
| Apa saja / onboarding dev | `@docs/MONEFYI_MASTER.md` |
| Parser L0–L2 | `@.monefyi/PARSE_MIGRATION_CONTEXT.md` `@docs/phases/PHASE_1_FOUNDATION.md` `@docs/reference/GRAMMAR_RULES.ts` |
| Budget UI | `@docs/MONEFYI_MASTER.md` § Budget |
| Monevisor | `@docs/MONEVISOR.md` |
| Deploy | `@docs/DEPLOY_STRUCTURE.md` |
| Planner (fitur/arsitektur) | `@docs/MONEFYI_PLANNER_MASTER.md` |
| Planner (stakeholder) | `@docs/APA_ITU_PLANNER.md` |

Panduan lengkap attach: [`../README_SPLIT_FILES.md`](../README_SPLIT_FILES.md).
