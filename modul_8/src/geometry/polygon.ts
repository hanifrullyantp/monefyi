/**
 * Geometri poligon murni (meter). Tanpa React/DOM/three.
 * Konvensi: titik urut berlawanan jarum jam (CCW) untuk batas luar; y positif ke belakang (arah "dalam" lahan).
 */
export interface Pt {
  x: number;
  y: number;
}
export type Polygon = Pt[];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Edge {
  a: Pt;
  b: Pt;
  length: number;
}

export interface SharedEdge {
  a: Pt;
  b: Pt;
  length: number;
}

const EPS = 1e-9;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function polygonArea(poly: Polygon): number {
  if (poly.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    sum += p.x * q.y - q.x * p.y;
  }
  return Math.abs(sum) / 2;
}

export function signedArea(poly: Polygon): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    sum += p.x * q.y - q.x * p.y;
  }
  return sum / 2;
}

export function ensureCCW(poly: Polygon): Polygon {
  return signedArea(poly) < 0 ? [...poly].reverse() : [...poly];
}

export function polygonPerimeter(poly: Polygon): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) sum += dist(poly[i], poly[(i + 1) % poly.length]);
  return sum;
}

export function polygonEdges(poly: Polygon): Edge[] {
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length];
    return { a, b, length: dist(a, b) };
  });
}

export function boundingBox(poly: Polygon): Rect {
  if (!poly.length) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function centroid(poly: Polygon): Pt {
  const area = signedArea(poly);
  if (Math.abs(area) < EPS) {
    const box = boundingBox(poly);
    return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  }
  let cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const cross = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

export function pointInPolygon(pt: Pt, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i];
    const pj = poly[j];
    if (pi.y > pt.y !== pj.y > pt.y && pt.x < ((pj.x - pi.x) * (pt.y - pi.y)) / (pj.y - pi.y + EPS) + pi.x) inside = !inside;
  }
  return inside;
}

export function rectToPolygon(r: Rect): Polygon {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ];
}

export function polygonToRect(poly: Polygon): Rect {
  return boundingBox(poly);
}

export function translatePolygon(poly: Polygon, dx: number, dy: number): Polygon {
  return poly.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

export function scalePolygon(poly: Polygon, sx: number, sy: number, origin?: Pt): Polygon {
  const o = origin ?? { x: 0, y: 0 };
  return poly.map((p) => ({ x: o.x + (p.x - o.x) * sx, y: o.y + (p.y - o.y) * sy }));
}

/** Rotasi 90° (searah jarum jam) di sekitar pusat poligon. */
export function rotatePolygon90(poly: Polygon, times = 1): Polygon {
  let out = [...poly];
  const c = centroid(poly);
  for (let t = 0; t < ((times % 4) + 4) % 4; t++) {
    out = out.map((p) => ({ x: c.x + (p.y - c.y), y: c.y - (p.x - c.x) }));
  }
  return ensureCCW(out);
}

/** Geser tiap titik ke dalam sejauh `amount` (aproksimasi offset per tepi + normal). */
export function insetPolygon(poly: Polygon, amount: number): Polygon {
  const ccw = ensureCCW(poly);
  const edges = polygonEdges(ccw);
  const out: Pt[] = [];
  for (let i = 0; i < ccw.length; i++) {
    const prev = edges[(i - 1 + ccw.length) % ccw.length];
    const next = edges[i];
    const n1 = inwardNormal(prev);
    const n2 = inwardNormal(next);
    out.push({ x: ccw[i].x + (n1.x + n2.x) * amount, y: ccw[i].y + (n1.y + n2.y) * amount });
  }
  return out;
}

function inwardNormal(e: Edge): Pt {
  const dx = e.b.x - e.a.x;
  const dy = e.b.y - e.a.y;
  const len = Math.hypot(dx, dy) || 1;
  // CCW: interior berada di kiri arah tepi => normal (-dy, dx)
  return { x: -dy / len, y: dx / len };
}

function segmentsIntersect(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d = (a: Pt, b: Pt, c: Pt) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) return true;
  return false;
}

