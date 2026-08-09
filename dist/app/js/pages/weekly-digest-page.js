/**
 * Weekly digest detail page — current week + history (Sprint 3).
 * @module pages/weekly-digest-page
 */

import { Icon } from '../components/icons.js';
import { loadWeeklyDigestHistory, markDigestViewed } from '../services/weekly-digest-store.js';
import { generateWeeklyDigest } from '../services/weekly-digest.js';

/**
 * @param {object} [opts]
 */
export async function showWeeklyDigestPage(opts = {}) {
  const host = document.createElement('div');
  host.className = 'pro-panel-host weekly-digest-page-host is-visible';
  document.body.appendChild(host);

  const digest = opts.digest || generateWeeklyDigest(window.STATE);
  const history = await loadWeeklyDigestHistory(8);
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

  host.innerHTML = `
    <div class="pro-panel weekly-digest-page" role="dialog" aria-modal="true">
      <div class="pro-panel__head">
        <div>
          <div class="pro-panel__kicker">Pro+ · Mingguan</div>
          <div class="pro-panel__title">Weekly Digest</div>
          <div class="weekly-digest-page__period">${escapeHtml(digest.period_label || '')}</div>
        </div>
        <button type="button" class="pro-panel__close" data-action="close">${Icon('x', { size: 18 })}</button>
      </div>

      <section class="weekly-digest-page__section">
        <h3>Ringkasan</h3>
        <div class="weekly-digest-page__stats">
          <div><span>Pengeluaran</span><strong>Rp ${fmt(digest.week_total)}</strong></div>
          <div><span>vs minggu lalu</span><strong>${escapeHtml(digest.change_label || '—')}</strong></div>
          ${digest.streak != null ? `<div><span>Streak</span><strong>${digest.streak} hari</strong></div>` : ''}
        </div>
      </section>

      ${digest.highlights?.length ? `
        <section class="weekly-digest-page__section">
          <h3>Highlights</h3>
          <ul>${digest.highlights.map((h) => `<li>✅ ${escapeHtml(h)}</li>`).join('')}</ul>
        </section>
      ` : ''}

      ${digest.improvements?.length ? `
        <section class="weekly-digest-page__section">
          <h3>Perlu perhatian</h3>
          <ul>${digest.improvements.map((h) => `<li>⚠️ ${escapeHtml(h)}</li>`).join('')}</ul>
        </section>
      ` : ''}

      ${digest.goals?.length ? `
        <section class="weekly-digest-page__section">
          <h3>Progress goals</h3>
          <ul>${digest.goals.map((g) => `<li>${escapeHtml(g.name)}: ${g.pct}%</li>`).join('')}</ul>
        </section>
      ` : ''}

      ${digest.recommendations?.length ? `
        <section class="weekly-digest-page__section">
          <h3>Action items</h3>
          <ul>${digest.recommendations.map((r) => `<li>💡 ${escapeHtml(r)}</li>`).join('')}</ul>
        </section>
      ` : ''}

      ${history.length > 1 ? `
        <section class="weekly-digest-page__section">
          <h3>Riwayat</h3>
          <ul class="weekly-digest-page__history">
            ${history.slice(1, 6).map((h) => {
              const c = h.content_json || {};
              return `<li>Minggu ${h.week_number}/${h.year} · Rp ${fmt(c.week_total || 0)}</li>`;
            }).join('')}
          </ul>
        </section>
      ` : ''}

      <div class="weekly-digest-page__actions">
        <button type="button" class="pro-panel__submit tap" data-action="advisor">Buka Monevisor</button>
        <button type="button" class="pro-panel__submit tap ghost" data-action="regen">Generate ulang</button>
      </div>
    </div>
  `;

  const close = () => host.remove();
  host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  host.addEventListener('click', (e) => { if (e.target === host) close(); });

  host.querySelector('[data-action="advisor"]')?.addEventListener('click', () => {
    close();
    opts.onAdvisor?.() || window.openAdvisor?.();
  });

  host.querySelector('[data-action="regen"]')?.addEventListener('click', async () => {
    const { saveWeeklyDigest } = await import('../services/weekly-digest-store.js');
    const fresh = generateWeeklyDigest(window.STATE);
    await saveWeeklyDigest(fresh);
    close();
    showWeeklyDigestPage({ ...opts, digest: fresh });
  });

  const current = history[0];
  if (current?.id) markDigestViewed(current.id).catch(() => {});
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

if (typeof window !== 'undefined') {
  window.monefyiWeeklyDigestPage = { showWeeklyDigestPage };
}
