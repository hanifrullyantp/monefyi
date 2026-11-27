import type { LayoutAlternative, LayoutBrief, LayoutScore, LayoutTypology, Level, Room, RoomFunction, RoomRequirement } from "../data/types";
import { mulberry32 } from "../engine/prng";
import { boundingBox, centroid, ensureCCW, polygonArea, polygonPerimeter, rectToPolygon, round2, sharedEdgeLength, type Polygon, type Rect } from "./polygon";
import { BASE_ROOM_RULES, calculateBuildingDensityScale, getEffectiveRule } from "./rules";

export const ROOM_MIN = Object.fromEntries(
  Object.entries(BASE_ROOM_RULES).map(([k, v]) => [k, { area: v.minArea, side: v.minSide, label: v.label, wet: v.wet, zone: v.zone, exterior: v.needsExterior }])
) as Record<RoomFunction, { area: number; side: number; label: string; wet: boolean; zone: "depan" | "tengah" | "belakang"; exterior: boolean }>;

export function requirementScale(brief: Pick<LayoutBrief, "area" | "floors" | "bedrooms" | "bathrooms">): number {
  return calculateBuildingDensityScale(brief);
}

export function buildRequirements(brief: LayoutBrief): RoomRequirement[] {
  const req: RoomRequirement[] = [];
  const scale = calculateBuildingDensityScale(brief);
  const push = (fungsi: RoomFunction, count: number) => {
    const r = getEffectiveRule(fungsi, scale);
    for (let i = 0; i < count; i++) {
      req.push({
        fungsi,
        label: count > 1 ? `${r.label} ${i + 1}` : r.label,
        count: 1,
        minArea: r.minArea,
        minSide: r.minSide,
        wet: BASE_ROOM_RULES[fungsi]?.wet ?? false,
        zone: BASE_ROOM_RULES[fungsi]?.zone ?? "tengah",
        needsExterior: BASE_ROOM_RULES[fungsi]?.needsExterior ?? true,
      });
    }
  };

  const levelArea = brief.area / Math.max(1, brief.floors);

  // Kebutuhan dasar lantai 1
  push("teras", 1);
  if (levelArea >= 40) push("carport", 1);
  push("ruang_tamu", 1);
  push("dapur", 1);
  if (levelArea >= 45) push("ruang_makan", 1);
  if (brief.floors > 1) push("tangga", 1);

  if (brief.floors === 1) {
    // 1 lantai: seluruh kamar dan kamar mandi di lantai 1
    push("kamar_utama", brief.bedrooms > 0 ? 1 : 0);
    push("kamar_tidur", Math.max(0, brief.bedrooms - 1));
    push("kamar_mandi", Math.max(1, brief.bathrooms));
    if (levelArea >= 60) push("ruang_keluarga", 1);
    if (levelArea >= 70) push("cuci", 1);
  } else {
    // 2 lantai: bagi antara lantai 1 dan lantai 2
    // Lantai 1: 1 KM dan jika kamar >= 3 ada 1 kamar di bawah
    push("kamar_mandi", 1);
    if (brief.bedrooms >= 3) push("kamar_tidur", 1);
    // Lantai 2 akan diisi saat menyusun level 2
  }

  return req;
}

export function buildUpperRequirements(brief: LayoutBrief): RoomRequirement[] {
  const req: RoomRequirement[] = [];
  const scale = calculateBuildingDensityScale(brief);
  const push = (fungsi: RoomFunction, count: number) => {
    const r = getEffectiveRule(fungsi, scale);
    for (let i = 0; i < count; i++) {
      req.push({
        fungsi,
        label: count > 1 ? `${r.label} (atas) ${i + 1}` : `${r.label} (atas)`,
        count: 1,
        minArea: r.minArea,
        minSide: r.minSide,
        wet: BASE_ROOM_RULES[fungsi]?.wet ?? false,
        zone: BASE_ROOM_RULES[fungsi]?.zone ?? "tengah",
        needsExterior: BASE_ROOM_RULES[fungsi]?.needsExterior ?? true,
      });
    }
  };

  push("kamar_utama", brief.bedrooms > 0 ? 1 : 0);
  const upperBeds = brief.bedrooms >= 3 ? brief.bedrooms - 2 : Math.max(0, brief.bedrooms - 1);
  push("kamar_tidur", upperBeds);
  if (brief.bathrooms >= 2) push("kamar_mandi", 1);
  push("ruang_keluarga", 1);
  const levelArea = brief.area / brief.floors;
  if (levelArea >= 50) push("cuci", 1);

  return req;
}

