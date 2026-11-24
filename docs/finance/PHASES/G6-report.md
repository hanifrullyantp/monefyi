# Laporan Gerbang Fase G6 — Penutupan Program G0–G6, Hardening G5, & Uji E2E Siklus Penuh

**Tanggal Terbit:** 2026-11-24  
**Program:** G0–G6 Keuangan Froyek  
**Branch:** `feat/g6-program-closure-e2e-docs`  
**Status Fase G6 / Program G0–G6:** `DONE` / `COMPLETED` (Seluruh gerbang verifikasi lokal F0–F4 & G0–G6 hijau; **13 migrasi SQL lokal berstatus `BLOCKED remote`**)

---

## 1. Ruang Lingkup Pekerjaan G6

1. **Hardening Minor dari Review G5 (`packages/domain/src/autonomyGovernance.ts`):**
   - Pada `authorizeAgentAction`, memperbaiki penentuan `requiresApproval` menjadi:
     ```ts
     const requiresApproval = isHighRisk || (request.requiresApproval ?? orgPolicy.autonomyLevel !== 'L2');
     ```
     sehingga `request.requiresApproval: false` **tidak pernah dapat mematikan kewajiban persetujuan manusia** apabila `isHighRisk === true` (mis. `dividen`, `tutup_proyek`, `tutup_periode`, `write_off`, `pinjaman_antar_proyek`, atau `pembayaran_keluar` pita `large` / `> Rp 10.000.000`).
   - Penambahan uji regresi eksplisit pada `g5TrustAndAttackSim.test.ts` dan `g6FullProgramE2E.test.ts` yang memverifikasi pemblokiran bypass tersebut (`allowed: false`, `requiresApproval: true`, `code: 'approval_required'`).
2. **Uji E2E Siklus Bisnis Penuh Terpadu Lintas Program (`apps/web/src/lib/financeV2/__tests__/g6FullProgramE2E.test.ts`):**
   - Menguji satu siklus bisnis terpadu organisasi jasa/kontraktor (`PT Karya Konstruksi Nusantara`, `org-nusantara`) dari **G0 hingga G5** di atas satu buku besar 4-kategori append-only:
     - **G0:** Modal awal, DP klien (`uang_muka_klien`), pengakuan pendapatan progres 25% (`computeRecognizableRevenue` $\rightarrow$ `Dr uang_muka_klien / Cr pendapatan_proyek`), pinjaman antar proyek 4-baris (`0` dampak L/R, `0` dampak kas konsolidasi), Neraca 4-kategori seimbang (`0` akun beban di aktiva), dan penolakan `UPDATE`/`DELETE` oleh `JournalImmutabilityError`.
     - **G1:** Ekstraksi nota OCR (`extractReceiptFields` $\rightarrow$ `buildPrepareEntryFromReceipt` $\rightarrow$ `prepareEntry` $\rightarrow$ `commitEntry`), penolakan prompt injection pada nota & chat, impor mutasi bank CSV BCA (`parseBankStatementCsv` $\rightarrow$ `matchBankStatementToLedger` $\rightarrow$ `reconcileCashVsBank` status `reconciled`), serta deteksi duplikat (`detectDuplicateEntry`) & nominal janggal (`detectAnomalousAmount`).
     - **G2:** Aging piutang 5 bucket (`computeAgingSchedule`), skor risiko klien (`scoreClientCollectionRisk`), peringatan proyek (`evaluateProjectProactiveAlerts`), cron multitenant (`runMultiTenantCronBatch` menolak 1 entri lintas-tenant dengan 0 kebocoran), draf penagihan WA L1 + SoD + jejak audit (`buildCollectionMessageDraft` + `approveAndDispatchCollectionDraft`), dan checklist tutup bulan 6 butir (`evaluateMonthCloseChecklist`).
     - **G3:** Forecast 13 minggu 3 skenario (`forecastCashFlow13Weeks`), margin + EAC proyek (`analyzeProjectMargin`), rekomendasi harga historis (`recommendProjectPricing`), simulasi what-if (`runAdvisorWhatIf`), prioritas hutang (`prioritizePayables`), penjaga narasi (`formatAdvisorMobileAnswer` + `verifyNarrativeNumbersMatchSource` meloloskan angka bersumber & menolak halusinasi `[999_000_000, 45]`), serta tool `buildAdvisorBriefTool` (`<= 400` token).
     - **G4:** Budget vs actual (`computeBudgetVsActual` + deteksi varians signifikan `>= 10%`), KPI CFO (`computeCfoKpis`), simulasi dividen 2 mode (`simulateDividendPolicyComparison`), laporan direksi deterministik (`buildBoardMonthlyReport` ber-SHA-256 identik 2x + `renderBoardReportPdfHtml`), pajak konfigurabel berlabel `"Draf untuk ditinjau konsultan pajak"`, penyusutan terjadwal menolak `periode_terkunci`, amortisasi pinjaman (`endingBalanceRupiah === 0`), dan skenario tahunan 12 bulan.
     - **G5:** Shadow mode (`evaluateShadowAgreement`), promosi L2 untuk low-risk (`N >= 30`, `100%`, `0` critical) & larangan L2 untuk `dividen`, auto-demote `L2 -> L1` saat 1 critical error, hardening `requiresApproval: false` pada aksi berisiko tinggi, penolakan kill switch / lintas-tenant / SoD / daily cap (`authorizeAgentAction`), memori koreksi bebas debit/kredit (`recordUserCorrectionSignal`), prosedur insiden jurnal pembalik seimbang + post-mortem SoD (`proposeMispostingReversalAndPostmortem` + `approveMispostingReversalPostmortem`), Neraca akhir tetap seimbang, dan ekspor jejak audit JSON/CSV ber-hash SHA-256 deterministik.
