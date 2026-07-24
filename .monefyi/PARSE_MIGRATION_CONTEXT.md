# Monefyi Parse System Migration - Master Context

**Last Updated:** 2025-01-15  
**Current Phase:** Phase 1 - Foundation (Week 1-2)

---

## Mission Statement

Migrate parsing architecture dari **AI-first** (70% Gemini calls, mahal, lambat) ke **Deterministic-first** (85% rules/memory, murah, cepat) dengan AI sebagai fallback.

**Philosophy:** "Parse cepat, murah, akurat, dan semakin pintar"

---

## Target Architecture

### 5-Layer Pipeline

```
INPUT -> L0 Preprocess -> L1 Memory -> L2 Rules -> L3 Fuzzy -> L4 AI -> L5 Review
         (normalize)     (personal)   (determin)  (hybrid)    (costly) (manual)
         
Confidence: --------->   0.95+        0.75+       0.65+       0.60+    <0.60
Source:                  memory       rule        fuzzy       ai       manual
```

### Layer Responsibilities

| Layer | Function | Offline | Target Coverage | Latency |
|-------|----------|---------|-----------------|---------|
| **L0** | Normalize input (typo, amount, date) | Yes | 100% | <10ms |
| **L1** | User memory (exact/fuzzy signature match) | Yes (IndexedDB) | 35% (30d) | <20ms |
| **L2** | Rule engine (grammar, regex, keywords) | Yes | 50-60% | <50ms |
| **L3** | Entity resolver (fuzzy merchant, category) | No (DB) | +15-20% | <150ms |
| **L4** | AI fallback (Gemini structured output) | No (API) | <15% | <2000ms |
| **L5** | Review queue (human correction) | Yes | <5% | N/A |

---

## Success Metrics

### Technical KPIs

| Metric | Baseline (Now) | Phase 1 Target | Phase 5 Target |
|--------|---------------|----------------|----------------|
| **AI Parse Rate** | 70% | 60% | <15% |
| **Memory Hit Rate** | 0% | 5-10% | 35% |
| **Rule Coverage** | 30% | 50-60% | 80% |
| **Zero-edit Save** | 58% | 62% | 75% |
| **p50 Latency** | 1800ms | 120ms | 80ms |
| **AI Cost/User/Mo** | $0.45 | $0.30 | $0.08 |

### User Experience KPIs

- Preview to Save time: <3 seconds
- Parser source visibility: 100% (badge shown)
- Confidence visible: 100%
- Undo availability: 10s window
- Offline parse capability: 60% inputs

---

## Tech Stack

### Client (PWA)
- **Runtime:** Vanilla JS (ES6+)
- **Storage:** IndexedDB (memory cache, 5MB limit)
- **UI:** Custom components (no framework)
- **Build:** Vite (dev), native bundle (prod)

### Server
- **Platform:** Supabase Edge Functions (Deno runtime)
- **Database:** PostgreSQL 15 + RLS
- **AI:** Gemini 1.5 Flash 8B (structured output)
- **CDN:** Cloudflare (caching layer)

### Testing
- **Unit:** Deno.test, Vitest (client)
- **E2E:** Playwright
- **Load:** k6

---

## Key Files & Locations

### Client Code
```
js/
├── app.js                           # Main entry, parseQuickText()
├── services/
│   ├── memory.js                    # IndexedDB memory cache
│   ├── parser.js                    # L0-L2 pipeline
│   └── api.js                       # Edge Function calls
├── parsers/
│   ├── normalize.js                 # L0: Preprocessing
│   ├── rules.js                     # L2: Grammar & regex
│   └── category.js                  # L2: Category classifier
└── utils/
    ├── confidence.js                # Scoring utilities
    └── signature.js                 # Memory signature hash
```