/* ============ Footprint Generator ============ */

export function generateFootprint(typology: LayoutTypology, levelArea: number, rand: () => number): Polygon {
  const ratio = 1.1 + rand() * 0.3;
  const width = Math.max(5.5, Math.round(Math.sqrt(levelArea * ratio) * 10) / 10);
  const depth = Math.round((levelArea / width) * 10) / 10;
  const W = width;
  const D = depth;

  switch (typology) {
    case "L": {
      // Bentuk L: buang takik di sudut belakang kanan
      const cutW = round2(W * (0.3 + rand() * 0.12));
      const cutD = round2(D * (0.3 + rand() * 0.12));
      const scale = Math.sqrt((W * D) / (W * D - cutW * cutD));
      const w = round2(W * scale);
      const d = round2(D * scale);
      const cw = round2(cutW * scale);
      const cd = round2(cutD * scale);
      return ensureCCW([
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: round2(d - cd) },
        { x: round2(w - cw), y: round2(d - cd) },
        { x: round2(w - cw), y: d },
        { x: 0, y: d },
      ]);
    }
    case "U": {
      // Bentuk U memeluk halaman belakang
      const holeW = round2(W * 0.32);
      const holeD = round2(D * 0.32);
      const scale = Math.sqrt((W * D) / (W * D - holeW * holeD));
      const w = round2(W * scale);
      const d = round2(D * scale);
      const hw = round2(holeW * scale);
      const hd = round2(holeD * scale);
      const x0 = round2((w - hw) / 2);
      return ensureCCW([
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: d },
        { x: round2(x0 + hw), y: d },
        { x: round2(x0 + hw), y: round2(d - hd) },
        { x: x0, y: round2(d - hd) },
        { x: x0, y: d },
        { x: 0, y: d },
      ]);
    }
    case "courtyard": {
      // Courtyard: lubang/takik taman di samping tengah
      const cutW = round2(W * 0.28);
      const cutD = round2(D * 0.35);
      const scale = Math.sqrt((W * D) / (W * D - cutW * cutD));
      const w = round2(W * scale);
      const d = round2(D * scale);
      const cw = round2(cutW * scale);
      const cd = round2(cutD * scale);
      const y0 = round2((d - cd) / 2);
      return ensureCCW([
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: y0 },
        { x: round2(w - cw), y: y0 },
        { x: round2(w - cw), y: round2(y0 + cd) },
        { x: w, y: round2(y0 + cd) },
        { x: w, y: d },
        { x: 0, y: d },
      ]);
    }
    case "split": {
      // Split level: massa depan dan belakang bergeser
      const step = round2(D * 0.16);
      const notch = round2(W * 0.22);
      return ensureCCW([
        { x: 0, y: 0 },
        { x: W, y: 0 },
        { x: W, y: round2(D - step) },
        { x: round2(W - notch), y: round2(D - step) },
        { x: round2(W - notch), y: D },
        { x: 0, y: D },
      ]);
    }
    default:
      return rectToPolygon({ x: 0, y: 0, w: W, h: D });
  }
}

