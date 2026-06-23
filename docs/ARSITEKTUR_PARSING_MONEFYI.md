# Arsitektur Parsing Monefyi.com

Dokumen ini menjelaskan arsitektur teknologi **parsing transaksi** untuk migrasi dari model **AI-first** ke model **deterministik-first** dengan **AI sebagai fallback**, plus sistem **pembelajaran berkelanjutan** dari koreksi user.

> **Status codebase (Juni 2026)**  
> - **PWA utama (`js/app.js`)**: `parseQuickText()` memanggil Edge Function AI dulu, heuristic lokal hanya fallback.  
> - **Edge Function (`asfin-parse-transaction`)**: sudah punya parser manual kuat (WhatsApp batch, regex, kategori, split akun) + Gemini fallback.  
> - **Monefyi Planner**: sudah punya pipeline 4 lapis (memory → rule → fuzzy → AI) — **referensi arsitektur terbaik** untuk diadopsi ke produk utama.

---

## 1. Tujuan & Prinsip Desain

| Prinsip | Artinya |
|--------|---------|
| **Deterministik dulu** | 80–95% input harus ter-parse tanpa LLM (cepat, murah, offline-capable, konsisten). |
| **AI sebagai penjaga** | LLM hanya dipanggil jika confidence rule < threshold atau input ambigu/multi-baris kompleks. |
| **Human-in-the-loop** | Setiap koreksi user = sinyal belajar; tidak auto-overwrite tanpa validasi. |
| **Explainable** | User selalu lihat *confidence*, *sumber parser* (memory/rule/ai), dan *alasan* jika perlu review. |
| **Personal + global** | Aturan global (Bahasa Indonesia, format IDR) + memori per-user (merchant, alias akun, pola tulisan). |
| **Aman & auditable** | Log parsing decision + versi rule; bisa rollback jika regresi. |

---

## 2. Gambaran Arsitektur (Target)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INPUT CHANNELS                                   │
│  Text NL │ Voice→Text │ OCR/Receipt │ WhatsApp Paste │ Manual Form     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    L0 — PREPROCESS & NORMALIZE                           │
│  strip WA metadata │ lowercase │ typo fix │ tokenize amount │ locale ID  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    L1 — USER MEMORY (exact + fuzzy)                      │
│  signature match │ slot template │ merchant alias │ account alias        │
│  confidence ≥ 0.95 → RETURN                                              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ miss
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    L2 — RULE ENGINE (deterministik)                      │
│  grammar NL │ regex amount/date │ category keywords │ account resolver   │
│  split payment │ batch WA blocks │ quantity×unit                         │
│  confidence ≥ 0.75 → RETURN (+ flags)                                   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ miss / low confidence
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    L3 — ENTITY RESOLVER (hybrid)                         │
│  fuzzy merchant │ learned category │ budget mapping │ duplicate check    │
│  confidence ≥ 0.65 → RETURN                                              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ still ambiguous
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    L4 — AI FALLBACK (Gemini / BYOK)                     │
│  structured JSON schema │ few-shot dari user memory │ batch classify     │
│  confidence ≥ 0.60 → RETURN (flag: ai_resolved)                          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ fail
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    L5 — REVIEW QUEUE                                     │
│  partial parse + needs_review │ user completes di preview card           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PREVIEW → CONFIRM → SAVE                              │
│  inline edit │ undo │ duplicate warning                                  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    LEARNING LOOP (async, non-blocking)                   │
│  capture correction delta │ update memory │ adjust weights │ audit log  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. State Saat Ini vs Target

### 3.1 PWA (`js/app.js`) — perlu migrasi

**Saat ini:**
```text
parseQuickText()
  → fetchAIParsedTransactionViaSupabase()   // AI FIRST
  → catch → parseTransactionTextHeuristic() // fallback lokal sederhana
```

**Target:**
```text
parseQuickText()
  → runParsePipeline()                      // L0–L5
  → AI hanya di L4 jika confidence < threshold
```

Heuristic lokal yang sudah ada (`parseIDRAmount`, `guessCategory`, `guessAccount`, dll.) menjadi **inti L2**, bukan cadangan terakhir.

### 3.2 Edge Function (`asfin-parse-transaction`) — sudah dekat target

Sudah memiliki:
- Parser baris WhatsApp (`parseTransactionLine`, `splitDateBlocks`, `parseBlock`)
- Klasifikasi kategori keyword (`classifyCategory`)
- Resolusi akun fuzzy Levenshtein (`resolveAccount`)
- Split pembayaran multi-akun
- Gemini hanya untuk mode `text`/`receipt` single-line dan batch ambiguous

**Rekomendasi:** jadikan Edge Function ini **single source of truth** parsing server-side; client hanya orchestration + cache memory L1.

### 3.3 Planner (`monefyi_planner`) — pola yang diadopsi

