/**
 * First-login bubble / spotlight product tour.
 * @module components/product-tour
 */

const TOUR_DONE_KEY = 'monefyi_tour_done';
const ONBOARDING_DONE_KEY = 'monefyi_onboarding_done';

/** @type {number} */
let _stepIndex = 0;
/** @type {Array<object>} */
let _steps = [];
/** @type {boolean} */
let _wired = false;
/** @type {(() => void)|null} */
let _onFinish = null;

/**
 * @returns {boolean}
 */
export function isTourDone() {
  return localStorage.getItem(TOUR_DONE_KEY) === '1'
    || localStorage.getItem(ONBOARDING_DONE_KEY) === '1';
}

/**
 * @returns {void}
 */
export function markTourDone() {
  localStorage.setItem(TOUR_DONE_KEY, '1');
  localStorage.setItem(ONBOARDING_DONE_KEY, '1');
}

/**
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
function resolveTarget(selector) {
  if (!selector) return null;
  const parts = String(selector).split(',').map((s) => s.trim()).filter(Boolean);
  for (const sel of parts) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 && rect.height < 2) continue;
    return el;
  }
  return null;
}

/**
 * @param {HTMLElement} el
 * @param {HTMLElement} spotlight
 * @param {HTMLElement} bubble
 * @param {'auto'|'top'|'bottom'} [placement]
 */
function positionAround(el, spotlight, bubble, placement = 'auto') {
  const pad = 8;
  const rect = el.getBoundingClientRect();
  const top = Math.max(8, rect.top - pad);
  const left = Math.max(8, rect.left - pad);
  const width = Math.min(window.innerWidth - 16, rect.width + pad * 2);
  const height = Math.min(window.innerHeight - 16, rect.height + pad * 2);

  spotlight.style.top = `${top}px`;
  spotlight.style.left = `${left}px`;
  spotlight.style.width = `${width}px`;
  spotlight.style.height = `${height}px`;

  bubble.style.left = '16px';
  bubble.style.right = '16px';
  bubble.style.width = 'auto';
  bubble.style.maxWidth = '420px';
  bubble.style.margin = '0 auto';

  const bubbleH = bubble.offsetHeight || 160;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  let place = placement;
  if (place === 'auto') {
    place = spaceBelow >= bubbleH + 24 || spaceBelow >= spaceAbove ? 'bottom' : 'top';
  }

  if (place === 'top') {
    bubble.style.top = `${Math.max(12, rect.top - bubbleH - 14)}px`;
  } else {
    bubble.style.top = `${Math.min(window.innerHeight - bubbleH - 16, rect.bottom + 12)}px`;
  }
}

/**
 * Default post-login tour steps (mobile-first).
 * @returns {Array<object>}
 */
function defaultSteps() {
  return [
    {
      selector: '#btnPeriodToggle, .mobile-header-period, #btnPeriodToggleTopbar',
      title: 'Filter periode',
      text: 'Pilih bulan atau rentang tanggal. Semua ringkasan dan daftar transaksi mengikuti periode ini.',
    },
    {
      selector: '#btnSaldoToggle, .hero-saldo-card, #kpiSaldo',
      title: 'Saldo & arus kas',
      text: 'Lihat estimasi saldo, pemasukan, dan pengeluaran periode aktif. Tap untuk ringkas/expand.',
    },
    {
      selector: '.home-quick-access, .home-quick-row',
      title: 'Akses cepat',
      text: 'Shortcut ke transaksi, budgeting, analisa, tutorial, dan pengaturan. Tap “Lihat semua” untuk lebih banyak.',
    },
    {
      selector: '.nav-bar [data-nav="list"], #appSidebar [data-nav="list"], #btnHeaderNewTxDesktop',
      title: 'Catat transaksi',
      text: 'Semua transaksi ada di sini. Kamu juga bisa menambah lewat tombol + atau input cepat di beranda.',
    },
    {
      selector: '#notifBellMobile, #btnNotifDesktop',
      title: 'Notifikasi',
      text: 'Peringatan budget, saran Monevisor, dan update penting muncul di sini.',
    },
    {
      selector: '.nav-bar [data-nav="budget"], #appSidebar [data-nav="budget"], #btnOpenBudget',
      title: 'Budgeting',
      text: 'Rencana belanja bulanan. Di sinilah kamu kontrol prioritas: harus, penting, dan simpan.',
    },
    {
      selector: '[data-action="add-budget"], #btnBudgetEmptySetup, .btn-add-budget-full',
      title: 'Langkah pertama: buat budget',
      text: 'Mulai dengan membuat budget pertama (atau Auto Budget). Tanpa budget, analisa dan alert kurang akurat.',
      nextLabel: 'Buat Budget',
      placement: 'bottom',
      async beforeStep() {
        if (typeof window.openBudget === 'function') {
          await window.openBudget();
          await new Promise((r) => setTimeout(r, 450));
        }
      },
      async onNext() {
        try {
          const { showBudgetFormModal } = await import('./budget-form-modal.js');
          const month = window.STATE?.budgetDraft?.month || window.STATE?.selectedMonth;
          showBudgetFormModal(
            { priority: 'penting', month },
            { onSaved: () => window.renderBudgetPageView?.(), showSummary: false },
          );
        } catch (e) {
          console.warn('[product-tour] open budget form', e);
        }
      },
    },
  ];
}

