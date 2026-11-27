import { describe, expect, it } from "vitest";
import { generateLayouts } from "./solver";
import {
  reflowAddRoom,
  reflowMoveSharedVertex,
  reflowRemoveRoom,
  reflowResize,
  reflowSetRoomSize,
  reflowShiftRoom,
  reflowSwapRooms,
} from "./reflow";
import {
  boundingBox,
  centroid,
  overlapAreaConcave,
  polygonArea,
  round2,
  type Polygon,
  type Pt,
} from "./polygon";
import { validateLayout } from "./validate";
import { createBuildingModel, DEFAULT_SETTINGS } from "../data/config";
import { SEED_CATALOG } from "../data/catalog";
import { computeRab } from "../engine/rab";
import { formulaVariables } from "./derived";
import type { BuildingModel, Room } from "../data/types";

function checkInvariants(rooms: Room[], footprint: Polygon, level = 0): { ok: boolean; areaDiff: number; maxOverlap: number; maxOutside: number } {
  const levelRooms = rooms.filter((r) => r.level === level);
  const fpArea = polygonArea(footprint);
  const totalRoomArea = levelRooms.reduce((s, r) => s + polygonArea(r.polygon), 0);
  const areaDiff = Math.abs(totalRoomArea - fpArea);

  let maxOverlap = 0;
  for (let i = 0; i < levelRooms.length; i++) {
    for (let j = i + 1; j < levelRooms.length; j++) {
      const ov = overlapAreaConcave(levelRooms[i].polygon, levelRooms[j].polygon);
      if (ov > maxOverlap) maxOverlap = ov;
    }
  }

  let maxOutside = 0;
  for (const r of levelRooms) {
    const area = polygonArea(r.polygon);
    const inside = overlapAreaConcave(r.polygon, footprint);
    const out = Math.max(0, area - inside);
    if (out > maxOutside) maxOutside = out;
  }

  return {
    ok: areaDiff <= 0.05 && maxOverlap <= 0.05 && maxOutside <= 0.05,
    areaDiff: round2(areaDiff),
    maxOverlap: round2(maxOverlap),
    maxOutside: round2(maxOutside),
  };
}

describe("T1. Generator Tidak Pernah Membuang Ruangan", () => {
  const testCases = [
    { area: 36, floors: 1, bedrooms: 2, bathrooms: 1, expectedFunctions: ["ruang_tamu", "dapur", "teras", "kamar_utama", "kamar_tidur", "kamar_mandi"] },
    { area: 45, floors: 1, bedrooms: 2, bathrooms: 1, expectedFunctions: ["ruang_tamu", "dapur", "teras", "carport", "ruang_makan", "kamar_utama", "kamar_tidur", "kamar_mandi"] },
    { area: 70, floors: 1, bedrooms: 3, bathrooms: 2, expectedFunctions: ["ruang_tamu", "dapur", "teras", "carport", "ruang_makan", "ruang_keluarga", "kamar_utama", "kamar_tidur", "kamar_mandi"] },
    { area: 100, floors: 2, bedrooms: 3, bathrooms: 2, expectedFunctions: ["ruang_tamu", "dapur", "teras", "carport", "tangga", "kamar_utama", "kamar_tidur", "kamar_mandi"] },
  ];

  const seeds = [45, 101, 202, 303, 404, 505, 606, 707, 808, 909, 1001];

  for (const tc of testCases) {
    it(`memuat SEMUA ruangan kebutuhan untuk ${tc.area}m² (${tc.floors} lantai, ${tc.bedrooms}KT, ${tc.bathrooms}KM)`, () => {
      for (const seed of seeds) {
        const alts = generateLayouts(
          {
            area: tc.area,
            floors: tc.floors,
            bedrooms: tc.bedrooms,
            bathrooms: tc.bathrooms,
            roadDirection: 0,
            typologyHint: null,
            seed,
          },
          3
        );

        expect(alts.length).toBeGreaterThanOrEqual(1);

        for (const alt of alts) {
          // 1. Semua fungsi wajib ada (TIDAK ADA YANG DIBUANG)
          const roomFuncs = new Set(alt.rooms.map((r) => r.fungsi));
          for (const expected of tc.expectedFunctions) {
            expect(roomFuncs.has(expected as any)).toBe(true);
          }

          // 2. Jumlah kamar tidur & kamar mandi tepat
          const bedCount = alt.rooms.filter((r) => r.fungsi === "kamar_utama" || r.fungsi === "kamar_tidur").length;
          expect(bedCount).toBe(tc.bedrooms);
          const bathCount = alt.rooms.filter((r) => r.fungsi === "kamar_mandi").length;
          expect(bathCount).toBe(tc.bathrooms);

          // 3. Luas ruangan >= 95% dari luas footprint
          for (let li = 0; li < tc.floors; li++) {
            const fp = alt.levels[li]?.footprint.points ?? [];
            const fpArea = polygonArea(fp);
            const levelRooms = alt.rooms.filter((r) => r.level === li);
            const levelRoomArea = levelRooms.reduce((s, r) => s + polygonArea(r.polygon), 0);
            expect(levelRoomArea).toBeGreaterThanOrEqual(fpArea * 0.95);

            // 4. Tanpa celah / tumpang tindih
            const inv = checkInvariants(alt.rooms, fp, li);
            expect(inv.maxOverlap).toBeLessThanOrEqual(0.05);
            expect(inv.maxOutside).toBeLessThanOrEqual(0.05);
          }
        }
      }
    });
  }
});

