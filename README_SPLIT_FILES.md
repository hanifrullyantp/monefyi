# 📦 SPLIT FILES - Panduan Penggunaan untuk Cursor

**Proyek:** Monefyi Parse System Migration - Phase 1 Foundation  
**Tujuan:** Menyediakan context split agar AI/Cursor lebih fokus, akurat, dan efisien.

---

## 🚀 Cara Menggunakan File-file Ini

### 1. **Struktur File yang Sudah Dibuat**

Semua file sudah dibuat sesuai panduan PHASE 1 FOUNDATION:

```
.monefyi/
├── PARSE_MIGRATION_CONTEXT.md     ← Master context (selalu attach)
└── DECISION_LOG.md                ← Alasan arsitektur (attach saat "mengapa?")

docs/
├── phases/
│   └── PHASE_1_FOUNDATION.md      ← Panduan implementasi detail (attach untuk task)
├── reference/
│   └── GRAMMAR_RULES.ts           ← Grammar & keyword reference
└── testing/
    └── GOLDEN_DATASET.json        ← Test cases regression

.cursorrules                         ← Global rules Cursor (wajib di root)
README_SPLIT_FILES.md                ← File ini (panduan penggunaan)
```

---

### 2. **Cara Attach File ke Cursor (Chat/Composer)**

#### **Untuk Semua Task (Wajib):**
```
@.monefyi/PARSE_MIGRATION_CONTEXT.md
@docs/phases/PHASE_1_FOUNDATION.md
```

#### **Task 1 (L0 Normalization):**
```
@.monefyi/PARSE_MIGRATION_CONTEXT.md
@docs/phases/PHASE_1_FOUNDATION.md
Task: Implement Task 1 - L0 Input Normalization
```

#### **Task 3 (L2 Rules) — Attach Grammar:**
```
@.monefyi/PARSE_MIGRATION_CONTEXT.md
@docs/phases/PHASE_1_FOUNDATION.md
@docs/reference/GRAMMAR_RULES.ts
Task: Implement Task 3 - L2 Rule Engine
```

#### **Task 6/7 (DB + Metrics):**
```
@.monefyi/PARSE_MIGRATION_CONTEXT.md
@docs/phases/PHASE_1_FOUNDATION.md
Task: Implement Task 6 - parse_events Table
```

#### **Saat AI Bertanya "Mengapa?" atau "Kenapa dipilih X?":**
```
@.monefyi/DECISION_LOG.md
@.monefyi/PARSE_MIGRATION_CONTEXT.md
```

#### **Saat Menulis Test / Regression:**
```
@docs/testing/GOLDEN_DATASET.json
@docs/phases/PHASE_1_FOUNDATION.md
```

---

### 3. **Workflow Rekomendasi (Langkah demi Langkah)**

#### **Langkah 1: Persiapan**
```bash
# Pastikan struktur folder sudah ada (sudah dibuat)
ls -la .monefyi docs/phases docs/reference docs/testing

# Pastikan .cursorrules ada di root
ls -la .cursorrules
```

#### **Langkah 2: Mulai Task 1**
1. Buka Cursor
2. Buka chat / composer
3. Copy-paste prompt berikut:

```
@.monefyi/PARSE_MIGRATION_CONTEXT.md
@docs/phases/PHASE_1_FOUNDATION.md

Task: Implement Task 1 - L0 Input Normalization

Please create `js/parsers/normalize.js` following the specification in PHASE_1_FOUNDATION.md.

Requirements:
1. normalizeInput() function with JSDoc
2. TYPO_MAP with 20+ entries
3. AMOUNT_PATTERNS for jt/rb/k conversion
4. DATE_KEYWORDS for relative dates
5. WhatsApp metadata removal

Also create `tests/normalize.test.js` with the test cases specified.

Let me review the code before applying.
```

4. Review hasilnya, lalu **Apply** jika OK.

