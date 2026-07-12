// =====================================================
// Shared UI render helpers
// =====================================================

export function renderSparkline(data: number[], color: string): string {
  const max = Math.max(...data, 1);
  const colorMap: Record<string, string> = {
    primary: "var(--primary)",
    success: "var(--success)",
    danger: "var(--danger)",
    warning: "var(--warning)",
    purple: "var(--purple)",
    white: "rgba(255,255,255,0.5)",
    green: "var(--success)",
  };
  const c = colorMap[color] || color;
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
