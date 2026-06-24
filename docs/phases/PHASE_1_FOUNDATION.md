# Phase 1: Foundation - Implementation Guide

**Duration:** Week 1-2 (10 working days)  
**Goal:** Balik urutan pipeline, AI jadi fallback  
**Status:** 🔄 In Progress

---

## 📋 Context

**Attach Required Files:**

```
@.monefyi/PARSE_MIGRATION_CONTEXT.md   ← Master context
@.monefyi/DECISION_LOG.md              ← Architecture rationale
```

**Current Situation:**

- `parseQuickText()` di `js/app.js` langsung call AI (70% input)
- Heuristic hanya fallback
- No learning mechanism
- No confidence scoring visible

**Target:**

- L0-L2 pipeline implemented
- AI usage turun 30-40%
- p50 latency <120ms
- Feature flag ready

---

## 🎯 Task Breakdown

### Task 1: L0 - Input Normalization

**File:** `js/parsers/normalize.js` (NEW FILE)

**Requirements:**

1. ✅ Typo correction map (20+ common typos)
2. ✅ Amount parsing ("5jt"→5000000, "85k"→85000, "150rb"→150000)
3. ✅ Date parsing ("kemarin", "hari ini", "12/6/2025")
4. ✅ WhatsApp metadata removal `[Contact] Timestamp`)
5. ✅ Whitespace normalization
6. ✅ Return `NormalizedInput` type

**Implementation:**

```javascript
/**
 * @typedef {Object} NormalizedInput
 * @property {string} text - Normalized text
 * @property {string[]} tokens - Split by whitespace
 * @property {string} original - Original input (unchanged)
 * @property {Object} metadata - Extracted metadata
 * @property {Date} metadata.timestamp - When input created
 * @property {string} [metadata.channel] - 'text' | 'voice' | 'whatsapp'
 */

/**
 * Normalize user input for parsing
 * @param {string} rawInput - Raw user text
 * @param {Object} options
 * @param {string} [options.channel] - Input channel
 * @returns {NormalizedInput}
 */
export function normalizeInput(rawInput, options = {}) {
  let text = rawInput.trim().toLowerCase();
  
  // TODO: Implement normalization steps
  // 1. Remove WhatsApp metadata
  // 2. Apply typo corrections
  // 3. Parse amounts
  // 4. Normalize whitespace
  
  return {
    text,
    tokens: text.split(/\s+/),
    original: rawInput,
    metadata: {
      timestamp: new Date(),
      channel: options.channel || 'text'
    }
  };
}

// Typo correction map
const TYPO_MAP = {
  'gopay': 'gopay',
  'gope': 'gopay',
  'gpay': 'gopay',
  'go-pay': 'gopay',
  
  'bcaa': 'bca',
  'b c a': 'bca',
  
  'mandri': 'mandiri',
  'mandrii': 'mandiri',
  
  'ovo': 'ovo',
  'ovoo': 'ovo',
  
  'dana': 'dana',
  'danaaa': 'dana',
  
  'tunai': 'cash',
  'cash': 'cash',
  'kas': 'cash',
  
  // Add more...
};

// Amount patterns
const AMOUNT_PATTERNS = [
  { regex: /(\d+)\s*(?:juta|jt|m)\b/gi, multiplier: 1000000 },
  { regex: /(\d+)\s*(?:ribu|rb|k)\b/gi, multiplier: 1000 },
  { regex: /(\d+)\.(\d{3})/g, replacer: '$1$2' }, // 85.000 → 85000
];

// Date patterns
const DATE_KEYWORDS = {
  'hari ini': 0,
  'today': 0,
  'kemarin': -1,
  'yesterday': -1,
  'lusa': 1,
  'besok': 1,
  'tomorrow': 1,
};
```

**Tests (create `tests/normalize.test.js`):**

```javascript
import { normalizeInput } from '../js/parsers/normalize.js';
import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';

Deno.test('L0: Amount parsing - juta', () => {
  const result = normalizeInput('gaji 5jt masuk bca');
  assertEquals(result.text.includes('5000000'), true);
});

Deno.test('L0: Amount parsing - ribu', () => {
  const result = normalizeInput('makan 85rb gopay');
  assertEquals(result.text.includes('85000'), true);
});

Deno.test('L0: Typo correction - bcaa', () => {
  const result = normalizeInput('transfer 100k dari bcaa');
  assertEquals(result.text.includes('bca'), true);
});

Deno.test('L0: Typo correction - gopay variants', () => {
  const inputs = ['gope 50k', 'gpay 50k', 'go-pay 50k'];
  inputs.forEach(input => {
    const result = normalizeInput(input);
    assertEquals(result.text.includes('gopay'), true);
  });
});

Deno.test('L0: WhatsApp metadata removal', () => {
  const input = '[John Doe] 14:23\nmakan 50k gopay';
  const result = normalizeInput(input, { channel: 'whatsapp' });
  assertEquals(result.text.startsWith('makan'), true);
});

// Add 15+ more test cases...
```