/**
 * @returns {void}
 */
function hideTour() {
  const overlay = document.getElementById('tourOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

/**
 * @returns {void}
 */
function finishTour() {
  markTourDone();
  hideTour();
  _onFinish?.();
}

/**
 * @returns {Promise<void>}
 */
async function renderStep() {
  const overlay = document.getElementById('tourOverlay');
  const spotlight = document.getElementById('tourSpotlight');
  const bubble = document.getElementById('tourBubble');
  const titleEl = document.getElementById('tourTitle');
  const textEl = document.getElementById('tourText');
  const stepEl = document.getElementById('tourStep');
  const nextBtn = document.getElementById('tourNext');
  const prevBtn = document.getElementById('tourPrev');

  if (!overlay || !spotlight || !bubble) return;

  // Skip steps whose targets are missing
  while (_stepIndex < _steps.length) {
    const step = _steps[_stepIndex];
    if (typeof step.beforeStep === 'function') {
      try { await step.beforeStep(); } catch (e) { console.warn('[product-tour] beforeStep', e); }
    }
    const target = resolveTarget(step.selector);
    if (target) break;
    _stepIndex += 1;
  }

  if (_stepIndex >= _steps.length) {
    finishTour();
    return;
  }

  const step = _steps[_stepIndex];
  const target = resolveTarget(step.selector);
  if (!target) {
    finishTour();
    return;
  }

  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');

  if (titleEl) titleEl.textContent = step.title || '';
  if (textEl) textEl.textContent = step.text || '';
  if (stepEl) stepEl.textContent = `${_stepIndex + 1} / ${_steps.length}`;
  if (nextBtn) {
    const isLast = _stepIndex >= _steps.length - 1;
    nextBtn.textContent = step.nextLabel || (isLast ? 'Selesai' : 'Lanjut');
  }
  if (prevBtn) {
    prevBtn.disabled = _stepIndex <= 0;
    prevBtn.style.opacity = _stepIndex <= 0 ? '0.45' : '1';
  }

  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  requestAnimationFrame(() => {
    positionAround(target, spotlight, bubble, step.placement || 'auto');
    // Re-measure after layout settles
    setTimeout(() => positionAround(target, spotlight, bubble, step.placement || 'auto'), 280);
  });
}

/**
 * Wire overlay buttons once.
 */
function ensureWired() {
  if (_wired) return;
  _wired = true;

  document.getElementById('tourSkip')?.addEventListener('click', () => {
    finishTour();
  });

  document.getElementById('tourPrev')?.addEventListener('click', () => {
    if (_stepIndex <= 0) return;
    _stepIndex -= 1;
    renderStep();
  });

  document.getElementById('tourNext')?.addEventListener('click', async () => {
    const step = _steps[_stepIndex];
    const isLast = _stepIndex >= _steps.length - 1;
    if (typeof step?.onNext === 'function') {
      try { await step.onNext(); } catch (e) { console.warn('[product-tour] onNext', e); }
    }
    if (isLast) {
      finishTour();
      return;
    }
    _stepIndex += 1;
    renderStep();
  });

  window.addEventListener('resize', () => {
    const overlay = document.getElementById('tourOverlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    renderStep();
  }, { passive: true });
}

/**
 * Start the first-login product tour.
 * @param {object} [options]
 * @param {boolean} [options.force]
 * @param {() => void} [options.onFinish]
 * @returns {Promise<boolean>} true if tour started
 */
export async function startProductTour(options = {}) {
  if (!options.force && isTourDone()) return false;

  const auth = document.getElementById('authOverlay');
  if (auth && !auth.classList.contains('hidden')) return false;
  const shell = document.getElementById('appShell');
  if (shell && shell.classList.contains('hidden')) return false;

  ensureWired();
  _steps = defaultSteps();
  _stepIndex = 0;
  _onFinish = typeof options.onFinish === 'function' ? options.onFinish : null;

  // Wait a tick so home / nav are painted
  await new Promise((r) => setTimeout(r, options.delayMs ?? 600));
  await renderStep();
  return true;
}

if (typeof window !== 'undefined') {
  window.monefyiProductTour = {
    startProductTour,
    isTourDone,
    markTourDone,
  };
}
