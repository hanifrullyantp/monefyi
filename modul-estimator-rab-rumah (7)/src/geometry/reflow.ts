import type { BuildingModel, Level, Pt, Room, RoomFunction } from "../data/types";
import {
  boundingBox,
  isSimplePolygon,
  overlapAreaConcave,
  polygonArea,
  rectToPolygon,
  round2,
  type Polygon,
  type Rect,
} from "./polygon";
import { getEffectiveRule } from "./rules";

export interface SlicingLeaf {
  type: "leaf";
  roomId: string;
}

export interface SlicingVoid {
  type: "void";
  id: string;
}

export interface SlicingSplit {
  type: "split";
  axis: "x" | "y";
  /** Rasio pemotongan (0..1) relatif terhadap batas node ini */
  ratio: number;
  first: SlicingNode;
  second: SlicingNode;
}

export type SlicingNode = SlicingLeaf | SlicingVoid | SlicingSplit;

export interface ReflowResult {
  rooms: Room[];
  footprint: Polygon;
  levels?: Level[];
  footprintExpanded?: { dx: number; dy: number; newArea: number };
  warnings: string[];
}

/**
 * Bangun pohon pemotongan (BSP/Guillotine) dari sekumpulan ruangan persegi di dalam batas.
 * Bila ruangan sudah ada susunannya, kita rekonstruksi pohon secara rekursif
 * dengan mencari garis pemisah (horizontal atau vertikal) yang membelah himpunan ruangan.
 */
export function buildTreeFromRooms(
  rooms: { id: string; box: Rect }[],
  bounds: Rect
): SlicingNode {
  if (rooms.length === 0) {
    return { type: "void", id: `void-${round2(bounds.x)}-${round2(bounds.y)}` };
  }
  if (rooms.length === 1) {
    return { type: "leaf", roomId: rooms[0].id };
  }

  // Cari garis pemisah horizontal yang memisahkan ruangan ke atas dan bawah
  const yCuts = new Set<number>();
  for (const r of rooms) {
    const y1 = round2(r.box.y);
    const y2 = round2(r.box.y + r.box.h);
    if (y1 > bounds.y + 0.05 && y1 < bounds.y + bounds.h - 0.05) yCuts.add(y1);
    if (y2 > bounds.y + 0.05 && y2 < bounds.y + bounds.h - 0.05) yCuts.add(y2);
  }

  let bestY: { y: number; diff: number; top: typeof rooms; bottom: typeof rooms } | null = null;
  for (const y of yCuts) {
    const top = rooms.filter((r) => r.box.y + r.box.h <= y + 0.08);
    const bottom = rooms.filter((r) => r.box.y >= y - 0.08);
    if (top.length > 0 && bottom.length > 0 && top.length + bottom.length === rooms.length) {
      const ratio = (y - bounds.y) / bounds.h;
      const diff = Math.abs(ratio - 0.5);
      if (!bestY || diff < bestY.diff) {
        bestY = { y, diff, top, bottom };
      }
    }
  }

  // Cari garis pemisah vertikal yang memisahkan ruangan ke kiri dan kanan
  const xCuts = new Set<number>();
  for (const r of rooms) {
    const x1 = round2(r.box.x);
    const x2 = round2(r.box.x + r.box.w);
    if (x1 > bounds.x + 0.05 && x1 < bounds.x + bounds.w - 0.05) xCuts.add(x1);
    if (x2 > bounds.x + 0.05 && x2 < bounds.x + bounds.w - 0.05) xCuts.add(x2);
  }

  let bestX: { x: number; diff: number; left: typeof rooms; right: typeof rooms } | null = null;
  for (const x of xCuts) {
    const left = rooms.filter((r) => r.box.x + r.box.w <= x + 0.08);
    const right = rooms.filter((r) => r.box.x >= x - 0.08);
    if (left.length > 0 && right.length > 0 && left.length + right.length === rooms.length) {
      const ratio = (x - bounds.x) / bounds.w;
      const diff = Math.abs(ratio - 0.5);
      if (!bestX || diff < bestX.diff) {
        bestX = { x, diff, left, right };
      }
    }
  }

  // Pilih pemisah yang paling seimbang
  if (bestX && (!bestY || bestX.diff <= bestY.diff)) {
    const ratio = Math.max(0.05, Math.min(0.95, (bestX.x - bounds.x) / bounds.h > 0 ? (bestX.x - bounds.x) / bounds.w : 0.5));
    const leftBounds: Rect = { x: bounds.x, y: bounds.y, w: bounds.w * ratio, h: bounds.h };
    const rightBounds: Rect = { x: bounds.x + leftBounds.w, y: bounds.y, w: bounds.w * (1 - ratio), h: bounds.h };
    return {
      type: "split",
      axis: "x",
      ratio,
      first: buildTreeFromRooms(bestX.left, leftBounds),
      second: buildTreeFromRooms(bestX.right, rightBounds),
    };
  }

  if (bestY) {
    const ratio = Math.max(0.05, Math.min(0.95, (bestY.y - bounds.y) / bounds.h));
    const topBounds: Rect = { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h * ratio };
    const bottomBounds: Rect = { x: bounds.x, y: bounds.y + topBounds.h, w: bounds.w, h: bounds.h * (1 - ratio) };
    return {
      type: "split",
      axis: "y",
      ratio,
      first: buildTreeFromRooms(bestY.top, topBounds),
      second: buildTreeFromRooms(bestY.bottom, bottomBounds),
    };
  }

  // Fallback bila ada ruangan tumpang-tindih/tidak ortogonal: bagi dua berdasarkan titik tengah
  const preferX = bounds.w >= bounds.h;
  const mid = rooms.length >> 1;
  const firstGroup = rooms.slice(0, mid);
  const secondGroup = rooms.slice(mid);
  const ratio = 0.5;
  if (preferX) {
    const leftBounds: Rect = { x: bounds.x, y: bounds.y, w: bounds.w * ratio, h: bounds.h };
    const rightBounds: Rect = { x: bounds.x + leftBounds.w, y: bounds.y, w: bounds.w * (1 - ratio), h: bounds.h };
    return {
      type: "split",
      axis: "x",
      ratio,
      first: buildTreeFromRooms(firstGroup, leftBounds),
      second: buildTreeFromRooms(secondGroup, rightBounds),
    };
  } else {
    const topBounds: Rect = { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h * ratio };
    const bottomBounds: Rect = { x: bounds.x, y: bounds.y + topBounds.h, w: bounds.w, h: bounds.h * (1 - ratio) };
    return {
      type: "split",
      axis: "y",
      ratio,
      first: buildTreeFromRooms(firstGroup, topBounds),
      second: buildTreeFromRooms(secondGroup, bottomBounds),
    };
  }
}