**Acceptance Criteria:**

- [ ] All 20 tests passing
- [ ] Handles edge cases (empty string, only numbers, emoji)
- [ ] Performance: <10ms untuk input 500 chars
- [ ] No mutations (pure function)

---

### Task 2: L1 - Memory Cache (IndexedDB)

**File:** `js/services/memory.js` (NEW FILE)

**Requirements:**

1. ✅ IndexedDB wrapper (idb-keyval library)
2. ✅ Signature-based lookup
3. ✅ Fuzzy matching (Levenshtein distance ≥0.80)
4. ✅ Cache limit (1000 entries max, LRU eviction)
5. ✅ Sync to server (background task)
6. ✅ Fallback to localStorage on error

**Implementation:**

```javascript
import { get, set, keys, del } from 'idb-keyval';

/**
 * @typedef {Object} MemoryEntry
 * @property {string} signature - Hash of normalized pattern
 * @property {string} signatureRaw - Human-readable pattern
 * @property {Object} output - Parsed transaction template
 * @property {number} confidence - Accuracy score (0-1)
 * @property {number} hitCount - Usage count
 * @property {Date} lastUsedAt - Last access time
 */

/**
 * Query local memory cache
 * @param {NormalizedInput} input
 * @returns {Promise<ParseResult|null>}
 */
export async function queryLocalMemory(input) {
  try {
    // 1. Generate temporary signature
    const signature = generateSignature(input);
    
    // 2. Exact match
    const exactMatch = await get(`memory:${signature}`);
    if (exactMatch && exactMatch.confidence >= 0.95) {
      await updateHitCount(signature);
      return {
        ...exactMatch.output,
        confidence: exactMatch.confidence,
        source: 'memory',
        signature
      };
    }
    
    // 3. Fuzzy match (Levenshtein)
    const allMemories = await getAllMemories();
    for (const mem of allMemories) {
      const similarity = levenshtein(input.text, mem.signatureRaw);
      if (similarity >= 0.80) {
        await updateHitCount(mem.signature);
        return {
          ...mem.output,
          confidence: similarity * mem.confidence,
          source: 'memory',
          signature: mem.signature,
          flags: ['fuzzy_match']
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Memory query failed:', error);
    return null; // Graceful degradation
  }
}

/**
 * Generate signature from normalized input
 * Simple hash for Phase 1 (improved in Phase 2)
 */
function generateSignature(input) {
  // Placeholder: replace amounts/dates with tokens
  let pattern = input.text;
  pattern = pattern.replace(/\b\d{4,}\b/g, '{AMOUNT}');
  pattern = pattern.replace(/\b\d{1,2}\/\d{1,2}\b/g, '{DATE}');
  
  // Simple hash (TODO: use proper crypto.subtle in Phase 2)
  return btoa(pattern).slice(0, 16);
}

/**
 * Levenshtein similarity (0-1)
 */
function levenshtein(a, b) {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return 1 - (distance / maxLen);
}

// TODO: Implement getAllMemories(), updateHitCount(), syncToServer()
```

**Tests:**

```javascript
Deno.test('L1: Exact signature match', async () => {
  // Seed memory
  await set('memory:abc123', {
    signature: 'abc123',
    signatureRaw: 'makan {AMOUNT} gopay',
    output: { type: 'expense', category: 'Food & Drink', account: 'GoPay' },
    confidence: 0.96,
    hitCount: 5
  });
  
  const input = normalizeInput('makan 75000 gopay');
  const result = await queryLocalMemory(input);
  
  assertEquals(result.source, 'memory');
  assertEquals(result.confidence >= 0.95, true);
  assertEquals(result.account, 'GoPay');
});

Deno.test('L1: Fuzzy match (typo tolerance)', async () => {
  await set('memory:def456', {
    signature: 'def456',
    signatureRaw: 'bensin {AMOUNT} cash',
    output: { type: 'expense', category: 'Transport', account: 'Cash' },
    confidence: 0.90,
    hitCount: 3
  });
  
  const input = normalizeInput('bensin 150000 tunai'); // 'tunai' normalized to 'cash'
  const result = await queryLocalMemory(input);
  
  assertEquals(result?.source, 'memory');
  assertEquals(result?.flags?.includes('fuzzy_match'), true);
});

// Add 10+ more tests...
```

