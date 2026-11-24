# Laporan Akhir Fase F4 — AI Belajar RAP dari Proyek Selesai & Evaluasi MAPE

**Tanggal Selesai:** 2026-11-24  
**Orkestrator:** Argon  
**Status Fase:** `IN_PROGRESS` (`F4-T1` selesai, berlanjut ke `F4-T2` E2E & Penutupan Program)

---

## 1. Ringkasan Eksekutif

Fase F4-T1 membangun mesin pembelajaran RAP (`packages/domain/src/rapLearning.ts` & `apps/web/src/services/financeV2/rapLearningService.ts`) yang menormalkan biaya aktual proyek selesai (`completed`/`finance_closed`) per satuan volume, menyusun draf RAP awal berbentuk rentang (`low`/`mid`/`high`) lengkap dengan *provenance*, menerapkan fallback katalog Estimator saat jumlah sampel historis $N < 3$, selalu mewajibkan persetujuan pemilik (`requiresOwnerApproval: true`), dan menangkap umpan balik selisih RAP vs realisasi saat tutup proyek.

---

## 2. Pengukuran MAPE per Kategori (`rapLearningEval.test.ts` & `evals/finance/rap_historical_eval.yaml`)

Evaluasi dijalankan pada 6 proyek selesai historis (`renovasi_rumah` & `bangun_ruko`) dan 3 proyek *holdout* (`90 m2`, `110 m2`, `160 m2`):

| Kategori RAP | MAPE (`%`) | Batas Gerbang | Status |
|---|---|---|---|
| `material` | `0.74%` | $\le 10\%$ | **PASS** |
| `labor` | `0.77%` | $\le 10\%$ | **PASS** |
| `equipment` | `0.68%` | $\le 10\%$ | **PASS** |
| `overhead` | `1.29%` | $\le 10\%$ | **PASS** |
| `other` | `0.47%` | $\le 10\%$ | **PASS** |
| **Total Proyek (`overallMapePct`)** | **`0.34%`** | **$\le 10\%$** | **PASS** |

*(Catatan: Pada organisasi baru tanpa 3 proyek serupa [$N < 3$], draf menggunakan katalog Estimator dasar dan tingkat akurasinya bergantung pada kesesuaian tarif katalog dasar.)*

---

## 3. Verifikasi & Langkah Berikutnya
- **4/4 tes di `apps/web/src/lib/rapLearningEval.test.ts` lulus:** *provenance* `"Berdasarkan N proyek serupa"` ($N \ge 3$), fallback katalog Estimator ($N < 3$), kewajiban `requiresOwnerApproval: true`, feedback loop tutup proyek, dan evaluasi MAPE.
- **Lanjut otomatis:** PR `F4-T2` untuk uji E2E siklus bisnis penuh (`fullBusinessCycleE2E.test.ts`), `DEPLOY-RUNBOOK.md`, dan `FINAL-REPORT.md`.