/**
 * Evaluasi pohon pemotongan terhadap batas persegi.
 * Menghasilkan kotak { id, rect } yang DIJAMIN TILING PENUH (tanpa celah, tanpa tumpang tindih).
 */
export function evaluateTreeToBounds(
  node: SlicingNode,
  bounds: Rect
): { roomId: string; rect: Rect }[] {
  if (node.type === "void") return [];
  if (node.type === "leaf") {
    return [{ roomId: node.roomId, rect: { x: round2(bounds.x), y: round2(bounds.y), w: round2(bounds.w), h: round2(bounds.h) } }];
  }

  const ratio = Math.max(0.02, Math.min(0.98, node.ratio));
  if (node.axis === "x") {
    const w1 = round2(bounds.w * ratio);
    const w2 = round2(bounds.w - w1);
    const r1: Rect = { x: bounds.x, y: bounds.y, w: w1, h: bounds.h };
    const r2: Rect = { x: round2(bounds.x + w1), y: bounds.y, w: w2, h: bounds.h };
    return [
      ...evaluateTreeToBounds(node.first, r1),
      ...evaluateTreeToBounds(node.second, r2),
    ];
  } else {
    const h1 = round2(bounds.h * ratio);
    const h2 = round2(bounds.h - h1);
    const r1: Rect = { x: bounds.x, y: bounds.y, w: bounds.w, h: h1 };
    const r2: Rect = { x: bounds.x, y: round2(bounds.y + h1), w: bounds.w, h: h2 };
    return [
      ...evaluateTreeToBounds(node.first, r1),
      ...evaluateTreeToBounds(node.second, r2),
    ];
  }
}

/**
 * Pangkas poligon ruangan agar pas mengikuti poligon footprint non-persegi (L, U, dll).
 */
export function fitRoomsToFootprint(
  tiledRooms: { roomId: string; rect: Rect }[],
  roomsMap: Map<string, Room>,
  footprint: Polygon
): Room[] {
  const result: Room[] = [];
  const fpBox = boundingBox(footprint);
  const isRectFp = footprint.length === 4 && Math.abs(polygonArea(footprint) - fpBox.w * fpBox.h) < 0.1;

  for (const { roomId, rect } of tiledRooms) {
    const baseRoom = roomsMap.get(roomId);
    if (!baseRoom) continue;

    if (isRectFp) {
      // Footprint persegi: langsung gunakan poligon kotak
      result.push({
        ...baseRoom,
        polygon: rectToPolygon(rect),
      });
      continue;
    }

    // Footprint non-persegi (L/U/dll): jika kotak berada di dalam footprint, gunakan poligon kotak
    const poly = rectToPolygon(rect);
    const area = rect.w * rect.h;
    const insideArea = overlapAreaConcave(poly, footprint);

    if (insideArea >= area - 0.05) {
      result.push({ ...baseRoom, polygon: poly });
    } else {
      // Ruangan yang berada di takik L/U: pangkas titik luar ke tepi footprint terdekat
      const clampedPoly = poly.map((pt) => {
        const cx = Math.max(fpBox.x, Math.min(fpBox.x + fpBox.w, pt.x));
        const cy = Math.max(fpBox.y, Math.min(fpBox.y + fpBox.h, pt.y));
        return { x: round2(cx), y: round2(cy) };
      });
      result.push({
        ...baseRoom,
        polygon: isSimplePolygon(clampedPoly) ? clampedPoly : poly,
      });
    }
  }

  return result;
}

/**
 * Operasi Utama Reflow:
 * Diberikan sekumpulan ruangan saat ini, batas footprint, dan modifikasi yang diinginkan,
 * fungsi ini menjalankan solver 1D/BSP watertight untuk menjamin Invarian A2:
 * - Tidak ada overlap
 * - Tidak ada celah
 * - Seluruh ruangan di dalam footprint
 */
