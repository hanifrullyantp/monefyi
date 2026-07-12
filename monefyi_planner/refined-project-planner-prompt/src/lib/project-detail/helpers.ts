export { renderSparkline } from "../ui-helpers";

export function renderDonutChart(
  pct: number,
  color: string,
  label: string,
  displayValue: string
): string {
  const r = 48;
  const circ = 2 * Math.PI * r;
  const dashArr = (pct / 100) * circ;
  return `
  <div class="donut-wrap">
    <svg width="120" height="120" viewBox="0 0 120 120" class="donut-svg">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--gray-200)" stroke-width="10"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}"
              stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${dashArr.toFixed(2)} ${circ.toFixed(2)}"
              transform="rotate(-90 60 60)"/>
    </svg>
    <div style="position:absolute;text-align:center;">
      <div style="font-size:24px;font-weight:900;color:${color}">${displayValue}</div>
      <div style="font-size:11px;color:var(--gray-400)">${label}</div>
    </div>
  </div>`;
}
