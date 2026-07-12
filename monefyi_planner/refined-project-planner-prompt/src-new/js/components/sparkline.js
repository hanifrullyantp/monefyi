// =====================================================
// PROJECT PLANNER — Sparkline Mini Charts
// Migrated from: src/lib/app.ts (renderSparkline)
// Phase 2.2.8 (partial)
// =====================================================

const COLOR_MAP = {
  primary: "var(--primary)",
  success: "var(--success)",
  danger: "var(--danger)",
  warning: "var(--warning)",
  purple: "var(--purple)",
  white: "rgba(255,255,255,0.5)",
  green: "var(--success)",
};

/**
 * Render inline sparkline bars HTML.
 * @param {number[]} data
 * @param {string} color
 * @returns {string}
 */
export function renderSparkline(data, color) {
  const max = Math.max(...data, 1);
  const c = COLOR_MAP[color] || color;
  return `
  <div class="sparkline">
    ${data
      .map(
        (v) => `
      <div class="sparkline-bar" style="height:${Math.round((v / max) * 28)}px;background:${c};opacity:0.6;"></div>`
      )
      .join("")}
  </div>`;
}