Pipeline `runNeverFailPipeline`:
1. Memory exact
2. Rule regex
3. Fuzzy memory
4. AI + few-shot dari org memory

Komponen yang bisa direuse:
- `commandMemoryService.ts` — signature + template slots
- `commandNormalize.ts` — normalisasi input
- `textSimilarity.ts` — fuzzy match

---

## 4. Komponen Parsing Manual (L2) — Spesifikasi

### 4.1 Grammar Natural Language (Bahasa Indonesia)

Contoh pola yang **wajib** didukung tanpa AI:

| Pola input | Field yang diekstrak |
|-----------|---------------------|
| `makan siang 85rb gopay` | amount, category≈Food, account=GoPay |
| `gaji 5jt masuk bca` | amount, type=income, account=BCA |
| `kemarin beli bensin 150 ribu` | date, category≈Transport, amount |
| `transfer 500k ke rekening mandiri` | type=transfer, amount, account |
| `indomaret 45.500 tunai` | merchant, amount, account=Cash |

**Implementasi:** parser berbasis **token + slot filling** (bukan sekadar regex flat):

```typescript
interface ParseSlots {
  amount?: number;
  type?: 'income' | 'expense' | 'transfer';
  date?: string;
  merchant?: string;
  category?: string;
  account?: string;
  payment_method?: string;
  notes?: string;
  confidence: number;
  matchedRules: string[];  // audit trail
}
```

Urutan ekstraksi disarankan:
1. **Amount** (paling deterministik — `85rb`, `5 jt`, `45.500`)
2. **Date** (`hari ini`, `kemarin`, `12/6/2026`)
3. **Type hints** (`gaji`, `masuk`, `beli`, `bayar`)
4. **Account/Payment** (GoPay, BCA, tunai, via, pake)
5. **Merchant** (`di Starbucks`, known brands list)
6. **Category** (keyword rules + user overrides)
7. **Sisa teks** → notes / merchant fallback

### 4.2 WhatsApp Batch Parser

Pertahankan & perluas logic di `asfin-parse-transaction`:
- Header tanggal: `Senin, 12/6/2026`
- Section: `Duit keluar` / `Duit masuk`
- Baris: `- 85000 Nasi padang (50000 gopay + 35000 cash)`
- Flag: `split_payment`, `split_sum_mismatch`, `low_confidence`

### 4.3 Confidence Scoring

```typescript
function scoreConfidence(slots: ParseSlots, flags: ParserFlag[]): number {
  let c = 0.5;
  if (slots.amount && slots.amount > 0) c += 0.25;
  if (slots.category && slots.category !== 'Lainnya') c += 0.10;
  if (slots.account) c += 0.08;
  if (slots.date) c += 0.05;
  if (slots.merchant) c += 0.05;
  for (const f of flags) {
    if (f === 'split_sum_mismatch') c -= 0.20;
    if (f === 'unknown_account') c -= 0.10;
    if (f === 'date_mismatch') c -= 0.05;
  }
  return clamp(c, 0.1, 0.99);
}
```

**Threshold keputusan:**

| Confidence | Aksi |
|-----------|------|
| ≥ 0.85 | Auto-preview, 1 tap Simpan |
| 0.65 – 0.84 | Preview + highlight field lemah |
| 0.45 – 0.64 | Panggil AI L4 (jika quota) |
| < 0.45 | Review queue / manual form |

---

## 5. AI Fallback (L4) — Kapan & Bagaimana

### 5.1 Trigger AI

- Confidence rule < **0.65**
- Input > N token / multi-intent
- OCR receipt dengan layout tidak dikenal
- Batch: hanya baris **ambigu** (partial classify), bukan seluruh batch
- User explicitly klik "Parse dengan AI"

### 5.2 Kontrak API (structured output)

Wajib JSON schema strict — **jangan** free-form prose:

```json
{
  "date": "2026-06-23",
  "type": "expense",
  "amount": 85000,
  "currency": "IDR",
  "category": "Food & Drink",
  "merchant": "Warung Padang",
  "account": "GoPay",
  "payment_method": "GoPay",
  "notes": "makan siang",
  "confidence": 0.88,
  "explanation": "optional, max 120 chars"
}
```

**Few-shot dinamis:** kirim 3–5 contoh dari `parse_memory` user (bukan contoh global saja).

### 5.3 Cost control

- Quota harian free tier (sudah ada di `ai_usage_logs`)
- BYOK user (`profiles.gemini_key`)
- Batch ambiguous: **1 call Gemini** untuk N baris, bukan N call

---

## 6. Sistem Pembelajaran (Learning Loop)

Ini inti permintaan: parsing harus **selalu belajar** dari user dan semakin akurat.

### 6.1 Sumber sinyal belajar

