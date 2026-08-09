/**
 * Landing cookie consent banner + deferred Meta Pixel load.
 */
import {
  readStoredConsent,
  writeStoredConsent,
  shouldLoadAnalytics,
} from '../../shared/cookie-consent.js';

const DEFAULT_META_PIXEL_ID = '1530674178146899';

/**
 * @param {string} pixelId
 */
export function loadMetaPixel(pixelId = DEFAULT_META_PIXEL_ID) {
  if (typeof window === 'undefined' || window.fbq) return;
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

/**
 * @param {object} [opts]
 * @param {() => void} [opts.onAccept]
 */
export function mountCookieConsentBanner(opts = {}) {
  if (typeof document === 'undefined') return;
  const storage = window.localStorage;
  const existing = readStoredConsent(storage);
  if (existing) {
    if (shouldLoadAnalytics(existing)) {
      loadMetaPixel();
      opts.onAccept?.();
    }
    return;
  }
  if (document.getElementById('monefyi-cookie-consent')) return;

  const el = document.createElement('div');
  el.id = 'monefyi-cookie-consent';
  el.className = 'cookie-consent';
  el.innerHTML = `
    <div class="cookie-consent__inner">
      <p class="cookie-consent__text">
        Kami memakai cookie/analytics (Meta Pixel) untuk mengukur iklan & konversi.
        <a href="/privacy.html" class="cookie-consent__link">Kebijakan Privasi</a>
      </p>
      <div class="cookie-consent__actions">
        <button type="button" class="cookie-consent__btn cookie-consent__btn--ghost" data-cookie-reject>Hanya esensial</button>
        <button type="button" class="cookie-consent__btn cookie-consent__btn--primary" data-cookie-accept>Terima analytics</button>
      </div>
    </div>
  `;

  const close = (choice) => {
    writeStoredConsent(storage, choice);
    el.remove();
    if (choice === 'accepted') {
      loadMetaPixel();
      opts.onAccept?.();
    }
  };

  el.querySelector('[data-cookie-accept]')?.addEventListener('click', () => close('accepted'));
  el.querySelector('[data-cookie-reject]')?.addEventListener('click', () => close('rejected'));
  document.body.appendChild(el);
}

if (typeof window !== 'undefined') {
  window.MonefyiCookieConsent = {
    loadMetaPixel,
    mountCookieConsentBanner,
    hasAnalyticsConsent: () => shouldLoadAnalytics(readStoredConsent(window.localStorage)),
  };
}
