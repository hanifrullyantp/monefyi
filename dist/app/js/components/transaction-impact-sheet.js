/**
 * Bottom sheet — impact feedback after saving a transaction.
 * @module components/transaction-impact-sheet
 */

/** @type {HTMLElement|null} */
let _root = null;
/** @type {number|null} */
let _timer = null;

function formatIDR(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

function ensureRoot() {
  if (_root && document.body.contains(_root)) return _root;
  _root = document.createElement('div');
  _root.id = 'txImpactSheetHost';
  _root.innerHTML = `
    <div class="tx-impact-sheet" role="status" aria-live="polite">
      <button type="button" class="tx-impact-sheet__dismiss tap" data-impact-dismiss aria-label="Tutup">×</button>
      <div class="tx-impact-sheet__body"></div>
    </div>
  `;
  document.body.appendChild(_root);
  _root.querySelector('[data-impact-dismiss]')?.addEventListener('click', () => hideTransactionImpactSheet());
  _root.addEventListener('click', (e) => {
    if (e.target === _root) hideTransactionImpactSheet();
  });
  return _root;
}

/**
 * @param {object} impact
 * @returns {string}
 */
function buildHtml(impact) {
  if (impact.incomplete) {
    return `
      <p class="tx-impact-sheet__title">✅ ${escapeHtml(impact.title)}</p>
      <p class="tx-impact-sheet__line tx-impact-sheet__line--muted">${escapeHtml(impact.message)}</p>
    `;
  }

  const lines = [];
  lines.push(`<p class="tx-impact-sheet__title">✅ ${escapeHtml(impact.title)} ${formatIDR(impact.amount)}</p>`);

  if (impact.isIncome && impact.incomeLine) {
    lines.push(`<p class="tx-impact-sheet__line">${escapeHtml(impact.incomeLine)}</p>`);
    return lines.join('');
  }

  if (impact.showSafeDelta && impact.safeToSpendBefore != null) {
    lines.push(`<p class="tx-impact-sheet__line">Sisa hari ini: dari Rp${formatIDR(impact.safeToSpendBefore)} → Rp${formatIDR(impact.safeToSpendAfter)}</p>`);
  } else {
    lines.push(`<p class="tx-impact-sheet__line">Sisa hari ini: Rp${formatIDR(impact.safeToSpendAfter)}</p>`);
  }

  if (impact.category) {
    lines.push(`<p class="tx-impact-sheet__line">Budget ${escapeHtml(impact.category.name)}: ${Math.round(impact.category.pct)}% ${impact.category.label}</p>`);
  }

  if (impact.category && impact.category.status !== 'safe') {
    lines.push(`<p class="tx-impact-sheet__line tx-impact-sheet__line--sub">Sisa bulan ini: Rp${formatIDR(impact.category.remaining)}</p>`);
    if (impact.daysToPayday) {
      lines.push(`<p class="tx-impact-sheet__line tx-impact-sheet__line--sub">Ada ${impact.daysToPayday} hari lagi ke gajian</p>`);
    }
  } else if (impact.flexibleRemaining != null && impact.category?.status === 'attention') {
    lines.push(`<p class="tx-impact-sheet__line tx-impact-sheet__line--sub">Sisa fleksibel: Rp${formatIDR(impact.flexibleRemaining)}</p>`);
  }

  if (impact.showRunway && impact.runwayDelta < 0) {
    lines.push(`<p class="tx-impact-sheet__line tx-impact-sheet__line--warn">Runway turun ~${Math.abs(Math.round(impact.runwayDelta))} hari</p>`);
  }

  if (impact.targetLine) {
    const parts = impact.targetLine.split('\n');
    parts.forEach((line) => {
      lines.push(`<p class="tx-impact-sheet__line tx-impact-sheet__line--sub">${escapeHtml(line)}</p>`);
    });
  } else if (impact.targetProgress) {
    lines.push(`<p class="tx-impact-sheet__line tx-impact-sheet__line--sub">${escapeHtml(impact.targetProgress.name)}: ${impact.targetProgress.pctBefore}% → ${impact.targetProgress.pctAfter}%</p>`);
  }

  return lines.join('');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * @param {object} impact from computeTransactionImpact
 * @param {{ autoDismissMs?: number }} [opts]
 */
export function showTransactionImpactSheet(impact, opts = {}) {
  if (!impact?.show) return;
  const root = ensureRoot();
  const body = root.querySelector('.tx-impact-sheet__body');
  if (body) body.innerHTML = buildHtml(impact);

  root.classList.remove('tx-impact-sheet-host--income', 'tx-impact-sheet-host--warn');
  if (impact.isIncome) root.classList.add('tx-impact-sheet-host--income');
  if (impact.category?.status === 'over' || impact.category?.status === 'warning') {
    root.classList.add('tx-impact-sheet-host--warn');
  }

  root.classList.add('is-visible');

  if (_timer) clearTimeout(_timer);
  const ms = opts.autoDismissMs ?? 4000;
  _timer = setTimeout(() => hideTransactionImpactSheet(), ms);
}

export function hideTransactionImpactSheet() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
  _root?.classList.remove('is-visible');
}

if (typeof window !== 'undefined') {
  window.monefyiTransactionImpactSheet = {
    showTransactionImpactSheet,
    hideTransactionImpactSheet,
  };
}