/** Poligon sederhana: >=3 titik, tidak ada sisi yang saling potong (kecuali berbagi titik ujung). */
export function isSimplePolygon(poly: Polygon): boolean {
  if (poly.length < 3) return false;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (i === j) continue;
      const adjacent = j === (i + 1) % n || i === (j + 1) % n;
      if (adjacent) continue;
      if (segmentsIntersect(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n])) return false;
    }
  }
  return polygonArea(poly) > 0.01;
}

/** Luas tumpang tindih dua poligon via clipping Sutherland–Hodgman (butuh poligon konveks kliping). */
export function polygonIntersectionArea(subject: Polygon, clip: Polygon): number {
  let output = ensureCCW(subject);
  const clipPoly = ensureCCW(clip);
  for (let i = 0; i < clipPoly.length; i++) {
    const A = clipPoly[i];
    const B = clipPoly[(i + 1) % clipPoly.length];
    const input = output;
    output = [];
    if (!input.length) break;
    const inside = (p: Pt) => (B.x - A.x) * (p.y - A.y) - (B.y - A.y) * (p.x - A.x) >= -1e-7;
    const intersect = (p: Pt, q: Pt): Pt => {
      const a1 = B.y - A.y;
      const b1 = A.x - B.x;
      const c1 = a1 * A.x + b1 * A.y;
      const a2 = q.y - p.y;
      const b2 = p.x - q.x;
      const c2 = a2 * p.x + b2 * p.y;
      const det = a1 * b2 - a2 * b1;
      if (Math.abs(det) < 1e-12) return p;
      return { x: (b2 * c1 - b1 * c2) / det, y: (a1 * c2 - a2 * c1) / det };
    };
    for (let j = 0; j < input.length; j++) {
      const cur = input[j];
      const prev = input[(j - 1 + input.length) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) output.push(intersect(prev, cur));
        output.push(cur);
      } else if (inside(prev)) {
        output.push(intersect(prev, cur));
      }
    }
  }
  return output.length >= 3 ? polygonArea(output) : 0;
}

export function overlapArea(a: Polygon, b: Polygon): number {
  return polygonIntersectionArea(a, b);
}

/**
 * Luas irisan untuk poligon cekung: dekomposisi `b` menjadi strip konveks
 * (scanline) lalu jumlahkan irisan tiap strip. Akurat untuk bentuk ortogonal L/T/U.
 */
export function overlapAreaConcave(a: Polygon, b: Polygon): number {
  const pieces = orthogonalPieces(b);
  if (pieces.length <= 1) return polygonIntersectionArea(a, b);
  return pieces.reduce((sum, piece) => sum + polygonIntersectionArea(a, piece), 0);
}

/** Dekomposisi scanline menjadi persegi/strip konveks. */
export function orthogonalPieces(poly: Polygon): Polygon[] {
  const ys = [...new Set(poly.map((p) => Math.round(p.y * 1000) / 1000))].sort((x, y) => x - y);
  const out: Polygon[] = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const y0 = ys[i];
    const y1 = ys[i + 1];
    if (y1 - y0 < 1e-6) continue;
    const ym = (y0 + y1) / 2;
    const xs: number[] = [];
    for (let j = 0; j < poly.length; j++) {
      const p = poly[j];
      const q = poly[(j + 1) % poly.length];
      if (p.y > ym !== q.y > ym) xs.push(p.x + ((ym - p.y) / (q.y - p.y)) * (q.x - p.x));
    }
    xs.sort((x, y) => x - y);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      if (xs[k + 1] - xs[k] < 1e-6) continue;
      out.push(rectToPolygon({ x: xs[k], y: y0, w: xs[k + 1] - xs[k], h: y1 - y0 }));
    }
  }
  return out.length ? out : [poly];
}

/** Bidang dinding bersama: panjang tepi yang kolinear & bertumpang antara dua poligon. */
export function sharedEdges(a: Polygon, b: Polygon, tolerance = 0.06): SharedEdge[] {
  const out: SharedEdge[] = [];
  for (const ea of polygonEdges(a)) {
    for (const eb of polygonEdges(b)) {
      const overlap = collinearOverlap(ea, eb, tolerance);
      if (overlap && overlap.length > 0.05) out.push(overlap);
    }
  }
  return out;
}