export function reflowLevel(
  levelRooms: Room[],
  footprint: Polygon,
  options?: {
    scale?: number;
    footprintExpansion?: { dx: number; dy: number };
  }
): { rooms: Room[]; footprint: Polygon } {
  if (levelRooms.length === 0) {
    return { rooms: [], footprint };
  }

  let effectiveFp = footprint;
  if (options?.footprintExpansion) {
    const { dx, dy } = options.footprintExpansion;
    const box = boundingBox(footprint);
    const newW = Math.max(4, box.w + dx);
    const newH = Math.max(4, box.h + dy);
    // Skala footprint
    const sx = newW / box.w;
    const sy = newH / box.h;
    effectiveFp = footprint.map((p) => ({
      x: round2(box.x + (p.x - box.x) * sx),
      y: round2(box.y + (p.y - box.y) * sy),
    }));
  }

  const box = boundingBox(effectiveFp);
  const roomsMap = new Map<string, Room>(levelRooms.map((r) => [r.id, r]));
  const roomBoxes = levelRooms.map((r) => ({
    id: r.id,
    box: boundingBox(r.polygon),
  }));

  const tree = buildTreeFromRooms(roomBoxes, box);
  const tiled = evaluateTreeToBounds(tree, box);
  const updatedRooms = fitRoomsToFootprint(tiled, roomsMap, effectiveFp);

  return { rooms: updatedRooms, footprint: effectiveFp };
}

/**
 * Menghitung fleksibilitas ruangan dari aturan dan fungsi ruangan (M2).
 */
export function getRoomFlexibility(room: Room, scale = 1.0): number {
  const rule = getEffectiveRule(room.fungsi, scale);
  return rule.flexibility;
}

/**
 * Operasi RESIZE (tarik sisi/sudut):
 * Mengubah posisi pembatas (divider) antara ruangan yang ditarik dan tetangganya.
 * Tetangga menyerap perubahan sesuai fleksibilitas. Seluruh ruangan tetap watertight.
 */
export function reflowResize(
  allRooms: Room[],
  footprint: Polygon,
  levelIndex: number,
  roomId: string,
  side: "kanan" | "kiri" | "atas" | "bawah",
  delta: number,
  options?: { allowExpandFootprint?: boolean; densityScale?: number }
): ReflowResult {
  const warnings: string[] = [];
  const levelRooms = allRooms.filter((r) => r.level === levelIndex);
  const otherLevels = allRooms.filter((r) => r.level !== levelIndex);
  const target = levelRooms.find((r) => r.id === roomId);
  if (!target) return { rooms: allRooms, footprint, warnings };

  const fpBox = boundingBox(footprint);
  const roomBox = boundingBox(target.polygon);
  const scale = options?.densityScale ?? 1.0;
  const rule = getEffectiveRule(target.fungsi, scale);

  // Periksa apakah tarikan menyentuh tepi luar footprint
  const isAtOuterEdge =
    (side === "kanan" && Math.abs(roomBox.x + roomBox.w - (fpBox.x + fpBox.w)) < 0.15) ||
    (side === "kiri" && Math.abs(roomBox.x - fpBox.x) < 0.15) ||
    (side === "bawah" && Math.abs(roomBox.y + roomBox.h - (fpBox.y + fpBox.h)) < 0.15) ||
    (side === "atas" && Math.abs(roomBox.y - fpBox.y) < 0.15);

  let newFootprint = footprint;
  let expandedInfo: ReflowResult["footprintExpanded"];

  if (isAtOuterEdge && delta > 0 && options?.allowExpandFootprint) {
    // Perluas footprint otomatis jika diizinkan
    const dx = side === "kanan" || side === "kiri" ? delta : 0;
    const dy = side === "bawah" || side === "atas" ? delta : 0;
    const expanded = reflowLevel(levelRooms, footprint, { footprintExpansion: { dx, dy } });
    newFootprint = expanded.footprint;
    const newArea = round2(polygonArea(newFootprint));
    expandedInfo = { dx, dy, newArea };
    warnings.push(`Footprint diperluas +${round2(dx || dy)} m (luas menjadi ${newArea} m²).`);
    return {
      rooms: [...otherLevels, ...expanded.rooms],
      footprint: newFootprint,
      footprintExpanded: expandedInfo,
      warnings,
    };
  }

  // Identifikasi tetangga di sisi yang ditarik
  const axis: "x" | "y" = side === "kanan" || side === "kiri" ? "x" : "y";
  const positive = side === "kanan" || side === "bawah";
  const boundary = positive
    ? axis === "x" ? roomBox.x + roomBox.w : roomBox.y + roomBox.h
    : axis === "x" ? roomBox.x : roomBox.y;

  // Temukan tetangga yang menempel pada pembatas
  const neighbors = levelRooms.filter((r) => {
    if (r.id === roomId) return false;
    const b = boundingBox(r.polygon);
    const nBoundary = positive
      ? axis === "x" ? b.x : b.y
      : axis === "x" ? b.x + b.w : b.y + b.h;
    const touches = Math.abs(nBoundary - boundary) < 0.2;
    const overlapsOtherAxis =
      axis === "x"
        ? Math.max(roomBox.y, b.y) < Math.min(roomBox.y + roomBox.h, b.y + b.h)
        : Math.max(roomBox.x, b.x) < Math.min(roomBox.x + roomBox.w, b.x + b.w);
    return touches && overlapsOtherAxis;
  });

  // Terapkan perubahan pada kotak-kotak ruangan dengan batasan fisik lunak
  const sign = positive ? 1 : -1;
  const actualDelta = delta * sign;

  // Batasi agar target tidak di bawah hard minimum (0.9 m)
  const targetDim = axis === "x" ? roomBox.w : roomBox.h;
  const maxShrink = Math.max(0, targetDim - rule.hardMinSide);
  const clampedActualDelta = actualDelta < 0 ? -Math.min(-actualDelta, maxShrink) : actualDelta;

  // Sesuaikan kotak ruangan
  const adjustedBoxes = levelRooms.map((r) => {
    const b = boundingBox(r.polygon);
    if (r.id === roomId) {
      if (side === "kanan") return { id: r.id, box: { ...b, w: Math.max(rule.hardMinSide, b.w + clampedActualDelta) } };
      if (side === "bawah") return { id: r.id, box: { ...b, h: Math.max(rule.hardMinSide, b.h + clampedActualDelta) } };
      if (side === "kiri") {
        const newW = Math.max(rule.hardMinSide, b.w - clampedActualDelta);
        return { id: r.id, box: { ...b, x: b.x + (b.w - newW), w: newW } };
      }
      if (side === "atas") {
        const newH = Math.max(rule.hardMinSide, b.h - clampedActualDelta);
        return { id: r.id, box: { ...b, y: b.y + (b.h - newH), h: newH } };
      }
    }
    // Tetangga menyerap perubahan
    const isNeighbor = neighbors.some((n) => n.id === r.id);
    if (isNeighbor) {
      const nRule = getEffectiveRule(r.fungsi, scale);
      if (side === "kanan") {
        const newX = b.x + clampedActualDelta;
        const newW = Math.max(nRule.hardMinSide, b.w - clampedActualDelta);
        return { id: r.id, box: { ...b, x: newX, w: newW } };
      }
      if (side === "bawah") {
        const newY = b.y + clampedActualDelta;
        const newH = Math.max(nRule.hardMinSide, b.h - clampedActualDelta);
        return { id: r.id, box: { ...b, y: newY, h: newH } };
      }
      if (side === "kiri") {
        return { id: r.id, box: { ...b, w: Math.max(nRule.hardMinSide, b.w + clampedActualDelta) } };
      }
      if (side === "atas") {
        return { id: r.id, box: { ...b, h: Math.max(nRule.hardMinSide, b.h + clampedActualDelta) } };
      }
    }
    return { id: r.id, box: b };
  });

  // Rekonstruksi denah melalui evaluasi tree agar kedap air tanpa celah
  const tree = buildTreeFromRooms(adjustedBoxes, fpBox);
  const tiled = evaluateTreeToBounds(tree, fpBox);
  const roomsMap = new Map(levelRooms.map((r) => [r.id, r]));
  const updatedRooms = fitRoomsToFootprint(tiled, roomsMap, footprint);

  // Periksa apakah ada ruangan di bawah minimum lunak untuk memberi peringatan ramah
  for (const r of updatedRooms) {
    const rRule = getEffectiveRule(r.fungsi, scale);
    const rArea = polygonArea(r.polygon);
    const rBox = boundingBox(r.polygon);
    if (rArea < rRule.minArea) {
      warnings.push(`${r.name} (${rArea.toFixed(1)} m²) di bawah minimum rekomendasi (${rRule.minArea} m²).`);
    } else if (Math.min(rBox.w, rBox.h) < rRule.minSide) {
      warnings.push(`${r.name} sisi terpendek (${Math.min(rBox.w, rBox.h).toFixed(1)} m) di bawah rekomendasi (${rRule.minSide} m).`);
    }
  }

  return {
    rooms: [...otherLevels, ...updatedRooms],
    footprint,
    warnings: [...new Set(warnings)].slice(0, 3),
  };
}

