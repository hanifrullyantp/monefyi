import * as THREE from "three";
import type { BuildingModel, FacadeSpec, Room, SpecState } from "../data/types";
import { paletteFor } from "../data/spec";
import { generateLayout } from "../geometry/layout";
import { boundingBox, centroid, polygonArea, polygonEdges, sharedEdgeLength, type Polygon, type Pt } from "../geometry/polygon";

export interface OpeningSpec {
  /** posisi tengah sepanjang tepi (0..1) */
  t: number;
  width: number;
  bottom: number;
  top: number;
  kind: "pintu" | "jendela" | "kaca_mati";
}

export interface WallSegment {
  a: Pt;
  b: Pt;
  openings: OpeningSpec[];
  interior: boolean;
  height: number;
  base: number;
}

export interface BuiltScene {
  group: THREE.Group;
  warnings: string[];
  dispose(): void;
}

const WALL_T = 0.16;
const INNER_T = 0.1;

/** Dinding dari tepi poligon: luar = tepi footprint, dalam = tepi bersama antar ruangan. */
export function deriveWalls(model: BuildingModel, rooms: Room[], level: number, base: number): WallSegment[] {
  const fp = model.levels[level]?.footprint.points ?? [];
  const height = model.levels[level]?.height ?? 3.2;
  const levelRooms = rooms.filter((r) => r.level === level);
  const segments: WallSegment[] = [];

  // Dinding luar: tepi footprint, jendela otomatis
  const edges = polygonEdges(fp);
  const frontEdgeIndex = edges.reduce((best, e, i) => {
    const mid = (e.a.y + e.b.y) / 2;
    const bestMid = (edges[best].a.y + edges[best].b.y) / 2;
    return mid < bestMid ? i : best;
  }, 0);

  edges.forEach((e, i) => {
    const openings: OpeningSpec[] = [];
    if (i === frontEdgeIndex) {
      openings.push({ t: 0.28, width: Math.min(1.0, e.length * 0.22), bottom: 0, top: 2.15, kind: "pintu" });
      if (e.length > 3.4) openings.push({ t: 0.7, width: Math.min(1.8, e.length * 0.3), bottom: 0.95, top: 2.15, kind: "jendela" });
    } else if (e.length >= 1.6) {
      const count = e.length > 5 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        openings.push({ t: (k + 1) / (count + 1), width: Math.min(1.3, e.length / (count + 1) * 0.6), bottom: 0.95, top: 2.1, kind: "jendela" });
      }
    }
    segments.push({ a: e.a, b: e.b, openings, interior: false, height, base });
  });

  // Dinding dalam: tepi bersama (dihitung sekali per pasangan)
  const seen = new Set<string>();
  for (let i = 0; i < levelRooms.length; i++) {
    for (let j = i + 1; j < levelRooms.length; j++) {
      const A = levelRooms[i];
      const B = levelRooms[j];
      if (sharedEdgeLength(A.polygon, B.polygon) < 0.4) continue;
      for (const ea of polygonEdges(A.polygon)) {
        for (const eb of polygonEdges(B.polygon)) {
          const ov = overlapOnEdge(ea.a, ea.b, eb.a, eb.b);
          if (!ov || ov.length < 0.5) continue;
          const key = `${ov.a.x.toFixed(2)},${ov.a.y.toFixed(2)}-${ov.b.x.toFixed(2)},${ov.b.y.toFixed(2)}`;
          const rev = `${ov.b.x.toFixed(2)},${ov.b.y.toFixed(2)}-${ov.a.x.toFixed(2)},${ov.a.y.toFixed(2)}`;
          if (seen.has(key) || seen.has(rev)) continue;
          seen.add(key);
          const doorWidth = Math.min(0.9, ov.length * 0.6);
          segments.push({
            a: ov.a, b: ov.b, interior: true, height, base,
            openings: ov.length > 1.2 ? [{ t: 0.5, width: doorWidth, bottom: 0, top: 2.1, kind: "pintu" }] : [],
          });
        }
      }
    }
  }
  return segments;
}

