/**
 * Onboarding v2 — diagnostic wizard + Plan 7 Hari Pertama.
 * @module components/onboarding-wizard-v2
 */

import {
  FINANCIAL_PROBLEMS,
  NEAR_TERM_GOALS,
  generateFirstWeekPlan,
} from '../services/onboarding-plan-generator.js';
import {
  saveUserPreferences,
  seedFixedBillsToBudget,
  syncMonevisorFromOnboarding,
  normalizePrefsPayload,
} from '../services/onboarding-prefs.js';
import { createFirstWeekPlan } from '../services/first-week-plan.js';

const INCOME_SOURCES = ['Gaji', 'Freelance', 'Usaha', 'Campuran'];
const TOTAL_STEPS = 8;
const DEFAULT_OPENING_ACCOUNTS = ['Cash', 'BCA', 'GoPay', 'OVO', 'Tabungan'];

/** @type {HTMLElement|null} */
let _host = null;

/** @type {object} */
let _state = {
  step: 1,
  financial_problems: [],
  payday_day: 25,
  payday_irregular: false,
  fixed_bills: [],
  has_debt: false,
  debt_amount: '',
  debt_name: '',
  near_term_goal: null,
  near_term_goal_custom: '',
  monthly_income: '',
  income_source: 'Gaji',
  opening_accounts: DEFAULT_OPENING_ACCOUNTS.map((name) => ({ name, amount: '' })),
  previewTasks: [],
  onClose: null,
};

function formatIDR(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, '');
}

function ensureHost() {
  if (_host && document.body.contains(_host)) return _host;
  _host = document.createElement('div');
  _host.id = 'onboardingWizardV2Host';
  document.body.appendChild(_host);
  return _host;
}

function getUserName() {
  return window.STATE?.db?.profile?.name
    || window.STATE?.db?.user?.user_metadata?.name
    || window.STATE?.db?.user?.email?.split('@')[0]
    || 'teman';
}

function progressDots(step, total = TOTAL_STEPS) {
  return Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    return `<div class="onboarding-wizard__dot${n <= step ? ' is-active' : ''}"></div>`;
  }).join('');
}

function getPrefsSnapshot() {
  return normalizePrefsPayload({
    financial_problems: _state.financial_problems,
    payday_day: _state.payday_irregular ? null : Number(_state.payday_day),
    payday_irregular: _state.payday_irregular,
    fixed_bills: _state.fixed_bills,
    has_debt: _state.has_debt,
    debt_amount: _state.has_debt ? Number(_state.debt_amount) : null,
    debt_name: _state.has_debt ? _state.debt_name : null,
    near_term_goal: _state.near_term_goal,
    near_term_goal_custom: _state.near_term_goal_custom,
    monthly_income: Number(_state.monthly_income),
    income_source: _state.income_source,
  });
}

