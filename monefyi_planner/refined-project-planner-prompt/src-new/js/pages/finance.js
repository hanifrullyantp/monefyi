// Phase 2.4.4 — PENDING
import { getState } from "../store.js";
import { formatRupiah } from "../utils.js";

/** @returns {string} */
export function render() {
  const s = getState();
  return `<div class="sandbox-placeholder"><h2>Keuangan Bisnis</h2><p>Tab: <code>${s.currentFinanceTab}</code></p><p>Kas: ${formatRupiah(s.data.business.totalKas)}</p><p><a href="#dashboard">← Dashboard</a></p></div>`;
}
