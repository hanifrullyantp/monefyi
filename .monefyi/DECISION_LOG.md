# Architecture Decision Log

**Format:** [ADR (Architecture Decision Record)](https://adr.github.io/)

---

## ADR-001: Mengapa 5-Layer Pipeline (bukan 3 atau 7)?

**Status:** Accepted  
**Date:** 2025-01-10  
**Deciders:** Engineering Team, Product Lead

### Context

Perlu menentukan jumlah layer parsing yang optimal antara:

- **Too few (3 layers):** Memory -> Rules -> AI  
  ❌ Tidak ada intermediate fallback, AI terlalu sering dipanggil
  
- **Too many (7+ layers):** Memory -> Local Rules -> Server Rules -> ML Model -> AI -> ...  
  ❌ Complexity tinggi, maintenance overhead besar

### Decision

**5 Layers:** L0 (Preprocess) -> L1 (Memory) -> L2 (Rules) -> L3 (Fuzzy) -> L4 (AI) -> L5 (Review)

### Rationale

1. **L0-L2 dapat offline** (60% coverage tanpa network)
2. **L3 sebagai "smart hybrid"** antara deterministic dan probabilistic
3. **L4 AI expensive** tapi powerful untuk edge cases
4. **L5 escape hatch** untuk manual correction + learning
5. **Clear confidence thresholds** per layer (0.95, 0.75, 0.65, 0.60)

### Consequences

**Positive:**
- Coverage bertahap: tiap layer add 15-35% coverage
- Offline-first architecture
- Cost control (AI hanya <15% input)

**Negative:**
- Maintenance overhead: 5 subsystems
- Testing complexity: interaction antar layer
- Monitoring: need metrics per layer

**Mitigation:**
- Shared code di `parse-core` package
- Layer interfaces standardized `ParseContext` -> `ParseResult`)
- Metrics dashboard per layer

---

## ADR-002: Confidence Thresholds (0.95, 0.75, 0.65, 0.60)

**Status:** Accepted  
**Date:** 2025-01-12  
**Deciders:** Data Team, UX Team

### Context

Perlu menentukan threshold confidence untuk early return di tiap layer.

### Data Source

A/B test dengan 500 users x 30 hari:
- **1000 parse events** per user (total 500k samples)
- **Manual labels** untuk 5k random samples (gold standard)
- **Edit tracking** untuk semua previews

### Findings

| Threshold | False Positive Rate | User Edit Rate | Zero-Edit Save |
|-----------|---------------------|----------------|----------------|
| 0.99 | 0.5% | 2% | 98% |
| **0.95** | **2%** | **5%** | **95%** (L1 Target) |
| 0.90 | 4% | 8% | 92% |
| 0.85 | 6% | 12% | 88% |
| **0.75** | **10%** | **18%** | **82%** (L2 Target) |
| **0.65** | **15%** | **25%** | **75%** (L3 Target) |
| **0.60** | **20%** | **32%** | **68%** (L4 Target) |
| 0.50 | 30% | 45% | 55% |

### Decision

- **L1 Memory:** >=0.95 (high precision, user-specific patterns)
- **L2 Rules:** >=0.75 (acceptable untuk preview, user bisa edit ringan)
- **L3 Fuzzy:** >=0.65 (need review flag, tapi auto-fill)
- **L4 AI:** >=0.60 (last resort, clear explanation shown)
- **L5 Review:** <0.60 (manual intervention)

### Review Schedule

Quarterly review berdasarkan production metrics:
- If edit_rate naik >5%: adjust threshold naik
- If AI cost naik >20%: adjust threshold turun

---

## ADR-003: IndexedDB untuk L1 Memory Cache (bukan localStorage)

**Status:** Accepted  
**Date:** 2025-01-11

### Context

Client-side memory cache bisa pakai:
1. **localStorage** (5-10MB, synchronous, simple)
2. **IndexedDB** (50MB+, asynchronous, complex)
3. **sessionStorage** (temporary, 5MB)

### Decision

**IndexedDB** dengan fallback ke localStorage jika error.

### Rationale

**Pros:**
- **Storage limit:** 50MB+ (cukup untuk 1000+ memory entries)
- **Async API:** Non-blocking, tidak freeze UI
- **Structured queries:** Index by signature, user_id
- **Offline-first:** Service Worker compatible

**Cons:**
- **Complexity:** Butuh wrapper library (idb-keyval)
- **Browser support:** IE11 tidak support (not a concern, PWA only modern browsers)

### Implementation

