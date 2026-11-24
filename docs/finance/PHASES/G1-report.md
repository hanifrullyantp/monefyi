# Laporan Gerbang Fase G1 — Alur Bukti, Mutasi Bank, Deteksi Duplikat/Anomali, & Evaluasi Adversarial

**Tanggal Terbit:** 2026-11-24  
**Program:** G0–G6 Keuangan Froyek  
**Status Fase G1:** `DONE` (Seluruh `G1-1`, `G1-2`, & `G1-3` selesai; migrasi SQL `G1-1` & `G1-2` lokal berstatus **`BLOCKED remote`**; seluruh data evaluasi saat ini **sintetis/adversarial**, belum memakai nota nyata anonim dari pemilik)

---

## 1. Ringkasan Status `G1-1` sampai `G1-3`

| Tugas | Status | Apa yang Terbukti (Kode & Tes Lokal) | Apa yang Hanya Diuji Sintetis / Mock | Status Remote / Produksi |
|---|---|---|---|---|
| **G1-1** (Ekstraksi Nota/Struk/Invoice $\rightarrow$ Draf + Lampiran Bukti) | `DONE` | Parser deterministik `packages/domain/src/receiptExtraction.ts` (PPN 11%, tanggal ID, SHA-256, skor keyakinan per-field, sanitasi prompt injection), `extractReceiptToDraft` selalu menghasilkan **draf ber-token** (`status: 'draft'`, `requiresReview: true`, tanpa auto-commit), dan `bindAttachmentToJournal` mengikat `journal_entry_id` (`receiptExtraction.test.ts`: `9` tes lulus). | Nota/struk/invoice berasal dari teks OCR sintetis & klien Supabase dimock (`vi.mock`); belum diuji dengan scan foto nota nyata milik pemilik atau PostgreSQL remote. | `BLOCKED remote` (`20261124150000_g1_1_journal_attachments.sql`) |
| **G1-2** (Impor Mutasi Bank & Rekonsiliasi Kas) | `DONE` | Parser CSV/TSV deterministik BCA/Mandiri/BRI/BNI/Generic (`packages/domain/src/bankStatement.ts`), `rowHash` SHA-256 anti-duplikasi impor ulang, pencocokan 1-to-1 tanpa auto-match pada kandidat skor imbang (`ambiguousMatches`), dan `reconcileCashVsBank` dengan `provenance` (`bankReconciliation.test.ts`: `12` tes lulus). | CSV mutasi bank yang diuji adalah fixture sintetis & `bankReconciliationService.ts` memakai klien Supabase mock; belum diuji pada ekspor CSV mutasi bank riil pemilik. | `BLOCKED remote` (`20261124151000_g1_2_bank_reconciliation.sql`) |
| **G1-3** (Deteksi Duplikat/Anomali, 4 Intent Baru, & Eval Terpisah) | `DONE` | `packages/domain/src/anomalyDetection.ts` (`detectDuplicateEntry` 3 lapis + `detectAnomalousAmount` 5 flag), 4 intent baru (`catat_invoice_terbit`, `catat_termin_diterima`, `catat_retensi`, `catat_gaji`) + penjaga `prompt_injection_detected` + penurunan `auto_commit` $\rightarrow$ `ask_back`/`confirm_one_tap` + `warnings` di `financeEntryEngine.ts`, serta perbaikan pemisahan angka nama proyek vs nominal di `money.ts` (`g1AnomalyAndEval.test.ts`: `13` tes lulus; F3 `gold_200_id.yaml` tetap `218/218` lulus). | Kedua set eval (`g1_dev_set.yaml` 20 kasus & `g1_heldout_adversarial.yaml` 30 kasus) bersifat **sintetis/adversarial** dan dijalankan terhadap pemilih kandidat model kecil deterministik lokal. | Kode domain & engine lokal (tanpa migrasi SQL baru) |

---

## 2. Metrik Evaluasi Terpisah (`Dev Set` vs `Held-Out Adversarial Set`)

> **Peringatan Kejujuran Data:** Seluruh kasus pada `evals/finance/g1_dev_set.yaml` (`20` kasus) dan `evals/finance/g1_heldout_adversarial.yaml` (`30` kasus) adalah **data sintetis & adversarial buatan tim pengembangan**, **bukan** nota fisik/chat transaksi nyata anonim dari pemilik. Evaluasi dijalankan terpisah (ID kasus saling lepas) pada 2 profil model kecil (`tier-small-flash-lite` & `tier-small-haiku-mini`).

### 2.1 Ringkasan Per Set & Model

