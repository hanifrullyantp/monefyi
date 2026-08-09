/**
 * Client for compliance edge functions (emails + purge trigger).
 * @module services/compliance-client
 */

/**
 * @returns {string}
 */
function supabaseUrl() {
  return window.MONEFYI_CONFIG?.supabaseUrl || window.STATE?.db?.url || '';
}

/**
 * @returns {string|null}
 */
function accessToken() {
  return window.STATE?.db?.session?.access_token
    || window.STATE?.session?.access_token
    || null;
}

/**
 * @param {string} fnName
 * @param {object} body
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function invokeComplianceFunction(fnName, body = {}) {
  const base = String(supabaseUrl()).replace(/\/+$/, '');
  const token = accessToken();
  if (!base || !token) {
    return { success: false, error: 'offline' };
  }

  try {
    const res = await fetch(`${base}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || res.statusText };
    }
    return { success: true, data };
  } catch (e) {
    console.warn('[compliance-client]', fnName, e);
    return { success: false, error: e.message || 'network error' };
  }
}

/**
 * @param {string} action
 * @param {object} [payload]
 * @returns {Promise<void>}
 */
export async function notifyCompliance(action, payload = {}) {
  const fn = window.MONEFYI_CONFIG?.fnComplianceNotify || 'monefyi-compliance-notify';
  await invokeComplianceFunction(fn, { action, ...payload });
}
