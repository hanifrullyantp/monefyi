# Rencana Capaian 100/100: Kesiapan Produksi & Akurasi Performa Agent Otonom

## Tanggal: 2026-11-27

## Aspek yang Akan Diperbaiki

### A. Kesiapan Produksi (Production Readiness) — Target 100/100

| # | Masalah | File | Severity | Aksi |
|---|---------|------|----------|------|
| A1 | Quota check hardcoded ke 0 di edge function | `my-supabase-project/supabase/functions/planner-agent-run/index.ts` | Kritikal | Ambil `usedRuns` dan `usedTokens` aktual dari `planner_agent_usage` |
| A2 | Tidak ada staging/canary deploy untuk agent | `.github/workflows/supabase-planner-deploy.yml` | Tinggi | Tambah workflow agent-staging + canary |
| A3 | Tidak ada health check endpoint agent | `my-supabase-project/supabase/functions/` | Tinggi | Buat `planner-agent-health` edge function |
| A4 | Tidak ada observability eksternal | Semua edge functions | Tinggi | Integrasi Sentry + structured logging |
| A5 | VERCEL_OIDC_TOKEN di `.env.local` (risiko keamanan) | `.env.local` | Tinggi | Pindah ke GitHub Secrets / Supabase Vault |
| A6 | Tidak ada containerisasi untuk dev konsisten | Root | Sedang | Tambah Dockerfile untuk agent-core |
| A7 | Tidak ada disaster recovery otomatis | `docs/DEPLOY-RUNBOOK.md` | Sedang | Tambah script backup otomatis + DR runbook |
| A8 | Tidak ada rate limiting untuk agent endpoints | `planner-agent-run` | Sedang | Tambah rate limiting di edge function |

### B. Akurasi & Performa (Accuracy & Performance) — Target 100/100

| # | Masalah | File | Severity | Aksi |
|---|---------|------|----------|------|
| B1 | Prompt tanpa few-shot examples | `apps/web/src/services/managerAgentService.ts` | Tinggi | Tambah few-shot JSON examples ke SYSTEM_PROMPT |
| B2 | Tidak ada validasi skema parameter sebelum eksekusi | `apps/web/src/services/managerAgentService.ts` | Tinggi | Tambah validasi parameter terhadap registry skema |
| B3 | Skenario uji hanya domain keuangan | `evals/scenarios/agent.yaml` | Tinggi | Tambah skenario HR, purchasing, estimator |
| B4 | Tidak ada LLM-as-judge evaluasi | `agent-core/src/evalRunner.ts` | Tinggi | Tambah evaluasi kualitatif dengan model besar |
| B5 | L3 autonomy selalu draft (inkonsisten) | `agent-core/src/runtime.ts` | Sedang | Perbaiki logika L3 untuk execute otomatis |
| B6 | Tidak ada confidence threshold output LLM | `managerAgentService.ts` | Sedang | Tambah threshold confidence sebelum eksekusi |
| B7 | Context retrieval statis (tidak ada semantic search) | `agent-core/src/profile.ts` | Sedang | Tambah semantic relevance scoring |
| B8 | Token budget estimasi (tidak aktual) | `managerAgentService.ts` | Sedang | Hitung token aktual sebelum kirim ke LLM |

## Eksekusi Wave-by-Wave

### Wave 1 (Independent, can run in parallel): Critical fixes
- A1: Fix quota check (planner-agent-run/index.ts)
- B1: Few-shot prompt (managerAgentService.ts)
- B2: Parameter schema validation (managerAgentService.ts)
- B5: L3 autonomy fix (runtime.ts)

### Wave 2 (Depends on Wave 1): Accuracy & evaluation
- B3: Expand eval scenarios (agent.yaml)
- B4: LLM-as-judge evaluasi (evalRunner.ts)
- B6: Confidence threshold (managerAgentService.ts)

### Wave 3 (Independent infrastructure): Production readiness
- A3: Health check edge function (new file)
- A4: Observability logging (ai-providers.ts + edge functions)
- A5: Env var security (.env.local cleanup)

### Wave 4 (Depends on Wave 1-3): Infra hardening
- A2: Staging/canary workflow (supabase-planner-deploy.yml)
- A6: Dockerfile (root)
- A7: Backup/DR script (scripts/)
- A8: Rate limiting (planner-agent-run)

### Wave 5: Verification & final audit
- Run all tests, typecheck, verify no regressions
