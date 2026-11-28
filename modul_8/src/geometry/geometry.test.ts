import { describe, expect, it } from "vitest";
import {
  boundingBox, centroid, dist, ensureCCW, insetPolygon, isSimplePolygon, overlapArea, pointInPolygon,
  polygonArea, polygonPerimeter, rectToPolygon, rotatePolygon90, sharedEdgeLength, sharedEdges, simplifyPolygon,
  splitRect, translatePolygon,
} from "./polygon";
import { generateLayouts, ROOM_MIN } from "./solver";
import { duplicateRoom, moveRoom, removeRoom, resizeRoomWithNeighbors, rotateRoom, setRoomRect, swapRooms } from "./layout";
import { validateLayout, checkRoomPlacement } from "./validate";
import { createBuildingModel, DEFAULT_SETTINGS } from "../data/config";
import { SEED_CATALOG } from "../data/catalog";
import { deriveGeometry, formulaVariables } from "./derived";
import { computeRab } from "../engine/rab";
import type { BuildingModel, Room } from "../data/types";

const rect = (x: number, y: number, w: number, h: number) => rectToPolygon({ x, y, w, h });

describe("Geometri poligon", () => {
  it("luas & keliling persegi dan L", () => {
    expect(polygonArea(rect(0, 0, 4, 3))).toBe(12);
    expect(polygonPerimeter(rect(0, 0, 4, 3))).toBe(14);
    const L = ensureCCW([{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 6 }, { x: 0, y: 6 }]);
    expect(polygonArea(L)).toBe(27);
  });
  it("titik dalam/luar poligon", () => {
    const L = ensureCCW([{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 6 }, { x: 0, y: 6 }]);
    expect(pointInPolygon({ x: 1, y: 1 }, L)).toBe(true);
    expect(pointInPolygon({ x: 5, y: 5 }, L)).toBe(false);
  });
  it("tumpang tindih & bidang bersama", () => {
    expect(overlapArea(rect(0, 0, 3, 3), rect(2, 0, 3, 3))).toBeCloseTo(3, 5);
    expect(overlapArea(rect(0, 0, 2, 2), rect(3, 0, 2, 2))).toBe(0);
    expect(sharedEdgeLength(rect(0, 0, 3, 3), rect(3, 0, 3, 3))).toBeCloseTo(3, 5);
    expect(sharedEdges(rect(0, 0, 3, 3), rect(3, 0, 3, 3))[0].length).toBeCloseTo(3, 5);
  });
  it("bounding box, centroid, inset, translate, rotate, simplify", () => {
    expect(boundingBox(rect(1, 2, 3, 4))).toEqual({ x: 1, y: 2, w: 3, h: 4 });
    const c = centroid(rect(0, 0, 4, 4));
    expect(c.x).toBeCloseTo(2, 5); expect(c.y).toBeCloseTo(2, 5);
    const inner = insetPolygon(rect(0, 0, 4, 4), 0.5);
    expect(polygonArea(inner)).toBeCloseTo(9, 1);
    expect(polygonArea(translatePolygon(rect(0, 0, 2, 2), 1, 1))).toBe(4);
    const rotated = rotatePolygon90(rect(0, 0, 4, 2), 1);
    const rb = boundingBox(rotated);
    expect(Math.round(rb.w)).toBe(2); expect(Math.round(rb.h)).toBe(4);
    expect(simplifyPolygon([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }]).length).toBe(4);
  });
  it("validasi poligon sederhana (self-intersect ditolak)", () => {
    expect(isSimplePolygon(rect(0, 0, 2, 2))).toBe(true);
    expect(isSimplePolygon([{ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 2, y: 0 }, { x: 0, y: 2 }])).toBe(false);
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    const [a, b] = splitRect({ x: 0, y: 0, w: 10, h: 4 }, 0.5, "x");
    expect(a.w).toBe(5); expect(b.w).toBe(5);
  });
});

