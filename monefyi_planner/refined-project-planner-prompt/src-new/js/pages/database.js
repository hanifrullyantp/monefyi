// Phase 2.4.5 — PENDING
import { getState } from "../store.js";

/** @returns {string} */
export function render() {
  const s = getState();
  const mats = s.data.database.materials.length;
  return `<div class="sandbox-placeholder"><h2>Database Master</h2><p>Tab: <code>${s.currentDatabaseTab}</code> · ${mats} bahan</p><p><a href="#dashboard">← Dashboard</a></p></div>`;
}
