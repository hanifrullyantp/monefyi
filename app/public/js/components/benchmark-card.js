/**
 * Anonymous benchmark comparison card (Fase 5.1).
 * @module components/benchmark-card
 */

/**
 * @param {object} benchmark from computeAnonymousBenchmark
 * @param {object} [callbacks]
 * @returns {HTMLElement}
 */
export function renderBenchmarkCard(benchmark, callbacks = {}) {
  const el = document.createElement('section');
  el.className = 'home-section benchmark-card';

  el.innerHTML = `
    <div class="benchmark-card__inner">
      <div class="benchmark-card__head">
        <span>📊</span>
        <div>
          <div class="benchmark-card__title">Bandingkan Anonim${benchmark.cohort_live ? ' · Live' : ''}</div>
          <div class="benchmark-card__cohort">${escapeHtml(benchmark.cohort_label)}</div>
        </div>
      </div>
      <div class="benchmark-card__metrics">
        ${(benchmark.metrics || []).map((m) => `
          <div class="benchmark-metric benchmark-metric--${m.status}">
            <div class="benchmark-metric__label">${escapeHtml(m.label)}</div>
            <div class="benchmark-metric__values">
              <span class="benchmark-metric__yours">${m.yours}${m.unit}</span>
              <span class="benchmark-metric__vs">vs</span>
              <span class="benchmark-metric__peers">${m.peers}${m.unit} peer</span>
            </div>
          </div>
        `).join('')}
      </div>
      <p class="benchmark-card__note">${escapeHtml(benchmark.sample_note)}</p>
      ${callbacks.onSettings ? `
        <button type="button" class="benchmark-card__settings tap">Kelola privasi</button>
      ` : ''}
    </div>
  `;

  el.querySelector('.benchmark-card__settings')?.addEventListener('click', () => {
    callbacks.onSettings?.();
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