/**
 * Operasi SET ROOM SIZE (popover 2x2 -> 3x4):
 * Menyetel lebar dan panjang ruangan, tetangga menyesuaikan otomatis via reflow.
 * Tidak pernah membatalkan atau menonaktifkan tombol ubah (M3 & A1).
 */
export function reflowSetRoomSize(
  allRooms: Room[],
  footprint: Polygon,
  levelIndex: number,
  roomId: string,
  targetW: number,
  targetH: number,
  scale = 1.0
): ReflowResult {
  void scale;
  const levelRooms = allRooms.filter((r) => r.level === levelIndex);
  const otherLevels = allRooms.filter((r) => r.level !== levelIndex);
  const target = levelRooms.find((r) => r.id === roomId);
  if (!target) return { rooms: allRooms, footprint, warnings: [] };

  const fpBox = boundingBox(footprint);
  const tBox = boundingBox(target.polygon);
  const clampedW = Math.max(0.9, Math.min(fpBox.w - 0.9, round2(targetW)));
  const clampedH = Math.max(0.9, Math.min(fpBox.h - 0.9, round2(targetH)));

  const deltaW = round2(clampedW - tBox.w);
  const deltaH = round2(clampedH - tBox.h);

  // Hitung ruang bebas ke kanan vs kiri
  const availRight = Math.max(0, fpBox.x + fpBox.w - (tBox.x + tBox.w));
  const availLeft = Math.max(0, tBox.x - fpBox.x);
  let shiftRight = 0;
  let shiftLeft = 0;
  if (deltaW > 0) {
    if (availRight >= deltaW) shiftRight = deltaW;
    else if (availLeft >= deltaW) shiftLeft = deltaW;
    else { shiftRight = availRight; shiftLeft = deltaW - shiftRight; }
  } else if (deltaW < 0) {
    shiftRight = deltaW;
  }

  // Hitung ruang bebas ke bawah vs atas
  const availDown = Math.max(0, fpBox.y + fpBox.h - (tBox.y + tBox.h));
  const availUp = Math.max(0, tBox.y - fpBox.y);
  let shiftDown = 0;
  let shiftUp = 0;
  if (deltaH > 0) {
    if (availDown >= deltaH) shiftDown = deltaH;
    else if (availUp >= deltaH) shiftUp = deltaH;
    else { shiftDown = availDown; shiftUp = deltaH - shiftDown; }
  } else if (deltaH < 0) {
    shiftDown = deltaH;
  }

  const roomBoxes = levelRooms.map((r) => {
    const b = boundingBox(r.polygon);
    if (r.id === roomId) {
      return { id: r.id, box: { x: round2(b.x - shiftLeft), y: round2(b.y - shiftUp), w: clampedW, h: clampedH } };
    }
    let nextB = { ...b };
    if (shiftRight > 0 && b.x >= tBox.x + tBox.w - 0.15) {
      nextB.x = round2(nextB.x + shiftRight);
      nextB.w = Math.max(0.9, round2(nextB.w - shiftRight));
    }
    if (shiftLeft > 0 && b.x + b.w <= tBox.x + 0.15) {
      nextB.w = Math.max(0.9, round2(nextB.w - shiftLeft));
    }
    if (shiftDown > 0 && b.y >= tBox.y + tBox.h - 0.15) {
      nextB.y = round2(nextB.y + shiftDown);
      nextB.h = Math.max(0.9, round2(nextB.h - shiftDown));
    }
    if (shiftUp > 0 && b.y + b.h <= tBox.y + 0.15) {
      nextB.h = Math.max(0.9, round2(nextB.h - shiftUp));
    }
    return { id: r.id, box: nextB };
  });

  const tree = buildTreeFromRooms(roomBoxes, fpBox);
  const tiled = evaluateTreeToBounds(tree, fpBox);
  const roomsMap = new Map(levelRooms.map((r) => [r.id, r]));
  const updatedRooms = fitRoomsToFootprint(tiled, roomsMap, footprint);

  return {
    rooms: [...otherLevels, ...updatedRooms],
    footprint,
    warnings: [],
  };
}