function overlapOnEdge(a1: Pt, a2: Pt, b1: Pt, b2: Pt, tol = 0.08): { a: Pt; b: Pt; length: number } | null {
  const dx = a2.x - a1.x;
  const dy = a2.y - a1.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const ux = dx / len;
  const uy = dy / len;
  const off = (p: Pt) => Math.abs((p.x - a1.x) * uy - (p.y - a1.y) * ux);
  if (off(b1) > tol || off(b2) > tol) return null;
  const proj = (p: Pt) => (p.x - a1.x) * ux + (p.y - a1.y) * uy;
  const lo = Math.max(0, Math.min(proj(b1), proj(b2)));
  const hi = Math.min(len, Math.max(proj(b1), proj(b2)));
  if (hi - lo < 0.05) return null;
  return { a: { x: a1.x + ux * lo, y: a1.y + uy * lo }, b: { x: a1.x + ux * hi, y: a1.y + uy * hi }, length: hi - lo };
}

export interface MeshPalette {
  wall: string;
  accent: string;
  roof: string;
  trim: string;
  floor: string;
  wet: string;
}

export function paletteFromSpec(facade: FacadeSpec | undefined, spec: SpecState | undefined): MeshPalette {
  const p = paletteFor(facade?.palette ?? "putih-kayu");
  const premium = spec?.lantai === "premium" || spec?.lantai === "menengah";
  return {
    wall: p.wall,
    accent: p.accent,
    roof: p.roof,
    trim: p.trim,
    floor: premium ? "#C9B79A" : "#D8CBB6",
    wet: "#D6E8EE",
  };
}

export interface BuildOptions {
  exploded?: boolean;
  shadows?: boolean;
  wireframe?: boolean;
  showInterior?: boolean;
}