describe("Solver denah", () => {
  const brief = { area: 70, floors: 1, bedrooms: 3, bathrooms: 2, roadDirection: 0, typologyHint: null, seed: 45 };
  it("menghasilkan 3 alternatif valid & berbeda tipologi", () => {
    const alts = generateLayouts(brief, 3);
    expect(alts.length).toBe(3);
    expect(new Set(alts.map((a) => a.typology)).size).toBeGreaterThanOrEqual(2);
    for (const alt of alts) {
      expect(alt.rooms.length).toBeGreaterThanOrEqual(3);
      const model = createBuildingModel({ area: 70, floors: 1, bedrooms: 3, bathrooms: 2 });
      const res = validateLayout({ ...model, levels: alt.levels }, alt.rooms);
      expect(res.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(alt.score.total).toBeGreaterThan(0);
      expect(alt.score.notes.length).toBeGreaterThan(0);
    }
  });
  it("deterministik: seed sama → hasil sama", () => {
    const a = generateLayouts(brief, 3);
    const b = generateLayouts(brief, 3);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = generateLayouts({ ...brief, seed: 999 }, 3);
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
  });
  it("tidak selalu kotak: ada alternatif dengan footprint >4 titik", () => {
    const alts = generateLayouts(brief, 3);
    expect(alts.some((a) => (a.levels[0]?.footprint.points.length ?? 4) > 4)).toBe(true);
  });
});

const modelWith = (rooms: Room[], over: Partial<BuildingModel> = {}): BuildingModel => {
  const base = createBuildingModel({ area: 70, floors: 1, bedrooms: 2, bathrooms: 1 });
  return { ...base, rooms, ...over };
};

describe("Operasi editor memengaruhi tetangga", () => {
  const rooms: Room[] = [
    { id: "a", name: "Ruang tamu", fungsi: "ruang_tamu", level: 0, polygon: rect(0, 0, 4, 4), wet: false },
    { id: "b", name: "Ruang makan", fungsi: "ruang_makan", level: 0, polygon: rect(4, 0, 3, 4), wet: false },
  ];
  it("seret dinding bersama melebarkan satu & menyempitkan tetangga", () => {
    const next = resizeRoomWithNeighbors(rooms, "a", "kanan", 1);
    const a = next.find((r) => r.id === "a")!;
    const b = next.find((r) => r.id === "b")!;
    expect(polygonArea(a.polygon)).toBeCloseTo(20, 5);
    expect(polygonArea(b.polygon)).toBeCloseTo(8, 5);
    expect(sharedEdgeLength(a.polygon, b.polygon)).toBeCloseTo(4, 5);
  });
  it("move, swap, rotate, setRect, duplicate, remove", () => {
    expect(boundingBox(moveRoom(rooms, "a", 1, 2).find((r) => r.id === "a")!.polygon)).toMatchObject({ x: 1, y: 2 });
    const swapped = swapRooms(rooms, "a", "b");
    expect(polygonArea(swapped.find((r) => r.id === "a")!.polygon)).toBe(12);
    expect(boundingBox(rotateRoom(rooms, "a").find((r) => r.id === "a")!.polygon).w).toBeCloseTo(4, 5);
    expect(polygonArea(setRoomRect(rooms, "a", 2, 2).find((r) => r.id === "a")!.polygon)).toBeCloseTo(4, 5);
    expect(duplicateRoom(rooms, "a").length).toBe(3);
    expect(removeRoom(rooms, "a").length).toBe(1);
  });
  it("undo/redo mengembalikan keadaan (pola riwayat 50 langkah)", () => {
    const history: Room[][] = [rooms];
    let current = rooms;
    for (let i = 0; i < 60; i++) { current = moveRoom(current, "a", 0.1, 0); history.push(current); }
    expect(history.length).toBe(61);
    const trimmed = history.slice(-51);
    expect(trimmed.length).toBe(51);
    const undo = trimmed[trimmed.length - 2];
    expect(boundingBox(undo.find((r) => r.id === "a")!.polygon).x).toBeCloseTo(5.9, 5);
  });
});

describe("Validasi denah", () => {
  it("menolak tumpang tindih, ukuran minimum, dan keluar footprint", () => {
    const overlap: Room[] = [
      { id: "a", name: "Kamar tidur 1", fungsi: "kamar_tidur", level: 0, polygon: rect(0, 0, 3, 3), wet: false },
      { id: "b", name: "Kamar tidur 2", fungsi: "kamar_tidur", level: 0, polygon: rect(2, 0, 3, 3), wet: false },
    ];
    const res = validateLayout(modelWith(overlap), overlap);
    expect(res.valid).toBe(false);
    expect(res.issues.some((i) => i.code === "overlap")).toBe(true);

    const small: Room[] = [{ id: "c", name: "Kamar mandi", fungsi: "kamar_mandi", level: 0, polygon: rect(0, 0, 0.6, 0.6), wet: true }];
    expect(validateLayout(modelWith(small), small).issues.some((i) => i.code === "room-too-small" || i.code === "room-too-narrow")).toBe(true);

    const outside: Room[] = [{ id: "d", name: "Dapur", fungsi: "dapur", level: 0, polygon: rect(40, 40, 3, 3), wet: true }];
    expect(validateLayout(modelWith(outside), outside).issues.some((i) => i.code === "room-outside")).toBe(true);
  });
  it("checkRoomPlacement memberi alasan & saran", () => {
    const rooms: Room[] = [
      { id: "a", name: "Kamar mandi", fungsi: "kamar_mandi", level: 0, polygon: rect(0, 0, 1.5, 1.5), wet: true },
      { id: "b", name: "Kamar tidur", fungsi: "kamar_tidur", level: 0, polygon: rect(1, 0, 3, 3), wet: false },
    ];
    const model = modelWith(rooms);
    const res = checkRoomPlacement(model, rooms, "a", 0);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Tumpang tindih|minimum|sisi/i);
  });
  it("minimum per fungsi berasal dari config", () => {
    expect(ROOM_MIN.kamar_tidur.area).toBeGreaterThan(0);
    expect(ROOM_MIN.kamar_mandi.side).toBeGreaterThan(0);
  });
});