export function sharedEdgeLength(a: Polygon, b: Polygon, tolerance = 0.06): number {
  return sharedEdges(a, b, tolerance).reduce((sum, e) => sum + e.length, 0);
}

function collinearOverlap(e1: Edge, e2: Edge, tol: number): SharedEdge | null {
  const dx = e1.b.x - e1.a.x;
  const dy = e1.b.y - e1.a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return null;
  const ux = dx / len;
  const uy = dy / len;
  // jarak titik e2 ke garis e1
  const off = (p: Pt) => Math.abs((p.x - e1.a.x) * uy - (p.y - e1.a.y) * ux);
  if (off(e2.a) > tol || off(e2.b) > tol) return null;
  const proj = (p: Pt) => (p.x - e1.a.x) * ux + (p.y - e1.a.y) * uy;
  const t1 = 0;
  const t2 = len;
  const t3 = proj(e2.a);
  const t4 = proj(e2.b);
  const lo = Math.max(Math.min(t1, t2), Math.min(t3, t4));
  const hi = Math.min(Math.max(t1, t2), Math.max(t3, t4));
  if (hi - lo <= 1e-6) return null;
  return {
    a: { x: e1.a.x + ux * lo, y: e1.a.y + uy * lo },
    b: { x: e1.a.x + ux * hi, y: e1.a.y + uy * hi },
    length: hi - lo,
  };
}

/** Tepi poligon yang menempel pada batas footprint (dinding luar ruangan). */
export function exteriorEdgeLength(room: Polygon, footprint: Polygon, tolerance = 0.06): number {
  return sharedEdgeLength(room, footprint, tolerance);
}

/** Tepi yang tidak berbagi dengan ruangan lain dan tidak di batas footprint → partisi bebas (jarang). */
export function snap(value: number, step = 0.1): number {
  return Math.round(value / step) * step;
}

export function snapPolygon(poly: Polygon, step = 0.1): Polygon {
  return poly.map((p) => ({ x: snap(p.x, step), y: snap(p.y, step) }));
}

/** Rapikan: buang titik duplikat & kolinear. */
export function simplifyPolygon(poly: Polygon, tol = 0.02): Polygon {
  const pts: Pt[] = [];
  for (const p of poly) {
    const last = pts[pts.length - 1];
    if (!last || dist(last, p) > tol) pts.push(p);
  }
  while (pts.length > 2 && dist(pts[0], pts[pts.length - 1]) < tol) pts.pop();
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i - 1 + pts.length) % pts.length];
    const b = pts[i];
    const c = pts[(i + 1) % pts.length];
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (Math.abs(cross) > tol) out.push(b);
  }
  return out.length >= 3 ? out : pts;
}

/** Bagi persegi menjadi dua dengan garis vertikal/horizontal pada posisi t (0..1). */
export function splitRect(r: Rect, ratio: number, axis: "x" | "y"): [Rect, Rect] {
  const t = Math.min(0.98, Math.max(0.02, ratio));
  if (axis === "x") {
    const cut = r.w * t;
    return [{ ...r, w: cut }, { x: r.x + cut, y: r.y, w: r.w - cut, h: r.h }];
  }
  const cut = r.h * t;
  return [{ ...r, h: cut }, { x: r.x, y: r.y + cut, w: r.w, h: r.h - cut }];
}

/** Titik tengah tepi terpanjang (untuk penempatan pintu/jendela). */
export function longestEdgeMidpoint(poly: Polygon, filter?: (e: Edge) => boolean): { point: Pt; edge: Edge; angle: number } | null {
  const edges = polygonEdges(poly).filter((e) => (filter ? filter(e) : true)).sort((a, b) => b.length - a.length);
  const e = edges[0];
  if (!e) return null;
  return { point: { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 }, edge: e, angle: Math.atan2(e.b.y - e.a.y, e.b.x - e.a.x) };
}