describe("T2. Invarian Geometri Property Test (>= 200 Operasi Acak)", () => {
  it("invarian (luas = footprint, nol overlap, semua di dalam) terjaga setelah 200+ operasi acak", () => {
    const brief = { area: 70, floors: 1, bedrooms: 3, bathrooms: 2, roadDirection: 0, typologyHint: null, seed: 45 };
    const initial = generateLayouts(brief, 1)[0];
    let rooms = initial.rooms;
    let fp = initial.levels[0].footprint.points;

    // Pastikan invarian awal terpenuhi
    expect(checkInvariants(rooms, fp, 0).ok).toBe(true);

    const prng = (s: number) => {
      let x = Math.sin(s++) * 10000;
      return x - Math.floor(x);
    };

    const operations = ["resize", "shift", "setRoomSize", "swap", "add", "remove", "moveSharedVertex"];

    for (let opIdx = 0; opIdx < 220; opIdx++) {
      const rIdx = Math.floor(prng(opIdx * 7) * rooms.length);
      const room = rooms[rIdx];
      const op = operations[Math.floor(prng(opIdx * 13) * operations.length)];

      if (op === "resize") {
        const side = (["kanan", "kiri", "atas", "bawah"] as const)[Math.floor(prng(opIdx * 17) * 4)];
        const delta = round2((prng(opIdx * 19) - 0.5) * 1.5);
        const res = reflowResize(rooms, fp, 0, room.id, side, delta);
        rooms = res.rooms;
      } else if (op === "shift") {
        const dx = round2((prng(opIdx * 23) - 0.5) * 1.0);
        const dy = round2((prng(opIdx * 29) - 0.5) * 1.0);
        const res = reflowShiftRoom(rooms, fp, 0, room.id, dx, dy);
        rooms = res.rooms;
      } else if (op === "setRoomSize") {
        const b = boundingBox(room.polygon);
        const nw = Math.max(1.5, Math.min(6.0, round2(b.w + (prng(opIdx * 31) - 0.5) * 1.2)));
        const nh = Math.max(1.5, Math.min(6.0, round2(b.h + (prng(opIdx * 37) - 0.5) * 1.2)));
        const res = reflowSetRoomSize(rooms, fp, 0, room.id, nw, nh);
        rooms = res.rooms;
      } else if (op === "swap" && rooms.length > 1) {
        const otherIdx = (rIdx + 1) % rooms.length;
        const res = reflowSwapRooms(rooms, fp, 0, room.id, rooms[otherIdx].id);
        rooms = res.rooms;
      } else if (op === "add" && rooms.length < 14) {
        const res = reflowAddRoom(rooms, fp, 0, "gudang", `Gudang ${opIdx}`);
        rooms = res.rooms;
      } else if (op === "remove" && rooms.length > 4) {
        const res = reflowRemoveRoom(rooms, fp, 0, room.id);
        rooms = res.rooms;
      } else if (op === "moveSharedVertex") {
        if (room.polygon.length > 0) {
          const vIdx = Math.floor(prng(opIdx * 41) * room.polygon.length);
          const pt = room.polygon[vIdx];
          const npt: Pt = { x: round2(pt.x + (prng(opIdx * 43) - 0.5) * 0.4), y: round2(pt.y + (prng(opIdx * 47) - 0.5) * 0.4) };
          const res = reflowMoveSharedVertex(rooms, fp, 0, room.id, vIdx, npt);
          rooms = res.rooms;
        }
      }

      // Verifikasi Invarian A2:
      const inv = checkInvariants(rooms, fp, 0);
      expect(inv.areaDiff).toBeLessThanOrEqual(0.05);
      expect(inv.maxOverlap).toBeLessThanOrEqual(0.05);
      expect(inv.maxOutside).toBeLessThanOrEqual(0.05);
    }
  });
});