/** Bangun seluruh rumah dari model + facade secara prosedural. */
export function buildHouse(model: BuildingModel, facade: FacadeSpec | undefined, spec: SpecState | undefined, opts: BuildOptions = {}): BuiltScene {
  const warnings: string[] = [];
  const group = new THREE.Group();
  const disposables: (THREE.BufferGeometry | THREE.Material)[] = [];
  const pal = paletteFromSpec(facade, spec);
  const rooms = generateLayout(model);

  const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.02, flatShading: false, wireframe: opts.wireframe, ...extra });
    disposables.push(m);
    return m;
  };
  const wallMat = mat(pal.wall, { side: THREE.DoubleSide });
  const innerMat = mat("#FBF8F1", { side: THREE.DoubleSide });
  const accentMat = mat(pal.accent);
  const roofMat = mat(pal.roof, { side: THREE.DoubleSide, roughness: 0.85 });
  const trimMat = mat(pal.trim, { roughness: 0.6 });
  const glassMat = mat("#A9D8E8", { transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.1 });
  const frameMat = mat("#6B7671", { roughness: 0.5 });
  const floorMat = mat(pal.floor);
  const wetMat = mat(pal.wet);
  const groundMat = mat("#D9E7DC", { roughness: 1 });
  const greenMat = mat("#8FBF9A", { roughness: 1 });
  const stoneMat = mat("#CFD4CC", { roughness: 1 });
  const metalMat = mat("#93A29B", { roughness: 0.45, metalness: 0.3 });

  const fp0 = model.levels[0]?.footprint.points ?? [];
  const box0 = boundingBox(fp0);
  const centerOffset = { x: -(box0.x + box0.w / 2), z: -(box0.y + box0.h / 2) };

  const addGeo = (geo: THREE.BufferGeometry, material: THREE.Material, part?: Record<string, unknown>) => {
    disposables.push(geo);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = Boolean(opts.shadows);
    mesh.receiveShadow = Boolean(opts.shadows);
    if (part) mesh.userData = { selectable: true, part };
    group.add(mesh);
    return mesh;
  };

  // Tanah
  const ground = new THREE.Mesh(new THREE.CircleGeometry(Math.max(22, box0.w * 2.4), 48), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.32;
  ground.receiveShadow = Boolean(opts.shadows);
  disposables.push(ground.geometry);
  group.add(ground);

  if (facade?.planter || facade?.fence) {
    const garden = new THREE.Mesh(new THREE.CircleGeometry(Math.max(14, box0.w * 1.5), 32), greenMat);
    garden.rotation.x = -Math.PI / 2;
    garden.position.y = -0.3;
    disposables.push(garden.geometry);
    group.add(garden);
  }

  const explodedGap = opts.exploded && model.floors > 1 ? 2.6 : 0;

  model.levels.forEach((level, li) => {
    const base = li * (level.height + 0.24) + (li > 0 ? explodedGap : 0);
    const fp = level.footprint.points ?? fp0;
    if (fp.length < 3) return;

    // Lantai (extrude footprint)
    const slabShape = shapeFrom(fp, centerOffset);
    const slabGeo = new THREE.ExtrudeGeometry(slabShape, { depth: 0.22, bevelEnabled: false });
    slabGeo.rotateX(-Math.PI / 2);
    slabGeo.translate(0, base + 0.22, 0);
    addGeo(slabGeo, stoneMat, { kind: "floor", name: `Lantai ${li + 1}`, level: li, area: Math.round(polygonArea(fp) * 10) / 10 });

    // Lantai per ruangan (warna berbeda untuk area basah)
    for (const room of rooms.filter((r) => r.level === li)) {
      const shape = shapeFrom(room.polygon, centerOffset);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, base + 0.25, 0);
      const c = centroid(room.polygon);
      addGeo(geo, room.wet ? wetMat : floorMat, {
        kind: "room", name: room.name, level: li, area: Math.round(polygonArea(room.polygon) * 10) / 10, wet: room.wet,
        roomId: room.id, cx: c.x, cy: c.y,
      });
      if (room.wet) {
        const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.4, 12), frameMat);
        fixture.position.set(c.x + centerOffset.x, base + 0.45, c.y + centerOffset.z);
        disposables.push(fixture.geometry);
        fixture.userData = { selectable: true, part: { kind: "room", name: room.name, level: li, area: Math.round(polygonArea(room.polygon) * 10) / 10, wet: true } };
        group.add(fixture);
      }
    }

    // Dinding
    const walls = deriveWalls(model, rooms, li, base + 0.24);
    for (const seg of walls) {
      buildWall(seg, seg.interior ? innerMat : wallMat, seg.interior ? INNER_T : WALL_T, { glassMat, frameMat, trimMat }, addGeo, centerOffset);
    }

    // Tangga
    if (li > 0 || model.floors > 1) {
      if (li === 0 && model.floors > 1) {
        for (let st = 0; st < 12; st++) {
          const g = new THREE.BoxGeometry(1.05, 0.16, 0.28);
          g.translate(box0.w * 0.24 + centerOffset.x, base + 0.4 + st * 0.26, box0.h * 0.1 + st * 0.24 + centerOffset.z);
          addGeo(g, floorMat);
        }
      }
    }
  });

  // Atap
  const topBase = model.levels.reduce((s, l) => s + l.height + 0.24, 0) + explodedGap * Math.max(0, model.floors - 1);
  buildRoof(model, facade, fp0, topBase, roofMat, trimMat, addGeo, centerOffset, warnings);

  // Elemen tampak
  if (facade) buildFacadeElements(facade, fp0, box0, topBase, model, { accentMat, trimMat, metalMat, glassMat, stoneMat, wallMat }, addGeo, centerOffset);

  return {
    group,
    warnings,
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}

