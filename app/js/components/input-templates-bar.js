/**
 * Quick input template chips above parse field (Growth Fase 2.5).
 * @module components/input-templates-bar
 */

/**
 * @param {HTMLElement} container
 * @param {HTMLInputElement} inputEl
 * @param {object} [state]
 */
export async function mountInputTemplatesBar(container, inputEl, state = window.STATE) {
  if (!container || !inputEl || container.querySelector('.input-templates-bar')) return;

  const { getQuickInputTemplates, getTimeBasedSuggestion } = await import('../services/input-templates.js');
  const templates = getQuickInputTemplates(state, 3);
  const timeSuggestion = getTimeBasedSuggestion();
  const items = timeSuggestion ? [timeSuggestion, ...templates].slice(0, 4) : templates;
  if (!items.length) return;

  const bar = document.createElement('div');
  bar.className = 'input-templates-bar';
  bar.innerHTML = items.map((t) => `
    <button type="button" class="input-template-chip tap" data-text="${escapeHtml(t.text)}">${escapeHtml(t.text)}</button>
  `).join('');

  bar.querySelectorAll('.input-template-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      inputEl.value = btn.getAttribute('data-text') || '';
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.focus();
    });
  });

  container.insertBefore(bar, inputEl);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
