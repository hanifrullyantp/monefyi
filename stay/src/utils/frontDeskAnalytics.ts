export type AnalyticsEvent =
  | 'view_mode_change'
  | 'room_panel_open'
  | 'room_panel_close'
  | 'room_inline_edit_start'
  | 'room_inline_edit_save'
  | 'room_inline_edit_cancel'
  | 'action_executed'
  | 'action_error'
  | 'command_palette_open'
  | 'keyboard_shortcut_used'
  | 'notification_click'
  | 'search_query';

export interface AnalyticsPayload {
  [key: string]: string | number | boolean | undefined;
}

const STORAGE_KEY = 'stay-frontdesk-analytics';
const MAX_EVENTS = 500;

interface StoredEvent {
  event: AnalyticsEvent;
  payload: AnalyticsPayload;
  timestamp: string;
}

function readEvents(): StoredEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistEvents(events: StoredEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* ignore quota */
  }
}

/**
 * Track interaksi front desk untuk improvement UX (local-only, privacy-safe).
 */
export function trackFrontDeskEvent(
  event: AnalyticsEvent,
  payload: AnalyticsPayload = {}
): void {
  if (import.meta.env.DEV) {
    console.debug('[STAY Front Desk Analytics]', event, payload);
  }
  const entry: StoredEvent = {
    event,
    payload,
    timestamp: new Date().toISOString(),
  };
  persistEvents([...readEvents(), entry]);
}

/** Ringkasan untuk debugging / halaman preferensi */
export function getFrontDeskAnalyticsSummary(): {
  viewModeCounts: Record<string, number>;
  actionCounts: Record<string, number>;
  errorRate: number;
  avgPanelDurationMs: number;
} {
  const events = readEvents();
  const viewModeCounts: Record<string, number> = {};
  const actionCounts: Record<string, number> = {};
  let actions = 0;
  let errors = 0;
  const panelDurations: number[] = [];
  let panelOpenTime: number | null = null;

  for (const e of events) {
    switch (e.event) {
      case 'view_mode_change':
        viewModeCounts[String(e.payload.mode)] =
          (viewModeCounts[String(e.payload.mode)] ?? 0) + 1;
        break;
      case 'action_executed':
        actions += 1;
        actionCounts[String(e.payload.action)] =
          (actionCounts[String(e.payload.action)] ?? 0) + 1;
        break;
      case 'action_error':
        errors += 1;
        break;
      case 'room_panel_open':
        panelOpenTime = new Date(e.timestamp).getTime();
        break;
      case 'room_panel_close':
        if (panelOpenTime) {
          panelDurations.push(new Date(e.timestamp).getTime() - panelOpenTime);
          panelOpenTime = null;
        }
        break;
      default:
        break;
    }
  }

  const avgPanelDurationMs =
    panelDurations.length > 0
      ? Math.round(panelDurations.reduce((a, b) => a + b, 0) / panelDurations.length)
      : 0;

  return {
    viewModeCounts,
    actionCounts,
    errorRate: actions > 0 ? Math.round((errors / actions) * 100) / 100 : 0,
    avgPanelDurationMs,
  };
}
