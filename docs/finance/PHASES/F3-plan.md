# Rencana Fase F3 — AI Pencatat Hemat Token, 9 Intent, & Gold Eval >= 200 Kalimat

**Tanggal:** 2026-11-24  
**Orkestrator:** Argon  
**Status:** `IN_PROGRESS`

---

## Tujuan Fase F3
1. **`agent-core/src/financeEntryEngine.ts` (`F3-1`):**
   - Mendukung 9 intent tertutup: `catat_biaya_proyek`, `catat_opex`, `catat_pemasukan` (`dp` | `termin` | `pelunasan` | `retensi`), `bayar_hutang`, `terima_piutang`, `kasbon`, `transfer_kas`, `dividen` (hanya `prepare`, wajib persetujuan pemilik), dan `tanya_saldo`.
   - Ekstraksi nominal (`parseRupiah`/`firstRupiah`) & tanggal (`parseTanggal`/`orgToday`) deterministik di kode.
   - Pengenalan proyek/pihak/dompet memakai alias organisasi + kemiripan teks (`needs_choice` maks. 5 kandidat saat ambigu).
   - Urutan klasifikasi 3 lapis: `aturan organisasi / riwayat koreksi -> aturan domain deterministik -> LLM hanya memilih dari <= 5 kandidat akun tertutup`.
   - Tiga pita keyakinan: `high` (auto-commit di bawah ambang nominal), `medium` (konfirmasi 1-ketuk), `low` (tanya balik; 0 salah-posting otomatis).
   - Ambang kapitalisasi `Rp 5.000.000` (`D-F1-02`): di bawah ambang untuk perbaikan workshop masuk `catat_opex`, di atas/sama dengan ambang + kata kunci aset/renovasi bertanya balik (`opex_expense` vs `aset_tetap`).
   - Memori koreksi: koreksi pengguna tersimpan sebagai aturan organisasi (`recordFinanceCorrection`) dengan `source='agent'`, `model`, `prepare_token`.
2. **Gold Set Evaluasi & Multi-Model (`F3-2`):**
   - `evals/finance/gold_200_id.yaml` berisi $\ge 205$ kalimat nyata bahasa Indonesia.
   - Diuji pada $\ge 2$ profil model kecil/murah: nominal/tanggal = 100%, top-1 klasifikasi $\ge 95\%$, salah-posting auto-commit = 0%, ambigu wajib bertanya balik.
   - Terintegrasi CI (`.github/workflows/agent-eval.yml`) dan laporan `PHASES/F3-report.md`.