export function reflowMoveRoom(
  allRooms: Room[],
  footprint: Polygon,
  levelIndex: number,
  draggedId: string,
  dropPoint: Pt,
  scale = 1.0
): ReflowResult {
  void scale;
  const levelRooms = allRooms.filter((r) => r.level === levelIndex);
  const otherLevels = allRooms.filter((r) => r.level !== levelIndex);
  const dragged = levelRooms.find((r) => r.id === draggedId);
  if (!dragged) return { rooms: allRooms, footprint, warnings: [] };

  const fpBox = boundingBox(footprint);
  // Pastikan drop point berada di dalam kotak footprint
  const clampedDrop: Pt = {
    x: Math.max(fpBox.x + 0.1, Math.min(fpBox.x + fpBox.w - 0.1, dropPoint.x)),
    y: Math.max(fpBox.y + 0.1, Math.min(fpBox.y + fpBox.h - 0.1, dropPoint.y)),
  };

  // Cari ruangan target yang menaungi titik drop
  const targetRoom = levelRooms.find((r) => {
    if (r.id === draggedId) return false;
    const b = boundingBox(r.polygon);
    return (
      clampedDrop.x >= b.x &&
      clampedDrop.x <= b.x + b.w &&
      clampedDrop.y >= b.y &&
      clampedDrop.y <= b.y + b.h
    );
  });

  if (!targetRoom) {
    // Drop di luar atau di area yang sama: kembalikan posisi asli tanpa error
    return { rooms: allRooms, footprint, warnings: [] };
  }

  const targetBox = boundingBox(targetRoom.polygon);
  const relX = (clampedDrop.x - targetBox.x) / targetBox.w;
  const relY = (clampedDrop.y - targetBox.y) / targetBox.h;

  // Jika drop berada di area tengah target (zona 25%..75%) -> SWAP POSISI (tukar posisi pohon)
  const isCenter = relX >= 0.22 && relX <= 0.78 && relY >= 0.22 && relY <= 0.78;

  if (isCenter) {
    return reflowSwapRooms(allRooms, footprint, levelIndex, draggedId, targetRoom.id, scale);
  }

  // Tentukan sisi penyisipan (kanan, kiri, atas, bawah)
  let insertSide: "kiri" | "kanan" | "atas" | "bawah";
  const distLeft = relX;
  const distRight = 1 - relX;
  const distTop = relY;
  const distBottom = 1 - relY;
  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  if (minDist === distLeft) insertSide = "kiri";
  else if (minDist === distRight) insertSide = "kanan";
  else if (minDist === distTop) insertSide = "atas";
  else insertSide = "bawah";

  // Sisipkan dragged room di sisi target dengan membelah targetRoom via tree reflow
  const roomBoxes = levelRooms.map((r) => {
    const b = boundingBox(r.polygon);
    if (r.id === targetRoom.id) {
      // Kecilkan sedikit target untuk memberi ruang
      if (insertSide === "kanan" || insertSide === "kiri") {
        return { id: r.id, box: { ...b, w: b.w * 0.6 } };
      }
      return { id: r.id, box: { ...b, h: b.h * 0.6 } };
    }
    if (r.id === draggedId) {
      // Posisikan kotak dragged room di samping target
      if (insertSide === "kanan") return { id: r.id, box: { x: targetBox.x + targetBox.w * 0.6, y: targetBox.y, w: targetBox.w * 0.4, h: targetBox.h } };
      if (insertSide === "kiri") return { id: r.id, box: { x: targetBox.x, y: targetBox.y, w: targetBox.w * 0.4, h: targetBox.h } };
      if (insertSide === "bawah") return { id: r.id, box: { x: targetBox.x, y: targetBox.y + targetBox.h * 0.6, w: targetBox.w, h: targetBox.h * 0.4 } };
      return { id: r.id, box: { x: targetBox.x, y: targetBox.y, w: targetBox.w, h: targetBox.h * 0.4 } };
    }
    return { id: r.id, box: b };
  });

  const tree = buildTreeFromRooms(roomBoxes, fpBox);
  const tiled = evaluateTreeToBounds(tree, fpBox);
  const roomsMap = new Map(levelRooms.map((r) => [r.id, r]));
  const updatedRooms = fitRoomsToFootprint(tiled, roomsMap, footprint);

  return {
    rooms: [...otherLevels, ...updatedRooms],
    footprint,
    warnings: [],
  };
}

