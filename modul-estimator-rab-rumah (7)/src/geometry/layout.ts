import type { BuildingModel, Pt, Room, RoomFunction } from "../data/types";
import { generateLayouts } from "./solver";
import { boundingBox, ensureCCW, polygonArea, rectToPolygon, round2, sharedEdgeLength } from "./polygon";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Denah otomatis deterministik dari solver (seed dari model). */
export function buildAutoRooms(model: BuildingModel): Room[] {
  const seed = model.layoutSeed ?? 45;
  const alts = generateLayouts(
    {
      area: model.area,
      floors: model.floors,
      bedrooms: model.bedrooms,
      bathrooms: model.bathrooms,
      roadDirection: model.roadDirection ?? 0,
      typologyHint: model.layoutTypology ?? null,
      seed,
    },
    1,
    model.levels,
  );
  return alts[0]?.rooms ?? [];
}

/** Repair only copies with a matching generated parent; do not overwrite an authored plan. */
export function repairLegacyRoomCopies(model: BuildingModel): BuildingModel {
  if (!model.rooms.length || !model.rooms.some(r => /^r-\d+-\d+/.test(r.id))) return model;
  const parents = new Map(model.rooms.map(r => [r.id, r]));
  const kept = model.rooms.filter(r => {
    if (r.level !== 1 || !/^r-\d+-\d+-L1$/.test(r.id)) return true;
    const parent = parents.get(r.id.slice(0, -3));
    return !(parent && parent.fungsi === r.fungsi &&
      (r.name === `${parent.name} (atas)` || (r.fungsi === 'ruang_keluarga' && r.name === 'Ruang keluarga atas')) &&
      JSON.stringify(parent.polygon) === JSON.stringify(r.polygon));
  });
  const wrongCoverage = model.levels.some(l => Math.abs(kept.filter(r => r.level === l.index).reduce((a,r) => a + polygonArea(r.polygon), 0) - polygonArea(l.footprint.points)) > 0.05);
  if (kept.length === model.rooms.length && !wrongCoverage) return model;
  const original = generateLayouts({ area: model.area, floors: model.floors, bedrooms: model.bedrooms,
    bathrooms: model.bathrooms, roadDirection: model.roadDirection ?? 0, seed: model.layoutSeed ?? 45,
    typologyHint: model.layoutTypology ?? null }, 1)[0]?.rooms ?? [];
  const untouched = original.length === kept.length && original.every(r => {
    const saved = parents.get(r.id);
    return saved && r.name === saved.name && JSON.stringify(r.polygon) === JSON.stringify(saved.polygon);
  });
  if (!untouched && kept.length === model.rooms.length) return model;
  return { ...model, rooms: untouched ? buildAutoRooms(model) : kept };
}

export function generateLayout(model: BuildingModel): Room[] {
  if (model.rooms.length > 0) return model.rooms;
  return buildAutoRooms(model);
}

/** Tukar posisi dua ruangan pada lantai sama (tukar poligon). */
export function swapRooms(rooms: Room[], a: string, b: string): Room[] {
  const ra = rooms.find((room) => room.id === a);
  const rb = rooms.find((room) => room.id === b);
  if (!ra || !rb || ra.level !== rb.level) return rooms;
  return rooms.map((room) => {
    if (room.id === a) return { ...room, polygon: rb.polygon.map((p) => ({ ...p })) };
    if (room.id === b) return { ...room, polygon: ra.polygon.map((p) => ({ ...p })) };
    return room;
  });
}

/* ---------- Operasi editor ---------- */

export function moveRoom(rooms: Room[], id: string, dx: number, dy: number): Room[] {
  return rooms.map((r) => (r.id === id ? { ...r, polygon: r.polygon.map((p) => ({ x: round2(p.x + dx), y: round2(p.y + dy) })) } : r));
}

/**
 * Seret dinding bersama: lebarkan `id` ke arah `axis` sejauh `delta`,
 * tetangga yang menempel pada sisi itu menyempit/ikut bergeser.
 */
