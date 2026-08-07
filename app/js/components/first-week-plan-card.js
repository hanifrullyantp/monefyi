/**
 * First-week plan progress card for Beranda.
 * @module components/first-week-plan-card
 */

import {
  getActivePlan,
  getPlanDayIndex,
  countCompletedTasks,
  getTaskActionTarget,
  evaluateAutoComplete,
} from '../services/first-week-plan.js';
import { Icon } from './icons.js';

/**
 * @param {object} plan
 * @param {object} [callbacks]
 * @returns {HTMLElement|null}
 */
export function renderFirstWeekPlanCard(plan, callbacks = {}) {
  if (!plan?.tasks?.length) return null;

  const dayIndex = getPlanDayIndex(plan);
  const done = countCompletedTasks(plan);
  const total = plan.tasks.length;
  const todayTask = plan.tasks.find((t) => t.day === dayIndex && !t.completed)
    || plan.tasks.find((t) => !t.completed)
    || plan.tasks[dayIndex - 1];

  const el = document.createElement('section');
  el.className = 'first-week-plan-card home-section';
  el.innerHTML = `
    <div class="first-week-plan-card__head">
      <h3 class="first-week-plan-card__title">${Icon('target', { size: 16 })} Plan 7 Hari Pertama</h3>
      <span class="first-week-plan-card__progress">Hari ${dayIndex}/7 · ${done}/${total}</span>
    </div>
    ${todayTask ? `
      <button type="button" class="first-week-plan-card__task${todayTask.completed ? ' is-done' : ''}" data-task-id="${todayTask.id}" data-auto-key="${todayTask.auto_key || ''}">
        <span class="first-week-plan-card__check">${todayTask.completed ? '✓' : ''}</span>
        <span>
          <p class="first-week-plan-card__task-title">${escapeHtml(todayTask.title)}</p>
          <p class="first-week-plan-card__task-hint">${escapeHtml(todayTask.hint || '')}</p>
        </span>
      </button>` : `
      <p class="first-week-plan-card__task-hint" style="margin:0">Semua task selesai — mantap!</p>`}
  `;

  el.querySelector('.first-week-plan-card__task')?.addEventListener('click', () => {
    const autoKey = todayTask?.auto_key;
    const target = getTaskActionTarget(autoKey);
    callbacks.onTaskAction?.(target, todayTask);
  });

  return el;
}

/**
 * Load plan, evaluate auto-complete, render card.
 * @param {object} [callbacks]
 * @returns {Promise<HTMLElement|null>}
 */
export async function buildFirstWeekPlanCard(callbacks = {}) {
  await evaluateAutoComplete({});
  const plan = await getActivePlan();
  if (!plan) return null;
  return renderFirstWeekPlanCard(plan, callbacks);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
