/**
 * UTM / referral capture + acquisition_events logging.
 * @module services/acquisition
 */

const STORAGE_KEY = 'monefyi_acq_first_touch';

/**
 * Capture first-touch UTM/ref from URL into localStorage.
 */
export function captureAcquisitionFromUrl(search = typeof location !== 'undefined' ? location.search : '') {
  try {
    const params = new URLSearchParams(search);
    const utm_source = params.get('utm_source') || '';
    const utm_medium = params.get('utm_medium') || '';
    const utm_campaign = params.get('utm_campaign') || '';
    const ref_code = params.get('ref') || params.get('referral') || '';
    if (!utm_source && !ref_code) return getStoredAcquisition();
    const existing = getStoredAcquisition();
    if (existing?.captured_at) return existing;
    const payload = {
      utm_source,
      utm_medium,
      utm_campaign,
      ref_code,
      captured_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
  } catch (_) {
    return null;
  }
}

export function getStoredAcquisition() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Log event to Supabase acquisition_events (best-effort).
 * @param {string} event
 * @param {object} [extra]
 */
export async function logAcquisitionEvent(event, extra = {}) {
  const touch = getStoredAcquisition() || {};
  const body = {
    event,
    utm_source: touch.utm_source || extra.utm_source || null,
    utm_medium: touch.utm_medium || extra.utm_medium || null,
    utm_campaign: touch.utm_campaign || extra.utm_campaign || null,
    ref_code: touch.ref_code || extra.ref_code || null,
    email: extra.email || null,
    user_id: extra.user_id || window.STATE?.db?.user?.id || null,
    meta: extra.meta || {},
  };

  try {
    const supa = window.STATE?.db?.supa;
    if (supa) {
      await supa.from('acquisition_events').insert(body);
      return { success: true };
    }
  } catch (e) {
    console.warn('[acq] insert failed', e);
  }

  // Fallback: edge function if RLS blocks anon insert
  try {
    const cfg = window.MONEFYI_CONFIG || {};
    const url = `${String(cfg.supabaseUrl || '').replace(/\/+$/, '')}/functions/v1/monefyi-track-event`;
    if (!cfg.supabaseUrl) return { success: false };
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey || '',
        Authorization: `Bearer ${cfg.supabaseAnonKey || ''}`,
      },
      body: JSON.stringify(body),
    });
    return { success: true };
  } catch (_) {
    return { success: false };
  }
}

/**
 * Append UTM/ref to a checkout URL when possible.
 */
export function decorateCheckoutUrl(url) {
  if (!url) return url;
  try {
    const touch = getStoredAcquisition();
    if (!touch) return url;
    const u = new URL(url, location.origin);
    if (touch.utm_source) u.searchParams.set('utm_source', touch.utm_source);
    if (touch.utm_medium) u.searchParams.set('utm_medium', touch.utm_medium);
    if (touch.utm_campaign) u.searchParams.set('utm_campaign', touch.utm_campaign);
    if (touch.ref_code) u.searchParams.set('ref', touch.ref_code);
    return u.toString();
  } catch (_) {
    return url;
  }
}

if (typeof window !== 'undefined') {
  window.monefyiAcquisition = {
    captureAcquisitionFromUrl,
    getStoredAcquisition,
    logAcquisitionEvent,
    decorateCheckoutUrl,
  };
  try { captureAcquisitionFromUrl(); } catch (_) { /* ignore */ }
}
