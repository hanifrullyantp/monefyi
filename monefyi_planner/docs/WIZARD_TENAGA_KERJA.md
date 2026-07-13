# Wizard Modal "Tambah Tenaga Kerja"

Parallel entry to `LaborPlannerModal` in Tab RAP. Wizard is **on by default**; rollback via `localStorage.setItem('useLaborWizard', '0')` or `VITE_LABOR_WIZARD=false`.

## Local URLs

```bash
cd monefyi_planner && npm run dev
```

| Resource | URL |
|----------|-----|
| Desktop preview (Phase 1) | http://localhost:5173/preview-wizard-tenaga-desktop.html |
| Mobile preview (Phase 1) | http://localhost:5173/preview-wizard-tenaga-mobile.html |
| Dev component demo | http://localhost:5173/app/dev/wizard-tenaga |
| Production entry | Tab RAP → Tenaga Kerja → `+ Tambah` or calendar icon |

## Parity Matrix: Wizard vs LaborPlannerModal

| Feature | LaborPlannerModal | LaborTenagaWizardModal | Notes |
|---------|-------------------|------------------------|-------|
| Pilih karyawan HR | `LaborWorkerPicker` | Step 1 `EmployeeSelector` | Search + keyboard nav (desktop) |
| Tambah ke HR | `createHrMemberQuick` | Same | Owner/manager only |
| Jabatan | Inline field | Step 2 text input | |
| Tarif (hari/jam/bulan) | Dropdown + Rp | Step 2 `RateCard` + chips | Maps to `LaborRateType` |
| Planning / Realisasi | Toggle + `LaborCalendarGrid` | Step 3 `MultiDatePicker` | Same `LaborSlotKind` |
| Detail per hari (½ hari, lembur) | `LaborDayEditor` | Context menu / pencil (wide) | Reuses `LaborDayEditor` |
| Drag-select tanggal | Desktop calendar | Desktop `MultiDatePicker` | |
| Import absensi | Button in modal | Step 3 import button | `mapAttendanceToActualSlots` |
| Edit existing RAP item | `editItem` prop | Same prop + `loadLaborSlots` | |
| Save flow | create/update RAP + slots + budget sync | Identical services | |
| Mobile bottom sheet | Responsive modal | `useWizardVariant` mobile | 92vh, safe-area |
| Wide split layout (≥1440px) | Single column | Calendar 60% + date list 40% | |
| Keyboard Esc / Ctrl+S | Partial | `WizardShell` full | Enter = next on desktop |

## Known Gaps (post-MVP)

- Long-press day detail on mobile: basic tap opens editor; long-press polish optional
- Swipe month on mobile: uses prev/next buttons (no gesture yet)
- Hardcoded rate tips per jabatan (can enrich from compensation history later)

## Legacy Modal Bugs (record only, not fixed)

- Dense single-screen layout harder to scan on mobile
- No step validation gates — user can save with incomplete worker/rate in some edge paths
- Calendar + worker picker compete for vertical space on small screens

## Manual Test Checklist (Phase 5)

### Desktop (1280px)

- [ ] Open wizard from Tab RAP `+ Tambah`
- [ ] Step 1→2→3 navigation; Back preserves data
- [ ] Search worker, select, optional "Tambah ke HR"
- [ ] Rate cards + suggestion chips
- [ ] Calendar drag-select; right-click → day editor
- [ ] Ctrl+S saves on step 3
- [ ] Esc prompts close
- [ ] Saved item appears in Tenaga Kerja table; reload persists

### Mobile (390px)

- [ ] Bottom sheet opens with drag handle
- [ ] Tap targets ≥44px
- [ ] Footer safe-area; no overlap with keyboard
- [ ] Planning/Realisasi toggle + date pick
- [ ] Save → data in RAP

### Responsive

- [ ] Resize 1280→390: state preserved, no flicker
- [ ] Tablet 820px: centered modal ~90vw

### Edit mode

- [ ] Open existing labor row → wizard pre-fills worker, rate, slots
- [ ] Update slots → totals sync in RAP

## Rollback

```js
localStorage.setItem('useLaborWizard', '0'); // legacy LaborPlannerModal
localStorage.setItem('useLaborWizard', '1'); // wizard (default)
```

## Migration (after approval)

1. Remove `shouldUseLaborWizard` branch; always render wizard
2. Deprecate `LaborPlannerModal` or redirect edit-only flows
3. Remove dev demo route and parallel flag