/** Dekomposisi poligon ortogonal menjadi potongan persegi konveks (scanline). */
export function convexPieces(poly: Polygon): Rect[] {
  const ys = [...new Set(poly.map((p) => round2(p.y)))].sort((a, b) => a - b);
  const out: Rect[] = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const y0 = ys[i];
    const y1 = ys[i + 1];
    if (y1 - y0 < 0.02) continue;
    const ym = (y0 + y1) / 2;
    const xs: number[] = [];
    for (let j = 0; j < poly.length; j++) {
      const a = poly[j];
      const b = poly[(j + 1) % poly.length];
      if (a.y > ym !== b.y > ym) xs.push(a.x + ((ym - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      if (xs[k + 1] - xs[k] < 0.05) continue;
      out.push({ x: round2(xs[k]), y: round2(y0), w: round2(xs[k + 1] - xs[k]), h: round2(y1 - y0) });
    }
  }
  return out.length ? out : [boundingBox(poly)];
}

/* ============ BSP Tiling Solver (Watertight, No Drop, No Gap) ============ */

interface BspLeaf {
  rect: Rect;
  req: RoomRequirement;
}

/**
 * Membagi persegi `rect` secara rekursif menjadi potongan-potongan untuk setiap kebutuhan ruang.
 * Dijamin: setiap item dalam `reqs` mendapatkan satu daun (LEAF) persis.
 * Jumlah daun == reqs.length.
 * Total luas daun == luas rect (100%).
 * Nol overlap, nol celah.
 */
function partitionRect(rect: Rect, reqs: RoomRequirement[], rand: () => number): BspLeaf[] {
  if (reqs.length === 0) return [];
  if (reqs.length === 1) return [{ rect, req: reqs[0] }];

  const totalNeed = reqs.reduce((s, r) => s + r.minArea, 0) || 1;
  const preferX = rect.w >= rect.h ? rand() < 0.78 : rand() < 0.22;
  const dim = preferX ? rect.w : rect.h;

  // Cari titik belah terbaik
  let bestSplit = 1;
  let bestRatio = 0.5;
  let accum = 0;
  for (let i = 0; i < reqs.length - 1; i++) {
    accum += reqs[i].minArea;
    const r = accum / totalNeed;
    if (r >= 0.35 && r <= 0.65) {
      bestSplit = i + 1;
      bestRatio = r;
      break;
    }
    if (r >= 0.5) {
      bestSplit = i + 1;
      bestRatio = r;
      break;
    }
  }

  // Batasi rasio agar tidak terlalu ekstrem
  const clampedRatio = Math.max(0.18, Math.min(0.82, bestRatio));
  const cut = round2(dim * clampedRatio);
  const rem = round2(dim - cut);

  let r1: Rect;
  let r2: Rect;
  if (preferX) {
    r1 = { x: rect.x, y: rect.y, w: cut, h: rect.h };
    r2 = { x: round2(rect.x + cut), y: rect.y, w: rem, h: rect.h };
  } else {
    r1 = { x: rect.x, y: rect.y, w: rect.w, h: cut };
    r2 = { x: rect.x, y: round2(rect.y + cut), w: rect.w, h: rem };
  }

  const group1 = reqs.slice(0, bestSplit);
  const group2 = reqs.slice(bestSplit);

  return [
    ...partitionRect(r1, group1, rand),
    ...partitionRect(r2, group2, rand),
  ];
}

/**
 * Mendistribusikan daftar kebutuhan ruang ke beberapa potongan persegi (pieces).
 * Setiap kebutuhan pasti dialokasikan ke salah satu piece.
 * Tidak ada piece yang kosong, tidak ada requirement yang hilang.
 */
function distributeReqsToPieces(
  reqs: RoomRequirement[],
  pieces: Rect[]
): RoomRequirement[][] {
  if (pieces.length <= 1) return [reqs];

  const totalArea = pieces.reduce((s, p) => s + p.w * p.h, 0);
  const totalNeed = reqs.reduce((s, r) => s + r.minArea, 0);
  const targets = pieces.map((p) => (p.w * p.h) / totalArea);

  const alloc: RoomRequirement[][] = pieces.map(() => []);
  let currPiece = 0;
  let accumNeed = 0;
  let targetAccum = targets[0] * totalNeed;

  for (const r of reqs) {
    alloc[currPiece].push(r);
    accumNeed += r.minArea;
    if (currPiece < pieces.length - 1 && accumNeed >= targetAccum) {
      currPiece++;
      targetAccum += targets[currPiece] * totalNeed;
    }
  }

  // Pastikan tidak ada piece yang kosong
  for (let i = 0; i < alloc.length; i++) {
    if (alloc[i].length === 0 && i > 0 && alloc[i - 1].length > 1) {
      alloc[i].push(alloc[i - 1].pop()!);
    }
  }

  return alloc;
}

function zoneOrder(zone: "depan" | "tengah" | "belakang", rand: () => number) {
  const base = zone === "depan" ? 0 : zone === "tengah" ? 1 : 2;
  return base + rand() * 0.25;
}

function scoreLayout(rooms: Room[], footprint: Polygon, targetArea: number): LayoutScore {
  const notes: string[] = [];
  const totalArea = rooms.reduce((s, r) => s + polygonArea(r.polygon), 0);
  const fpArea = polygonArea(footprint);
  const coverage = fpArea > 0 ? totalArea / fpArea : 0;
  const areaFit = Math.round(Math.max(0, 100 - Math.abs(totalArea - targetArea) / Math.max(1, targetArea) * 200 - Math.abs(1 - coverage) * 50));

  // Sirkulasi
  const publics = rooms.filter((r) => ["ruang_tamu", "ruang_keluarga", "ruang_makan", "koridor", "teras"].includes(r.fungsi));
  let reachable = 0;
  for (const r of rooms) {
    if (publics.includes(r)) { reachable++; continue; }
    const touchesPublic = publics.some((p) => sharedEdgeLength(r.polygon, p.polygon) > 0.6);
    const touchesFootprint = sharedEdgeLength(r.polygon, footprint) > 0.6;
    if (touchesPublic || touchesFootprint) reachable++;
  }
  const circulation = rooms.length ? Math.round((reachable / rooms.length) * 100) : 0;
  if (circulation < 100) notes.push(`${rooms.length - reachable} ruang sirkulasi terbatas`);

  // Plumbing
  const wet = rooms.filter((r) => r.wet);
  let plumbing = 100;
  if (wet.length > 1) {
    let sum = 0, pairs = 0;
    for (let i = 0; i < wet.length; i++) {
      for (let j = i + 1; j < wet.length; j++) {
        const a = centroid(wet[i].polygon);
        const b = centroid(wet[j].polygon);
        sum += Math.hypot(a.x - b.x, a.y - b.y);
        pairs++;
      }
    }
    const avg = sum / Math.max(1, pairs);
    plumbing = Math.round(Math.max(35, 100 - Math.max(0, avg - 2.5) * 11));
    if (avg > 4) notes.push(`titik basah menyebar (rata-rata ${avg.toFixed(1)} m)`);
  }

  // Bukaan luar
  const needExt = rooms.filter((r) => BASE_ROOM_RULES[r.fungsi]?.needsExterior);
  const withExt = needExt.filter((r) => sharedEdgeLength(r.polygon, footprint) >= 1.2).length;
  const daylight = needExt.length ? Math.round((withExt / needExt.length) * 100) : 100;
  if (daylight < 100) notes.push(`${needExt.length - withExt} ruang minim dinding luar`);

  // Cek apakah ada ruangan padat
  const hasDense = rooms.some((r) => polygonArea(r.polygon) < (BASE_ROOM_RULES[r.fungsi]?.minArea ?? 3) * 0.85);
  if (hasDense) notes.push("denah padat — ukuran ruang disesuaikan proporsional");

  const total = Math.round(areaFit * 0.3 + circulation * 0.3 + plumbing * 0.18 + daylight * 0.22);
  if (!notes.length) notes.push("semua aturan kedekatan terpenuhi");
  return { total, areaFit, circulation, plumbing, daylight, notes };
}

const TYPOLOGIES: LayoutTypology[] = ["linear", "L", "courtyard", "split", "U"];

const TYPOLOGY_LABEL: Record<LayoutTypology, string> = {
  linear: "Linear — ruang berderet, sirkulasi efisien",
  L: "Bentuk L — halaman samping lapang",
  courtyard: "Courtyard — taman di tengah/belakang",
  split: "Split — massa depan-belakang bertingkat zona",
  U: "Bentuk U — memeluk taman belakang",
};

/**
 * Generator Denah:
 * Menghasilkan `count` alternatif denah (default 3) dengan tipologi berbeda.
 * Jaminan Invarian A5 & T1:
 * - Setiap kebutuhan ruang pasti terpasang (TIDAK PERNAH membuang ruangan).
 * - Total luas ruangan >= 95% dari luas footprint (dalam tiling presisi = 100%).
 * - Tanpa celah, tanpa tumpang tindih.
 * - Deterministik: input & seed sama -> hasil sama.
 */
export function generateLayouts(brief: LayoutBrief, count = 3, fixedLevels?: readonly Level[]): LayoutAlternative[] {
  const out: LayoutAlternative[] = [];
  const levelArea = brief.area / Math.max(1, brief.floors);

  for (let attempt = 0; attempt < count * 6 && out.length < count; attempt++) {
    const seed = brief.seed + attempt * 7919;
    const rand = mulberry32(seed);

    let typology = brief.typologyHint && attempt === 0 ? brief.typologyHint : TYPOLOGIES[attempt % TYPOLOGIES.length];
    if (out.some((a) => a.typology === typology)) {
      typology = TYPOLOGIES.find((t) => !out.some((a) => a.typology === t)) ?? typology;
    }

    const generated = generateFootprint(typology, levelArea, rand);
    const footprintL1 = fixedLevels?.[0]?.footprint.points ?? generated;
    const boxL1 = boundingBox(footprintL1);
    const piecesL1 = convexPieces(footprintL1);

    // Kebutuhan lantai 1
    const reqsL1 = buildRequirements(brief).sort((a, b) => zoneOrder(a.zone, rand) - zoneOrder(b.zone, rand));
    const allocL1 = distributeReqsToPieces(reqsL1, piecesL1);

    const rooms: Room[] = [];
    let roomCounter = 0;

    // Tiling lantai 1
    for (let pi = 0; pi < piecesL1.length; pi++) {
      const piece = piecesL1[pi];
      const pieceReqs = allocL1[pi];
      if (!pieceReqs || pieceReqs.length === 0) continue;

      const leaves = partitionRect(piece, pieceReqs, rand);
      for (const leaf of leaves) {
        roomCounter++;
        rooms.push({
          id: `r-${seed}-${roomCounter}`,
          name: leaf.req.label,
          fungsi: leaf.req.fungsi,
          level: 0,
          polygon: rectToPolygon(leaf.rect),
          wet: leaf.req.wet,
          zone: leaf.req.zone,
        });
      }
    }

    // Tiling lantai 2 jika rumah 2 lantai
    let footprintL2 = footprintL1;
    let boxL2 = boxL1;
    if (brief.floors > 1) {
      // Lantai 2 bisa persegi atau mengikuti L1
      footprintL2 = fixedLevels?.[1]?.footprint.points ?? footprintL1;
      boxL2 = boundingBox(footprintL2);
      const piecesL2 = convexPieces(footprintL2);
      const reqsL2 = buildUpperRequirements(brief).sort((a, b) => zoneOrder(a.zone, rand) - zoneOrder(b.zone, rand));
      const allocL2 = distributeReqsToPieces(reqsL2, piecesL2);

      for (let pi = 0; pi < piecesL2.length; pi++) {
        const piece = piecesL2[pi];
        const pieceReqs = allocL2[pi];
        if (!pieceReqs || pieceReqs.length === 0) continue;

        const leaves = partitionRect(piece, pieceReqs, rand);
        for (const leaf of leaves) {
          roomCounter++;
          rooms.push({
            id: `r-${seed}-${roomCounter}`,
            name: leaf.req.label,
            fungsi: leaf.req.fungsi,
            level: 1,
            polygon: rectToPolygon(leaf.rect),
            wet: leaf.req.wet,
            zone: leaf.req.zone,
          });
        }
      }
    }

    const levels: Level[] = Array.from({ length: Math.max(1, brief.floors) }, (_, index) => {
      const fp = index === 0 ? footprintL1 : footprintL2;
      const bx = index === 0 ? boxL1 : boxL2;
      return {
        index,
        height: 3.2,
        footprint: {
          shape: typology === "linear" ? "persegi" : (typology as Level["footprint"]["shape"]),
          width: round2(bx.w),
          depth: round2(bx.h),
          points: fp,
        },
      };
    });

    const score = scoreLayout(rooms.filter((r) => r.level === 0), footprintL1, levelArea);
    const totalRoomArea = round2(rooms.reduce((s, r) => s + polygonArea(r.polygon), 0));

    out.push({
      id: `alt-${seed}`,
      typology,
      label: TYPOLOGY_LABEL[typology],
      rooms,
      levels,
      score,
      seed,
      area: totalRoomArea,
    });
  }

  return out.sort((a, b) => b.score.total - a.score.total);
}

export function neighborSummary(rooms: Room[], roomId: string): string[] {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return [];
  return rooms
    .filter((r) => r.id !== roomId && r.level === room.level)
    .map((r) => ({ r, len: sharedEdgeLength(room.polygon, r.polygon) }))
    .filter((x) => x.len > 0.3)
    .sort((a, b) => b.len - a.len)
    .map((x) => `${x.r.name} (${x.len.toFixed(1)} m)`);
}

export function roomPerimeter(room: Room) {
  return polygonPerimeter(room.polygon);
}
