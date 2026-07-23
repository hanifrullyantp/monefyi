/**
 * First-login onboarding wizard (goal → income → auto-budget).
 * @module components/onboarding-wizard
 */

const GOALS = [
  { id: 'save_more', label: 'Hemat lebih banyak' },
  { id: 'pay_debt', label: 'Bayar hutang' },
  { id: 'invest', label: 'Mulai investasi' },
  { id: 'track', label: 'Cuma mau track pengeluaran' },
];

let _host = null;
let _state = { step: 1, goal: null, income: '', source: 'Gaji' };

function formatIDR(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

function ensureHost() {
  if (_host && document.body.contains(_host)) return _host;
  _host = document.createElement('div');
  _host.id = 'onboardingWizardHost';
  document.body.appendChild(_host);
  return _host;
}

function progressDots(step) {
  return [1, 2, 3].map((i) =>
    `<div class="onboarding-wizard__dot${i <= step ? ' is-active' : ''}"></div>`
  ).join('');
}

function renderStep() {
  const host = ensureHost();
  const name = window.STATE?.db?.profile?.name
    || window.STATE?.db?.user?.user_metadata?.name
    || window.STATE?.db?.user?.email?.split('@')[0]
    || 'teman';

  if (_state.step === 1) {
    host.innerHTML = `
      <div class="onboarding-wizard">
        <div class="onboarding-wizard__progress">${progressDots(1)}</div>
        <h2 class="onboarding-wizard__title">Selamat datang, ${escapeHtml(name)}!</h2>
        <p class="onboarding-wizard__sub">Pilih tujuan keuangan utama kamu.</p>
        <div class="onboarding-goal-grid">
          ${GOALS.map((g) => `
            <button type="button" class="onboarding-goal${_state.goal === g.id ? ' is-selected' : ''}" data-goal="${g.id}">
              ${escapeHtml(g.label)}
            </button>`).join('')}
        </div>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn--ghost" data-ob-skip>Nanti aja</button>
          <button type="button" class="onboarding-btn onboarding-btn--primary" data-ob-next ${!_state.goal ? 'disabled' : ''}>Lanjut</button>
        </div>
      </div>`;
  } else if (_state.step === 2) {
    host.innerHTML = `
      <div class="onboarding-wizard">
        <div class="onboarding-wizard__progress">${progressDots(2)}</div>
        <h2 class="onboarding-wizard__title">Set Income Bulan Ini</h2>
        <p class="onboarding-wizard__sub">Ini jadi dasar budget kamu.</p>
        <div class="onboarding-field">
          <label>Nominal income (Rp)</label>
          <input type="number" inputmode="numeric" id="obIncome" value="${escapeAttr(_state.income)}" placeholder="5000000" />
        </div>
        <div class="onboarding-field">
          <label>Sumber</label>
          <select id="obSource">
            ${['Gaji', 'Freelance', 'Usaha'].map((s) =>
              `<option value="${s}" ${_state.source === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </div>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn--ghost" data-ob-back>Kembali</button>
          <button type="button" class="onboarding-btn onboarding-btn--primary" data-ob-next>Lanjut</button>
        </div>
      </div>`;
  } else if (_state.step === 3) {
    const income = Number(_state.income) || 0;
    const harus = Math.round(income * 0.5);
    const penting = Math.round(income * 0.3);
    const mau = Math.round(income * 0.2);
    host.innerHTML = `
      <div class="onboarding-wizard">
        <div class="onboarding-wizard__progress">${progressDots(3)}</div>
        <h2 class="onboarding-wizard__title">Budget Pertama (Otomatis)</h2>
        <p class="onboarding-wizard__sub">Kami buatkan budget awal 50/30/20. Kamu bisa edit nanti.</p>
        <ul class="onboarding-budget-preview">
          <li><span>Harus (50%)</span><strong>Rp ${formatIDR(harus)}</strong></li>
          <li><span>Penting (30%)</span><strong>Rp ${formatIDR(penting)}</strong></li>
          <li><span>Mau / Simpan (20%)</span><strong>Rp ${formatIDR(mau)}</strong></li>
        </ul>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn--ghost" data-ob-later>Nanti aja</button>
          <button type="button" class="onboarding-btn onboarding-btn--primary" data-ob-accept>Terima</button>
        </div>
      </div>`;
  } else {
    host.innerHTML = `
      <div class="onboarding-wizard">
        <div class="onboarding-complete">
          <div class="onboarding-complete__emoji" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></div>
          <h2 class="onboarding-wizard__title">Kamu siap!</h2>
          <p class="onboarding-wizard__sub">Mulai catat transaksi pertamamu.</p>
          <div class="onboarding-actions">
            <button type="button" class="onboarding-btn onboarding-btn--ghost" data-ob-dashboard>Lihat Dashboard</button>
            <button type="button" class="onboarding-btn onboarding-btn--primary" data-ob-add-tx>Tambah Transaksi</button>
          </div>
        </div>
      </div>`;
    burstConfetti();
  }

  bindEvents(host);
}

function bindEvents(host) {
  host.querySelectorAll('[data-goal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      _state.goal = btn.getAttribute('data-goal');
      renderStep();
    });
  });
  host.querySelector('[data-ob-next]')?.addEventListener('click', async () => {
    if (_state.step === 1 && _state.goal) {
      await saveGoal(_state.goal);
      _state.step = 2;
      renderStep();
    } else if (_state.step === 2) {
      _state.income = host.querySelector('#obIncome')?.value || '';
      _state.source = host.querySelector('#obSource')?.value || 'Gaji';
      if (!Number(_state.income)) {
        host.querySelector('#obIncome')?.focus();
        return;
      }
      await saveIncome(Number(_state.income), _state.source);
      _state.step = 3;
      renderStep();
    }
  });
  host.querySelector('[data-ob-back]')?.addEventListener('click', () => {
    _state.step = Math.max(1, _state.step - 1);
    renderStep();
  });
  host.querySelector('[data-ob-skip]')?.addEventListener('click', () => {
    closeOnboardingWizard({ completed: false });
  });
  host.querySelector('[data-ob-later]')?.addEventListener('click', async () => {
    await markCompleted();
    _state.step = 4;
    renderStep();
  });
  host.querySelector('[data-ob-accept]')?.addEventListener('click', async () => {
    await applyBudget(Number(_state.income) || 0);
    await markCompleted();
    _state.step = 4;
    renderStep();
  });
  host.querySelector('[data-ob-dashboard]')?.addEventListener('click', () => {
    closeOnboardingWizard({ completed: true, go: 'dashboard' });
  });
  host.querySelector('[data-ob-add-tx]')?.addEventListener('click', () => {
    closeOnboardingWizard({ completed: true, go: 'add_tx' });
  });
}

async function saveGoal(goalId) {
  try {
    const supa = window.STATE?.db?.supa;
    const uid = window.STATE?.db?.user?.id;
    if (!supa || !uid) return;
    await supa.from('monevisor_prefs').upsert({
      user_id: uid,
      primary_goal: goalId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('[onboarding] saveGoal', e);
  }
}

async function saveIncome(amount, source) {
  try {
    const mod = await import('../services/income-source.js');
    const period = window.STATE?.selectedMonth
      || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    if (typeof mod.saveIncomeSource === 'function') {
      await mod.saveIncomeSource({
        id: `ob-${Date.now()}`,
        period,
        type: source,
        amount,
        name: source,
        updated_at: new Date().toISOString(),
      });
    } else if (typeof mod.upsertIncomeSource === 'function') {
      await mod.upsertIncomeSource({ period, type: source, amount, name: source });
    }
  } catch (e) {
    console.warn('[onboarding] saveIncome', e);
  }
}

async function applyBudget(income) {
  try {
    const mod = await import('../services/budget-generator.js');
    if (typeof mod.generateBudget === 'function' && typeof mod.applyGeneratedBudgets === 'function') {
      const generated = await mod.generateBudget({
        strategy: 'no_history',
        income,
      });
      await mod.applyGeneratedBudgets(generated);
    } else if (typeof window.generateAndApplyBudget === 'function') {
      await window.generateAndApplyBudget(income);
    }
  } catch (e) {
    console.warn('[onboarding] applyBudget', e);
  }
}

async function markCompleted() {
  try {
    const supa = window.STATE?.db?.supa;
    const uid = window.STATE?.db?.user?.id;
    if (!supa || !uid) return;
    await supa.from('profiles').update({
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }).eq('id', uid);
    if (window.STATE?.db?.profile) {
      window.STATE.db.profile.onboarding_completed = true;
    }
    try { localStorage.setItem('monefyi_onboarding_done', '1'); } catch (_) { /* ignore */ }
  } catch (e) {
    console.warn('[onboarding] markCompleted', e);
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

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, '');
}

/**
 * @param {object} [opts]
 * @param {(r:{completed:boolean, go?:string})=>void} [opts.onClose]
 */
export function openOnboardingWizard(opts = {}) {
  _state = { step: 1, goal: null, income: '', source: 'Gaji', onClose: opts.onClose };
  const host = ensureHost();
  host.classList.add('is-open');
  renderStep();
}

export function closeOnboardingWizard(result = { completed: false }) {
  if (_host) _host.classList.remove('is-open');
  const cb = _state.onClose;
  if (typeof cb === 'function') cb(result);
  if (result.go === 'dashboard' && typeof window.showDashboard === 'function') {
    window.showDashboard();
  }
  if (result.go === 'add_tx') {
    document.getElementById('btnHeaderNewTxDesktop')?.click()
      || document.getElementById('btnQuickAdd')?.click()
      || document.querySelector('[data-open-tx]')?.click();
  }
}

/**
 * Show wizard if profile.onboarding_completed is false.
 */
export async function maybeShowOnboardingWizard() {
  const profile = window.STATE?.db?.profile;
  if (!profile) return false;
  // Only when server explicitly says not completed (new trial/paid users)
  if (profile.onboarding_completed !== false) return false;
  const plan = profile.plan_type || 'none';
  if (plan === 'none') return false;
  openOnboardingWizard();
  return true;
}

if (typeof window !== 'undefined') {
  window.monefyiOnboarding = {
    openOnboardingWizard,
    closeOnboardingWizard,
    maybeShowOnboardingWizard,
  };
}
