# AGENT GUIDE — Kontrak Agent AI Keuangan Froyek

Dokumen ini mendefinisikan antarmuka, batasan, anggaran token, dan pagar pengaman untuk seluruh tool agent AI keuangan di `agent-core/`, `packages/domain/`, dan `evals/finance/`.

---

## 1. Prinsip Desain Wajib

1. **Agent TIDAK PERNAH memilih Debit/Kredit.**  
   Agent hanya mengekstrak dan mengisi slot kejadian (jenis kejadian, proyek, item, nominal, tanggal, pihak, dompet). Server menentukan akun dan menyusun jurnal dari template di `packages/domain/src/journal.ts`.
2. **Pola Dua Langkah (`prepare_*` $\rightarrow$ `commit_*`):**
   - `prepare_*` memvalidasi slot secara deterministik, mengunci nominal & tanggal selama **10 menit**, dan mengembalikan `prepare_token` + ringkasan dampak (`impact`).
   - `commit_*` hanya menerima `prepare_token` dan `idempotency_key` (tidak pernah menerima nominal atau tanggal baru).
   - Setiap entri jurnal yang berasal dari agent wajib menyimpan metadata `source = 'agent'`, `model`, dan `prepare_token` (disiapkan bertahap hingga F3).
3. **Parser Deterministik di Kode (Bukan LLM):**
   - `parseRupiah` dan `firstRupiah` di `packages/domain/src/money.ts` untuk nominal Indonesia (`50rb`, `1,5jt`, `2 juta 500 ribu`, `Rp 65.000`).
   - `parseTanggal` dan `orgToday` di `packages/domain/src/dates.ts` untuk tanggal (`hari ini`, `kemarin`, `lusa`, `YYYY-MM-DD`, `DD/MM/YYYY`, `DD <bulan> YYYY`).
4. **Respons Ringkas & Terstruktur:**
   - JSON ber-enum tertutup, ID pendek + nama, satu baris `summary`, daftar maksimal 5 kandidat (`needs_choice`), tanpa echo teks bebas.
   - Error memakai `StructuredError` (`code`, `message_id`, `fix_hint`, `valid_options`).
5. **Pengaman Ketat:**
   - Cek hak akses per langkah lewat `min_role` di SOP (`agent-core/sop/*.yaml`).
   - Tolak pencatatan pada **periode terkunci** (`periode_terkunci`).
   - Agent **tidak pernah** bisa melakukan `DELETE` atau mengedit jurnal.
   - Aksi berisiko (dividen, tutup proyek, tutup periode, write-off, nominal > `ambang_konfirmasi_rupiah`) wajib persetujuan pemilik (`approval: true`).

---

## 2. Anggaran Token (Diukur di CI)

| Komponen | Batas Maksimum |
|---|---|
| System prompt agent keuangan | $\le 1.200$ token |
| Deskripsi setiap tool | $\le 25$ kata |
| Hasil tool tipikal | $\le 250$ token |
| Tool snapshot (`get_finance_snapshot`, F2) | $\le 400$ token |
| Jumlah panggilan tool per pencatatan biasa | $\le 3$ panggilan |

---

## 3. Katalog Tool Aktif (F0–F3)

Sumber tunggal definisi tool berada di `agent-core/src/registry.ts` (dihasilkan ke `agent-core/functions.json` dan `docs/agent/AGENT_MANUAL.md`):

- `find_project(query)` / `find_party(query)` / `find_wallet(query, project_id?)` — *read*, cari entitas (maks. 5 kandidat atau `needs_choice`).
- `get_project_cash(project_id)` & `get_party_debt(party_id, project_id?)` — *read*, cek kas proyek / hutang pihak.
- `get_finance_snapshot(kind?, project_id?)` — *read*, min `manager` ($\le 400$ token).
- `prepare_entry(intent, text, project_id?, party_id?, wallet_id?, entry_date?)` — *prepare*, **9 intent tertutup**: `catat_biaya_proyek`, `catat_opex`, `catat_pemasukan`, `bayar_hutang`, `terima_piutang`, `kasbon`, `transfer_kas`, `dividen`, `tanya_saldo`.
  - Server mengekstrak nominal/tanggal deterministik, mencocokkan entitas via alias + fuzzy, lalu mengklasifikasi via urutan: **aturan organisasi/koreksi $\rightarrow$ aturan domain $\rightarrow$ pemilih LLM ($\le 5$ kandidat)**.
  - Pita keyakinan: `high` ($\rightarrow$ `auto_commit` jika di bawah ambang), `medium` ($\rightarrow$ `confirm_one_tap`), `low` ($\rightarrow$ `ask_back`).
  - Penjaga keras: `dividen` wajib `owner_approved=true`, opex $\ge \text{Rp }5.000.000$ untuk kata kunci aset/renovasi bertanya balik `opex` vs `aset_tetap`, pengeluaran pribadi ditolak.
- `commit_entry(prepare_token, idempotency_key, owner_approved?)` — *commit*, memvalidasi token 10 menit, idempotensi, & persetujuan pemilik.

## 3.1 System Prompt Ringkas Agent Keuangan ($\le 1.200$ token)

```text
Kamu asisten pencatat keuangan Froyek. JANGAN pernah memilih debit/kredit atau mengarang ID.
Tugasmu hanya: (1) panggil get_finance_snapshot untuk pertanyaan saldo/laba, atau (2) teruskan intent tertutup & teks transaksi ke prepare_entry, lalu commit_entry bila action=auto_commit atau sudah dikonfirmasi pemilik.
Jika status needs_choice/ask_back, tampilkan opsi singkat (maks 5) ke pengguna.
```

---

## 4. Evaluasi & Gerbang CI

- Skenario baseline: `evals/scenarios/agent.yaml` dan `evals/finance/` (diperluas menuju $\ge 200$ kalimat Indonesia di F3).
- Gerbang kelulusan eval:
  - Ekstraksi nominal/tanggal deterministik: **100%**
  - Akurasi klasifikasi top-1: **$\ge 95\%$**
  - Kesalahan kritis / salah-posting otomatis: **0**
  - Kasus ambigu wajib bertanya balik (`needs_choice` / `needsReview`), bukan menebak.