**Acceptance Criteria:**

- [ ] Tests passing (exact + fuzzy)
- [ ] Handles 1000 entries without lag
- [ ] IndexedDB error → fallback to localStorage
- [ ] Sync to server (background, non-blocking)

---

### Task 3: L2 - Rule Engine

**File:** `js/parsers/rules.js` (NEW FILE)

**Requirements:**

1. ✅ Grammar parser (10 patterns Bahasa Indonesia)
2. ✅ Category keyword classifier (50+ keywords)
3. ✅ Account resolver (regex + fuzzy)
4. ✅ Return confidence score
5. ✅ Audit trail `matchedRules` array)

**Implementation:**

```javascript
/**
 * @typedef {Object} GrammarRule
 * @property {string} id
 * @property {RegExp} pattern
 * @property {Function} extract
 * @property {number} confidence
 * @property {string[]} examples
 */

const GRAMMAR_RULES = [
  {
    id: 'expense_basic',
    pattern: /^(beli|bayar|buat|ke|di)\s+(.+?)\s+(\d+)\s*(?:pakai|pake|via|dengan)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'expense',
      merchant: match[2],
      amount: parseInt(match[3]),
      account: match[4]
    }),
    confidence: 0.85,
    examples: ['beli kopi 25000 gopay', 'bayar parkir 5000 cash']
  },
  
  {
    id: 'expense_amount_first',
    pattern: /^(\d+)\s+(beli|bayar|buat|untuk)\s+(.+?)(?:\s+(?:pakai|pake|via)\s+(\w+))?$/i,
    extract: (match) => ({
      type: 'expense',
      amount: parseInt(match[1]),
      merchant: match[3],
      account: match[4]
    }),
    confidence: 0.82,
    examples: ['85000 beli makan siang', '50000 untuk bensin']
  },
  
  {
    id: 'income_basic',
    pattern: /^(gaji|terima|masuk|bonus|transfer masuk)\s+(\d+)\s*(?:dari|ke)?\s*(\w+)?$/i,
    extract: (match) => ({
      type: 'income',
      category: 'Salary',
      amount: parseInt(match[2]),
      account: match[3]
    }),
    confidence: 0.90,
    examples: ['gaji 5000000 bca', 'terima 1000000 gopay']
  },
  
  // TODO: Add 7+ more rules
];

/**
 * Apply grammar rules to normalized input
 * @param {NormalizedInput} input
 * @returns {ParseResult|null}
 */
export function applyGrammarRules(input) {
  for (const rule of GRAMMAR_RULES) {
    const match = input.text.match(rule.pattern);
    if (match) {
      const extracted = rule.extract(match);
      return {
        ...extracted,
        confidence: rule.confidence,
        source: 'rule',
        matchedRules: [rule.id],
        flags: []
      };
    }
  }
  return null;
}

/**
 * Classify category from keywords
 */
const CATEGORY_KEYWORDS = {
  'Food & Drink': ['makan', 'minum', 'kopi', 'nasi', 'ayam', 'soto', 'bakso', 'warung', 'resto', 'cafe'],
  'Transport': ['bensin', 'grab', 'gojek', 'taxi', 'parkir', 'tol', 'ojek', 'motor', 'mobil'],
  'Shopping': ['beli', 'belanja', 'indomaret', 'alfamart', 'shopee', 'tokopedia', 'toped'],
  'Bills & Utilities': ['listrik', 'air', 'internet', 'wifi', 'pulsa', 'token', 'tagihan'],
  // Add more...
};

export function classifyCategory(text) {
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'Other';
}

/**
 * Resolve account from keywords
 */
const ACCOUNT_PATTERNS = [
  { regex: /\b(gopay|gope|go-pay)\b/i, account: 'GoPay' },
  { regex: /\b(ovo)\b/i, account: 'OVO' },
  { regex: /\b(dana)\b/i, account: 'DANA' },
  { regex: /\b(bca|bcaa)\b/i, account: 'BCA' },
  { regex: /\b(mandiri|mandri)\b/i, account: 'Mandiri' },
  { regex: /\b(tunai|cash|kas)\b/i, account: 'Cash' },
  // Add more...
];

export function resolveAccount(text) {
  for (const { regex, account } of ACCOUNT_PATTERNS) {
    if (regex.test(text)) {
      return account;
    }
  }
  return undefined;
}

/**
 * Complete L2 pipeline
 */
export async function L2_applyRules(input) {
  // 1. Grammar matching
  const grammarResult = applyGrammarRules(input);
  
  if (grammarResult) {
    // 2. Enhance with category
    if (!grammarResult.category) {
      grammarResult.category = classifyCategory(
        grammarResult.merchant || input.text
      );
    }
    
    // 3. Enhance with account
    if (!grammarResult.account) {
      grammarResult.account = resolveAccount(input.text);
    }
    
    return grammarResult;
  }
  
  return null;
}
```