function renderStep() {
  const host = ensureHost();
  const name = getUserName();

  if (_state.step === 1) {
    host.innerHTML = `
      <div class="onboarding-wizard onboarding-wizard--v2">
        <div class="onboarding-wizard__progress">${progressDots(1)}</div>
        <p class="onboarding-wizard__step-label">Langkah 1 dari ${TOTAL_STEPS}</p>
        <h2 class="onboarding-wizard__title">Hai ${escapeHtml(name)}, kita kenalan dulu</h2>
        <p class="onboarding-wizard__sub">Masalah keuangan utama kamu sekarang apa? (bisa pilih lebih dari satu)</p>
        <div class="onboarding-chip-grid">
          ${FINANCIAL_PROBLEMS.map((p) => `
            <button type="button" class="onboarding-chip${_state.financial_problems.includes(p.id) ? ' is-selected' : ''}" data-problem="${p.id}">
              ${escapeHtml(p.label)}
            </button>`).join('')}
        </div>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn--ghost" data-obv2-skip>Nanti aja</button>
          <button type="button" class="onboarding-btn onboarding-btn--primary" data-obv2-next ${_state.financial_problems.length ? '' : 'disabled'}>Lanjut</button>
        </div>
      </div>`;
  } else if (_state.step === 2) {
    host.innerHTML = `
      <div class="onboarding-wizard onboarding-wizard--v2">
        <div class="onboarding-wizard__progress">${progressDots(2)}</div>
        <p class="onboarding-wizard__step-label">Langkah 2 dari ${TOTAL_STEPS}</p>
        <h2 class="onboarding-wizard__title">Kamu biasanya gajian tanggal berapa?</h2>
        <p class="onboarding-wizard__sub">Ini bantu kami hitung sisa hari aman pakai uang.</p>
        <label class="onboarding-field onboarding-field--inline">
          <input type="checkbox" id="obv2PaydayIrregular" ${_state.payday_irregular ? 'checked' : ''} />
          <span>Income tidak tentu (freelancer / harian)</span>
        </label>
        <div class="onboarding-field${_state.payday_irregular ? ' is-disabled' : ''}" id="obv2PaydayWrap">
          <label>Tanggal gajian (1–31)</label>
          <input type="number" id="obv2Payday" min="1" max="31" value="${escapeAttr(String(_state.payday_day || 25))}" ${_state.payday_irregular ? 'disabled' : ''} />
        </div>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn--ghost" data-obv2-back>Kembali</button>
          <button type="button" class="onboarding-btn onboarding-btn--primary" data-obv2-next>Lanjut</button>
        </div>
      </div>`;
  } else if (_state.step === 3) {
    const billRows = (_state.fixed_bills.length ? _state.fixed_bills : [{ name: '', amount: '' }])
      .map((b, i) => `
        <div class="onboarding-bill-row" data-bill-idx="${i}">
          <input type="text" class="obv2-bill-name" placeholder="Nama (listrik, kontrakan…)" value="${escapeAttr(b.name)}" />
          <input type="number" class="obv2-bill-amount" inputmode="numeric" placeholder="Nominal" value="${escapeAttr(b.amount ? String(b.amount) : '')}" />
          <button type="button" class="onboarding-bill-remove" data-remove-bill="${i}" aria-label="Hapus">×</button>
        </div>`).join('');
    host.innerHTML = `
      <div class="onboarding-wizard onboarding-wizard--v2">
        <div class="onboarding-wizard__progress">${progressDots(3)}</div>
        <p class="onboarding-wizard__step-label">Langkah 3 dari ${TOTAL_STEPS}</p>
        <h2 class="onboarding-wizard__title">Ada tagihan tetap setiap bulan?</h2>
        <p class="onboarding-wizard__sub">Contoh: cicilan, kontrakan, listrik. Boleh dilewati.</p>
        <div class="onboarding-bill-list" id="obv2BillList">${billRows}</div>
        <button type="button" class="onboarding-btn onboarding-btn--ghost onboarding-btn--block" data-obv2-add-bill>+ Tambah tagihan</button>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn--ghost" data-obv2-back>Kembali</button>
          <button type="button" class="onboarding-btn onboarding-btn--ghost" data-obv2-skip-step>Lewati</button>
          <button type="button" class="onboarding-btn onboarding-btn--primary" data-obv2-next>Lanjut</button>
        </div>
      </div>`;
  } else if (_state.step === 4) {
    host.innerHTML = `
      <div class="onboarding-wizard onboarding-wizard--v2">
        <div class="onboarding-wizard__progress">${progressDots(4)}</div>
        <p class="onboarding-wizard__step-label">Langkah 4 dari ${TOTAL_STEPS}</p>
        <h2 class="onboarding-wizard__title">Saat ini ada utang aktif?</h2>
        <div class="onboarding-radio-row">
          <label class="onboarding-radio"><input type="radio" name="obv2Debt" value="no" ${_state.has_debt ? '' : 'checked'} /> Tidak ada</label>
          <label class="onboarding-radio"><input type="radio" name="obv2Debt" value="yes" ${_state.has_debt ? 'checked' : ''} /> Ada</label>
        </div>
        <div class="onboarding-debt-fields${_state.has_debt ? '' : ' hidden'}" id="obv2DebtFields">
          <div class="onboarding-field">
            <label>Nama utang (opsional)</label>
            <input type="text" id="obv2DebtName" value="${escapeAttr(_state.debt_name)}" placeholder="KPR, pinjol, kartu kredit…" />
          </div>
          <div class="onboarding-field">
            <label>Sisa utang kira-kira (Rp)</label>
            <input type="number" id="obv2DebtAmount" inputmode="numeric" value="${escapeAttr(_state.debt_amount ? String(_state.debt_amount) : '')}" placeholder="5000000" />
          </div>
        </div>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn--ghost" data-obv2-back>Kembali</button>
          <button type="button" class="onboarding-btn onboarding-btn--primary" data-obv2-next>Lanjut</button>
        </div>
      </div>`;
  } else if (_state.step === 5) {
    host.innerHTML = `
      <div class="onboarding-wizard onboarding-wizard--v2">
        <div class="onboarding-wizard__progress">${progressDots(5)}</div>
        <p class="onboarding-wizard__step-label">Langkah 5 dari ${TOTAL_STEPS}</p>
        <h2 class="onboarding-wizard__title">Dalam 6 bulan ke depan, kamu ingin:</h2>
        <div class="onboarding-goal-grid">
          ${NEAR_TERM_GOALS.map((g) => {
            let label = g.label;
            if (g.id === 'pay_off_debt' && _state.debt_name) {
              label = `Lunas utang ${_state.debt_name}`;
            }
            return `
            <button type="button" class="onboarding-goal${_state.near_term_goal === g.id ? ' is-selected' : ''}" data-goal="${g.id}">
              ${escapeHtml(label)}
            </button>`;
          }).join('')}
        </div>
        <div class="onboarding-field${_state.near_term_goal === 'custom' ? '' : ' hidden'}" id="obv2CustomGoal">
          <label>Tulis tujuanmu</label>
          <input type="text" id="obv2CustomGoalInput" value="${escapeAttr(_state.near_term_goal_custom)}" placeholder="Misal: beli motor cash" />
        </div>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn--ghost" data-obv2-back>Kembali</button>
          <button type="button" class="onboarding-btn onboarding-btn--primary" data-obv2-next ${_state.near_term_goal ? '' : 'disabled'}>Lanjut</button>
        </div>
      </div>`;
  } else if (_state.step === 6) {
    host.innerHTML = `
      <div class="onboarding-wizard onboarding-wizard--v2">
        <div class="onboarding-wizard__progress">${progressDots(6)}</div>
        <p class="onboarding-wizard__step-label">Langkah 6 dari ${TOTAL_STEPS}</p>
        <h2 class="onboarding-wizard__title">Pemasukan rutin per bulan kamu sekitar berapa?</h2>
        <p class="onboarding-wizard__sub">Perkiraan saja — bisa diubah nanti.</p>
        <div class="onboarding-field">
          <label>Nominal (Rp)</label>
          <input type="number" inputmode="numeric" id="obv2Income" value="${escapeAttr(_state.monthly_income)}" placeholder="8000000" />
        </div>
        <div class="onboarding-field">
          <label>Sumber</label>
          <select id="obv2IncomeSource">
            ${INCOME_SOURCES.map((s) =>
              `<option value="${s}" ${_state.income_source === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </div>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn--ghost" data-obv2-back>Kembali</button>
          <button type="button" class="onboarding-btn onboarding-btn--primary" data-obv2-next>Lanjut</button>
        </div>
      </div>`;
  } else if (_state.step === 7) {
    const rows = (_state.opening_accounts?.length ? _state.opening_accounts : DEFAULT_OPENING_ACCOUNTS.map((n) => ({ name: n, amount: '' })));
    host.innerHTML = `
      <div class="onboarding-wizard onboarding-wizard--v2">
        <div class="onboarding-wizard__progress">${progressDots(7)}</div>
        <p class="onboarding-wizard__step-label">Langkah 7 dari ${TOTAL_STEPS}</p>
        <h2 class="onboarding-wizard__title">Setup saldo awal (opsional)</h2>
        <p class="onboarding-wizard__sub">Untuk akurasi neraca, input saldo saat ini di setiap akun. Cek app bank/e-wallet kamu.</p>
        <div class="onboarding-opening-grid">
          ${rows.map((acc, i) => `
            <div class="onboarding-field onboarding-opening-row">
              <label>${escapeHtml(acc.name)}</label>
              <input type="number" inputmode="numeric" class="obv2-opening-amt" data-idx="${i}" value="${escapeAttr(acc.amount)}" placeholder="0" />
            </div>
          `).join('')}
        </div>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn--ghost" data-obv2-back>Kembali</button>
          <button type="button" class="onboarding-btn onboarding-btn--ghost" data-obv2-skip-opening>Lewati</button>
          <button type="button" class="onboarding-btn onboarding-btn--primary" data-obv2-next>Lanjut</button>
        </div>
      </div>`;
  } else if (_state.step === 8) {
    const tasks = _state.previewTasks.length
      ? _state.previewTasks
      : generateFirstWeekPlan(getPrefsSnapshot());
    _state.previewTasks = tasks;
    host.innerHTML = `
      <div class="onboarding-wizard onboarding-wizard--v2">
        <h2 class="onboarding-wizard__title">Plan 7 Hari Pertamamu</h2>
        <p class="onboarding-wizard__sub">Task kecil setiap hari — disesuaikan dengan masalah yang kamu pilih.</p>
        <ul class="onboarding-plan-preview">
          ${tasks.map((t) => `
            <li>
              <span class="onboarding-plan-preview__day">Hari ${t.day}</span>
              <span class="onboarding-plan-preview__title">${escapeHtml(t.title)}</span>
            </li>`).join('')}
        </ul>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn--primary onboarding-btn--block" data-obv2-finish>Mulai Hari 1</button>
        </div>
      </div>`;
  }

  bindEvents(host);
}

function collectOpeningFromDom(host) {
  const inputs = host.querySelectorAll('.obv2-opening-amt');
  const rows = (_state.opening_accounts?.length ? _state.opening_accounts : DEFAULT_OPENING_ACCOUNTS.map((n) => ({ name: n, amount: '' })));
  inputs.forEach((inp) => {
    const idx = Number(inp.getAttribute('data-idx'));
    if (rows[idx]) rows[idx].amount = inp.value || '';
  });
  _state.opening_accounts = rows.filter((r) => Number(r.amount) > 0 || DEFAULT_OPENING_ACCOUNTS.includes(r.name));
}

function collectBillsFromDom(host) {
  const rows = host.querySelectorAll('.onboarding-bill-row');
  const bills = [];
  rows.forEach((row) => {
    const name = row.querySelector('.obv2-bill-name')?.value?.trim();
    const amount = Number(row.querySelector('.obv2-bill-amount')?.value) || 0;
    if (name && amount > 0) bills.push({ name, amount });
  });
  _state.fixed_bills = bills;
}

function bindEvents(host) {
  host.querySelectorAll('[data-problem]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-problem');
      const set = new Set(_state.financial_problems);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      _state.financial_problems = [...set];
      renderStep();
    });
  });

  host.querySelector('#obv2PaydayIrregular')?.addEventListener('change', (e) => {
    _state.payday_irregular = e.target.checked;
    renderStep();
  });

  host.querySelectorAll('[data-goal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      _state.near_term_goal = btn.getAttribute('data-goal');
      renderStep();
    });
  });

  host.querySelectorAll('input[name="obv2Debt"]').forEach((el) => {
    el.addEventListener('change', () => {
      _state.has_debt = el.value === 'yes';
      host.querySelector('#obv2DebtFields')?.classList.toggle('hidden', !_state.has_debt);
    });
  });

  host.querySelector('[data-obv2-add-bill]')?.addEventListener('click', () => {
    collectBillsFromDom(host);
    _state.fixed_bills.push({ name: '', amount: '' });
    renderStep();
  });

  host.querySelectorAll('[data-remove-bill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      collectBillsFromDom(host);
      const idx = Number(btn.getAttribute('data-remove-bill'));
      _state.fixed_bills.splice(idx, 1);
      renderStep();
    });
  });

  host.querySelector('[data-obv2-back]')?.addEventListener('click', () => {
    if (_state.step === 3) collectBillsFromDom(host);
    if (_state.step === 4) {
      _state.debt_name = host.querySelector('#obv2DebtName')?.value || '';
      _state.debt_amount = host.querySelector('#obv2DebtAmount')?.value || '';
    }
    _state.step = Math.max(1, _state.step - 1);
    renderStep();
  });

  host.querySelector('[data-obv2-skip]')?.addEventListener('click', () => {
    closeOnboardingWizardV2({ completed: false });
  });

  host.querySelector('[data-obv2-skip-step]')?.addEventListener('click', () => {
    _state.fixed_bills = [];
    _state.step = 4;
    renderStep();
  });

  host.querySelector('[data-obv2-skip-opening]')?.addEventListener('click', () => {
    _state.opening_accounts = [];
    _state.step = 8;
    _state.previewTasks = generateFirstWeekPlan(getPrefsSnapshot());
    renderStep();
  });

  host.querySelector('[data-obv2-next]')?.addEventListener('click', async () => {
    if (_state.step === 1 && !_state.financial_problems.length) return;

    if (_state.step === 2) {
      _state.payday_irregular = !!host.querySelector('#obv2PaydayIrregular')?.checked;
      if (!_state.payday_irregular) {
        const day = Number(host.querySelector('#obv2Payday')?.value);
        if (!day || day < 1 || day > 31) {
          host.querySelector('#obv2Payday')?.focus();
          return;
        }
        _state.payday_day = day;
      }
    }

    if (_state.step === 3) collectBillsFromDom(host);

    if (_state.step === 4) {
      _state.has_debt = host.querySelector('input[name="obv2Debt"]:checked')?.value === 'yes';
      if (_state.has_debt) {
        _state.debt_name = host.querySelector('#obv2DebtName')?.value?.trim() || '';
        _state.debt_amount = host.querySelector('#obv2DebtAmount')?.value || '';
      }
    }

    if (_state.step === 5) {
      if (!_state.near_term_goal) return;
      if (_state.near_term_goal === 'custom') {
        _state.near_term_goal_custom = host.querySelector('#obv2CustomGoalInput')?.value?.trim() || '';
        if (!_state.near_term_goal_custom) {
          host.querySelector('#obv2CustomGoalInput')?.focus();
          return;
        }
      }
    }

    if (_state.step === 6) {
      _state.monthly_income = host.querySelector('#obv2Income')?.value || '';
      _state.income_source = host.querySelector('#obv2IncomeSource')?.value || 'Gaji';
      if (!Number(_state.monthly_income)) {
        host.querySelector('#obv2Income')?.focus();
        return;
      }
    }

    if (_state.step === 7) {
      collectOpeningFromDom(host);
    }

    if (_state.step < 8) {
      if (_state.step === 7) {
        _state.previewTasks = generateFirstWeekPlan(getPrefsSnapshot());
      }
      _state.step += 1;
      renderStep();
    }
  });

  host.querySelector('[data-obv2-finish]')?.addEventListener('click', () => finishOnboarding());
}

async function saveIncome(amount, source) {
  try {
    const mod = await import('../services/income-source.js');
    const period = window.STATE?.selectedMonth
      || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const typeMap = { Gaji: 'salary', Freelance: 'freelance', Usaha: 'business', Campuran: 'other' };
    await mod.saveIncomeSource({
      id: `obv2-${Date.now()}`,
      period,
      type: typeMap[source] || 'salary',
      amount,
      name: source,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[onboarding-v2] saveIncome', e);
  }
}

async function markCompletedV2() {
  try {
    const supa = window.STATE?.db?.supa;
    const uid = window.STATE?.db?.user?.id;
    if (!supa || !uid) return;
    await supa.from('profiles').update({
      onboarding_completed: true,
      onboarding_version: '2',
      updated_at: new Date().toISOString(),
    }).eq('id', uid);
    if (window.STATE?.db?.profile) {
      window.STATE.db.profile.onboarding_completed = true;
      window.STATE.db.profile.onboarding_version = '2';
    }
    try { localStorage.setItem('monefyi_onboarding_done', '1'); } catch (_) { /* ignore */ }
  } catch (e) {
    console.warn('[onboarding-v2] markCompleted', e);
  }
}

async function finishOnboarding() {
  const host = _host;
  const btn = host?.querySelector('[data-obv2-finish]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Menyimpan…';
  }

  const prefs = getPrefsSnapshot();

  try {
    await saveUserPreferences(prefs);
    await saveIncome(Number(_state.monthly_income), _state.income_source);
    await seedFixedBillsToBudget(prefs);
    await syncMonevisorFromOnboarding(prefs);
    await createFirstWeekPlan(prefs);
    const openingRows = (_state.opening_accounts || [])
      .filter((a) => Number(a.amount) > 0)
      .map((a) => ({ account_name: a.name, amount: Number(a.amount), source: 'onboarding' }));
    if (openingRows.length) {
      const { saveOpeningBalances } = await import('../services/account-opening-balance.js');
      await saveOpeningBalances(window.STATE?.db?.user?.id, openingRows);
    }
    await markCompletedV2();
    burstConfetti();
    closeOnboardingWizardV2({ completed: true, go: 'dashboard' });
  } catch (e) {
    console.error('[onboarding-v2] finish', e);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Mulai Hari 1';
    }
  }
}

function burstConfetti() {
  const layer = document.createElement('div');
  layer.className = 'onboarding-confetti';
  const colors = ['#10b981', '#34d399', '#fbbf24', '#60a5fa', '#f472b6'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('i');
    el.style.left = `${Math.random() * 100}%`;
    el.style.background = colors[i % colors.length];
    el.style.animationDelay = `${Math.random() * 0.4}s`;
    layer.appendChild(el);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1600);
}

/**
 * @param {object} [opts]
 * @param {(r:{completed:boolean, go?:string})=>void} [opts.onClose]
 */
export function openOnboardingWizardV2(opts = {}) {
  _state = {
    step: 1,
    financial_problems: [],
    payday_day: 25,
    payday_irregular: false,
    fixed_bills: [],
    has_debt: false,
    debt_amount: '',
    debt_name: '',
    near_term_goal: null,
    near_term_goal_custom: '',
    monthly_income: '',
    income_source: 'Gaji',
    previewTasks: [],
    onClose: opts.onClose,
  };
  const host = ensureHost();
  host.classList.add('is-open');
  renderStep();
}

/**
 * @param {{ completed?: boolean, go?: string }} [result]
 */
export function closeOnboardingWizardV2(result = { completed: false }) {
  if (_host) _host.classList.remove('is-open');
  const cb = _state.onClose;
  if (typeof cb === 'function') cb(result);
  if (result.go === 'dashboard') {
    if (typeof window.showDashboard === 'function') window.showDashboard();
    if (typeof window.showBeranda === 'function') window.showBeranda();
    if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
  }
}

/**
 * Show v2 wizard if profile qualifies.
 * @returns {boolean}
 */
export function maybeShowOnboardingWizardV2() {
  const profile = window.STATE?.db?.profile;
  if (!profile) return false;
  if (profile.onboarding_completed !== false) return false;
  const plan = profile.plan_type || 'none';
  if (plan === 'none') return false;
  if (profile.onboarding_version !== '2') return false;
  openOnboardingWizardV2();
  return true;
}

if (typeof window !== 'undefined') {
  window.monefyiOnboardingV2 = {
    openOnboardingWizardV2,
    closeOnboardingWizardV2,
    maybeShowOnboardingWizardV2,
  };
}
