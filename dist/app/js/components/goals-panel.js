/**
 * Multi-goals panel — CRUD + templates (Sprint 3).
 * @module components/goals-panel
 */

import { Icon } from './icons.js';
import {
  loadFinancialGoals,
  saveFinancialGoal,
  enrichGoal,
  canCreateAdditionalGoal,
  attemptCreateAdditionalGoal,
} from '../services/financial-goals.js';

export const GOAL_TEMPLATES = [
  { name: 'Dana Darurat', icon: '🛡️', color: '#10b981', target_amount: 10000000 },
  { name: 'DP Rumah', icon: '🏠', color: '#3b82f6', target_amount: 50000000 },
  { name: 'Liburan', icon: '✈️', color: '#f59e0b', target_amount: 15000000 },
  { name: 'Pendidikan Anak', icon: '🎓', color: '#8b5cf6', target_amount: 25000000 },
  { name: 'Mobil / Motor', icon: '🚗', color: '#06b6d4', target_amount: 30000000 },
];

/**
 * @param {object} [opts]
 */
export async function showGoalsPanel(opts = {}) {
  await loadFinancialGoals();
  const host = document.createElement('div');
  host.className = 'pro-panel-host goals-panel-host is-visible';
  document.body.appendChild(host);

  const close = () => host.remove();
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

  const render = () => {
    const goals = (window.STATE?.db?.financialGoals || []).filter((g) => g.status !== 'achieved');
    const canAdd = canCreateAdditionalGoal();

    host.innerHTML = `
      <div class="pro-panel goals-panel" role="dialog" aria-modal="true">
        <div class="pro-panel__head">
          <div>
            <div class="pro-panel__kicker">Target Finansial</div>
            <div class="pro-panel__title">Goals (${goals.length})</div>
          </div>
          <button type="button" class="pro-panel__close" data-action="close">${Icon('x', { size: 18 })}</button>
        </div>
        <div class="goals-panel__list">
          ${goals.length ? goals.map((g) => {
            const e = enrichGoal(g);
            const pct = e.stats?.pct ?? 0;
            return `
              <div class="goals-panel__item" data-goal-id="${g.id}">
                <span class="goals-panel__icon">${g.icon || '🎯'}</span>
                <div class="goals-panel__info">
                  <strong>${escapeHtml(g.name)}${g.is_primary ? ' · utama' : ''}</strong>
                  <div class="goals-panel__meta">${pct}% · Rp ${fmt(g.current_amount)} / Rp ${fmt(g.target_amount)}</div>
                  <div class="goals-panel__bar"><span style="width:${pct}%"></span></div>
                </div>
              </div>
            `;
          }).join('') : '<p class="pro-panel__empty">Belum ada target. Pilih template di bawah.</p>'}
        </div>
        ${canAdd ? `
          <div class="goals-panel__templates">
            <div class="goals-panel__templates-title">Template cepat</div>
            <div class="goals-panel__template-row">
              ${GOAL_TEMPLATES.map((t) => `
                <button type="button" class="goals-panel__template tap" data-template="${escapeHtml(t.name)}">${t.icon} ${escapeHtml(t.name)}</button>
              `).join('')}
            </div>
          </div>
          <form class="pro-panel__form" id="goalCreateForm">
            <input name="name" placeholder="Nama target" required />
            <div class="pro-panel__form-row">
              <input name="target_amount" type="number" min="1000" placeholder="Target (Rp)" required />
              <input name="current_amount" type="number" min="0" placeholder="Sudah terkumpul" value="0" />
            </div>
            <button type="submit" class="pro-panel__submit tap">+ Tambah Target</button>
          </form>
        ` : `
          <p class="pro-panel__empty">Plan Basic: 1 target aktif. Upgrade untuk multiple goals.</p>
          <button type="button" class="pro-panel__submit tap" data-action="upgrade">Upgrade Pro+</button>
        `}
      </div>
    `;

    host.querySelector('[data-action="close"]')?.addEventListener('click', close);
    host.querySelector('[data-action="upgrade"]')?.addEventListener('click', () => {
      window.openUpgradeSheet?.({ featureKey: 'multiple_goals' });
    });

    host.querySelectorAll('[data-template]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-template');
        const tpl = GOAL_TEMPLATES.find((t) => t.name === name);
        const form = host.querySelector('#goalCreateForm');
        if (!form || !tpl) return;
        form.querySelector('[name="name"]').value = tpl.name;
        form.querySelector('[name="target_amount"]').value = String(tpl.target_amount);
      });
    });

    host.querySelector('#goalCreateForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const allowed = await attemptCreateAdditionalGoal();
      if (!allowed && !canCreateAdditionalGoal()) return;
      try {
        await saveFinancialGoal({
          name: fd.get('name'),
          target_amount: fd.get('target_amount'),
          current_amount: fd.get('current_amount') || 0,
          status: 'active',
          is_primary: goals.length === 0,
        });
        opts.onSaved?.();
        render();
      } catch (err) {
        window.showToast?.(err.message || 'Gagal', 'error');
      }
    });
  };

  render();
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

if (typeof window !== 'undefined') {
  window.monefyiGoalsPanel = { showGoalsPanel, GOAL_TEMPLATES };
}
