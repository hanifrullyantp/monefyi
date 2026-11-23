import { isDemoEmbedActive } from './demoMode';

export type DemoAnalyticsEvent =
  | 'demo_loaded'
  | 'demo_first_interaction'
  | 'demo_scroll_depth'
  | 'demo_detail_opened'
  | 'demo_item_edited'
  | 'demo_item_added'
  | 'demo_wa_click'
  | 'demo_pdf_view'
  | 'demo_cta_click'
  | 'demo_reset'
  | 'demo_time_engaged';

type DemoPayload = Record<string, string | number | boolean | undefined>;

function parentOrigin(): string {
  if (typeof document === 'undefined') return '';
  try {
    if (document.referrer) return new URL(document.referrer).origin;
  } catch {
    /* ignore */
  }
  return window.location.origin;
}

/** Kirim ke parent landing (postMessage) + console di dev. */
export function trackDemoEvent(name: DemoAnalyticsEvent, payload: DemoPayload = {}): void {
  if (!isDemoEmbedActive()) return;
  const body = { type: 'monefyi-demo', event: name, is_demo: true, ...payload };
  if (process.env.NODE_ENV === 'development') {
    console.debug('[demo-analytics]', body);
  }
  const target = parentOrigin();
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(body, target || '*');
  }
}