describe("T3. Skenario Khusus Hasil Audit", () => {
  it("(a) geser Dapur 1.5 m ke kanan dan Ruang makan 1.5 m ke kanan -> diterapkan tanpa pembatalan, tetangga menyesuaikan, T2 invarian terpenuhi", () => {
    const brief = { area: 70, floors: 1, bedrooms: 3, bathrooms: 2, roadDirection: 0, typologyHint: "linear" as const, seed: 45 };
    const alt = generateLayouts(brief, 1)[0];
    const fp = alt.levels[0].footprint.points;
    let rooms = alt.rooms;

    const dapur = rooms.find((r) => r.fungsi === "dapur")!;
    expect(dapur).toBeDefined();

    // Geser Dapur 1.5 m ke kanan
    const resDapur = reflowShiftRoom(rooms, fp, 0, dapur.id, 1.5, 0);
    expect(resDapur.rooms.length).toBe(rooms.length);
    rooms = resDapur.rooms;

    const inv1 = checkInvariants(rooms, fp, 0);
    expect(inv1.ok).toBe(true);

    const makan = rooms.find((r) => r.fungsi === "ruang_makan");
    if (makan) {
      // Geser Ruang makan 1.5 m ke kanan
      const resMakan = reflowShiftRoom(rooms, fp, 0, makan.id, 1.5, 0);
      expect(resMakan.rooms.length).toBe(rooms.length);
      rooms = resMakan.rooms;

      const inv2 = checkInvariants(rooms, fp, 0);
      expect(inv2.ok).toBe(true);
    }
  });

  it("(b) tarik sisi kanan Ruang makan +1 m -> Dapur mengecil / tetangga menyesuaikan, tidak keluar batas", () => {
    const brief = { area: 70, floors: 1, bedrooms: 3, bathrooms: 2, roadDirection: 0, typologyHint: "linear" as const, seed: 45 };
    const alt = generateLayouts(brief, 1)[0];
    const fp = alt.levels[0].footprint.points;
    const makan = alt.rooms.find((r) => r.fungsi === "ruang_makan") ?? alt.rooms[0];
    const initialArea = polygonArea(makan.polygon);

    const res = reflowResize(alt.rooms, fp, 0, makan.id, "kanan", 1.0);
    const newMakan = res.rooms.find((r) => r.id === makan.id)!;
    expect(polygonArea(newMakan.polygon)).toBeGreaterThan(initialArea);

    const inv = checkInvariants(res.rooms, fp, 0);
    expect(inv.ok).toBe(true);
    expect(inv.maxOutside).toBeLessThanOrEqual(0.05);
  });

  it("(c) setRoomSize 2x2 -> 3x4 pada ruangan tengah -> tetangga menyesuaikan, hasil tetap tiling penuh", () => {
    const brief = { area: 70, floors: 1, bedrooms: 3, bathrooms: 2, roadDirection: 0, typologyHint: "linear" as const, seed: 45 };
    const alt = generateLayouts(brief, 1)[0];
    const fp = alt.levels[0].footprint.points;
    const target = alt.rooms[Math.floor(alt.rooms.length / 2)];

    const res = reflowSetRoomSize(alt.rooms, fp, 0, target.id, 3.0, 4.0);
    const updated = res.rooms.find((r) => r.id === target.id)!;
    const b = boundingBox(updated.polygon);
    expect(b.w).toBeCloseTo(3.0, 1);
    expect(b.h).toBeCloseTo(4.0, 1);

    const inv = checkInvariants(res.rooms, fp, 0);
    expect(inv.ok).toBe(true);
  });

  it("(d) swap Kamar mandi dengan Carport -> posisi bertukar, luas masing-masing mendekati semula", () => {
    const brief = { area: 70, floors: 1, bedrooms: 3, bathrooms: 2, roadDirection: 0, typologyHint: "linear" as const, seed: 45 };
    const alt = generateLayouts(brief, 1)[0];
    const fp = alt.levels[0].footprint.points;
    const bath = alt.rooms.find((r) => r.fungsi === "kamar_mandi")!;
    const carport = alt.rooms.find((r) => r.fungsi === "carport")!;
    expect(bath).toBeDefined();
    expect(carport).toBeDefined();

    const bathCenterBefore = centroid(bath.polygon);
    const carportCenterBefore = centroid(carport.polygon);

    const res = reflowSwapRooms(alt.rooms, fp, 0, bath.id, carport.id);
    const bathAfter = res.rooms.find((r) => r.id === bath.id)!;
    const carportAfter = res.rooms.find((r) => r.id === carport.id)!;

    const bathCenterAfter = centroid(bathAfter.polygon);
    const carportCenterAfter = centroid(carportAfter.polygon);

    // Posisi bertukar
    expect(Math.hypot(bathCenterAfter.x - carportCenterBefore.x, bathCenterAfter.y - carportCenterBefore.y)).toBeLessThan(1.5);
    expect(Math.hypot(carportCenterAfter.x - bathCenterBefore.x, carportCenterAfter.y - bathCenterBefore.y)).toBeLessThan(1.5);

    const inv = checkInvariants(res.rooms, fp, 0);
    expect(inv.ok).toBe(true);
  });
});