export function resizeRoomWithNeighbors(rooms: Room[], id: string, side: "kanan" | "kiri" | "bawah" | "atas", delta: number): Room[] {
  const target = rooms.find((r) => r.id === id);
  if (!target) return rooms;
  const box = boundingBox(target.polygon);
  const axis: "x" | "y" = side === "kanan" || side === "kiri" ? "x" : "y";
  const positive = side === "kanan" || side === "bawah";
  const boundary = positive
    ? axis === "x" ? box.x + box.w : box.y + box.h
    : axis === "x" ? box.x : box.y;

  const neighbors = rooms.filter((r) => r.id !== id && r.level === target.level && sharedEdgeLength(r.polygon, target.polygon) > 0.3);

  const shiftEdge = (poly: Pt[], coord: number, amount: number, matchTol = 0.08): Pt[] =>
    poly.map((p) => (Math.abs((axis === "x" ? p.x : p.y) - coord) < matchTol ? { ...p, [axis]: round2((axis === "x" ? p.x : p.y) + amount) } : { ...p }));

  let next = rooms.map((r) => (r.id === id ? { ...r, polygon: shiftEdge(r.polygon, boundary, delta) } : r));

  for (const n of neighbors) {
    const nBox = boundingBox(n.polygon);
    const nStart = axis === "x" ? nBox.x : nBox.y;
    const nEnd = axis === "x" ? nBox.x + nBox.w : nBox.y + nBox.h;
    const touches = Math.abs(nStart - boundary) < 0.08 || Math.abs(nEnd - boundary) < 0.08;
    if (!touches) continue;
    next = next.map((r) => (r.id === n.id ? { ...r, polygon: shiftEdge(r.polygon, boundary, delta) } : r));
  }
  return next;
}

export function setRoomRect(rooms: Room[], id: string, w: number, h: number): Room[] {
  const target = rooms.find((r) => r.id === id);
  if (!target) return rooms;
  const box = boundingBox(target.polygon);
  const sx = w / Math.max(0.1, box.w);
  const sy = h / Math.max(0.1, box.h);
  return rooms.map((r) =>
    r.id === id
      ? { ...r, polygon: r.polygon.map((p) => ({ x: round2(box.x + (p.x - box.x) * sx), y: round2(box.y + (p.y - box.y) * sy) })) }
      : r,
  );
}

export function rotateRoom(rooms: Room[], id: string): Room[] {
  const target = rooms.find((r) => r.id === id);
  if (!target) return rooms;
  const box = boundingBox(target.polygon);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return rooms.map((r) =>
    r.id === id
      ? { ...r, polygon: ensureCCW(r.polygon.map((p) => ({ x: round2(cx + (p.y - cy)), y: round2(cy - (p.x - cx)) }))) }
      : r,
  );
}

export function duplicateRoom(rooms: Room[], id: string): Room[] {
  const target = rooms.find((r) => r.id === id);
  if (!target) return rooms;
  const box = boundingBox(target.polygon);
  const copy: Room = {
    ...target,
    id: `${target.id}-c${Date.now().toString(36).slice(-3)}`,
    name: `${target.name} (salinan)`,
    polygon: target.polygon.map((p) => ({ x: round2(p.x + box.w * 0.15), y: round2(p.y + box.h * 0.15) })),
  };
  return [...rooms, copy];
}

export function removeRoom(rooms: Room[], id: string): Room[] {
  return rooms.filter((r) => r.id !== id);
}

export function addRoom(rooms: Room[], fungsi: RoomFunction, name: string, rect: Rect, level = 0): Room[] {
  const wet = fungsi === "kamar_mandi" || fungsi === "dapur" || fungsi === "cuci";
  return [
    ...rooms,
    { id: `r-new-${Date.now().toString(36)}`, name, fungsi, level, polygon: rectToPolygon(rect), wet, zone: "tengah" },
  ];
}

/** Pindahkan ruangan ke slot ruangan lain (aksesibel tanpa drag). */
export function moveRoomTo(rooms: Room[], id: string, targetId: string): Room[] {
  return swapRooms(rooms, id, targetId);
}

/** Salin denah lantai sumber ke lantai tujuan. */
export function copyLevel(source: Room[], fromLevel: number, toLevel: number): Room[] {
  const base = source.filter((r) => r.level !== toLevel);
  const copies = source
    .filter((r) => r.level === fromLevel)
    .map((r) => ({ ...r, id: `${r.id}-L${toLevel}`, level: toLevel, polygon: r.polygon.map((p) => ({ ...p })) }));
  return [...base, ...copies];
}