function shapeFrom(poly: Polygon, offset: { x: number; z: number }): THREE.Shape {
  const shape = new THREE.Shape();
  poly.forEach((p, i) => {
    const x = p.x + offset.x;
    const y = p.y + offset.z;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

type AddGeo = (geo: THREE.BufferGeometry, material: THREE.Material, part?: Record<string, unknown>) => THREE.Mesh;

/** Dinding dengan lubang bukaan: dibangun dari kotak-kotak (pier, sill, header) + kusen/daun/kaca. */
function buildWall(
  seg: WallSegment,
  material: THREE.Material,
  thickness: number,
  mats: { glassMat: THREE.Material; frameMat: THREE.Material; trimMat: THREE.Material },
  addGeo: AddGeo,
  offset: { x: number; z: number },
) {
  const dx = seg.b.x - seg.a.x;
  const dy = seg.b.y - seg.a.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.05) return;
  const angle = Math.atan2(dy, dx);
  const cx = (seg.a.x + seg.b.x) / 2 + offset.x;
  const cz = (seg.a.y + seg.b.y) / 2 + offset.z;
  const place = (geo: THREE.BufferGeometry, along: number, y: number, thicknessScale = 1) => {
    geo.translate(along - len / 2, 0, 0);
    geo.rotateY(-angle);
    geo.translate(cx, y, cz);
    void thicknessScale;
    return geo;
  };
  const box = (w: number, h: number, t: number) => new THREE.BoxGeometry(Math.max(0.01, w), Math.max(0.01, h), t);

  const sorted = [...seg.openings].sort((a, b) => a.t - b.t);
  let cursor = 0;
  const partName = seg.interior ? "Dinding dalam" : "Dinding luar";
  for (const op of sorted) {
    const centerAlong = op.t * len;
    const start = Math.max(cursor, centerAlong - op.width / 2);
    const end = Math.min(len, centerAlong + op.width / 2);
    if (start > cursor + 0.02) {
      const w = start - cursor;
      const geo = place(box(w, seg.height, thickness), cursor + w / 2, seg.base + seg.height / 2);
      addGeo(geo, material, { kind: "wall", name: partName, area: Math.round(w * seg.height * 10) / 10 });
    }
    if (op.bottom > 0.02) {
      const geo = place(box(end - start, op.bottom, thickness), (start + end) / 2, seg.base + op.bottom / 2);
      addGeo(geo, material, { kind: "wall", name: partName, area: Math.round((end - start) * op.bottom * 10) / 10 });
    }
    if (op.top < seg.height - 0.02) {
      const h = seg.height - op.top;
      const geo = place(box(end - start, h, thickness), (start + end) / 2, seg.base + op.top + h / 2);
      addGeo(geo, material, { kind: "wall", name: partName, area: Math.round((end - start) * h * 10) / 10 });
    }
    // Kusen
    const frameT = thickness + 0.03;
    const jambH = op.top - op.bottom;
    for (const side of [-1, 1]) {
      const geo = place(box(0.06, jambH, frameT), (start + end) / 2 + side * (op.width / 2 - 0.03), seg.base + op.bottom + jambH / 2);
      addGeo(geo, mats.frameMat);
    }
    const head = place(box(op.width, 0.06, frameT), (start + end) / 2, seg.base + op.top - 0.03);
    addGeo(head, mats.frameMat);
    // Daun / kaca
    const panel = place(box(op.width - 0.12, jambH - 0.1, op.kind === "pintu" ? 0.05 : 0.03), (start + end) / 2, seg.base + op.bottom + jambH / 2);
    addGeo(panel, op.kind === "pintu" ? mats.trimMat : mats.glassMat, { kind: "wall", name: op.kind === "pintu" ? "Pintu" : "Jendela", area: Math.round(op.width * jambH * 10) / 10 });
    cursor = end;
  }
  if (cursor < len - 0.02) {
    const w = len - cursor;
    const geo = place(box(w, seg.height, thickness), cursor + w / 2, seg.base + seg.height / 2);
    addGeo(geo, material, { kind: "wall", name: partName, area: Math.round(w * seg.height * 10) / 10 });
  }
}

/**
 * Atap prosedural. Untuk footprint non-persegi: dekomposisi ke kotak-kotak (strip) lalu
 * tiap strip diberi atap pelana/limasan; footprint sangat kompleks → fallback datar + peringatan.
 */
function buildRoof(
  model: BuildingModel,
  facade: FacadeSpec | undefined,
  fp: Polygon,
  top: number,
  roofMat: THREE.Material,
  trimMat: THREE.Material,
  addGeo: AddGeo,
  offset: { x: number; z: number },
  warnings: string[],
) {
  if (fp.length < 3) return;
  const type = facade?.roofType ?? model.roof.type;
  const pitch = ((facade?.roofPitch ?? model.roof.pitch) * Math.PI) / 180;
  const overhang = facade?.overhang ?? model.roof.overhang;
  const strips = decomposeToRects(fp);

  if (type === "datar") {
    const shape = shapeFrom(expand(fp, overhang), offset);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, top + 0.24, 0);
    addGeo(geo, roofMat, { kind: "roof", name: "Atap datar" });
    // Parapet
    const edges = polygonEdges(expand(fp, overhang));
    for (const e of edges) {
      const len = e.length;
      const g = new THREE.BoxGeometry(len, 0.45, 0.14);
      g.translate(0, 0, 0);
      g.rotateY(-Math.atan2(e.b.y - e.a.y, e.b.x - e.a.x));
      g.translate((e.a.x + e.b.x) / 2 + offset.x, top + 0.68, (e.a.y + e.b.y) / 2 + offset.z);
      addGeo(g, trimMat, { kind: "roof", name: "Parapet" });
    }
    return;
  }

  if (strips.length > 6) {
    warnings.push("Bentuk atap terlalu kompleks untuk dekomposisi otomatis — dipakai atap datar. Sederhanakan footprint untuk atap miring.");
    const shape = shapeFrom(expand(fp, overhang), offset);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, top + 0.24, 0);
    addGeo(geo, roofMat, { kind: "roof", name: "Atap datar (fallback)" });
    return;
  }

  for (const r of strips) {
    const w = r.w + overhang * 2;
    const d = r.h + overhang * 2;
    const cx = r.x + r.w / 2 + offset.x;
    const cz = r.y + r.h / 2 + offset.z;
    const rise = Math.tan(pitch) * (Math.min(w, d) / 2);

    if (type === "pelana") {
      const along = w >= d;
      const span = along ? d : w;
      const length = along ? w : d;
      const slope = Math.hypot(span / 2, rise);
      for (const side of [-1, 1]) {
        const geo = new THREE.BoxGeometry(along ? length : slope, 0.14, along ? slope : length);
        if (along) {
          geo.rotateX(side * Math.atan2(rise, span / 2));
          geo.translate(cx, top + rise / 2 + 0.07, cz + side * (span / 4));
        } else {
          geo.rotateZ(-side * Math.atan2(rise, span / 2));
          geo.translate(cx + side * (span / 4), top + rise / 2 + 0.07, cz);
        }
        addGeo(geo, roofMat, { kind: "roof", name: "Atap pelana" });
      }
      const ridge = new THREE.BoxGeometry(along ? length + 0.1 : 0.16, 0.13, along ? 0.16 : length + 0.1);
      ridge.translate(cx, top + rise + 0.1, cz);
      addGeo(ridge, trimMat, { kind: "roof", name: "Nok" });
    } else {
      // limasan / perisai: piramida terpotong dari 4 sisi
      const geo = hipRoofGeometry(w, d, rise, type === "perisai");
      geo.translate(cx, top, cz);
      addGeo(geo, roofMat, { kind: "roof", name: `Atap ${type}` });
    }

    // Talang / lisplang
    const fascia = new THREE.BoxGeometry(w + 0.06, 0.16, d + 0.06);
    fascia.translate(cx, top + 0.02, cz);
    addGeo(fascia, trimMat, { kind: "roof", name: "Lisplang & talang" });
  }
}