| Event | Sinyal | Prioritas |
|-------|--------|-----------|
| User edit field sebelum Simpan | Koreksi parsial (amount, category, dll.) | Tinggi |
| User reject preview & input ulang | Pola gagal | Tinggi |
| User konfirmasi tanpa edit | Positive reinforcement | Sedang |
| Transaksi manual form (tanpa parse) | Pola yang belum didukung | Sedang |
| Import CSV/OCR correction | Bulk learning | Rendah (batch) |

### 6.2 Model data — `parse_memory`

Adaptasi dari `planner_command_memory`:

```sql
CREATE TABLE parse_memory (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- opsional: org_id untuk shared business accounts

  signature       text NOT NULL,          -- normalized pattern hash
  raw_sample      text,                   -- contoh input asli (PII-aware retention)
  input_template  jsonb NOT NULL,         -- slot template: {amount}, {merchant}, ...
  
  -- Hasil parsing yang sudah divalidasi user
  output_template jsonb NOT NULL,         -- { type, category, account, ... }

  entity_type     text NOT NULL DEFAULT 'transaction',
  source          text NOT NULL CHECK (source IN ('user', 'ai', 'import')),
  
  hit_count       int NOT NULL DEFAULT 0,
  confirm_count   int NOT NULL DEFAULT 0, -- user save tanpa edit
  edit_count      int NOT NULL DEFAULT 0, -- user edit sebelum save
  accuracy_score  numeric(4,3) NOT NULL DEFAULT 0.75,

  last_used_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, signature)
);

CREATE INDEX parse_memory_user_hits ON parse_memory (user_id, hit_count DESC);
```

### 6.3 Signature & template slots

Normalisasi input sebelum hash:

```text
"makan siang 85rb gopay"  →  "makan siang {AMOUNT} {ACCOUNT:gopay}"
"gaji 5jt bca"            →  "gaji {AMOUNT} {ACCOUNT:bca}"
```

Implementasi mirip `commandNormalize.ts`:
- Replace amount → `{AMOUNT}`
- Replace known accounts → `{ACCOUNT:xxx}`
- Replace dates → `{DATE}`
- Sisanya lowercase, collapse whitespace

**Lookup:**
1. Exact signature match → apply `output_template` + fill slots → confidence 0.95
2. Fuzzy similarity ≥ 0.72 → apply template + adjust slots → confidence 0.75–0.90

### 6.4 Update accuracy setelah save

```typescript
async function recordParseFeedback(event: {
  memoryId?: string;
  rawInput: string;
  parsed: ParsedTransaction;
  final: Transaction;      // setelah user edit
  source: 'memory' | 'rule' | 'ai';
}) {
  const edited = diffFields(event.parsed, event.final);
  
  if (edited.length === 0) {
    // Positive: tingkatkan accuracy
    await bumpMemory(event.memoryId, { confirm: true, delta: +0.02 });
  } else {
    // Koreksi: update template / buat memory baru
    await upsertMemoryFromCorrection(event.rawInput, event.final);
    await bumpMemory(event.memoryId, { edit: true, delta: -0.05 });
    
    // Jika AI salah tapi rule bisa → tambah rule candidate
    if (event.source === 'ai') {
      await enqueueRuleCandidate(event.rawInput, event.final, edited);
    }
  }
}
```

### 6.5 Entity learning terpisah

Selain full-transaction memory, simpan **entity lexicon** per user:

```sql
CREATE TABLE parse_entity_lexicon (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  entity_type text NOT NULL,  -- 'merchant' | 'account_alias' | 'category_alias'
  alias       text NOT NULL,  -- "bcaa" 
  canonical   text NOT NULL,  -- "BCA"
  hit_count   int DEFAULT 0,
  UNIQUE (user_id, entity_type, alias)
);
```

Contoh: user sering ketik `bcaa` → sistem belajar alias ke `BCA`.

### 6.6 Rule promotion pipeline (semi-otomatis)

Jangan langsung ubah rule global dari 1 koreksi. Gunakan antrian:

```sql
CREATE TABLE parse_rule_candidates (
  id            uuid PRIMARY KEY,
  pattern       text,
  suggested_rule jsonb,
  support_count int DEFAULT 1,   -- berapa user/koreksi mendukung
  status        text DEFAULT 'pending',  -- pending | approved | rejected
  created_at    timestamptz DEFAULT now()
);
```

**Admin/cron** review mingguan → promote ke `CATEGORY_RULES` / `ACCOUNT_ALIASES` global.

---

## 7. Rekomendasi Agar Parsing Benar-benar Akurat & Cerdas

### 7.1 Teknis (short-term)

