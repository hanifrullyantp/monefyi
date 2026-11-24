# AGENT GUIDE — Kontrak Agent AI Keuangan Froyek

Kontrak antarmuka, anggaran token, dan pagar pengaman agent keuangan (`agent-core/`, `packages/domain/`, `evals/finance/`).

---

## 1. Prinsip Desain Wajib

1. **Agent TIDAK PERNAH memilih Debit/Kredit.** Agent hanya mengisi slot kejadian; server menentukan akun via `packages/domain/src/journal.ts`.
2. **Pola Dua Langkah (`prepare_*` -> `commit_*`):**
   - `prepare_*` memvalidasi slot deterministik, mengunci nominal & tanggal 10 menit, dan mengembalikan `prepare_token` + `impact`.
   - `commit_*` hanya menerima `prepare_token` + `idempotency_key` (tanpa nominal/tanggal baru).
   - Jurnal agent wajib menyimpan `source = 'agent'`, `model`, dan `prepare_token`.
3. **Parser Deterministik (Bukan LLM):**
   - `parseRupiah` & `firstRupiah` (`packages/domain/src/money.ts`) untuk nominal Indonesia (`50rb`, `1,5jt`, `Rp 65.000`).
   - `parseTanggal` & `orgToday` (`packages/domain/src/dates.ts`) untuk tanggal (`hari ini`, `kemarin`, `YYYY-MM-DD`, `DD/MM/YYYY`, `DD <bulan> YYYY`).
4. **Respons Ringkas & Pengaman Ketat:**
   - JSON enum tertutup, ID pendek + nama, maks. 5 kandidat (`needs_choice`), error `StructuredError`.
   - Cek `min_role` (`agent-core/sop/*.yaml`), tolak `periode_terkunci`, dilarang `DELETE`/edit jurnal, aksi berisiko wajib `owner_approved=true`.

---

## 2. Anggaran Token (Diukur di CI)

| Komponen | Batas Maksimum |
|---|---|
| System prompt agent keuangan | <= 1.200 token |
| Deskripsi setiap tool | <= 25 kata |
| Hasil tool tipikal | <= 250 token |
| Tool snapshot (`get_finance_snapshot`, F2) | <= 400 token |
| Panggilan tool per pencatatan biasa | <= 3 panggilan |

---

## 3. Katalog Tool Aktif (F0–G1)

Sumber tunggal definisi tool: `agent-core/src/registry.ts` (`agent-core/functions.json`, `docs/agent/AGENT_MANUAL.md`):

- `find_project(query)` / `find_party(query)` / `find_wallet(query, project_id?)` — *read* (maks. 5 kandidat).
- `get_project_cash(project_id)` & `get_party_debt(party_id, project_id?)` — *read*, cek kas / hutang.
- `get_finance_snapshot(kind?, project_id?)` — *read*, min `manager` (<= 400 token).
- `prepare_entry(intent, text, project_id?, party_id?, wallet_id?, entry_date?)` — *prepare*, **9 intent tertutup**: `catat_biaya_proyek`, `catat_opex`, `catat_pemasukan`, `bayar_hutang`, `terima_piutang`, `kasbon`, `transfer_kas`, `dividen`, `tanya_saldo`.
  - Klasifikasi: `org_rule` -> `domain_rule` -> `llm_closed_choice` (<= 5 kandidat); pita `high` (`auto_commit`), `medium` (`confirm_one_tap`), `low` (`ask_back`).
  - Penjaga: `dividen` wajib `owner_approved=true`; opex aset/renovasi >= Rp 5jt tanya `opex` vs `aset_tetap`; pengeluaran pribadi ditolak.
- `commit_entry(prepare_token, idempotency_key, owner_approved?)` — *commit*, validasi token 10 menit & idempotensi.
- **Alur Nota/Struk/Invoice OCR (`G1-1`):** `extractReceiptFields` & `buildPrepareEntryFromReceipt` (`receiptExtraction.ts`) -> `extractReceiptToDraft` (`receiptAttachmentService.ts`) memanggil `prepareFinanceEntry` menjadi **draf ber-token** (`status: 'draft'`, `requiresReview: true`, tanpa auto-commit) dengan `attachmentHash` SHA-256, skor keyakinan, & sanitasi `prompt_injection_detected`; saat `commit_entry`, `bindAttachmentToJournal` mengikat `journal_entry_id` (`NULL -> UUID`) di `planner_journal_attachments`.
- **RAP Pembelajaran (`F4`):** `generateRapDraftFromHistory` menyusun draf rentang + *provenance* dengan `requiresOwnerApproval: true`.

## 3.1 System Prompt Ringkas Agent Keuangan (<= 1.200 token)

```text
Kamu asisten pencatat keuangan Froyek. JANGAN pernah memilih debit/kredit atau mengarang ID.
Tugasmu hanya: (1) panggil get_finance_snapshot untuk pertanyaan saldo/laba, atau (2) teruskan intent tertutup & teks transaksi ke prepare_entry, lalu commit_entry bila action=auto_commit atau sudah dikonfirmasi pemilik.
Jika status needs_choice/ask_back, tampilkan opsi singkat (maks 5) ke pengguna.
```

---

## 4. Evaluasi & Gerbang CI

- Skenario baseline: `evals/scenarios/agent.yaml` & `evals/finance/` (>= 200 kalimat Indonesia).
- Gerbang kelulusan: nominal/tanggal **100%**, top-1 **>= 95%**, salah auto-commit **0**, ambigu wajib `needs_choice`/`needsReview`.

