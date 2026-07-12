// Phase 2.4.2 — PENDING
import { getState } from "../store.js";

/** @returns {string} */
export function render() {
  const count = getState().data.projects.length;
  return `<div class="sandbox-placeholder"><h2>Projects</h2><p>${count} project · Step 2.4.2 pending</p><p><a href="#dashboard">← Dashboard</a></p></div>`;
}
