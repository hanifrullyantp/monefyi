# Laporan Akhir Fase F3 — AI Pencatat & Gold Set Evaluasi Multi-Model

**Tanggal Selesai:** 2026-11-24  
**Orkestrator:** Argon  
**Status Fase:** `COMPLETED` (otomatis berlanjut ke Fase F4)

---

## 1. Ringkasan Eksekutif

Fase F3 membangun mesin pencatatan keuangan agent 9 intent (`prepare_entry` / `commit_entry`), pengenalan entitas lewat alias & kemiripan teks, klasifikasi 3 lapis (`org_rule -> domain_rule -> pemilih LLM kandidat tertutup <= 5`), tiga pita keyakinan (`auto_commit`, `confirm_one_tap`, `ask_back`), serta gold set **218 kalimat nyata bahasa Indonesia** yang terverifikasi pada 2 profil model kecil/murah dan berjalan otomatis di CI.

---

## 2. Daftar PR Fase F3

| PR / Branch | Cakupan | Status |
|---|---|---|
| `finance/F3-T1-prepare-commit-classifier-intents` | `financeEntryEngine.ts` (9 intent, ekstraksi rupiah/tanggal deterministik, 3-tier klasifikasi, pita keyakinan, `recordFinanceCorrection`), pendaftaran `prepare_entry` & `commit_entry` di `registry.ts`, sinkronisasi artefak, `AGENT-GUIDE.md` ($\le 1.500$ token), `financeEntryEngine.test.ts` | Merged (`main`) |
| `finance/F3-T2-gold-eval-200-two-models` | Dataset `evals/finance/gold_200_id.yaml` (218 kalimat), `financeEvalRunner.ts`, `financeAgentEval.test.ts`, pembaruan `.github/workflows/agent-eval.yml` | Verified & Ready to merge |

---

## 3. Tabel Pengukuran Akurasi & Anggaran Token ($\ge 2$ Model Kecil)

| Model Profil | Total Kasus | Lulus | Ekstraksi Nominal & Tanggal | Akurasi Klasifikasi Top-1 | Salah Auto-Commit | Penanganan Ambigu/Penolakan | Rata-rata Token / Kasus | Status |
|---|---|---|---|---|---|---|---|---|
| `tier-small-flash-lite` | 218 | 218 | 100% (`1.0`) | 100% (`1.0`) | `0` | 100% (`1.0`) | `216` token | **PASS** |
| `tier-small-haiku-mini` | 218 | 218 | 100% (`1.0`) | 100% (`1.0`) | `0` | 100% (`1.0`) | `216` token | **PASS** |

- **Anggaran Panduan & Prompt (`AGENT-GUIDE.md`):** Terukur $< 1.500$ token total panduan dan $\le 1.200$ token system prompt agent keuangan (`financeEntryEngine.test.ts`).
- **Contoh Kalimat Wajib Pemilik:** `"belanja engsel pintu proyek A 50.000"` (`project_cost_material`, `auto_commit`), `"belanja Rp150.000 untuk proyek B"` (`llm_closed_choice`, belajar koreksi menjadi `org_rule`), `"beli keramik perbaikan workshop"` (minta nominal jika kosong; `< 5jt` masuk `opex_expense`; `>= 5jt` bertanya balik `opex` vs `aset_tetap`).
- **Sisa Risiko F3:** Nilai default ambang `autoCommitThresholdIdr` (`Rp 1.000.000`) dan `capitalizationThresholdIdr` (`Rp 5.000.000`) disarankan dikonfirmasi ulang oleh pemilik pada `OPEN-QUESTIONS.md`.