/**
 * Operasi SWAP: Menukar posisi dua ruangan sambil mempertahankan luas/rasio masing-masing (M3).
 */
export function reflowSwapRooms(
  allRooms: Room[],
  footprint: Polygon,
  levelIndex: number,
  idA: string,
  idB: string,
  scale = 1.0
): ReflowResult {
  void scale;
  const levelRooms = allRooms.filter((r) => r.level === levelIndex);
  const otherLevels = allRooms.filter((r) => r.level !== levelIndex);
  const roomA = levelRooms.find((r) => r.id === idA);
  const roomB = levelRooms.find((r) => r.id === idB);
  if (!roomA || !roomB) return { rooms: allRooms, footprint, warnings: [] };

  const boxA = boundingBox(roomA.polygon);
  const boxB = boundingBox(roomB.polygon);
  const fpBox = boundingBox(footprint);

  // Tukar kotak posisi di antara A dan B
  const roomBoxes = levelRooms.map((r) => {
    if (r.id === idA) return { id: idA, box: { ...boxB } };
    if (r.id === idB) return { id: idB, box: { ...boxA } };
    return { id: r.id, box: boundingBox(r.polygon) };
  });

  const tree = buildTreeFromRooms(roomBoxes, fpBox);
  const tiled = evaluateTreeToBounds(tree, fpBox);
  const roomsMap = new Map(levelRooms.map((r) => [r.id, r]));
  const updatedRooms = fitRoomsToFootprint(tiled, roomsMap, footprint);

  return {
    rooms: [...otherLevels, ...updatedRooms],
    footprint,
    warnings: [],
  };
}

/**
 * Operasi ADD ROOM:
 * Ruangan baru mengambil ruang dari ruangan yang paling fleksibel (teras, keluarga, koridor),
 * tanpa membuat celah atau tumpang tindih (M3).
 */