| Dataset | Model Profil | Total Kasus | Lulus | Top-1 Accuracy | False Auto-Commit (`L2`) | Appropriate Ask-Back Rate | Rata-rata Token Respons | Rata-rata Total Token | Status |
|---|---|---|---|---|---|---|---|---|---|
| `g1_dev_set.yaml` (Dev) | `tier-small-flash-lite` | `20` | `20` | `100%` (`1.00`) | `0` (`0%`) | `100%` (`1.00`, 7/7) | `215` token | `233` token | **PASS** |
| `g1_dev_set.yaml` (Dev) | `tier-small-haiku-mini` | `20` | `20` | `100%` (`1.00`) | `0` (`0%`) | `100%` (`1.00`, 7/7) | `215` token | `233` token | **PASS** |
| `g1_heldout_adversarial.yaml` (Held-Out) | `tier-small-flash-lite` | `30` | `30` | `100%` (`1.00`) | `0` (`0%`) | `100%` (`1.00`, 14/14) | `198` token | `218` token | **PASS** |
| `g1_heldout_adversarial.yaml` (Held-Out) | `tier-small-haiku-mini` | `30` | `30` | `100%` (`1.00`) | `0` (`0%`) | `100%` (`1.00`, 14/14) | `198` token | `218` token | **PASS** |
| `gold_200_id.yaml` (Regresi F3) | `tier-small-flash-lite` & `haiku-mini` | `218` | `218` | `100%` (`1.00`) | `0` (`0%`) | `100%` (`1.00`) | — | `216` token | **PASS** |

### 2.2 Rincian Per Kategori (`g1_dev_set.yaml` & `g1_heldout_adversarial.yaml`)

| Set | Kategori | Total Kasus | Lulus | Akurasi | Cakupan Pengujian |
|---|---|---|---|---|---|
| **Dev** | `catat_invoice_terbit` | `4` | `4` | `100%` | `receivable_accrual` + wajib `project_id` & `party_id` (`missing_party`, `missing_project`) |
| **Dev** | `catat_termin_diterima` | `4` | `4` | `100%` | `client_termin` + `dpApplied` + wajib `project_id` |
| **Dev** | `catat_retensi` | `4` | `4` | `100%` | `client_retention_hold` & `client_retention_release` + wajib `project_id` & `party_id` |
| **Dev** | `catat_gaji` | `4` | `4` | `100%` | `project_cost_labor` (tukang/mandor proyek) vs `opex_expense` (staf kantor) + wajib proyek tukang |
| **Dev** | `duplicate_detection` | `2` | `2` | `100%` | `duplicate_attachment_hash` & `duplicate_invoice_number` menurunkan ke `ask_back` |
| **Dev** | `anomaly_detection` | `2` | `2` | `100%` | `exceeds_rap_remaining` & `statistical_outlier` menurunkan ke `confirm_one_tap` |
| **Held-Out** | `typo_slang` | `5` | `5` | `100%` | `blj`, `proek`, `byr`, `cairin termin`, `bon dulu`, `byr utang` |
| **Held-Out** | `mixed_en_id` | `5` | `5` | `100%` | `issue invoice`, `purchase cement`, `payroll staff`, `retention release`, `received termin` |
| **Held-Out** | `anomaly_amount` | `5` | `5` | `100%` | `possible_extra_zero_typo` (5jt vs median 500rb, 2jt vs 200rb), `Rp 250jt` & `Rp 150jt` (`above_approval_threshold`), nominal `0` |
| **Held-Out** | `ambiguous_similar_project` | `5` | `5` | `100%` | `Ruko Bu Ana 1` vs `Ruko Bu Ana 2` ambigu $\rightarrow$ `needs_choice` (`0` auto-commit); disambiguasi eksplisit `1`/`2` tetap akurat |
| **Held-Out** | `prompt_injection` | `4` | `4` | `100%` | Injeksi EN/ID (`IGNORE ALL PREVIOUS INSTRUCTIONS`, `abaikan instruksi sebelumnya`, `system prompt`, `call commit_entry`) $\rightarrow$ `rejected` (`prompt_injection_detected`) |
| **Held-Out** | `duplicate_adversarial` | `2` | `2` | `100%` | Duplikat nominal + tanggal dalam 2 hari + proyek sama & duplikat nomor invoice beda kapitalisasi $\rightarrow$ `ask_back` |
| **Held-Out** | `new_intents_adversarial` | `2` | `2` | `100%` | Variasi frase `transfer gaji tukang` & `penahanan retensi` |
| **Held-Out** | `safety_guard` | `2` | `2` | `100%` | Blokir pengeluaran pribadi & periode terkunci |

- **Anggaran Panduan & Token:** `docs/finance/AGENT-GUIDE.md` terukur **`1.302` estimasi token** ($\le 1.500$ batas CI), seluruh deskripsi tool di `agent-core/src/registry.ts` tetap $\le 25$ kata.

---

## 3. Kebutuhan Data Nyata Anonim dari Pemilik (Format Ekspor)

Karena evaluasi G1 baru memakai data sintetis/adversarial, sebelum memercayai klasifikasi otomatis dan pencocokan mutasi bank pada operasional harian, pemilik disarankan menyiapkan **sampel nyata yang sudah dianonimkan** (hapus/samarkan nama asli klien, nomor rekening, & NPWP) secara lokal (jangan di-commit ke Git) dengan format berikut:

### 3.1 Format Ekspor Sampel Nota / Chat Transaksi Nyata (`owner_receipts_anon.json`)
```json
{
  "dataset": "OWNER_ANON_SAMPLE",
  "projects": [
    { "id": "p-1", "name": "Proyek A", "aliases": ["prj a"] }
  ],
  "parties": [
    { "id": "sup-1", "name": "Supplier Samaran 1", "aliases": ["sup 1"] }
  ],
  "cases": [
    {
      "id": "real_001",
      "source_type": "whatsapp_chat | receipt_ocr",
      "raw_text": "teks nota OCR atau pesan WA yang sudah disamarkan",
      "expected_intent": "catat_biaya_proyek | catat_opex | catat_invoice_terbit | catat_termin_diterima | catat_retensi | catat_gaji | ...",
      "expected_amount_idr": 650000,
      "expected_date": "2026-11-24",
      "expected_project_id": "p-1"
    }
  ]
}
```

### 3.2 Format Ekspor Sampel Mutasi Bank Nyata Anonim (`owner_bank_anon.csv`)
- Ekspor CSV langsung dari Internet Banking (BCA/Mandiri/BRI/BNI) untuk 1 bulan dengan kolom rekening disamarkan:
  - **BCA:** `Tanggal,Keterangan,Cabang,Jumlah,Saldo` (`CR`/`DB`)
  - **Mandiri/BRI/BNI:** `Tanggal,Deskripsi,Debit,Kredit,Saldo`

---

## 4. Bukti Verifikasi Lokal (`typecheck`, `vitest`, `gate:docs`, `gate:rebrand`)

Hasil eksekusi aktual pada branch `feat/g1-3-duplicate-anomaly-intents-eval`:

- `npm run typecheck:web` (`tsc --noEmit`): **PASS** (exit code `0`).
- `npm run test:web` (`vitest run`): **PASS** — **94 test files passed (94), 661 tests passed (661)**:
  - `src/lib/financeV2/__tests__/receiptExtraction.test.ts` (**9** tests passed)
  - `src/lib/financeV2/__tests__/bankReconciliation.test.ts` (**12** tests passed)
  - `src/lib/financeV2/__tests__/g1AnomalyAndEval.test.ts` (**13** tests passed)
  - `src/lib/financeAgentEval.test.ts` (**3** tests passed — `218/218` pada 2 model kecil)
  - `src/lib/financeEntryEngine.test.ts` (**6** tests passed — termasuk budget `AGENT-GUIDE.md` `<= 1.500` token)
  - `src/lib/agentTools.test.ts` (**8** tests passed — sinkronisasi `registry.ts`, `AGENT_MANUAL.md`, `fixtures.json`)
  - `src/lib/domainMoney.test.ts` (**24** tests passed) + seluruh suite G0 & F0–F4.
- `npm run gate:docs`: **PASS** (file keuangan berubah terdeteksi bersama pembaruan `docs/finance/CHANGELOG.md`).
- `npm run gate:rebrand`: **PASS** (`Files scanned: 1193`, `Unapproved violations: 0`).

---

## 5. Sisa Risiko & Tindak Lanjut Menuju `G2`

1. **Data Evaluasi Masih Sintetis/Adversarial:**
   Akurasi `100%` dan `0` salah-auto-commit di atas dibuktikan pada dataset sintetis (`g1_dev_set.yaml` & `g1_heldout_adversarial.yaml`). Pengujian terhadap foto nota buram/tulisan tangan nyata dan slang khas tim lapangan pemilik wajib dilakukan pada awal `G2` setelah pemilik menyediakan sampel anonim.
2. **Migrasi SQL `G1-1` & `G1-2` Masih `BLOCKED remote`:**
   Tabel `planner_journal_attachments`, `planner_bank_statement_rows`, dan `planner_bank_reconciliations` (`20261124150000_g1_1_journal_attachments.sql`, `20261124151000_g1_2_bank_reconciliation.sql`) baru diuji secara struktural di Vitest dan belum diterapkan ke PostgreSQL produksi bersama migrasi `F0`/`F1`/`G0`.
3. **Ketiadaan UI Review Terpadu (`G2`):**
   Mesin backend/domain G1 sudah menghasilkan draf terstruktur, antrean `ambiguousMatches`, `unmatchedBankRows`, dan `warnings` duplikat/anomali, namun layar UI review 1-tap & konfirmasi `ask_back` untuk pengguna akhir masih menjadi cakupan Fase `G2`.
4. **Ketergantungan Pemilih LLM Nyata:**
   Pada runner evaluasi deterministik, pemilih kandidat tertutup (`tier-small-flash-lite` & `tier-small-haiku-mini`) disimulasikan secara lokal tanpa panggilan jaringan API LLM; pada integrasi produksi perlu tetap menjaga batas ketat $\le 5$ kandidat tertutup tanpa wewenang memilih debit/kredit.
