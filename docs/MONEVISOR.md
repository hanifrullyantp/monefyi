# Monevisor — Dokumentasi Produk & Pengembangan

> **Monevisor** = **Sahabat Keuangan AI** di Monefyi PWA (`monefyi.com/app`).  
> Conversational, storytelling, actionable, personal, proactive.  
> Terakhir diperbarui: Juli 2026 (UVP redesign).

---

## 1. Positioning

| Aspek | Monefyi core | Monevisor |
|-------|--------------|-----------|
| Input | Catat transaksi | — |
| Struktur | Budget + prioritas | Story + insight + aksi |
| Insight | Dashboard | Narasi + health journey + chat |
| Aksi | Simpan / edit | One-tap apply, realokasi, tanya lanjut |

**Prinsip:** Data → bahasa manusia → 1–3 langkah konkret.

---

## 2. Arsitektur (UVP)

```
openAdvisor / openAdvisorAuto
        │
        ▼
 monevisor-page.js  (full tab page: report primary + collapsible chat)
        │
        ├─ financial-report.js (offline metrics / breakdown / trends)
        └─ monevisor-client.js (insights + chat + apply)
             ├─ online → monefyi-generate-insights / ai-user-coach / monevisor-apply-action
             └─ offline → monevisor-heuristic.js (same response shape)
        │
        ▼
 Local apply via STATE.budgetsByMonth + saveBudgetRowsLocal / saveBudgetMonth
```

### Frontend

| File | Peran |
|------|-------|
| `app/js/pages/monevisor-page.js` | Full-page UI (report + collapsible chat) |
| `app/js/services/financial-report.js` | Offline financial report from STATE / data-store |
| `app/css/monevisor-page.css` | Page styles |
| `app/js/components/monevisor-panel.js` | Legacy overlay panel (unused by main nav) |
| `app/js/services/monevisor-client.js` | Client unified + offline-first |
| `app/js/services/monevisor-heuristic.js` | Fallback lokal |
| `app/css/monevisor-panel.css` | Legacy panel styles |
| `app/js/app.js` | `openAdvisor` → monevisor page tab; warm-up client |

### Backend

| Edge function | Peran |
|---------------|-------|
| `monefyi-generate-insights` | Story + healthTrend + insights[] + actions (legacy fields kept) |
| `ai-user-coach` | Chat + history (`monevisor_messages`) + prefs + quick_replies |
| `monevisor-apply-action` | One-tap apply (budgets categories.rows) |

### Tables (migration `20260801_monevisor_enhance.sql`)

- `monevisor_messages` — chat persistence
- `monevisor_prefs` — goals, tone, learned facts
- `monevisor_actions` — audit log apply

---

## 3. Response shape (insights)

Enhanced (backward compatible):

- `greeting`, `story`, `healthScore`, `healthLabel`, `healthTrend`, `healthMessage`
- `insights[]` with optional `action: { type, label, payload }`
- `budgetRecommendations[]` with `impact` + `action`
- `suggested_questions[]`, `disclaimer`
- Legacy: `summary`, `bullets`, `tips`, `alerts`, `metrics`, `source`

---

## 4. Offline

- Generate: heuristic fallback (same shape)
- Apply budget: local draft via `saveBudgetRowsLocal` / `window.saveBudgetMonth`
- Chat: requires network (clear offline message)

---

## 5. Deep links

- Budget evaluation → `openAdvisorAuto({ focus: 'over', prefillMessage })`
- Notification `ask_monevisor` → same with budget context

---

## 6. Legal

Bukan nasihat keuangan berlisensi (OJK). Disclaimer di response + panel.

---

*Update dokumen ini saat kontrak edge function atau panel berubah.*
