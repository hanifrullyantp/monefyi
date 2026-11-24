# Rencana Fase F4 — AI Belajar RAP, Evaluasi MAPE, Uji E2E Siklus Penuh, & Final Report

**Tanggal:** 2026-11-24  
**Orkestrator:** Argon  
**Status:** `IN_PROGRESS`

---

## Tujuan Fase F4
1. **AI Belajar RAP (`F4-1`):**
   - Membangun dataset dari proyek selesai (`completed`/`finance_closed`) dengan normalisasi per satuan volume (`m2`/`unit`).
   - Menghasilkan draf RAP awal berbentuk rentang (`low`/`mid`/`high`) disertai *provenance* jelas (`"Berdasarkan N proyek serupa"` jika $N \ge 3$; fallback katalog Estimator bila $N < 3$).
   - Selalu mewajibkan persetujuan pemilik (`requiresOwnerApproval: true`) sebelum draf masuk menjadi RAP aktif proyek.
   - Umpan balik otomatis saat tutup proyek (`computeRapCompletionFeedback`: selisih RAP vs realisasi per kategori memperbarui dataset).
   - Evaluasi MAPE per kategori pada proyek *holdout* (`evals/finance/rap_historical_eval.yaml` + `rapLearningEval.test.ts` + `PHASES/F4-report.md`).
2. **E2E Siklus Bisnis Penuh & Penutupan (`F4-2`):**
   - `fullBusinessCycleE2E.test.ts`: menguji siklus bisnis utuh dari buat proyek $\rightarrow$ draf RAP disetujui $\rightarrow$ DP $\rightarrow$ belanja agent (3 contoh wajib + aset vs opex) $\rightarrow$ hutang/piutang $\rightarrow$ termin & retensi $\rightarrow$ tutup proyek $\rightarrow$ dividen 2 mode $\rightarrow$ tutup periode $\rightarrow$ verifikasi `businessReportFromLedger` == buku besar.
   - Menerbitkan `docs/finance/DEPLOY-RUNBOOK.md` & `docs/finance/FINAL-REPORT.md`.