3. **Dokumentasi Penutupan Program:**
   - Pembaruan [`docs/finance/DEPLOY-RUNBOOK.md`](../DEPLOY-RUNBOOK.md) dengan tabel ringkasan lengkap Langkah 1 s.d. 13 (`F0`–`G5`) + aktivasi awal `L1` + Mode Bayangan.
   - Pembaruan [`docs/finance/FINAL-REPORT.md`](../FINAL-REPORT.md) dengan pemisahan jujur antara bukti kode deterministik vs pengujian sintetis/in-memory, sisa risiko, dan rekomendasi aktivasi otonomi `L1`.
   - Penerbitan [`docs/finance/USER-GUIDE-ROLES.md`](../USER-GUIDE-ROLES.md) sebagai panduan pengguna singkat Bahasa Indonesia untuk 3 peran (**Asisten Keuangan**, **Financial Advisor**, **CFO**).
   - Pembaruan [`docs/finance/PROGRESS.md`](../PROGRESS.md) & [`docs/finance/CHANGELOG.md`](../CHANGELOG.md) (`[G6]`).

---

## 2. Bukti Hasil Verifikasi Lokal Aktual (Branch `feat/g6-program-closure-e2e-docs`)

| Perintah Verifikasi | Hasil | Detail Output Aktual |
|---|---|---|
| `npm run typecheck:web` | **PASS** | Exit code `0` (`tsc --noEmit` bersih tanpa error) |
| `npm run test:web` | **PASS** | **102 test files passed (102), 726 tests passed (726)** dalam `37.00s` (termasuk `g6FullProgramE2E.test.ts` `1/1`, `g5TrustAndAttackSim.test.ts` `12/12`, `financeAgentEval.test.ts` `218/218` pada 2 model kecil) |
| `node scripts/g0-staging-migration-dryrun.mjs` | **PASS** | Dataset sintetis `596` transaksi, `485` jurnal, `matched: true`, `balanceSheetBalanced: true`, `expenseInAktiva: 0` |
| `node scripts/g0-owner-local-parity-check.mjs --demo-synthetic` | **PASS** | `mode: OFFLINE_LOCAL_ONLY`, `matched: true`, `neraca.isBalanced: true`, `missingJournalEntryIdCount: 0`, `unbalancedJournalsCount: 0` |
| `npm run gate:rebrand` | **PASS** | `Files scanned: 1202`, `Allowlisted legacy occurrences: 1557`, `Unapproved violations: 0` |
| `npm run gate:docs` | **PASS** | Verifikasi bahwa file keuangan yang berubah disertai pembaruan `docs/finance/CHANGELOG.md` |

---

## 3. Catatan Kejujuran & Status Produksi

- **Status Migrasi DB:** Seluruh 13 file migrasi SQL (`20261124100000` s.d. `20261124180000`) berada di lokal dan berstatus **`BLOCKED remote`**. Tidak ada perubahan yang pernah di-push ke Supabase remote produksi.
- **Sifat Pengujian:** Seluruh skenario bisnis, eval AI, backtest forecast, dan simulasi dry-run dijalankan pada dataset **sintetis / kurasi in-memory**. Sebelum aktivasi penuh di produksi, pemilik wajib menjalankan langkah `DEPLOY-RUNBOOK.md` (rotasi token `.env.local`, backup DB, uji paritas offline data nyata, eksekusi migrasi berurutan, dan aktivasi awal di level **`L1` + Mode Bayangan**).
