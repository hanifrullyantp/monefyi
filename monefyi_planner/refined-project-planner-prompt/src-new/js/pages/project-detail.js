// Phase 2.4.3 — PENDING
import { getState } from "../store.js";

/** @returns {string} */
export function render() {
  const s = getState();
  const p = s.data.projects.find((x) => x.id === s.currentProjectId);
  return `<div class="sandbox-placeholder"><h2>${p?.name || "Project"}</h2><p>Tab: <code>${s.currentProjectTab}</code> · Step 2.4.3 pending</p><p><a href="#projects">← Projects</a></p></div>`;
}