### Server Code
```
supabase/
├── functions/
│   └── asfin-parse-transaction/
│       ├── index.ts                 # Edge Function entry
│       ├── parse-core/
│       │   ├── pipeline.ts          # L0-L5 orchestrator
│       │   ├── memory.ts            # L1: DB memory query
│       │   ├── rules.ts             # L2: Server-side rules
│       │   ├── resolver.ts          # L3: Entity resolver
│       │   └── ai.ts                # L4: Gemini integration
│       └── types.ts                 # Shared types
└── migrations/
    └── 20250115_parse_foundation.sql
```

### Documentation
```
docs/
├── README.md                        # Documentation index (start here)
├── MONEFYI_MASTER.md                # Complete product reference
├── MONEFYI_PRODUCT_PROMPT.md          # Product spec + AI dev prompt
├── ARSITEKTUR_PARSING_MONEFYI.md    # Parsing architecture
├── MONEVISOR.md                     # AI advisor
├── DEPLOY_STRUCTURE.md              # Deploy & URLs
├── ADMIN_RUNBOOK.md                 # Admin operations
├── phases/
│   └── PHASE_1_FOUNDATION.md        # Current phase details
├── reference/
│   ├── GRAMMAR_RULES.ts
│   ├── DB_SCHEMA.sql
│   └── TYPES.ts
└── testing/
    └── GOLDEN_DATASET.json
```

---

## Current Phase: Phase 1

**Duration:** Week 1-2  
**Goal:** Balik urutan pipeline, AI jadi fallback

### Key Deliverables

1. Refactor `parseQuickText()` dengan feature flag
2. Implement L0 (normalization)
3. Implement L1 (IndexedDB memory cache)
4. Implement L2 (basic grammar rules)
5. UI: Parser source badge & confidence bar
6. Logging: `parse_events` table
7. Testing: 50 regression test cases

### Success Criteria

- AI usage turun 30-40%
- No accuracy regression vs baseline
- p50 latency <120ms
- Feature flag ready untuk gradual rollout

---

## Coding Standards

### JavaScript/TypeScript
- Use strict mode
- JSDoc for all public functions
- Explicit types (TypeScript) / JSDoc (JS)
- No `any` type (use `unknown`)
- Prefer `interface` over `type`

### Naming Conventions
- Functions: `camelCase` with verb prefix `parseInput`, `getUserData`)
- Constants: `SCREAMING_SNAKE_CASE`
- Classes/Types: `PascalCase`
- Files: `kebab-case.js`

### Error Handling

```javascript
// Good
async function parseInput(text) {
  try {
    const result = await heavyOperation(text);
    return { success: true, data: result };
  } catch (error) {
    console.error('Parse failed:', error);
    Sentry.captureException(error);
    return { success: false, error: error.message };
  }
}
```

### Performance Rules
- IndexedDB reads must be <50ms
- DOM updates: batch with `requestAnimationFrame`
- Avoid synchronous localStorage (use IndexedDB)
- Debounce user input (300ms)

---

## Security Checklist

- All DB queries use RLS policies
- User input sanitized (XSS prevention)
- API rate limiting: 100 req/user/hour
- BYOK Gemini keys encrypted (Supabase Vault)
- No PII in logs (anonymize user input)

---

## Reference Commands

### Attach Reference Docs
```
@GRAMMAR_RULES.ts       # When implementing L2 rules
@DB_SCHEMA.sql          # When working with database
@TYPES.ts               # When defining interfaces
@GOLDEN_DATASET.json    # When writing tests
```

### Feature Flag Check
```javascript
const useNewPipeline = await featureFlags.isEnabled('new_parser_pipeline', userId);
```

### Quick Test
```bash
# Unit tests
npm test -- --grep "L0 normalization"

# E2E test
npm run test:e2e -- phase1.spec.js

# Load test
k6 run tests/load/parse-benchmark.js
```

---

## Related Documents

- **Current Phase Details:** `docs/phases/PHASE_1_FOUNDATION.md`
- **Architecture Decisions:** `.monefyi/DECISION_LOG.md`
- **Grammar Rules:** `docs/reference/GRAMMAR_RULES.ts`
- **Test Dataset:** `docs/testing/GOLDEN_DATASET.json`

---

**Version:** 1.0.0  
**Maintainer:** Monefyi Engineering Team
