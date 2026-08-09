/**
 * Micro-learning lesson sheet (Growth Fase 3.5).
 * @module components/micro-learning-sheet
 */

import {
  LESSONS,
  markLessonComplete,
  getLearningPathSummary,
} from '../services/micro-learning.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export function showMicroLearningSheet(opts = {}) {
  const lesson = LESSONS.find((l) => l.id === opts.lessonId) || LESSONS[0];
  const path = getLearningPathSummary();

  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'microLearningHost';
    _host.className = 'innovation-host';
    document.body.appendChild(_host);
  }

  _host.innerHTML = `
    <div class="innovation-sheet" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">🎓 Micro-Learning · ${lesson.minutes} min</div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
      <h3 class="innovation-sheet__title">${escapeHtml(lesson.title)}</h3>
      <div class="micro-lesson-body">
        <p>Konsep inti: pahami dulu, baru eksekusi. Setelah baca, coba fitur terkait di aplikasi.</p>
        <ul>
          <li>Takeaway: 1 aksi konkret hari ini</li>
          <li>Fitur terkait: ${escapeHtml(lesson.feature)}</li>
          <li>Progress path: ${path.completed}/${path.total} selesai</li>
        </ul>
      </div>
      <button type="button" class="innovation-btn tap" data-action="done">Tandai selesai</button>
    </div>
  `;
  _host.classList.add('is-visible');

  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.querySelector('[data-action="done"]')?.addEventListener('click', () => {
    markLessonComplete(lesson.id);
    opts.onComplete?.(lesson);
    close();
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
