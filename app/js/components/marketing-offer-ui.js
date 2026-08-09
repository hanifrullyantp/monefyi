/**
 * Marketing offer display — modal, banner, sheet, card, toast.
 * @module components/marketing-offer-ui
 */

/**
 * Inline persistent banner for dashboard.
 * @param {object} offer
 * @param {object} [opts]
 * @returns {HTMLElement}
 */
export function renderDashboardBanner(offer, opts = {}) {
  const c = offer.content_json || {};
  const headline = escapeHtml(c.headline || 'Monefyi');
  const body = escapeHtml(c.body || '');
  const cta = escapeHtml(c.cta_text || 'Lihat');

  const el = document.createElement('div');
  el.className = 'marketing-dashboard-banner home-section';
  el.innerHTML = `
    <div class="marketing-dashboard-banner__inner">
      <div class="marketing-dashboard-banner__text">
        <strong>${headline}</strong>
        <span>${body}</span>
      </div>
      <div class="marketing-dashboard-banner__actions">
        <button type="button" class="marketing-dashboard-banner__cta" data-mk-action="cta">${cta}</button>
        <button type="button" class="marketing-dashboard-banner__dismiss" data-mk-action="dismiss" aria-label="Tutup">×</button>
      </div>
    </div>
  `;

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mk-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-mk-action');
    if (action === 'cta') {
      handleCta(c);
      opts.onAction?.('clicked');
    } else if (action === 'dismiss') {
      opts.onAction?.('dismissed');
    }
  });

  return el;
}

/**
 * @param {object} offer
 * @param {object} [opts]
 * @returns {Promise<string|null>} action taken
 */
export function showMarketingOffer(offer, opts = {}) {
  const content = offer.content_json || {};
  const format = content.display_format || 'modal';

  return new Promise((resolve) => {
    const onAction = (action) => {
      opts.onAction?.(action);
      cleanup();
      resolve(action);
    };

    let host = null;
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      host?.remove();
      document.body.classList.remove('marketing-offer-open');
    };

    host = document.createElement('div');
    host.className = `marketing-offer-host marketing-offer-host--${format}`;
    host.innerHTML = renderOfferHtml(offer, format);

    document.body.appendChild(host);
    document.body.classList.add('marketing-offer-open');

    requestAnimationFrame(() => host?.classList.add('is-open'));

    if (opts.autoDismissMs > 0) {
      timer = setTimeout(() => onAction('dismissed'), opts.autoDismissMs);
    }

    host.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-mk-action]');
      if (!btn) {
        if (e.target.classList.contains('marketing-offer-backdrop')) onAction('dismissed');
        return;
      }
      const action = btn.getAttribute('data-mk-action');
      if (action === 'cta') {
        handleCta(content);
        onAction('clicked');
      } else if (action === 'dismiss') {
        onAction('dismissed');
      } else if (action === 'not_interested') {
        onAction('not_interested');
      }
    });
  });
}

/**
 * @param {object} offer
 * @param {string} format
 * @returns {string}
 */
function renderOfferHtml(offer, format) {
  const c = offer.content_json || {};
  const headline = escapeHtml(c.headline || 'Monefyi');
  const body = escapeHtml(c.body || '');
  const cta = escapeHtml(c.cta_text || 'Lihat Detail');
  const dismiss = escapeHtml(c.dismiss_label || 'Nanti');

  const actions = `
    <div class="marketing-offer__actions">
      <button type="button" class="marketing-offer__btn ghost" data-mk-action="dismiss">${dismiss}</button>
      <button type="button" class="marketing-offer__btn primary" data-mk-action="cta">${cta}</button>
    </div>
  `;

  const inner = `
    <div class="marketing-offer__panel" role="dialog" aria-modal="true">
      <button type="button" class="marketing-offer__close" data-mk-action="dismiss" aria-label="Tutup">×</button>
      <h2 class="marketing-offer__headline">${headline}</h2>
      <p class="marketing-offer__body">${body}</p>
      ${actions}
      <button type="button" class="marketing-offer__ni" data-mk-action="not_interested">Tidak tertarik</button>
    </div>
  `;

  if (format === 'banner') {
    return `<div class="marketing-offer-backdrop marketing-offer-backdrop--banner"><div class="marketing-offer__banner">${inner.replace('marketing-offer__panel', 'marketing-offer__panel marketing-offer__panel--banner')}</div></div>`;
  }
  if (format === 'card') {
    return `<div class="marketing-offer-backdrop marketing-offer-backdrop--inline"><div class="marketing-offer__card">${inner.replace('marketing-offer__panel', 'marketing-offer__panel marketing-offer__panel--card')}</div></div>`;
  }
  if (format === 'toast') {
    return `<div class="marketing-offer-backdrop marketing-offer-backdrop--toast"><div class="marketing-offer__toast">${inner.replace('marketing-offer__panel', 'marketing-offer__panel marketing-offer__panel--toast')}</div></div>`;
  }
  if (format === 'sheet') {
    return `<div class="marketing-offer-backdrop"><div class="marketing-offer__sheet">${inner.replace('marketing-offer__panel', 'marketing-offer__panel marketing-offer__panel--sheet')}</div></div>`;
  }
  return `<div class="marketing-offer-backdrop"><div class="marketing-offer__modal">${inner}</div></div>`;
}

/**
 * @param {object} content
 */
function handleCta(content) {
  const action = content.cta_action;
  if (action === 'open_settings_household') {
    window.openSettings?.('account');
    return;
  }
  if (action === 'open_neraca') {
    window.openNeraca?.();
    return;
  }
  const url = content.cta_url || '#paket';
  if (url.startsWith('#')) {
    if (url === '#paket' || url.includes('paket')) {
      window.openUpgradeSheet?.({ featureKey: 'upgrade' })
        || window.openSettings?.('account');
    } else {
      location.hash = url.replace(/^#/, '');
    }
    return;
  }
  window.open(url, '_blank', 'noopener');
}

/**
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