function hipRoofGeometry(w: number, d: number, rise: number, fullPerisai: boolean): THREE.BufferGeometry {
  const hw = w / 2;
  const hd = d / 2;
  const ridgeInset = fullPerisai ? Math.min(hw, hd) * 0.55 : Math.max(0, (Math.max(w, d) - Math.min(w, d)) / 2);
  const along = w >= d;
  const r1 = along ? { x: -ridgeInset, z: 0 } : { x: 0, z: -ridgeInset };
  const r2 = along ? { x: ridgeInset, z: 0 } : { x: 0, z: ridgeInset };
  const c = [
    { x: -hw, z: -hd }, { x: hw, z: -hd }, { x: hw, z: hd }, { x: -hw, z: hd },
  ];
  const verts: number[] = [];
  const corners = c.map(p => [p.x, 0, p.z]);
  const leftRidge = [r1.x, rise, r1.z], rightRidge = [r2.x, rise, r2.z];
  const tri = (a: number[], b: number[], c: number[]) => verts.push(...a, ...b, ...c);
  const [a, b, e, f] = along ? corners : [corners[3], corners[0], corners[1], corners[2]];
  const [n, m] = along ? [leftRidge, rightRidge] : [rightRidge, leftRidge];
  // Each long roof face is a quad. Both triangles are needed in the front elevation.
  tri(a, m, b); tri(a, n, m); tri(b, m, e);
  tri(e, n, f); tri(e, m, n); tri(f, n, a);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Dekomposisi poligon ortogonal menjadi strip horizontal (scanline pada y unik). */
export function decomposeToRects(poly: Polygon): { x: number; y: number; w: number; h: number }[] {
  const ys = [...new Set(poly.map((p) => Math.round(p.y * 100) / 100))].sort((a, b) => a - b);
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const y0 = ys[i];
    const y1 = ys[i + 1];
    if (y1 - y0 < 0.05) continue;
    const ym = (y0 + y1) / 2;
    const xs: number[] = [];
    for (let j = 0; j < poly.length; j++) {
      const a = poly[j];
      const b = poly[(j + 1) % poly.length];
      if (a.y > ym !== b.y > ym) {
        xs.push(a.x + ((ym - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      if (xs[k + 1] - xs[k] < 0.05) continue;
      rects.push({ x: xs[k], y: y0, w: xs[k + 1] - xs[k], h: y1 - y0 });
    }
  }
  // Gabungkan strip vertikal yang identik rentang x-nya
  const merged: typeof rects = [];
  for (const r of rects) {
    const prev = merged[merged.length - 1];
    if (prev && Math.abs(prev.x - r.x) < 0.02 && Math.abs(prev.w - r.w) < 0.02 && Math.abs(prev.y + prev.h - r.y) < 0.02) {
      prev.h += r.h;
    } else merged.push({ ...r });
  }
  return merged;
}

function expand(poly: Polygon, amount: number): Polygon {
  const c = centroid(poly);
  return poly.map((p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * amount, y: p.y + (dy / len) * amount };
  });
}

function buildFacadeElements(
  f: FacadeSpec,
  fp: Polygon,
  box: { x: number; y: number; w: number; h: number },
  top: number,
  model: BuildingModel,
  mats: { accentMat: THREE.Material; trimMat: THREE.Material; metalMat: THREE.Material; glassMat: THREE.Material; stoneMat: THREE.Material; wallMat: THREE.Material },
  addGeo: AddGeo,
  offset: { x: number; z: number },
) {
  const frontZ = box.y + offset.z - 0.1;
  const levelH = (model.levels[0]?.height ?? 3.2) + 0.24;

  if (f.canopy) {
    const g = new THREE.BoxGeometry(Math.min(3.2, box.w * 0.5), 0.12, 1.6);
    g.translate(box.x + box.w * 0.3 + offset.x, levelH - 0.5, frontZ - 0.8);
    addGeo(g, mats.trimMat, { kind: "roof", name: "Kanopi depan", area: 4.5 });
    for (const side of [-1, 1]) {
      const post = new THREE.BoxGeometry(0.1, levelH - 0.5, 0.1);
      post.translate(box.x + box.w * 0.3 + offset.x + side * 1.3, (levelH - 0.5) / 2, frontZ - 1.5);
      addGeo(post, mats.metalMat);
    }
  }

  if (f.columns > 0) {
    for (let i = 0; i < f.columns; i++) {
      const x = box.x + ((i + 1) / (f.columns + 1)) * box.w + offset.x;
      const g = new THREE.CylinderGeometry(0.18, 0.2, levelH * (model.floors > 1 ? 1.8 : 1), 12);
      g.translate(x, (levelH * (model.floors > 1 ? 1.8 : 1)) / 2, frontZ - 0.45);
      addGeo(g, mats.accentMat, { kind: "wall", name: "Kolom dekoratif" });
    }
  }

  if (f.balcony && model.floors > 1) {
    const slab = new THREE.BoxGeometry(Math.min(3.4, box.w * 0.55), 0.16, 1.3);
    slab.translate(box.x + box.w * 0.55 + offset.x, levelH + 0.1, frontZ - 0.65);
    addGeo(slab, mats.stoneMat, { kind: "roof", name: "Balkon", area: 5.2 });
    const rail = new THREE.BoxGeometry(Math.min(3.4, box.w * 0.55), 0.06, 0.06);
    rail.translate(box.x + box.w * 0.55 + offset.x, levelH + 1.05, frontZ - 1.28);
    addGeo(rail, mats.metalMat);
    for (let i = 0; i <= 8; i++) {
      const bal = new THREE.BoxGeometry(0.04, 0.95, 0.04);
      bal.translate(box.x + box.w * 0.55 + offset.x - 1.7 + i * 0.42, levelH + 0.6, frontZ - 1.28);
      addGeo(bal, mats.metalMat);
    }
  }

  if (f.secondarySkin) {
    const g = new THREE.BoxGeometry(box.w * 0.42, levelH * 0.9, 0.08);
    g.translate(box.x + box.w * 0.72 + offset.x, levelH * 0.55, frontZ - 0.28);
    addGeo(g, mats.accentMat, { kind: "wall", name: "Secondary skin", area: 12 });
    for (let i = 0; i < 9; i++) {
      const slot = new THREE.BoxGeometry(box.w * 0.4, 0.05, 0.12);
      slot.translate(box.x + box.w * 0.72 + offset.x, 0.5 + i * 0.32, frontZ - 0.34);
      addGeo(slot, mats.trimMat);
    }
  }

  if (f.carport !== "tidak") {
    const cx = box.x - 1.6 + offset.x;
    const cz = box.y + box.h * 0.55 + offset.z;
    const slab = new THREE.BoxGeometry(3, 0.1, 5);
    slab.translate(cx, 0.06, cz);
    addGeo(slab, mats.stoneMat, { kind: "floor", name: "Carport", area: 15 });
    if (f.carport === "tertutup") {
      const roof = new THREE.BoxGeometry(3.2, 0.12, 5.2);
      roof.translate(cx, 2.5, cz);
      addGeo(roof, mats.trimMat, { kind: "roof", name: "Atap carport", area: 16 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const post = new THREE.BoxGeometry(0.12, 2.5, 0.12);
        post.translate(cx + sx * 1.45, 1.25, cz + sz * 2.4);
        addGeo(post, mats.metalMat);
      }
    }
  }

  if (f.fence) {
    const z = box.y - 1.8 + offset.z;
    for (let i = 0; i <= 12; i++) {
      const post = new THREE.BoxGeometry(0.09, 1.1, 0.09);
      post.translate(box.x - 2 + (i * (box.w + 4)) / 12 + offset.x, 0.55, z);
      addGeo(post, mats.metalMat);
    }
    for (const h of [0.35, 1.0]) {
      const rail = new THREE.BoxGeometry(box.w + 4, 0.06, 0.06);
      rail.translate(box.x + box.w / 2 + offset.x, h, z);
      addGeo(rail, mats.metalMat, { kind: "wall", name: "Pagar depan", area: 9 });
    }
  }

  if (f.accentWall) {
    const g = new THREE.BoxGeometry(box.w * 0.28, top * 0.75, 0.14);
    g.translate(box.x + box.w * 0.12 + offset.x, (top * 0.75) / 2, frontZ - 0.12);
    addGeo(g, mats.accentMat, { kind: "wall", name: "Dinding aksen", area: 7 });
  }

  if (f.planter) {
    for (let i = 0; i < 3; i++) {
      const g = new THREE.BoxGeometry(0.8, 0.45, 0.5);
      g.translate(box.x + 0.8 + i * 1.4 + offset.x, 0.22, frontZ - 1.9);
      addGeo(g, mats.stoneMat, { kind: "wall", name: "Planter box" });
    }
  }

  if (f.frontStairs) {
    for (let i = 0; i < 3; i++) {
      const g = new THREE.BoxGeometry(1.8, 0.14, 0.34);
      g.translate(box.x + box.w * 0.3 + offset.x, 0.07 + i * 0.14, frontZ - 0.5 - i * 0.34);
      addGeo(g, mats.stoneMat, { kind: "floor", name: "Tangga depan", area: 2.4 });
    }
  }

  if (f.louvre) {
    const g = new THREE.BoxGeometry(1.4, 2.2, 0.1);
    g.translate(box.x + box.w * 0.88 + offset.x, 1.4, frontZ - 0.2);
    addGeo(g, mats.accentMat, { kind: "wall", name: "Roster / louvre", area: 4 });
  }
  void fp;
}
