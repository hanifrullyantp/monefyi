/**
 * Money personality quiz sheet (Fase 8.1).
 * @module components/money-personality-quiz
 */

import {
  PERSONALITY_QUESTIONS,
  computePersonalityResult,
  savePersonalityResult,
  loadPersonalityResult,
} from '../services/money-personality.js';
import { applyPersonalityDefaults, PERSONALITY_ACTIONS } from '../services/personality-personalization.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export async function showMoneyPersonalityQuiz(opts = {}) {
  if (loadPersonalityResult() && !opts.retake) {
    showPersonalityResult(loadPersonalityResult(), opts);
    return;
  }

  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'personalityQuizHost';
    _host.className = 'innovation-host';
    document.body.appendChild(_host);
  }

  /** @type {Record<string, string>} */
  const answers = {};
  let step = 0;

  const render = () => {
    const q = PERSONALITY_QUESTIONS[step];
    _host.innerHTML = `
      <div class="innovation-sheet" role="dialog" aria-modal="true">
        <div class="innovation-sheet__head">
          <div class="innovation-sheet__kicker">Money Personality · ${step + 1}/${PERSONALITY_QUESTIONS.length}</div>
          <button type="button" class="innovation-sheet__close" data-action="close">×</button>
        </div>
        <h3 class="innovation-sheet__title">${escapeHtml(q.text)}</h3>
        <div class="innovation-options">
          ${q.options.map((opt, i) => `
            <button type="button" class="innovation-option tap" data-idx="${i}">${escapeHtml(opt.label)}</button>
          `).join('')}
        </div>
      </div>
    `;
    _host.classList.add('is-visible');
    _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
    _host.querySelectorAll('[data-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        answers[q.id] = btn.getAttribute('data-idx');
        step += 1;
        if (step >= PERSONALITY_QUESTIONS.length) {
          const result = savePersonalityResult(computePersonalityResult(answers));
          applyPersonalityDefaults(result);
          showPersonalityResult(result, opts);
        } else {
          render();
        }
      });
    });
  };

  render();
}

/**
 * @param {object} result
 * @param {object} [opts]
 */
function showPersonalityResult(result, opts = {}) {
  if (!_host) return;
  const actions = PERSONALITY_ACTIONS[result.type_id] || PERSONALITY_ACTIONS.balanced;
  _host.innerHTML = `
    <div class="innovation-sheet" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">Hasil Tes</div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
      <div class="personality-result">
        <div class="personality-result__icon">${result.icon}</div>
        <div class="personality-result__name">${escapeHtml(result.name)}</div>
        <div class="personality-result__tag">${escapeHtml(result.tagline)}</div>
        <p class="personality-result__strategy">${escapeHtml(result.strategy)}</p>
        <div class="personality-result__features">
          ${(result.features || []).map((f) => `<span class="innovation-chip">${escapeHtml(f)}</span>`).join('')}
        </div>
        <p class="innovation-sheet__hint">Personalisasi diterapkan: Impulse Guard & rekomendasi fitur disesuaikan tipemu.</p>
        <div class="personality-result__actions">
          ${actions.map((a) => `
            <button type="button" class="innovation-btn innovation-btn--ghost tap" data-personality-act="${escapeHtml(a.action)}">${escapeHtml(a.label)}</button>
          `).join('')}
        </div>
        <button type="button" class="innovation-btn tap" data-action="done">Selesai</button>
        <button type="button" class="innovation-btn innovation-btn--ghost tap" data-action="retake">Ulangi tes</button>
      </div>
    </div>
  `;
  _host.classList.add('is-visible');
  _host.querySelector('[data-action="close"]')?.addEventListener('click', () => {
    close();
    opts.onComplete?.(result);
  });
  _host.querySelector('[data-action="done"]')?.addEventListener('click', () => {
    close();
    opts.onComplete?.(result);
  });
  _host.querySelectorAll('[data-personality-act]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { runPersonalityAction } = await import('../services/personality-personalization.js');
      await runPersonalityAction(btn.getAttribute('data-personality-act'), opts);
    });
  });
  _host.querySelector('[data-action="retake"]')?.addEventListener('click', () => {
    localStorage.removeItem('monefyi_money_personality');
    showMoneyPersonalityQuiz({ ...opts, retake: true });
  });
}

function close() {
  _host?.classList.remove('is-visible');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
