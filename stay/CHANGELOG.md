# CHANGELOG — Front Desk Redesign (STAY)

Semua perubahan redesign Front Desk Monefyi STAY, dari Phase 1 hingga Phase 6.

## Phase 6 — UX Polish (Agustus 2026)

### Animasi & Transisi
- Stagger animation saat first load grid (FloorGroup + RoomCard via Framer Motion)
- Smooth transition antar view mode (Grid / Denah / Timeline) dengan `AnimatePresence`
- Card status change: fade + ripple effect (`room-status-ripple`)
- Panel open/close: spring animation (Sheet — Phase 4)
- Micro-bounce pada tombol aksi (`btn-micro-bounce`)
- Skeleton loading dengan shimmer (`frontdesk-shimmer`)
- Toggle **Animasi UI** di preferensi — respect `prefers-reduced-motion`

### Sound Effects
- `src/utils/sounds.ts` — ting, success, error, click
- Web Audio fallback + optional MP3 di `public/sounds/`
- Toggle suara + volume slider di preferensi

### Keyboard Shortcuts
- `src/hooks/useKeyboardShortcuts.ts`
- `N` booking baru · `S`/`/` search · `F` filter · `1/2/3` view · `Esc` close · `?` cheat sheet · `⌘K` command palette
- `src/components/common/KeyboardShortcutsDialog.tsx`

### Command Palette
- `src/components/common/CommandPalette.tsx` (cmdk)
- Search kamar, tamu, perintah cepat, recent actions

### Notification Center
- `src/components/frontdesk/NotificationCenter.tsx`
- Bell icon + badge di header
- Kategori: booking, payment, housekeeping, system
- Mark all read · click navigasi ke konteks

### Toast System Enhancement
- Variants: success, error, warning, info, urgent
- Branding STAY · action buttons · progress bar
- Queue max 4 toasts · auto-dismiss per variant

### Loading & Caching
- `src/hooks/useFrontDeskData.ts` — react-query cache untuk room cards
- Progressive skeleton grid
- Optimistic updates (Phase 4 `useRoomActions`)

### Empty States
- `src/components/common/EmptyStates.tsx`
- no-rooms · no-bookings · no-search-results · all-occupied · no-urgent

### Error Boundaries
- `src/components/common/ErrorBoundary.tsx`
- Pesan Bahasa Indonesia · Coba Lagi · Laporkan Bug

### Dark Mode
- Class-based `@custom-variant dark` di `phase6-polish.css`
- Toggle di header Front Desk
- Persist di `frontDeskPreferencesStore`

### Print Styles
- `src/styles/print.css` — format denah kamar, hide UI controls

### Analytics (Local)
- `src/utils/frontDeskAnalytics.ts` — view mode, actions, panel duration, error rate
- Ringkasan di halaman preferensi
- *(Dashboard stats tetap di `src/utils/analytics.ts`)*

### Settings
- `/settings/frontdesk-preferences` — animasi, suara, shortcuts, dark mode, volume

---

## Phase 5 — Floor Plan + Timeline

- `FloorPlanView`, `FloorCanvas`, `RoomShape`, `FloorPlanEditor`
- `TimelineView`, `TimelineRow`, `BookingBar`
- `useTimelineNavigation`, `useTimelineData`
- View mode toggle: Grid / Denah / Timeline
- `react-zoom-pan-pinch` untuk zoom/pan denah
- Migration `floor_plan_position JSONB`

---

## Phase 4 — Room Detail Panel

- `RoomDetailPanel` — side panel / bottom sheet
- Sections: GuestInfo, StayTimeline, Payment, Facilities, Activity, QuickActions
- `frontDeskStore` — selectedRoom, isDetailPanelOpen
- `useRoomActions` — mock handlers + toast + optimistic update
- Payment modal terintegrasi

---

## Phase 3 — Header Redesign

- `FrontDeskHeader` — greeting personal + live clock
- Quick stats grid (6 metrik)
- `UrgentActionBar` — aksi urgent dengan dismiss
- `ViewModeToggle`, `QuickSearchInput`
- `useLiveClock`, `useUrgentActions`, `useRoomFilters`

---

## Phase 2 — Room Card Grid

- `RoomCard` — rich card dengan status, guest, progress, indicators
- `RoomGridView`, `FloorGroup`, `RoomCardBadge`, `RoomCardProgress`
- `GuestAvatar`, filter & search, card size preference
- `mapRoomsToCardData`, `roomStatus` utilities
- Front desk theme tokens (`frontdesk-theme.css`)

---

## Phase 1 — Foundation

- Routing `/front-desk` sebagai default setelah login
- `ReceptionistDashboard` shell
- Zustand `appStore` + mock data
- Role-based access (receptionist, manager, owner)
- E2E smoke tests Playwright

---

## Dependencies Added (Redesign)

| Package | Phase |
|---------|-------|
| `framer-motion` | 2 |
| `react-zoom-pan-pinch` | 5 |
| `cmdk` | 6 |
| `@tanstack/react-query` | 6 |

---

## Breaking / Migration Notes

- Modal checkout lama di `FrontDeskPage` dihapus — gunakan Room Detail Panel
- Preferensi tersebar di localStorage kini terpusat di `stay-frontdesk-preferences`
- Dark mode: class `dark` on `<html>`, bukan `prefers-color-scheme` saja