#### **Langkah 3: Test Task 1**
```bash
# (Sesuaikan dengan package.json kamu)
npm test tests/normalize.test.js
# atau
deno test --allow-all tests/normalize.test.js
```

#### **Langkah 4: Lanjut Task 2 & 3 (Bisa Parallel)**
```
@.monefyi/PARSE_MIGRATION_CONTEXT.md
@docs/phases/PHASE_1_FOUNDATION.md

Task: Implement Task 2 - L1 Memory Cache (IndexedDB)
```

```
@.monefyi/PARSE_MIGRATION_CONTEXT.md
@docs/phases/PHASE_1_FOUNDATION.md
@docs/reference/GRAMMAR_RULES.ts

Task: Implement Task 3 - L2 Rule Engine
```

#### **Langkah 5: Task 4 (Refactor parseQuickText)**
```
@.monefyi/PARSE_MIGRATION_CONTEXT.md
@docs/phases/PHASE_1_FOUNDATION.md

Task: Refactor parseQuickText() with feature flag in js/app.js
```

#### **Langkah 6: Task 5 (UI) + Task 6 + Task 7**
Gunakan template yang sama, tambahkan file referensi bila perlu.

---

### 4. **Prompt Template Siap Pakai**

#### **Template Umum**
```
@.monefyi/PARSE_MIGRATION_CONTEXT.md
@docs/phases/PHASE_1_FOUNDATION.md
[ATTACH TAMBAHAN JIKA PERLU]

Task: [Nama Task]

Please create/modify [file path] following the specification.

Requirements:
- [list requirement 1]
- [list requirement 2]

Also create tests if specified.

Let me review the code before applying.
```

#### **Template untuk Testing**
```
@docs/testing/GOLDEN_DATASET.json
@docs/phases/PHASE_1_FOUNDATION.md

Write unit tests for [function] using the golden dataset.
Target: [X] passing test cases.
```

---

### 5. **Checklist Sebelum Kirim Prompt ke Cursor**

- [ ] Attach file master: `@.monefyi/PARSE_MIGRATION_CONTEXT.md`
- [ ] Attach file phase: `@docs/phases/PHASE_1_FOUNDATION.md`
- [ ] Attach file spesifik (GRAMMAR_RULES / GOLDEN jika relevan)
- [ ] Tulis task yang jelas + "Let me review before applying"
- [ ] Git commit dulu (backup)
- [ ] Baca requirement di PHASE_1_FOUNDATION.md

---

### 6. **Tips Optimalisasi**

1. **Jangan attach semua file sekaligus** — hanya file yang relevan.
2. **Gunakan "Let me review before applying"** — kurangi kesalahan.
3. **Satu task per chat** — jangan minta implement 3 task sekaligus.
4. **Setelah selesai task, update PARSE_MIGRATION_CONTEXT.md** (jika ada perubahan).
5. **Jika hasil buruk**, tambahkan konteks lebih banyak dari DECISION_LOG atau GRAMMAR_RULES.

---

### 7. **Urutan Rekomendasi Eksekusi**

| Urutan | Task | File Utama | File Tambahan |
|--------|------|------------|---------------|
| 1 | Task 1 (L0) | normalize.js | — |
| 2 | Task 7 (Metrics) | metrics.js | — |
| 3 | Task 6 (DB) | parse_events.sql | — |
| 4 | Task 2 (L1) | memory.js | — |
| 5 | Task 3 (L2) | rules.js | GRAMMAR_RULES.ts |
| 6 | Task 4 (Refactor) | app.js | — |
| 7 | Task 5 (UI) | preview-card.js | — |
| 8 | Full Testing | — | GOLDEN_DATASET.json |

---

**File ini adalah panduan resmi penggunaan split files.**  
Gunakan bersama dengan file-file di folder `.monefyi`, `docs/phases`, `docs/reference`, dan `.cursorrules`.

**Siap untuk mulai? Mulai dari Task 1!** 🚀