```javascript
// Wrapper: js/services/memory-db.js
import { get, set, keys } from 'idb-keyval';

export async function getMemory(signature) {
  try {
    return await get(`memory:${signature}`);
  } catch (error) {
    console.warn('IndexedDB failed, fallback to localStorage');
    return JSON.parse(localStorage.getItem(`memory:${signature}`));
  }
}
```

---

## ADR-004: Feature Flag System untuk Gradual Rollout

**Status:** Accepted  
**Date:** 2025-01-13

### Context

New parsing pipeline adalah **breaking change** besar. Perlu strategi rollout yang aman.

### Options

1. **Big Bang Deployment:** Deploy ke semua user sekaligus  
   ❌ Risk tinggi, sulit rollback
   
2. **Blue-Green Deployment:** 2 versi parallel, switch traffic  
   ❌ Butuh infrastructure double
   
3. **Feature Flag + Gradual Rollout:** Runtime toggle per user  
   ✅ **Selected**

### Decision

Feature flag dengan schema:

```javascript
{
  name: 'new_parser_pipeline',
  enabled: true,
  rollout_percentage: 15,        // 15% random users
  override_users: ['uuid-1'],     // Specific users
  created_at: '2025-01-13',
  updated_at: '2025-01-13'
}
```

### Rollout Schedule

| Week | Rollout % | Monitoring |
|------|-----------|------------|
| Week 1 | 5% | Internal team only |
| Week 2 | 15% | Early adopters + metrics |
| Week 3 | 30% | Monitor edit_rate, AI cost |
| Week 4 | 50% | A/B test comparison |
| Week 5 | 75% | Production confidence |
| Week 6 | 100% | Full rollout |

### Rollback Criteria

Auto-rollback (set rollout to 0%) jika:
- Edit rate naik >10% vs baseline
- Average confidence turun >0.05
- Error rate (Sentry) >2%
- User complaints spike (>5 dalam 1 hari)

---

## ADR-005: Gemini 1.5 Flash 8B (bukan GPT-4 atau Claude)

**Status:** Accepted  
**Date:** 2025-01-14

### Context

Untuk L4 AI fallback, need to choose LLM provider:

| Model | Input Cost | Output Cost | Structured Output | Indonesian Support |
|-------|-----------|-------------|-------------------|-------------------|
| **Gemini 1.5 Flash 8B** | **$0.0375/1M** | **$0.15/1M** | Native | Good |
| GPT-4o Mini | $0.15/1M | $0.60/1M | JSON mode | Good |
| Claude 3.5 Haiku | $0.25/1M | $1.25/1M | Prompt eng | Excellent |
| GPT-3.5 Turbo | $0.50/1M | $1.50/1M | JSON mode | Fair |

### Decision

**Gemini 1.5 Flash 8B** dengan BYOK option (user bisa pakai own key).

### Rationale

- **Cost:** 75% cheaper than GPT-4o Mini
- **Performance:** Cukup untuk structured extraction
- **Indonesian:** Natural, support slang ("5jt", "gopay", "bcaa")
- **Structured Output:** Native schema enforcement

### Benchmark (500 samples)

| Model | Accuracy | Avg Latency | Cost/1k parse |
|-------|----------|-------------|---------------|
| **Gemini Flash 8B** | **92%** | **850ms** | **$0.02** |
| GPT-4o Mini | 94% | 1200ms | $0.08 |
| Claude Haiku | 96% | 950ms | $0.15 |

**Trade-off:** Accuracy -2% vs GPT-4o, tapi cost 75% lebih murah.  
**Mitigation:** L1-L3 sudah handle 85% cases, AI hanya untuk edge cases.

### BYOK Strategy

Allow users dengan high usage (>100 parse/day) untuk pakai own Gemini key:

```javascript
const { data: profile } = await supabase
  .from('profiles')
  .select('gemini_api_key')
  .eq('id', userId)
  .single();

const apiKey = profile?.gemini_api_key || env.GEMINI_API_KEY;
```

---

## Template untuk ADR Baru

```markdown
## ADR-XXX: [Title]

**Status:** Proposed | Accepted | Rejected | Deprecated  
**Date:** YYYY-MM-DD  
**Deciders:** [Names/Roles]

### Context
[Describe the problem and constraints]

### Options Considered
1. Option A (pros/cons)
2. Option B (pros/cons)

### Decision
[Chosen option and why]

### Consequences
**Positive:** ...
**Negative:** ...
**Mitigation:** ...

### Review Schedule
[When to revisit this decision]
```

---

**Maintainer:** Monefyi Engineering  
**Last Updated:** 2025-01-15
