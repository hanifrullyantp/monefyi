/**
 * Cookie consent helpers — shared between landing and tests.
 * @module shared/cookie-consent
 */

export const COOKIE_CONSENT_KEY = 'monefyi_cookie_consent';
export const COOKIE_CONSENT_VERSION = 1;

/**
 * @param {string|null|undefined} raw
 * @returns {'accepted'|'rejected'|null}
 */
export function parseCookieConsent(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.v !== COOKIE_CONSENT_VERSION) return null;
    return parsed.choice === 'accepted' || parsed.choice === 'rejected'
      ? parsed.choice
      : null;
  } catch {
    return raw === 'accepted' || raw === 'rejected' ? raw : null;
  }
}

/**
 * @param {'accepted'|'rejected'} choice
 * @returns {string}
 */
export function serializeCookieConsent(choice) {
  return JSON.stringify({
    v: COOKIE_CONSENT_VERSION,
    choice,
    at: new Date().toISOString(),
  });
}

/**
 * @param {'accepted'|'rejected'|null} consent
 * @returns {boolean}
 */
export function shouldLoadAnalytics(consent) {
  return consent === 'accepted';
}

/**
 * @param {Storage|null|undefined} storage
 * @returns {'accepted'|'rejected'|null}
 */
export function readStoredConsent(storage) {
  if (!storage) return null;
  try {
    return parseCookieConsent(storage.getItem(COOKIE_CONSENT_KEY));
  } catch {
    return null;
  }
}

/**
 * @param {Storage|null|undefined} storage
 * @param {'accepted'|'rejected'} choice
 */
export function writeStoredConsent(storage, choice) {
  if (!storage) return;
  try {
    storage.setItem(COOKIE_CONSENT_KEY, serializeCookieConsent(choice));
  } catch { /* ignore quota */ }
}