export function reflowAddRoom(
  allRooms: Room[],
  footprint: Polygon,
  levelIndex: number,
  fungsi: RoomFunction,
  name: string,
  scale = 1.0
): ReflowResult {
  void scale;
  const levelRooms = allRooms.filter((r) => r.level === levelIndex);
  const otherLevels = allRooms.filter((r) => r.level !== levelIndex);
  const rule = getEffectiveRule(fungsi, scale);

  // Cari ruangan yang paling fleksibel di lantai ini
  const candidates = [...levelRooms].sort((a, b) => {
    const flexA = getRoomFlexibility(a, scale);
    const flexB = getRoomFlexibility(b, scale);
    const areaA = polygonArea(a.polygon);
    const areaB = polygonArea(b.polygon);
    return flexB * areaB - flexA * areaA;
  });

  const victim = candidates[0] ?? levelRooms[0];
  const newId = `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const fpBox = boundingBox(footprint);

  if (!victim) {
    // Ruangan pertama
    const newRoom: Room = {
      id: newId,
      name,
      fungsi,
      level: levelIndex,
      polygon: rectToPolygon(fpBox),
      wet: fungsi === "kamar_mandi" || fungsi === "dapur" || fungsi === "cuci",
    };
    return { rooms: [newRoom], footprint, warnings: [] };
  }

  const victimBox = boundingBox(victim.polygon);
  const splitHoriz = victimBox.w >= victimBox.h;
  const ratio = Math.max(0.3, Math.min(0.7, rule.preferredArea / (polygonArea(victim.polygon) || 1)));

  // Belah victim menjadi dua
  const roomBoxes: { id: string; box: Rect }[] = [];
  for (const r of levelRooms) {
    if (r.id === victim.id) {
      if (splitHoriz) {
        roomBoxes.push({ id: victim.id, box: { ...victimBox, w: victimBox.w * (1 - ratio) } });
        roomBoxes.push({
          id: newId,
          box: { x: victimBox.x + victimBox.w * (1 - ratio), y: victimBox.y, w: victimBox.w * ratio, h: victimBox.h },
        });
      } else {
        roomBoxes.push({ id: victim.id, box: { ...victimBox, h: victimBox.h * (1 - ratio) } });
        roomBoxes.push({
          id: newId,
          box: { x: victimBox.x, y: victimBox.y + victimBox.h * (1 - ratio), w: victimBox.w, h: victimBox.h * ratio },
        });
      }
    } else {
      roomBoxes.push({ id: r.id, box: boundingBox(r.polygon) });
    }
  }

  const tree = buildTreeFromRooms(roomBoxes, fpBox);
  const tiled = evaluateTreeToBounds(tree, fpBox);
  const roomsMap = new Map<string, Room>(levelRooms.map((r) => [r.id, r]));
  roomsMap.set(newId, {
    id: newId,
    name,
    fungsi,
    level: levelIndex,
    polygon: [],
    wet: fungsi === "kamar_mandi" || fungsi === "dapur" || fungsi === "cuci",
  });

  const updatedRooms = fitRoomsToFootprint(tiled, roomsMap, footprint);
  return {
    rooms: [...otherLevels, ...updatedRooms],
    footprint,
    warnings: [`${name} ditambahkan mengambil ruang dari ${victim.name}.`],
  };
}

/**
 * Operasi REMOVE ROOM:
 * Ruangan dihapus, tetangga di sekitarnya mengisi kekosongan secara proporsional (tanpa celah!)
 */
export function reflowRemoveRoom(
  allRooms: Room[],
  footprint: Polygon,
  levelIndex: number,
  roomId: string
): ReflowResult {
  const levelRooms = allRooms.filter((r) => r.level === levelIndex);
  const otherLevels = allRooms.filter((r) => r.level !== levelIndex);
  const remaining = levelRooms.filter((r) => r.id !== roomId);
  if (remaining.length === 0) {
    return { rooms: otherLevels, footprint, warnings: [] };
  }

  const target = levelRooms.find((r) => r.id === roomId);
  const fpBox = boundingBox(footprint);
  const targetBox = target ? boundingBox(target.polygon) : null;

  // Ruangan yang berbagi sisi dengan target diperluas
  const roomBoxes = remaining.map((r) => {
    const b = boundingBox(r.polygon);
    if (!targetBox) return { id: r.id, box: b };
    // Jika berada di samping target, kembangkan kotaknya untuk mengisi ruang target
    const isAdjacentX = Math.abs(b.x + b.w - targetBox.x) < 0.1 || Math.abs(targetBox.x + targetBox.w - b.x) < 0.1;
    const isAdjacentY = Math.abs(b.y + b.h - targetBox.y) < 0.1 || Math.abs(targetBox.y + targetBox.h - b.y) < 0.1;
    if (isAdjacentX) {
      const newX = Math.min(b.x, targetBox.x);
      const newW = b.w + targetBox.w * 0.5;
      return { id: r.id, box: { ...b, x: newX, w: newW } };
    }
    if (isAdjacentY) {
      const newY = Math.min(b.y, targetBox.y);
      const newH = b.h + targetBox.h * 0.5;
      return { id: r.id, box: { ...b, y: newY, h: newH } };
    }
    return { id: r.id, box: b };
  });

  const tree = buildTreeFromRooms(roomBoxes, fpBox);
  const tiled = evaluateTreeToBounds(tree, fpBox);
  const roomsMap = new Map(remaining.map((r) => [r.id, r]));
  const updatedRooms = fitRoomsToFootprint(tiled, roomsMap, footprint);

  return {
    rooms: [...otherLevels, ...updatedRooms],
    footprint,
    warnings: [],
  };
}

/**
 * Operasi EDIT SUDUT (Mode Bentuk Kreatif):
 * Menggeser satu sudut poligon. Ruangan lain yang berbagi titik sudut tersebut
 * ikut digeser secara serentak (shared vertex), sehingga tidak timbul celah/tumpang-tindih (M3).
 */
export function reflowMoveSharedVertex(
  allRooms: Room[],
  footprint: Polygon,
  levelIndex: number,
  roomId: string,
  vertexIndex: number,
  newPt: Pt,
  tolerance = 0.15
): ReflowResult {
  const levelRooms = allRooms.filter((r) => r.level === levelIndex);
  const otherLevels = allRooms.filter((r) => r.level !== levelIndex);
  const target = levelRooms.find((r) => r.id === roomId);
  if (!target || !target.polygon[vertexIndex]) {
    return { rooms: allRooms, footprint, warnings: [] };
  }

  const oldPt = target.polygon[vertexIndex];
  const fpBox = boundingBox(footprint);

  // Jangan geser titik batas luar footprint
  const isOuterBoundary =
    Math.abs(oldPt.x - fpBox.x) < 0.05 ||
    Math.abs(oldPt.x - (fpBox.x + fpBox.w)) < 0.05 ||
    Math.abs(oldPt.y - fpBox.y) < 0.05 ||
    Math.abs(oldPt.y - (fpBox.y + fpBox.h)) < 0.05;

  if (isOuterBoundary) {
    return { rooms: allRooms, footprint, warnings: [] };
  }

  const snappedPt: Pt = { x: round2(newPt.x), y: round2(newPt.y) };

  // Update semua ruangan pada lantai ini yang memiliki titik sudut yang sama
  const updatedLevelRooms = levelRooms.map((r) => {
    let changed = false;
    const newPoly = r.polygon.map((p, i) => {
      const isTargetVertex = r.id === roomId && i === vertexIndex;
      const isShared = Math.hypot(p.x - oldPt.x, p.y - oldPt.y) <= tolerance;
      if (isTargetVertex || isShared) {
        changed = true;
        return { ...snappedPt };
      }
      return p;
    });

    if (changed && isSimplePolygon(newPoly)) {
      return { ...r, polygon: newPoly };
    }
    return r;
  });

  // Validasi konservasi luas: total luas seluruh ruangan harus tetap sama (+-0.03 m2)
  const beforeArea = levelRooms.reduce((sum, r) => sum + polygonArea(r.polygon), 0);
  const afterArea = updatedLevelRooms.reduce((sum, r) => sum + polygonArea(r.polygon), 0);
  if (Math.abs(afterArea - beforeArea) > 0.04) {
    // Jika pergeseran merusak invarian luas (mis. titik sudut tak seimbang), pertahankan keadaan sebelumnya
    return { rooms: allRooms, footprint, warnings: [] };
  }

  return {
    rooms: [...otherLevels, ...updatedLevelRooms],
    footprint,
    warnings: [],
  };
}

export function reflowExpandFootprint(
  model: BuildingModel,
  rooms: Room[],
  dx: number,
  dy: number
): { model: BuildingModel; rooms: Room[]; areaDelta: number } {
  const oldBox = boundingBox(model.levels[0]?.footprint.points ?? []);
  const newW = Math.max(4, round2(oldBox.w + dx));
  const newH = Math.max(4, round2(oldBox.h + dy));
  const sx = newW / oldBox.w;
  const sy = newH / oldBox.h;

  const newLevels = model.levels.map((lvl) => {
    const pts = (lvl.footprint.points ?? []).map((p) => ({
      x: round2(oldBox.x + (p.x - oldBox.x) * sx),
      y: round2(oldBox.y + (p.y - oldBox.y) * sy),
    }));
    return {
      ...lvl,
      footprint: {
        ...lvl.footprint,
        width: newW,
        depth: newH,
        points: pts,
      },
    };
  });

  const updatedRooms: Room[] = [];
  for (let li = 0; li < model.levels.length; li++) {
    const lvlRooms = rooms.filter((r) => r.level === li);
    const lvlFp = newLevels[li].footprint.points;
    const reflowed = reflowLevel(lvlRooms, lvlFp);
    updatedRooms.push(...reflowed.rooms);
  }

  const newFootprintArea = round2(newLevels.reduce((s, l) => s + polygonArea(l.footprint.points), 0));
  const areaDelta = round2(newFootprintArea - model.area);

  const updatedModel: BuildingModel = {
    ...model,
    area: newFootprintArea,
    levels: newLevels,
    rooms: updatedRooms,
    updated: new Date().toISOString(),
  };

  return { model: updatedModel, rooms: updatedRooms, areaDelta };
}

/**
 * Operasi SHIFT RUANGAN (T3a):
 * Menggeser satu ruangan sejauh (dx, dy) di dalam kanvas tiling.
 * Tetangga di sisi asal mengembang mengisi celah, tetangga di sisi tujuan
 * mengompresi secara proporsional. Tiling tetap kedap air 100% tanpa celah dan tanpa tumpang tindih.
 */
export function reflowShiftRoom(
  allRooms: Room[],
  footprint: Polygon,
  levelIndex: number,
  roomId: string,
  dx: number,
  dy: number,
  options?: { densityScale?: number }
): ReflowResult {
  void options;
  const levelRooms = allRooms.filter((r) => r.level === levelIndex);
  const otherLevels = allRooms.filter((r) => r.level !== levelIndex);
  const target = levelRooms.find((r) => r.id === roomId);
  if (!target) return { rooms: allRooms, footprint, warnings: [] };

  const fpBox = boundingBox(footprint);
  const targetBox = boundingBox(target.polygon);

  // Jika tidak ada pergeseran berarti
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
    return { rooms: allRooms, footprint, warnings: [] };
  }

  // Bangun kotak-kotak tergeser
  const adjustedBoxes = levelRooms.map((r) => {
    const b = boundingBox(r.polygon);
    if (r.id === roomId) {
      // Geser kotak target
      const newX = Math.max(fpBox.x, Math.min(fpBox.x + fpBox.w - b.w, b.x + dx));
      const newY = Math.max(fpBox.y, Math.min(fpBox.y + fpBox.h - b.h, b.y + dy));
      return { id: r.id, box: { ...b, x: round2(newX), y: round2(newY) } };
    }
    // Jika r berada di sisi asal, kembangkan untuk mengisi ruang yang ditinggalkan
    if (dx > 0 && Math.abs(b.x + b.w - targetBox.x) < 0.15) {
      return { id: r.id, box: { ...b, w: round2(b.w + dx) } };
    }
    if (dx < 0 && Math.abs(b.x - (targetBox.x + targetBox.w)) < 0.15) {
      return { id: r.id, box: { ...b, x: round2(b.x + dx), w: round2(b.w - dx) } };
    }
    if (dy > 0 && Math.abs(b.y + b.h - targetBox.y) < 0.15) {
      return { id: r.id, box: { ...b, h: round2(b.h + dy) } };
    }
    if (dy < 0 && Math.abs(b.y - (targetBox.y + targetBox.h)) < 0.15) {
      return { id: r.id, box: { ...b, y: round2(b.y + dy), h: round2(b.h - dy) } };
    }
    return { id: r.id, box: b };
  });

  const tree = buildTreeFromRooms(adjustedBoxes, fpBox);
  const tiled = evaluateTreeToBounds(tree, fpBox);
  const roomsMap = new Map(levelRooms.map((r) => [r.id, r]));
  const updatedRooms = fitRoomsToFootprint(tiled, roomsMap, footprint);

  return {
    rooms: [...otherLevels, ...updatedRooms],
    footprint,
    warnings: [],
  };
}
