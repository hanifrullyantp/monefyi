/**
 * Collapsible QA checklist during admin test-mode impersonate.
 * @module components/test-mode-checklist
 */

import { isTestModeActive, callTestLab, getTestUserId } from '../services/test-mode-service.js';
import { computePeriodFinancials } from '../services/financial-metrics.js';

const MANUAL_ITEMS = [
  { id: 'M1', label: 'Banner pending HP terlihat' },
  { id: 'M2', label: 'Large-transaction sheet: classify asset' },
  { id: 'M4', label: 'Neraca page balance' },
  { id: 'M5', label: 'Digest tidak deficit fantasy' },
];

/**
 * Run client-side headline checks on current STATE.
 */
export function runClientVerification(state = window.STATE) {
  const month = state?.testMode?.defaultMonth || state?.selectedMonth || '2026-08';
  const metrics = computePeriodFinancials(state, month);
  const hpPending = (state.transactions || []).some(
    (t) => (t.status === 'pending' || t.meta?.status === 'pending') && String(t.amount) === '7988000',
  );

  return [
    {
      label: `${month} consumption`,
      expected: month === '2026-08' ? 3395000 : '—',
      actual: metrics.consumptionExpense,
      pass: month !== '2026-08' || metrics.consumptionExpense === 3395000,
    },
    {
      label: 'HP pending excluded from reports',
      expected: true,
      actual: metrics.pendingCount >= 1,
      pass: metrics.pendingCount >= 1 || !hpPending,
    },
    {
      label: 'No fantasy 11.383jt consumption',
      expected: '< 11383000',
      actual: metrics.consumptionExpense,
      pass: metrics.consumptionExpense < 11383000,
    },
  ];
}

/**
 * @param {HTMLElement} [mount]
 */
export function renderTestModeChecklist(mount) {
  const root = mount || document.body;
  let panel = document.getElementById('testModeChecklist');

  if (!isTestModeActive()) {
    panel?.remove();
    return;
  }

  if (!panel) {
    panel = document.createElement('aside');
    panel.id = 'testModeChecklist';
    panel.className = 'test-mode-checklist';
    panel.innerHTML = `
      <button type="button" class="test-mode-checklist__toggle" id="testModeChecklistToggle" aria-expanded="true">Checklist QA</button>
      <div class="test-mode-checklist__body" id="testModeChecklistBody"></div>
    `;
    root.appendChild(panel);
    panel.querySelector('#testModeChecklistToggle')?.addEventListener('click', () => {
      const body = panel.querySelector('#testModeChecklistBody');
      const open = body?.classList.toggle('is-collapsed');
      panel.querySelector('#testModeChecklistToggle')?.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  }

  refreshChecklistBody(panel.querySelector('#testModeChecklistBody'));
}

/**
 * @param {HTMLElement|null} body
 */
async function refreshChecklistBody(body) {
  if (!body) return;

  const auto = runClientVerification();
  const autoHtml = auto.map((r) => `
    <div class="test-mode-checklist__row ${r.pass ? 'pass' : 'fail'}">
      <span>${escapeHtml(r.label)}</span>
      <span>${r.pass ? '✓' : '✗'} ${formatNum(r.actual)}</span>
    </div>
  `).join('');

  const manualHtml = MANUAL_ITEMS.map((m) => `
    <label class="test-mode-checklist__manual">
      <input type="checkbox" data-manual-id="${m.id}" />
      ${escapeHtml(m.label)}
    </label>
  `).join('');

  body.classList.remove('is-collapsed');
  body.innerHTML = `
    <p class="test-mode-checklist__heading">Auto checks (live)</p>
    ${autoHtml}
    <p class="test-mode-checklist__heading">Manual</p>
    ${manualHtml}
    <button type="button" class="test-mode-checklist__rerun" id="testModeRerunVerify">Re-run verify</button>
    <p class="test-mode-checklist__server" id="testModeServerVerify">—</p>
  `;

  body.querySelector('#testModeRerunVerify')?.addEventListener('click', async () => {
    refreshChecklistBody(body);
    const out = body.querySelector('#testModeServerVerify');
    if (out) out.textContent = 'Running…';
    try {
      const testUserId = getTestUserId();
      const res = await callTestLab({ action: 'run_verification', test_user_id: testUserId });
      if (out) out.textContent = `Server: ${res.pass}/${res.total} passed`;
    } catch (e) {
      if (out) out.textContent = `Server verify error: ${e.message}`;
    }
  });
}

function formatNum(n) {
  if (typeof n === 'number') return new Intl.NumberFormat('id-ID').format(n);
  return String(n);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

if (typeof window !== 'undefined') {
  window.addEventListener('monefyi:test-mode-changed', () => renderTestModeChecklist());
  window.monefyiRefreshTestChecklist = () => renderTestModeChecklist();
}