describe("T4. Peringatan Berisi Saran yang Dapat Diterapkan", () => {
  it("pelanggaran minimum menghasilkan peringatan bersaran dan saran itu dapat dijalankan", () => {
    const model = createBuildingModel({ area: 70, floors: 1, bedrooms: 3, bathrooms: 2 });
    const brief = { area: 70, floors: 1, bedrooms: 3, bathrooms: 2, roadDirection: 0, typologyHint: "linear" as const, seed: 45 };
    const alt = generateLayouts(brief, 1)[0];
    const fp = alt.levels[0].footprint.points;

    // Kecilkan paksa satu ruangan di bawah minimum
    const room = alt.rooms[0];
    const shrunk = reflowSetRoomSize(alt.rooms, fp, 0, room.id, 1.0, 1.0);
    const val = validateLayout(model, shrunk.rooms);

    const smallIssue = val.issues.find((i) => i.code === "room-too-small" || i.code === "room-too-narrow");
    expect(smallIssue).toBeDefined();
    expect(smallIssue?.severity).toBe("saran");
    expect(smallIssue?.actionLabel).toBeTruthy();
    expect(smallIssue?.suggestion).toBeTruthy();

    // Terapkan saran: perbesar kembali ruangan
    const fixed = reflowSetRoomSize(shrunk.rooms, fp, 0, room.id, 3.0, 3.0);
    const valAfter = validateLayout(model, fixed.rooms);
    const smallAfter = valAfter.issues.find((i) => i.roomIds.includes(room.id) && (i.code === "room-too-small" || i.code === "room-too-narrow"));
    expect(smallAfter).toBeUndefined();
  });
});