1. **Balik urutan di `parseQuickText()`** — pipeline L1→L2 dulu, AI terakhir.
2. **Unifikasi parser** — pindahkan heuristic `js/app.js` ke shared module (`packages/parse-core/`) dipakai client + Edge Function (Deno).
3. **Tampilkan `meta.parser_source` + confidence** di preview card (user trust ↑, koreksi ↑, learning ↑).
4. **Partial AI** — untuk batch WA, AI hanya klasifikasi baris `low_confidence`, bukan seluruh teks.
5. **Duplicate detection pre-save** — cegah noise di memory (amount+date+merchant within 24h).

### 7.2 Teknis (medium-term)

6. **Guided correction UI** — saat user edit category, tawarkan "Ingat untuk input seperti ini?" (opt-in memory).
7. **Active learning** — surface input yang sering gagal di dashboard admin (`parse_failures` log).
8. **A/B threshold** — uji confidence cutoff 0.65 vs 0.75 per cohort.
9. **Offline-first L1+L2** — memory + rule di IndexedDB; sync ke Supabase background.
10. **Receipt OCR pipeline** — OCR deterministic (layout/template bank) → AI hanya untuk field kosong.

### 7.3 Produk & UX

11. **Jangan auto-save hasil AI** — selalu preview kecuali confidence ≥ 0.92 AND memory match.
12. **Satu kalimat feedback** — "Diambil dari aturan: pola 'X rb + e-wallet'" bukan black box.
13. **Undo setelah save** — batalkan memory learning jika user undo dalam 10 detik.

### 7.4 Metrik keberhasilan

| Metrik | Target |
|--------|--------|
| Parse tanpa AI | ≥ 85% input |
| Save tanpa edit (auto-correct rate) | ≥ 70% |
| Latency p50 parse | < 80ms (rule), < 2s (AI) |
| AI cost per user/month | turun 60–80% post-migrasi |
| Memory hit rate | ≥ 30% setelah 30 hari usage |

---

## 8. Skema Log & Observability

```sql
CREATE TABLE parse_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  raw_input       text,
  input_channel   text,  -- text | voice | ocr | whatsapp | manual
  parser_layer    text,  -- memory | rule | fuzzy | ai | manual
  confidence      numeric(4,3),
  parsed_json     jsonb,
  final_json      jsonb,  -- null jika batal
  edited_fields   text[],
  latency_ms      int,
  ai_tokens       int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);
```

Dashboard internal:
- Top failed patterns
- AI vs rule ratio per hari
- Field paling sering dikoreksi (→ prioritaskan rule)

---

## 9. Rencana Migrasi (Fase)

### Fase 1 — Quick win (1–2 minggu)
- [ ] Refactor `parseQuickText()` → `runParsePipeline()` client-side
- [ ] AI fallback hanya jika confidence < 0.65
- [ ] Tampilkan source + confidence di UI
- [ ] Log `parse_events` (minimal)

### Fase 2 — Memory (2–4 minggu)
- [ ] Tabel `parse_memory` + `parse_entity_lexicon`
- [ ] Port logic dari `commandMemoryService` (Planner)
- [ ] Hook `recordParseFeedback()` on save

### Fase 3 — Server unification (4–6 minggu)
- [ ] Shared `parse-core` package
- [ ] Edge Function jadi orchestrator utama
- [ ] Client cache L1 memory

### Fase 4 — Continuous improvement (ongoing)
- [ ] Rule candidate queue + admin review
- [ ] Active learning dashboard
- [ ] Receipt template bank (BCA, GoPay, dll.)

---

## 10. Referensi File di Repo

| Area | Path |
|------|------|
| AI-first parse (PWA) | `js/app.js` → `parseQuickText`, `parseTransactionTextHeuristic` |
| Edge parser manual + AI | `my-supabase-project/supabase/functions/asfin-parse-transaction/index.ts` |
| Planner pipeline (target pattern) | `monefyi_planner/src/lib/commandParser.ts`, `commandPipeline.ts` |
| Memory service (Planner) | `monefyi_planner/src/services/commandMemoryService.ts` |
| Product spec parsing | `docs/MONEFYI_PRODUCT_PROMPT.md` § Feature 1 |

---

## 11. Kesimpulan

Migrasi **bukan** menghapus AI — melainkan **memposisikan AI sebagai lapisan terakhir** yang terjangkau dan terukur. Akurasi jangka panjang datang dari **tiga loop**:

1. **Rule engine** yang kuat untuk Bahasa Indonesia + format keuangan lokal  
2. **Personal memory** dari konfirmasi & koreksi user  
3. **Promosi rule global** dari pola yang terbukti (bukan tebak-tebakan LLM)

Planner Monefyi sudah membuktikan pola ini (`memory → rule → fuzzy → AI`). Langkah strategis terbesar adalah **menerapkan pipeline yang sama ke PWA utama** dan **menyatukan parser** antara client dan Edge Function.

---

*Dokumen ini living document — update setiap fase migrasi selesai.*
