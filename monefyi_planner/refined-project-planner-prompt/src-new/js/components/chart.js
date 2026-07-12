// =====================================================
// PROJECT PLANNER — Canvas Charts
// Migrated from: src/lib/app.ts (renderDashboardChart)
// Phase 2.2.8 (partial)
// =====================================================

import { getState } from "../store.js";

/**
 * Draw cashflow line chart on dashboard canvas.
 */
export function renderDashboardChart() {
  const canvas = document.getElementById("cashflow-chart");
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr || 800;
  canvas.height = 220 * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth;
  const h = 220;
  const pd = 40;
  const { business: data } = getState().data;
  const inData = data.cashflowData;
  const outData = data.cashflowOut;
  const labels = data.cashflowMonths;
  const max = Math.max(...inData, ...outData) * 1.1;

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(0,0,0,0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pd + (h - 2 * pd) * (i / 4);
    ctx.beginPath();
    ctx.moveTo(pd, y);
    ctx.lineTo(w - pd, y);
    ctx.stroke();
  }

  /**
   * @param {number[]} dataset
   * @param {string} color
   * @param {string} fillColor
   */
  const drawLine = (dataset, color, fillColor) => {
    const pts = dataset.map((v, i) => ({
      x: pd + i * ((w - 2 * pd) / (dataset.length - 1)),
      y: h - pd - (v / max) * (h - 2 * pd),
    }));

    ctx.beginPath();
    ctx.moveTo(pts[0].x, h - pd);
    pts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, h - pd);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  drawLine(outData, "#EF4444", "rgba(239,68,68,0.08)");
  drawLine(inData, "#10B981", "rgba(16,185,129,0.08)");

  ctx.fillStyle = "#9CA3AF";
  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "center";
  labels.forEach((l, i) => {
    const x = pd + i * ((w - 2 * pd) / (labels.length - 1));
    ctx.fillText(l, x, h - 10);
  });
}
