/**
 * Predictive alerts + daily micro-insight bar (Growth Fase 1).
 * @module components/growth-alerts-bar
 */

/**
 * @param {object} [state]
 * @param {object} [callbacks]
 * @returns {Promise<HTMLElement|null>}
 */
export async function renderGrowthAlertsBar(state = window.STATE, callbacks = {}) {
  const { generatePredictiveAlerts, dismissPredictiveAlert } = await import('../services/predictive-alerts.js');
  const { getDailyDashboardInsight } = await import('../services/contextual-micro-insights.js');

  const alerts = generatePredictiveAlerts(state);
  const daily = getDailyDashboardInsight(state);
  if (!alerts.length && !daily) return null;

  const el = document.createElement('section');
  el.className = 'home-section growth-alerts-bar';

  const items = [];
  if (daily) items.push({ ...daily, dismissible: false });
  alerts.forEach((a) => items.push({ ...a, dismissible: true }));

  const visible = items.slice(0, 2);

  el.innerHTML = visible.map((item, i) => `
    <div class="growth-alert growth-alert--${item.severity || 'info'}" data-idx="${i}" data-id="${escapeHtml(item.id || '')}">
      <div class="growth-alert__icon">${item.icon || '💡'}</div>
      <div class="growth-alert__body">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.body)}</p>
        ${item.actions?.length ? `
          <div class="growth-alert__actions">
            ${item.actions.map((act) => `
              <button type="button" class="growth-alert__btn tap" data-act="${escapeHtml(act.target)}">${escapeHtml(act.label)}</button>
            `).join('')}
          </div>
        ` : ''}
      </div>
      ${item.dismissible ? `<button type="button" class="growth-alert__dismiss tap" data-dismiss aria-label="Tutup">✕</button>` : ''}
    </div>
  `).join('');

  el.querySelectorAll('[data-dismiss]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.growth-alert');
      const id = row?.getAttribute('data-id');
      if (id) dismissPredictiveAlert(id, 48);
      row?.remove();
      if (!el.querySelector('.growth-alert')) el.remove();
    });
  });

  el.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-act');
      if (target === 'budget') callbacks.onViewBudget?.();
      else if (target === 'advisor') callbacks.onViewAdvisor?.();
      else if (target === 'emergency') {
        import('../services/emergency-mode.js').then(({ setEmergencyMode }) => {
          setEmergencyMode(true, 'predictive_alert');
          if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
        });
      } else if (target === 'goals') callbacks.onViewGoals?.() || callbacks.onViewTarget?.();
      else if (target === 'whatif') {
        import('./what-if-simulator.js').then(({ showWhatIfSimulator }) => {
          showWhatIfSimulator({ onNeedTarget: callbacks.onViewTarget });
        });
      }
    });
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
