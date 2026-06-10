/**
 * Monefyi UI enhancements — toast undo, keyboard, AI input, onboarding
 */
(function (global) {
  const $ = (sel, root) => (root || document).querySelector(sel);

  let undoCallback = null;
  let undoTimer = null;

  function t(key, vars) {
    if (typeof global.t === 'function') return global.t(key, vars);
    if (global.MonefyiI18n) return global.MonefyiI18n.t(key, vars);
    return key;
  }

  function showToast(message, kind, opts) {
    const root = $('#toastRoot');
    if (!root) return;
    root.classList.add('toast-root--active');
    root.style.pointerEvents = 'auto';

    const el = document.createElement('div');
    el.className = `toast toast--${kind || 'success'}`;
    el.setAttribute('role', 'status');

    const msg = document.createElement('span');
    msg.className = 'toast__msg';
    msg.textContent = String(message || '');
    el.appendChild(msg);

    if (opts?.undo && typeof opts.undo === 'function') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast__undo tap';
      btn.textContent = t('toast.undo');
      btn.addEventListener('click', () => {
        clearTimeout(undoTimer);
        opts.undo();
        el.remove();
        if (!root.children.length) root.style.pointerEvents = 'none';
      });
      el.appendChild(btn);
    }

    if (kind === 'error') {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'toast__close tap';
      close.setAttribute('aria-label', t('common.close'));
      close.textContent = '×';
      close.addEventListener('click', () => {
        el.remove();
        if (!root.children.length) root.style.pointerEvents = 'none';
      });
      el.appendChild(close);
    }

    root.appendChild(el);

    const dismissMs = kind === 'error' ? 0 : opts?.duration ?? 3000;
    if (dismissMs > 0) {
      undoTimer = setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        setTimeout(() => {
          el.remove();
          if (!root.children.length) root.style.pointerEvents = 'none';
        }, 200);
      }, dismissMs);
    }
  }

  function initKeyboardShortcuts(handlers) {
    document.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'k') {
        e.preventDefault();
        handlers.onSearch?.();
      }
      if (mod && e.key === 'n') {
        e.preventDefault();
        handlers.onNewTx?.();
      }
      if (e.key === 'Escape') {
        handlers.onEscape?.();
      }
    });
  }

  function initSidebarCollapse() {
    const aside = $('#appSidebar');
    const btn = $('#btnSidebarCollapse');
    if (!aside || !btn) return;

    const stored = localStorage.getItem('monefyi_sidebar_collapsed');
    if (stored === '1') aside.classList.add('sidebar--collapsed');

    btn.addEventListener('click', () => {
      aside.classList.toggle('sidebar--collapsed');
      localStorage.setItem('monefyi_sidebar_collapsed', aside.classList.contains('sidebar--collapsed') ? '1' : '0');
      btn.setAttribute(
        'aria-label',
        aside.classList.contains('sidebar--collapsed') ? t('sidebar.expand') : t('sidebar.collapse'),
      );
    });
  }

  function renderTxPreviewCard(tx, container, onSave, onEdit) {
    if (!container || !tx) return;
    const conf = tx.meta?.confidence != null ? Math.round(Number(tx.meta.confidence) * 100) : null;
    container.innerHTML = `
      <div class="ai-preview-card rounded-xl p-4 app-card-opaque">
        <div class="text-xs app-muted font-medium">${t('ai.preview.title')}</div>
        <div class="mt-2 flex items-start justify-between gap-3">
          <div>
            <div class="text-lg font-semibold">${escapeHtml(tx.category || 'Lainnya')}</div>
            <div class="text-sm app-muted">${escapeHtml(tx.merchant || tx.notes || '—')}</div>
            <div class="text-xs app-muted2 mt-1">${escapeHtml(tx.account || '')} • ${escapeHtml(tx.date || '')}</div>
          </div>
          <div class="text-right">
            <div class="text-lg font-bold" style="color:var(--accent-primary)">${formatAmt(tx)}</div>
            ${conf != null ? `<div class="text-[10px] app-muted mt-1">${t('ai.preview.confidence')}: ${conf}%</div>` : ''}
          </div>
        </div>
        <div class="mt-3 flex gap-2">
          <button type="button" id="aiPreviewSave" class="tap flex-1 btn-primary py-2 rounded-lg text-sm font-semibold">${t('ai.preview.save')}</button>
          <button type="button" id="aiPreviewEdit" class="tap flex-1 btn-ghost py-2 rounded-lg text-sm">${t('ai.preview.edit')}</button>
        </div>
      </div>`;
    container.classList.remove('hidden');
    $('#aiPreviewSave', container)?.addEventListener('click', () => onSave?.(tx));
    $('#aiPreviewEdit', container)?.addEventListener('click', () => onEdit?.(tx));
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatAmt(tx) {
    const n = Number(tx.amount || 0);
    const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
    if (global.formatIDR) return sign + global.formatIDR(n).replace(/^\+|^−/, (m) => m);
    return sign + 'Rp ' + n.toLocaleString('id-ID');
  }

  function initVoiceInput(inputEl, btnEl) {
    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SR || !inputEl || !btnEl) {
      btnEl?.classList.add('hidden');
      return;
    }
    const rec = new SR();
    rec.lang = document.documentElement.lang === 'en' ? 'en-ID' : 'id-ID';
    rec.interimResults = false;
    btnEl.addEventListener('click', () => {
      try {
        rec.start();
        btnEl.classList.add('voice-active');
      } catch (_) {}
    });
    rec.onresult = (ev) => {
      const text = ev.results?.[0]?.[0]?.transcript || '';
      inputEl.value = (inputEl.value ? inputEl.value + ' ' : '') + text.trim();
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    };
    rec.onend = () => btnEl.classList.remove('voice-active');
    rec.onerror = () => btnEl.classList.remove('voice-active');
  }

  function showOnboardingIfNeeded() {
    if (localStorage.getItem('monefyi_onboarding_done')) return;
    const el = $('#onboardingBackdrop');
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('open');
  }

  function hideOnboarding() {
    localStorage.setItem('monefyi_onboarding_done', '1');
    const el = $('#onboardingBackdrop');
    if (el) {
      el.classList.remove('open');
      el.classList.add('hidden');
    }
  }

  function cachePeriod(period) {
    try {
      localStorage.setItem('monefyi_last_period', JSON.stringify(period));
    } catch (_) {}
  }

  function restorePeriod() {
    try {
      const raw = localStorage.getItem('monefyi_last_period');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function syncSegmentIndicator(container, activeSelector, indicatorEl) {
    if (!container || !indicatorEl) return;
    const active = container.querySelector(activeSelector);
    if (!active) {
      indicatorEl.style.opacity = '0';
      return;
    }
    const cr = container.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    indicatorEl.style.opacity = '1';
    indicatorEl.style.width = `${ar.width}px`;
    indicatorEl.style.transform = `translateX(${ar.left - cr.left}px)`;
  }

  function syncChipIndicator() {
    const row = $('#txTypeChips');
    syncSegmentIndicator(row, '.tx-chip.active', $('#txChipIndicator', row));
  }

  function syncViewSegmentIndicator() {
    const seg = $('#txViewToggle');
    syncSegmentIndicator(seg, '.tx-view-btn.active', $('#txViewIndicator', seg));
  }

  function initTxSwipeDelete(rowEl, onDeleteRequest) {
    if (window.matchMedia('(min-width: 768px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const inner = rowEl.querySelector('.tx-card-inner');
    if (!inner) return;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let swiping = false;

    rowEl.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swiping = false;
      currentX = 0;
    }, { passive: true });

    rowEl.addEventListener('touchmove', (e) => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!swiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 12) swiping = true;
      if (!swiping || dx > 0) return;
      currentX = Math.max(dx, -96);
      inner.style.transform = `translateX(${currentX}px)`;
    }, { passive: true });

    rowEl.addEventListener('touchend', () => {
      if (currentX < -72) onDeleteRequest?.();
      inner.style.transform = '';
      currentX = 0;
      swiping = false;
    });
  }

  let txListKeyboardBound = false;
  function initTxListKeyboard(getTxIds) {
    if (txListKeyboardBound) return;
    txListKeyboardBound = true;
    document.addEventListener('keydown', (e) => {
      const cards = [...document.querySelectorAll('.tx-card-v2[data-tx-row]')];
      if (!cards.length) return;
      const active = document.activeElement;
      const idx = cards.indexOf(active);
      if (e.key === 'ArrowDown' && idx >= 0) {
        e.preventDefault();
        cards[Math.min(idx + 1, cards.length - 1)]?.focus();
      } else if (e.key === 'ArrowUp' && idx >= 0) {
        e.preventDefault();
        cards[Math.max(idx - 1, 0)]?.focus();
      } else if (e.key === 'Enter' && idx >= 0 && active?.dataset?.txId) {
        e.preventDefault();
        global.openEdit?.(active.dataset.txId);
      } else if (e.key === 'Delete' && idx >= 0 && active?.dataset?.txId) {
        e.preventDefault();
        const confirm = active.querySelector('[data-tx-confirm]');
        confirm?.classList.remove('hidden');
      }
    });
  }

  function initInfoSaldoPillDismiss() {
    const pill = $('#infoSaldoPill');
    if (!pill) return;
    if (localStorage.getItem('monefyi_info_saldo_dismissed') === '1') {
      pill.classList.add('hidden');
      return;
    }
    pill.addEventListener('click', () => {
      pill.classList.add('hidden');
      localStorage.setItem('monefyi_info_saldo_dismissed', '1');
    });
  }

  function txSkeleton(count) {
    return Array.from({ length: count || 4 })
      .map(
        () => `
      <div class="tx-skeleton rounded-xl p-4 app-card" aria-hidden="true">
        <div class="flex gap-3">
          <div class="skeleton-circle w-11 h-11 shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="skeleton-line w-2/3 h-4"></div>
            <div class="skeleton-line w-1/2 h-3"></div>
          </div>
          <div class="skeleton-line w-16 h-5"></div>
        </div>
      </div>`,
      )
      .join('');
  }

  global.MonefyiUI = {
    showToast,
    initKeyboardShortcuts,
    initSidebarCollapse,
    renderTxPreviewCard,
    initVoiceInput,
    showOnboardingIfNeeded,
    hideOnboarding,
    cachePeriod,
    restorePeriod,
    txSkeleton,
    syncChipIndicator,
    syncViewSegmentIndicator,
    initTxSwipeDelete,
    initTxListKeyboard,
    initInfoSaldoPillDismiss,
  };
})(window);