describe("Konsistensi denah ↔ variabel rumus ↔ volume RAB", () => {
  const cases: [string, Room[]][] = [
    ["persegi", [
      { id: "a", name: "Ruang tamu", fungsi: "ruang_tamu", level: 0, polygon: rect(0, 0, 6, 4), wet: false },
      { id: "b", name: "Kamar tidur", fungsi: "kamar_tidur", level: 0, polygon: rect(0, 4, 3.5, 3.5), wet: false },
      { id: "c", name: "Kamar mandi", fungsi: "kamar_mandi", level: 0, polygon: rect(3.5, 4, 2.5, 3.5), wet: true },
    ]],
    ["L", [
      { id: "a", name: "Ruang tamu", fungsi: "ruang_tamu", level: 0, polygon: rect(0, 0, 7, 4), wet: false },
      { id: "b", name: "Kamar tidur", fungsi: "kamar_tidur", level: 0, polygon: rect(0, 4, 4, 3.5), wet: false },
      { id: "c", name: "Dapur", fungsi: "dapur", level: 0, polygon: rect(4, 4, 3, 3.5), wet: true },
    ]],
    ["kreatif", [
      { id: "a", name: "Ruang tamu", fungsi: "ruang_tamu", level: 0, polygon: ensureCCW([{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 4 }, { x: 3, y: 5 }, { x: 0, y: 4 }]), wet: false },
      { id: "b", name: "Kamar mandi", fungsi: "kamar_mandi", level: 0, polygon: rect(0, 5, 2.5, 2.5), wet: true },
    ]],
  ];

  it.each(cases)("%s: variabel rumus cocok dengan geometri poligon", (_name, rooms) => {
    const totalArea = rooms.reduce((s, r) => s + polygonArea(r.polygon), 0);
    const box = boundingBox(rooms.flatMap((r) => r.polygon));
    const model = modelWith(rooms, {
      area: Math.round(totalArea * 10) / 10,
      levels: [{ index: 0, height: 3.2, footprint: { shape: "polygon", width: box.w, depth: box.h, points: rect(0, 0, box.w, box.h) } }],
    });
    const g = deriveGeometry(model);
    const vars = formulaVariables(model);
    expect(vars.luas_basah).toBeCloseTo(g.wetArea, 2);
    expect(vars.luas_lantai).toBeCloseTo(g.totalFloorArea, 2);
    expect(vars.keliling_luar).toBeCloseTo(g.outerWallLength, 2);
    expect(vars.panjang_dinding_dalam).toBeCloseTo(g.interiorWallLength, 2);
    expect(vars.luas_dinding_bersih).toBeCloseTo(g.netWallArea, 2);

    const rab = computeRab({ model, settings: DEFAULT_SETTINGS, catalog: SEED_CATALOG, iterations: 10 });
    const wall = rab.items.find((i) => i.workItemId === "dinding.pasangan")!;
    expect(wall.volume).toBeCloseTo(Math.round(g.netWallArea * 100) / 100, 2);
    const wet = rab.items.find((i) => i.workItemId === "dinding.keramik_basah");
    if (wet) expect(wet.volume).toBeCloseTo(Math.round(g.wetPerimeter * 1.8 * 100) / 100, 1);
  });

  it("mengubah denah mengubah volume RAB", () => {
    const rooms: Room[] = [
      { id: "a", name: "Ruang tamu", fungsi: "ruang_tamu", level: 0, polygon: rect(0, 0, 6, 4), wet: false },
      { id: "b", name: "Kamar mandi", fungsi: "kamar_mandi", level: 0, polygon: rect(0, 4, 2, 2), wet: true },
    ];
    const box = { w: 6, h: 6 };
    const model = modelWith(rooms, { area: 28, levels: [{ index: 0, height: 3.2, footprint: { shape: "persegi", width: box.w, depth: box.h, points: rect(0, 0, box.w, box.h) } }] });
    const before = computeRab({ model, settings: DEFAULT_SETTINGS, catalog: SEED_CATALOG, iterations: 10 });
    const bigger = setRoomRect(rooms, "b", 3, 3);
    const after = computeRab({ model: { ...model, rooms: bigger }, settings: DEFAULT_SETTINGS, catalog: SEED_CATALOG, iterations: 10 });
    const wetBefore = before.items.find((i) => i.workItemId === "dinding.keramik_basah")!.volume;
    const wetAfter = after.items.find((i) => i.workItemId === "dinding.keramik_basah")!.volume;
    expect(wetAfter).toBeGreaterThan(wetBefore);
  });
});