**Tests:**

```javascript
Deno.test('L2: Grammar - expense_basic', () => {
  const input = normalizeInput('beli kopi 25000 gopay');
  const result = applyGrammarRules(input);
  
  assertEquals(result.type, 'expense');
  assertEquals(result.amount, 25000);
  assertEquals(result.merchant.includes('kopi'), true);
  assertEquals(result.account, 'gopay');
  assertEquals(result.matchedRules, ['expense_basic']);
});

Deno.test('L2: Grammar - income_basic', () => {
  const input = normalizeInput('gaji 5000000 bca');
  const result = applyGrammarRules(input);
  
  assertEquals(result.type, 'income');
  assertEquals(result.category, 'Salary');
  assertEquals(result.amount, 5000000);
});

Deno.test('L2: Category classifier - Food', () => {
  const category = classifyCategory('makan siang di warung');
  assertEquals(category, 'Food & Drink');
});

Deno.test('L2: Category classifier - Transport', () => {
  const category = classifyCategory('bensin motor');
  assertEquals(category, 'Transport');
});

Deno.test('L2: Account resolver - GoPay variants', () => {
  assertEquals(resolveAccount('bayar pakai gopay'), 'GoPay');
  assertEquals(resolveAccount('bayar pakai gope'), 'GoPay');
  assertEquals(resolveAccount('bayar pakai go-pay'), 'GoPay');
});

// Add 15+ more tests...
```

**Acceptance Criteria:**

- [ ] 10 grammar rules implemented
- [ ] 50+ category keywords
- [ ] 15+ account patterns
- [ ] All tests passing
- [ ] Coverage: 50-60% dari golden dataset

---

### Task 4: Refactor `parseQuickText()` dengan Feature Flag

**File:** `js/app.js` (MODIFY EXISTING)

**Requirements:**

1. ✅ Feature flag check
2. ✅ Call new pipeline (L0→L1→L2→Server)
3. ✅ Preserve legacy behavior (rollback safety)
4. ✅ Metrics logging
5. ✅ Error handling graceful

**Implementation:**

