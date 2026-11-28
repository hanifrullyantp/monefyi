import type { BuildingModel } from "../data/types";
import { generateLayout } from "./layout";
import { boundingBox, centroid, polygonArea, type Polygon } from "./polygon";


const roomColors = ["#DDF2E8", "#E5EEF9", "#F7EAD7", "#EDE9FE", "#FCE7F3", "#E0F2FE"];

export function floorPlanSvg(model: BuildingModel, level = 0, width = 640): string {
  const fp: Polygon = model.levels[level]?.footprint.points ?? [{ x: 0, y: 0 }, { x: 8, y: 6 }];
  const box = boundingBox(fp);
  const pad = 26;
  const scale = (width - pad * 2) / Math.max(1, box.w);
  const height = Math.round(box.h * scale + pad * 2);
  const rooms = generateLayout(model).filter((room) => room.level === level);
  const tx = (p: { x: number; y: number }) => `${(pad + (p.x - box.x) * scale).toFixed(1)},${(pad + (p.y - box.y) * scale).toFixed(1)}`;
  const roomSvg = rooms.map((room, i) => {
    const c = centroid(room.polygon);
    return `<g><polygon points="${room.polygon.map(tx).join(" ")}" fill="${room.wet ? "#DBEAFE" : roomColors[i % roomColors.length]}" stroke="#0F172A" stroke-width="2"/><text x="${(pad + (c.x - box.x) * scale).toFixed(1)}" y="${(pad + (c.y - box.y) * scale).toFixed(1)}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#334155">${escapeXml(room.name)}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Denah lantai ${level + 1}"><rect width="${width}" height="${height}" fill="#F8FAF9"/><polygon points="${fp.map(tx).join(" ")}" fill="none" stroke="#157F5F" stroke-width="6"/>${roomSvg}<text x="${pad}" y="${height - 8}" font-family="Arial" font-size="11" fill="#5B6B7A">Lantai ${level + 1} · ${box.w.toFixed(1)} × ${box.h.toFixed(1)} m</text></svg>`;
}

export function isometricSvg(model: BuildingModel, width = 640): string {
  const fp: Polygon = model.levels[0]?.footprint.points ?? [{ x: 0, y: 0 }, { x: 8, y: 6 }];
  const box = boundingBox(fp);
  const pal = { wall: "#F5F1E8", roof: "#8C5A45" };
  const ox = width / 2;
  const oy = 112;
  const scale = 30;
  const iso = (x: number, y: number, z: number) => ({ x: ox + (x - y) * scale * 0.82, y: oy + (x + y) * scale * 0.42 - z * scale });
  const levels = Math.min(3, model.floors);
  let body = "";
  const pts = fp.map((p) => ({ x: p.x - box.x, y: p.y - box.y }));
  for (let l = 0; l < levels; l++) {
    const z0 = l * 2.85;
    const z1 = z0 + 2.75;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const p1 = iso(a.x, a.y, z0);
      const p2 = iso(b.x, b.y, z0);
      const p3 = iso(b.x, b.y, z1);
      const p4 = iso(a.x, a.y, z1);
      const shade = i % 2 === 0 ? pal.wall : "#E9EEE9";
      body += `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}" fill="${shade}" stroke="#C6D2CC"/>`;
    }
  }
  const topZ = levels * 2.85;
  const rise = model.roof.type === "datar" ? 0.3 : Math.tan((model.roof.pitch * Math.PI) / 180) * Math.min(box.w, box.h) * 0.4;
  const c = centroid(pts);
  const apex = iso(c.x, c.y, topZ + rise);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const p1 = iso(a.x, a.y, topZ);
    const p2 = iso(b.x, b.y, topZ);
    body += `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${apex.x},${apex.y}" fill="${pal.roof}" opacity="${0.72 + (i % 3) * 0.09}" stroke="#5F6D67"/>`;
  }
  const ground = pts.map((p) => iso(p.x - 1.2, p.y - 1.2, 0));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 340" role="img" aria-label="Ilustrasi isometrik rumah"><rect width="${width}" height="340" fill="#EAF3EE"/><circle cx="${width - 90}" cy="58" r="32" fill="#FDE68A" opacity=".45"/><polygon points="${ground.map((p) => `${p.x},${p.y}`).join(" ")}" fill="#DDEAE1" stroke="#C7DCD1"/>${body}</svg>`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] ?? char));
}

export function roomAreas(model: BuildingModel) {
  return generateLayout(model).map((r) => ({ name: r.name, area: polygonArea(r.polygon) }));
}