describe("T5. Pemetaan Koordinat Pointer -> Dunia", () => {
  it("transformasi matematis CTM terbalik akurat pada berbagai rasio viewport", () => {
    // Simulasi fungsi getScreenCTM().inverse()
    const transformScreenToWorld = (
      screenX: number,
      screenY: number,
      viewport: { left: number; top: number; width: number; height: number },
      viewBox: { x: number; y: number; width: number; height: number }
    ): Pt => {
      // Rasio letterbox preserveAspectRatio: xMidYMid meet
      const scaleX = viewport.width / viewBox.width;
      const scaleY = viewport.height / viewBox.height;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = (viewport.width - viewBox.width * scale) / 2;
      const offsetY = (viewport.height - viewBox.height * scale) / 2;

      const worldX = viewBox.x + (screenX - viewport.left - offsetX) / scale;
      const worldY = viewBox.y + (screenY - viewport.top - offsetY) / scale;
      return { x: round2(worldX), y: round2(worldY) };
    };

    const vb = { x: 0, y: 0, width: 10, height: 10 };

    // Kasus 1: Desktop Landscape 1280x800
    const vpDesktop = { left: 50, top: 20, width: 800, height: 600 };
    const pt1 = transformScreenToWorld(450, 320, vpDesktop, vb);
    expect(pt1.x).toBeCloseTo(5.0, 1);
    expect(pt1.y).toBeCloseTo(5.0, 1);

    // Kasus 2: Mobile Portrait 390x844 (Letterbox vertikal)
    const vpMobile = { left: 16, top: 120, width: 358, height: 358 };
    const pt2 = transformScreenToWorld(195, 299, vpMobile, vb);
    expect(pt2.x).toBeCloseTo(5.0, 1);
    expect(pt2.y).toBeCloseTo(5.0, 1);
  });
});

describe("T7. Konsistensi Denah -> Variabel Rumus -> Volume RAB Setelah Operasi Editor", () => {
  it("setelah operasi resize/swap, variabel rumus sinkron dengan poligon dan RAB terhitung", () => {
    const model = createBuildingModel({ area: 70, floors: 1, bedrooms: 3, bathrooms: 2 });
    const brief = { area: 70, floors: 1, bedrooms: 3, bathrooms: 2, roadDirection: 0, typologyHint: "L" as const, seed: 45 };
    const alt = generateLayouts(brief, 1)[0];
    const fp = alt.levels[0].footprint.points;

    // Lakukan operasi swap dan resize
    const swapped = reflowSwapRooms(alt.rooms, fp, 0, alt.rooms[0].id, alt.rooms[1].id).rooms;
    const resized = reflowResize(swapped, fp, 0, swapped[0].id, "kanan", 0.5).rooms;

    const updatedModel: BuildingModel = {
      ...model,
      rooms: resized,
      levels: alt.levels,
    };

    const vars = formulaVariables(updatedModel);
    expect(vars.luas_lantai).toBeGreaterThan(0);
    expect(vars.keliling_luar).toBeGreaterThan(0);
    expect(vars.luas_dinding_bersih).toBeGreaterThan(0);

    const rab = computeRab({
      model: updatedModel,
      settings: DEFAULT_SETTINGS,
      catalog: SEED_CATALOG,
      iterations: 10,
    });

    expect(rab.subtotal).toBeGreaterThan(0);
    expect(rab.items.length).toBeGreaterThan(15);
    const wall = rab.items.find((i) => i.workItemId === "dinding.pasangan");
    expect(wall?.volume).toBeCloseTo(vars.luas_dinding_bersih, 2);
  });
});