```javascript
import { normalizeInput } from './parsers/normalize.js';
import { queryLocalMemory } from './services/memory.js';
import { L2_applyRules } from './parsers/rules.js';
import { featureFlags } from './services/feature-flags.js';
import { logParseEvent } from './services/metrics.js';

/**
 * Parse quick text input
 * @param {string} text - User input
 * @returns {Promise<ParsedTransaction>}
 */
async function parseQuickText(text) {
  const startTime = performance.now();
  const userId = await getCurrentUserId();
  
  // Feature flag check
  const useNewPipeline = await featureFlags.isEnabled(
    'new_parser_pipeline',
    userId
  );
  
  try {
    let result;
    
    if (useNewPipeline) {
      result = await runNewParsePipeline(text, userId);
    } else {
      result = await legacyParseAIFirst(text); // Existing function
    }
    
    // Log metrics
    const latency = performance.now() - startTime;
    await logParseEvent({
      userId,
      input: text,
      result,
      latency,
      pipeline: useNewPipeline ? 'new' : 'legacy'
    });
    
    return result;
    
  } catch (error) {
    console.error('Parse failed:', error);
    Sentry.captureException(error);
    
    // Graceful degradation
    return {
      confidence: 0.30,
      source: 'manual',
      flags: ['needs_review', 'error']
    };
  }
}

/**
 * New parsing pipeline (L0-L2 + Server fallback)
 */
async function runNewParsePipeline(text, userId) {
  // L0: Preprocess
  const normalized = normalizeInput(text);
  
  // L1: Memory
  const memoryResult = await queryLocalMemory(normalized);
  if (memoryResult && memoryResult.confidence >= 0.95) {
    console.log('[L1 Memory Hit]', memoryResult);
    return memoryResult;
  }
  
  // L2: Rules
  const ruleResult = await L2_applyRules(normalized);
  if (ruleResult && ruleResult.confidence >= 0.75) {
    console.log('[L2 Rule Match]', ruleResult);
    return ruleResult;
  }
  
  // L3-L5: Server (Edge Function)
  console.log('[Calling Server Pipeline]');
  const serverResult = await callServerParse({
    text: normalized.text,
    userId,
    fallbackToAI: ruleResult ? ruleResult.confidence < 0.65 : true
  });
  
  return serverResult;
}

/**
 * Call server parse (Edge Function)
 */
async function callServerParse(payload) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/asfin-parse-transaction`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify(payload)
    }
  );
  
  if (!response.ok) {
    throw new Error(`Server parse failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// Export for use in other parts
window.parseQuickText = parseQuickText;
```

**Tests (E2E with Playwright):**

```javascript
// tests/e2e/parse-quick-text.spec.js
import { test, expect } from '@playwright/test';

test('Parse quick text - Memory hit', async ({ page }) => {
  await page.goto('/');
  
  // Enable feature flag for this user
  await page.evaluate(() => {
    localStorage.setItem('feature_new_parser_pipeline', 'true');
  });
  
  // Seed memory
  await page.evaluate(() => {
    const { set } = window.idbKeyval;
    set('memory:abc123', {
      signature: 'abc123',
      signatureRaw: 'makan {AMOUNT} gopay',
      output: {
        type: 'expense',
        category: 'Food & Drink',
        account: 'GoPay',
        amount: 0 // Will be filled by template
      },
      confidence: 0.96
    });
  });
  
  // Input text
  await page.fill('#quick-text-input', 'makan 75000 gopay');
  await page.click('#parse-button');
  
  // Wait for preview
  await page.waitForSelector('.preview-card');
  
  // Verify parser source badge
  const badge = await page.textContent('.badge');
  expect(badge).toContain('Memory');
  
  // Verify confidence
  const confidence = await page.textContent('.confidence span');
  expect(parseInt(confidence)).toBeGreaterThan(90);
  
  // Verify parsed fields
  expect(await page.inputValue('[name="category"]')).toBe('Food & Drink');
  expect(await page.inputValue('[name="account"]')).toBe('GoPay');
  expect(await page.inputValue('[name="amount"]')).toBe('75000');
});

test('Parse quick text - Rule match', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('feature_new_parser_pipeline', 'true');
  });
  
  await page.fill('#quick-text-input', 'beli kopi 25000 gopay');
  await page.click('#parse-button');
  
  await page.waitForSelector('.preview-card');
  
  const badge = await page.textContent('.badge');
  expect(badge).toContain('Rule');
  
  expect(await page.inputValue('[name="type"]')).toBe('expense');
  expect(await page.inputValue('[name="amount"]')).toBe('25000');
});

test('Feature flag OFF - Legacy behavior', async ({ page }) => {
  await page.goto('/');
  
  // Feature flag disabled
  await page.evaluate(() => {
    localStorage.removeItem('feature_new_parser_pipeline');
  });
  
  await page.fill('#quick-text-input', 'makan 50000 gopay');
  await page.click('#parse-button');
  
  // Should use legacy AI-first pipeline
  await page.waitForSelector('.preview-card');
  
  const badge = await page.textContent('.badge');
  expect(badge).toContain('AI'); // Legacy always uses AI
});
```

**Acceptance Criteria:**

- [ ] Feature flag toggles pipeline
- [ ] L0→L1→L2 sequence correct
- [ ] Legacy behavior unchanged when flag OFF
- [ ] Error handling graceful (no crashes)
- [ ] E2E tests passing

---

### Task 5: UI - Parser Metadata Display

**File:** `js/components/preview-card.js` (NEW FILE)

**Requirements:**

1. ✅ Parser source badge (Memory, Rule, AI, Manual)
2. ✅ Confidence bar visual
3. ✅ Tooltip with matched rules
4. ✅ Low-confidence warning
5. ✅ Responsive design

**Implementation:**

```javascript
/**
 * Render preview card with parser metadata
 * @param {ParseResult} parsed
 * @returns {HTMLElement}
 */
export function renderPreviewCard(parsed) {
  const container = document.createElement('div');
  container.className = 'preview-card';
  
  // Badge configuration
  const badgeConfig = {
    memory: { icon: '🧠', color: 'purple', text: 'Learned', tooltip: 'From your patterns' },
    rule: { icon: '📏', color: 'blue', text: 'Rule', tooltip: `Matched: ${parsed.matchedRules?.join(', ')}` },
    ai: { icon: '✨', color: 'green', text: 'AI', tooltip: 'Analyzed by Gemini' },
    manual: { icon: '✍️', color: 'gray', text: 'Manual', tooltip: 'Needs your input' }
  };
  
  const badge = badgeConfig[parsed.source] || badgeConfig.manual;
  
  container.innerHTML = `
    <div class="preview-header">
      <span class="badge badge-${badge.color}" title="${badge.tooltip}">
        ${badge.icon} ${badge.text}
      </span>
      
      <div class="confidence-indicator">
        <div class="confidence-bar-bg">
          <div 
            class="confidence-bar-fill ${getConfidenceClass(parsed.confidence)}" 
            style="width: ${parsed.confidence * 100}%"
          ></div>
        </div>
        <span class="confidence-text">${Math.round(parsed.confidence * 100)}%</span>
      </div>
    </div>
    
    ${parsed.explanation ? `
      <div class="explanation-box">
        <span class="icon">💡</span>
        <span>${parsed.explanation}</span>
      </div>
    ` : ''}
    
    <div class="preview-fields">
      ${renderField('date', parsed.date, parsed.flags)}
      ${renderField('type', parsed.type, parsed.flags)}
      ${renderField('amount', parsed.amount, parsed.flags)}
      ${renderField('category', parsed.category, parsed.flags)}
      ${renderField('account', parsed.account, parsed.flags)}
      ${renderField('merchant', parsed.merchant, parsed.flags)}
      ${renderField('notes', parsed.notes, parsed.flags)}
    </div>
    
    <div class="preview-actions">
      <button class="btn btn-primary" onclick="handleSave()">
        💾 Save
      </button>
      <button class="btn btn-secondary" onclick="handleEdit()">
        ✏️ Edit
      </button>
      <button class="btn btn-text" onclick="handleCancel()">
        Cancel
      </button>
    </div>
  `;
  
  return container;
}

/**
 * Get confidence class for color coding
 */
function getConfidenceClass(confidence) {
  if (confidence >= 0.90) return 'confidence-high';
  if (confidence >= 0.70) return 'confidence-medium';
  return 'confidence-low';
}

/**
 * Render individual field with warning indicators
 */
function renderField(name, value, flags = []) {
  const hasWarning = flags.includes(`ambiguous_${name}`) || flags.includes(`unknown_${name}`);
  
  return `
    <div class="field ${hasWarning ? 'field-warning' : ''}">
      <label for="${name}">${formatLabel(name)}</label>
      <input 
        type="${getInputType(name)}"
        id="${name}"
        name="${name}"
        value="${value || ''}"
        onchange="handleFieldEdit('${name}', this.value)"
        ${hasWarning ? 'class="has-warning"' : ''}
      />
      ${hasWarning ? '<span class="warning-icon" title="Please verify">⚠️</span>' : ''}
    </div>
  `;
}

function formatLabel(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getInputType(name) {
  if (name === 'amount') return 'number';
  if (name === 'date') return 'date';
  return 'text';
}
```

**CSS (add to `css/preview-card.css`):**

```css
.preview-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin: 20px 0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: help;
}

.badge-purple { background: #E9D5FF; color: #6B21A8; }
.badge-blue { background: #DBEAFE; color: #1E40AF; }
.badge-green { background: #D1FAE5; color: #065F46; }
.badge-gray { background: #F3F4F6; color: #374151; }

.confidence-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.confidence-bar-bg {
  width: 100px;
  height: 8px;
  background: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
}

.confidence-bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.confidence-high { background: #10B981; }
.confidence-medium { background: #F59E0B; }
.confidence-low { background: #EF4444; }

.confidence-text {
  font-size: 14px;
  font-weight: 600;
  min-width: 40px;
}

.explanation-box {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #FEF3C7;
  border-left: 4px solid #F59E0B;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
}

.preview-fields {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.field input {
  padding: 10px 12px;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.field input:focus {
  outline: none;
  border-color: #3B82F6;
}

.field-warning input {
  border-color: #F59E0B;
  background: #FFFBEB;
}

.warning-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  cursor: help;
}

.preview-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3B82F6;
  color: white;
}

.btn-primary:hover {
  background: #2563EB;
}

.btn-secondary {
  background: #F3F4F6;
  color: #374151;
}

.btn-text {
  background: transparent;
  color: #6B7280;
}
```

**Tests:**

```javascript
test('Preview card shows memory badge', async ({ page }) => {
  const parsed = {
    source: 'memory',
    confidence: 0.96,
    type: 'expense',
    amount: 75000
  };
  
  await page.evaluate((data) => {
    const card = window.renderPreviewCard(data);
    document.body.appendChild(card);
  }, parsed);
  
  const badge = await page.textContent('.badge');
  expect(badge).toContain('Learned');
  expect(badge).toContain('🧠');
});

test('Confidence bar shows correct color', async ({ page }) => {
  // High confidence (green)
  let parsed = { source: 'rule', confidence: 0.95 };
  await page.evaluate((data) => {
    const card = window.renderPreviewCard(data);
    document.body.appendChild(card);
  }, parsed);
  
  let barClass = await page.getAttribute('.confidence-bar-fill', 'class');
  expect(barClass).toContain('confidence-high');
  
  // Low confidence (red)
  parsed = { source: 'ai', confidence: 0.62 };
  await page.evaluate((data) => {
    const card = window.renderPreviewCard(data);
    document.body.innerHTML = '';
    document.body.appendChild(card);
  }, parsed);
  
  barClass = await page.getAttribute('.confidence-bar-fill', 'class');
  expect(barClass).toContain('confidence-low');
});
```

**Acceptance Criteria:**

- [ ] Badge shows correct icon & color per source
- [ ] Confidence bar visually accurate
- [ ] Tooltip shows matched rules (for rule source)
- [ ] Low-confidence warning visible
- [ ] Responsive on mobile (<375px)

---

### Task 6: Database - `parse_events` Table

**File:** `supabase/migrations/20250115_parse_events.sql` (NEW FILE)

```sql
-- ============================================================
-- Migration: parse_events table for logging
-- Purpose: Track all parse attempts for metrics & learning
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS parse_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      text,
  
  -- Input
  raw_input       text NOT NULL,
  input_channel   text NOT NULL DEFAULT 'text' CHECK (input_channel IN (
    'text', 'voice', 'ocr', 'whatsapp', 'manual'
  )),
  
  -- Processing
  parser_layer    text NOT NULL CHECK (parser_layer IN (
    'memory', 'rule', 'fuzzy', 'ai', 'manual', 'error'
  )),
  confidence      numeric(4,3) CHECK (confidence BETWEEN 0 AND 1),
  
  -- Output
  parsed_json     jsonb NOT NULL,
  final_json      jsonb,                  -- null if user cancelled
  edited_fields   text[],                 -- which fields user changed
  
  -- Performance
  latency_ms      int,
  ai_tokens       int DEFAULT 0,
  
  -- Flags
  flags           text[],
  
  -- Temporal
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for analytics
CREATE INDEX idx_parse_events_user_time 
  ON parse_events (user_id, created_at DESC);
CREATE INDEX idx_parse_events_layer 
  ON parse_events (parser_layer, created_at DESC);
CREATE INDEX idx_parse_events_confidence 
  ON parse_events (confidence DESC NULLS LAST);

-- RLS Policies
ALTER TABLE parse_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON parse_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own events"
  ON parse_events FOR SELECT
  USING (auth.uid() = user_id);

-- Admin policy (for analytics dashboard)
CREATE POLICY "Service role can view all"
  ON parse_events FOR SELECT
  USING (auth.role() = 'service_role');

-- Retention policy (delete events older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_parse_events()
RETURNS void AS $$
BEGIN
  DELETE FROM parse_events
  WHERE created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-parse-events', '0 2 * * *', 'SELECT cleanup_old_parse_events()');

COMMIT;
```

**Acceptance Criteria:**

- [ ] Migration runs successfully
- [ ] RLS policies tested (cross-user isolation)
- [ ] Indexes created
- [ ] Retention policy function works

---

### Task 7: Metrics Logging

**File:** `js/services/metrics.js` (NEW FILE)

```javascript
import { supabase } from './supabase-client.js';

/**
 * Log parse event to database
 * @param {Object} event
 * @param {string} event.userId
 * @param {string} event.input
 * @param {ParseResult} event.result
 * @param {number} event.latency
 * @param {string} event.pipeline - 'new' | 'legacy'
 */
export async function logParseEvent(event) {
  try {
    const { error } = await supabase
      .from('parse_events')
      .insert({
        user_id: event.userId,
        raw_input: event.input,
        input_channel: 'text',
        parser_layer: event.result.source || 'manual',
        confidence: event.result.confidence,
        parsed_json: event.result,
        latency_ms: Math.round(event.latency),
        ai_tokens: event.result._aiTokens || 0,
        flags: event.result.flags || [],
        session_id: getSessionId()
      });
    
    if (error) {
      console.error('Failed to log parse event:', error);
    }
  } catch (error) {
    // Don't throw - logging failure shouldn't break user flow
    console.error('Metrics logging error:', error);
  }
}

/**
 * Get or create session ID (persisted in sessionStorage)
 */
function getSessionId() {
  let sessionId = sessionStorage.getItem('parse_session_id');
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('parse_session_id', sessionId);
  }
  
  return sessionId;
}

/**
 * Get parse metrics for current user (dashboard)
 */
export async function getParseMetrics(userId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const { data, error } = await supabase
    .from('parse_events')
    .select('parser_layer, confidence, latency_ms, edited_fields')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString());
  
  if (error) {
    console.error('Failed to fetch metrics:', error);
    return null;
  }
  
  // Calculate stats
  const total = data.length;
  const byLayer = {};
  let totalLatency = 0;
  let zeroEditCount = 0;
  
  for (const event of data) {
    byLayer[event.parser_layer] = (byLayer[event.parser_layer] || 0) + 1;
    totalLatency += event.latency_ms || 0;
    
    if (!event.edited_fields || event.edited_fields.length === 0) {
      zeroEditCount++;
    }
  }
  
  return {
    total,
    byLayer,
    avgLatency: Math.round(totalLatency / total),
    zeroEditRate: (zeroEditCount / total * 100).toFixed(1),
    memoryHitRate: ((byLayer.memory || 0) / total * 100).toFixed(1),
    aiUsageRate: ((byLayer.ai || 0) / total * 100).toFixed(1)
  };
}
```

**Acceptance Criteria:**

- [ ] Events logged successfully
- [ ] No crashes on logging failure
- [ ] getParseMetrics() returns correct stats
- [ ] Session ID persisted correctly

---

## ✅ Definition of Done (Phase 1)

### Code Quality

- [ ] All functions have JSDoc comments
- [ ] No console.log (use console.error for errors)
- [ ] No hardcoded values (use constants)
- [ ] Error handling in all async functions

### Testing

- [ ] Unit tests: 50+ passing (L0, L1, L2)
- [ ] E2E tests: 5+ scenarios passing
- [ ] Manual testing: 20 real-world inputs
- [ ] Golden dataset: 70% accuracy (baseline)

### Performance

- [ ] L0 normalization: <10ms
- [ ] L1 memory query: <20ms
- [ ] L2 rule matching: <50ms
- [ ] End-to-end p50: <120ms
- [ ] No memory leaks (tested with 1000 parses)

### Deployment

- [ ] Feature flag created (0% rollout)
- [ ] Database migration applied
- [ ] Code reviewed (2+ approvers)
- [ ] Rollback plan documented
- [ ] Monitoring dashboard setup

### Metrics (Baseline)

- [ ] Measure current AI usage rate
- [ ] Measure current edit rate
- [ ] Measure current latency (p50, p95)
- [ ] Document baseline in ADR

### Documentation

- [ ] Update PARSE_MIGRATION_CONTEXT.md
- [ ] Document new functions (JSDoc)
- [ ] Update team wiki
- [ ] Create demo video (internal)

---

## 📊 Success Metrics (Phase 1 Target)

| Metric | Baseline | Target | How to Measure |
|--------|----------|--------|----------------|
| **AI Parse Rate** | 70% | 60% | `SELECT COUNT(*) FROM parse_events WHERE parser_layer='ai'` |
| **Memory Hit Rate** | 0% | 5-10% | `SELECT COUNT(*) FROM parse_events WHERE parser_layer='memory'` |
| **Rule Coverage** | 30% | 50-60% | `SELECT COUNT(*) FROM parse_events WHERE parser_layer='rule'` |
| **Zero-Edit Save** | 58% | 62% | `SELECT COUNT(*) FROM parse_events WHERE edited_fields IS NULL` |
| **p50 Latency** | 1800ms | <120ms | Median of `latency_ms` (L0-L2 only) |
| **Error Rate** | <1% | <1% | Sentry error count |

**Acceptance:** Minimal 3/6 metrics hit target untuk proceed ke Phase 2.

---

## 🚀 Ready to Execute

**Recommended Order:**

1. Task 1 (L0 Normalize) → Task 7 (Metrics) → Task 6 (DB)
2. Task 2 (L1 Memory) + Task 3 (L2 Rules) parallel
3. Task 4 (Refactor parseQuickText)
4. Task 5 (UI Preview Card)
5. End-to-end testing + tuning

**Estimated Effort:**

- Tasks 1-3: 3 days
- Task 4: 1 day
- Task 5: 1 day
- Tasks 6-7: 0.5 days
- Testing & polish: 2 days
- **Total: 7.5 days** (buffer 2.5 days = 10 days)

---

**Next:** Submit Task 1 to Cursor untuk mulai implementation.
