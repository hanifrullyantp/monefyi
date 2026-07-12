// =====================================================
// PROJECT PLANNER — Utility Functions
// Migrated from src/lib/utils.ts
// =====================================================

/**
 * Format number as Indonesian Rupiah.
 * @param {number} amount
 * @param {boolean} [compact=false]
 * @returns {string}
 */
export function formatRupiah(amount, compact = false) {
  if (compact) {
    if (amount >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1)}M`;
    if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}jt`;
    if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)}rb`;
    return `Rp ${amount}`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format ISO date string to Indonesian display.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Fuzzy subsequence match (e.g. "smn" matches "Semen").
 * @param {string} query
 * @param {string} text
 * @returns {boolean}
 */
export function fuzzyMatch(query, text) {
  if (!query) return true;
  const q = query.toLowerCase().replace(/\s/g, "");
  const t = text.toLowerCase().replace(/\s/g, "");
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

/**
 * Debounce function calls.
 * @template {(...args: unknown[]) => void} T
 * @param {T} fn
 * @param {number} delay
 * @returns {T}
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function calls.
 * @template {(...args: unknown[]) => void} T
 * @param {T} fn
 * @param {number} limit
 * @returns {T}
 */
export function throttle(fn, limit) {
  let lastTime = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastTime >= limit) {
      lastTime = now;
      fn(...args);
    }
  };
}

/**
 * Animate a number counting up in an element.
 * @param {HTMLElement} el
 * @param {number} target
 * @param {number} [duration=800]
 * @param {(n: number) => string} [formatter]
 */
export function countUp(el, target, duration = 800, formatter = (n) => n.toString()) {
  const start = performance.now();
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = formatter(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/**
 * Animate progress bar width.
 * @param {HTMLElement} barEl
 * @param {number} targetPct
 * @param {number} [delay=0]
 */
export function animateProgress(barEl, targetPct, delay = 0) {
  barEl.style.width = "0%";
  setTimeout(() => {
    barEl.style.width = `${Math.min(targetPct, 100)}%`;
  }, delay + 100);
}

/**
 * Map status string to CSS color token name.
 * @param {string} status
 * @returns {string}
 */
export function getStatusColor(status) {
  switch (status) {
    case "ok": return "success";
    case "over": return "danger";
    case "warning": return "warning";
    case "done": return "success";
    case "active": return "primary";
    default: return "gray";
  }
}

/**
 * Generate a unique ID string.
 * @returns {string}
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Clamp value between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Deep clone a JSON-serializable value.
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
