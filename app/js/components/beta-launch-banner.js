/**
 * Beta launch banner — prompts real-user feedback during beta (Sprint 6).
 * @module components/beta-launch-banner
 */

const DISMISS_KEY = 'monefyi_beta_banner_dismissed_until';

/**
 * @returns {Promise<boolean>}
 */
export async function shouldShowBetaBanner() {
  const profile = window.STATE?.db?.profile;
  if (profile?.early_access) return true;
  try {
    const { isFeatureEnabled } = await import('../services/feature-flag-store.js');
    return isFeatureEnabled('beta_feedback');
  } catch {
    return false;
  }
}

/**
 * @returns {boolean}
 */
function isDismissed() {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}

/**
 * Mount dismissible beta banner on home dashboard.
 * @param {HTMLElement} [container]
 */
export async function mountBetaLaunchBanner(container) {
  if (!container || isDismissed()) return;
  if (!(await shouldShowBetaBanner())) return;
  if (container.querySelector('.beta-launch-banner')) return;

  const el = document.createElement('section');
  el.className = 'home-section beta-launch-banner';
  el.innerHTML = `
    <div class="beta-launch-banner__inner">
      <div>
        <div class="beta-launch-banner__title">🧪 Beta Tester</div>
        <div class="beta-launch-banner__body">Terima kasih sudah ikut uji coba! Laporkan bug atau saran lewat Feedback.</div>
      </div>
      <div class="beta-launch-banner__actions">
        <button type="button" class="landing-btn landing-btn--primary landing-btn--sm tap" data-beta-feedback>Kirim Feedback</button>
        <button type="button" class="beta-launch-banner__dismiss tap" data-beta-dismiss aria-label="Tutup">✕</button>
      </div>
    </div>
  `;

  el.querySelector('[data-beta-feedback]')?.addEventListener('click', () => {
    window.location.hash = '#tutorial';
  });
  el.querySelector('[data-beta-dismiss]')?.addEventListener('click', () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch { /* ignore */ }
    el.remove();
  });

  container.prepend(el);
}
