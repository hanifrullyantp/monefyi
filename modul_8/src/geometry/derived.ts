import type { BuildingModel, Room } from "../data/types";
import { generateLayout } from "./layout";
import { boundingBox, polygonArea, polygonPerimeter, round2, sharedEdgeLength, type Polygon } from "./polygon";

export interface DerivedGeometry {
  footprintWidth: number;
  footprintDepth: number;
  /** Luas tapak lantai dasar, bukan jumlah seluruh lantai. */
  footprintArea: number;
  totalFloorArea: number;
  floorAreas: number[];
  groundArea: number;
  groundPerimeter: number;
  levels: number;
  outerWallLength: number;
  interiorWallLength: number;
  groundInteriorWallLength: number;
  wallOuterArea: number;
  wallInnerArea: number;
  openingArea: number;
  netWallArea: number;
  wetArea: number;
  wetPerimeter: number;
  roofProjectedArea: number;
  roofArea: number;
  roofPerimeter: number;
  totalHeight: number;
  roomsByLevel: Room[][];
  roomCount: number;
  doorCount: number;
  windowCount: number;
  /** Panjang dinding luar per ruangan (untuk penempatan jendela). */
  exteriorByRoom: Record<string, number>;
  /** Total bidang dinding bersama antar ruangan (dihitung sekali). */
  sharedWallLength: number;
}

export const DOOR_AREA = 1.9;
export const WINDOW_AREA = 1.2;

/**
 * Geometri murni dari BuildingModel berbasis poligon.
 * - dinding luar = keliling footprint per lantai
 * - dinding dalam = Σ bidang bersama antar ruangan (dihitung sekali) + sisa perimeter ruangan yang tidak di batas footprint
 * - luas bukaan = pintu × 1,9 + jendela × 1,2
 */
export function deriveGeometry(model: BuildingModel): DerivedGeometry {
  const rooms = generateLayout(model);
  const level0 = model.levels[0]?.footprint;
  const fp0: Polygon = level0?.points?.length ? level0.points : [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 7.5 }, { x: 0, y: 7.5 }];
  const box0 = boundingBox(fp0);

  let outer = 0, inner = 0, groundInner = 0, wallOuterArea = 0, wallInnerArea = 0, area = 0, wetArea = 0, wetPerimeter = 0, totalHeight = 0, shared = 0;
  const exteriorByRoom: Record<string, number> = {};

  model.levels.forEach((level) => {
    const fp: Polygon = level.footprint.points?.length ? level.footprint.points : fp0;
    const perimeter = polygonPerimeter(fp);
    const levelRooms = rooms.filter((room) => room.level === level.index);

    let levelShared = 0;
    for (let i = 0; i < levelRooms.length; i++) {
      for (let j = i + 1; j < levelRooms.length; j++) {
        levelShared += sharedEdgeLength(levelRooms[i].polygon, levelRooms[j].polygon);
      }
    }
    // Dinding dalam: bidang bersama + tepi ruangan yang menempel batas footprint di atas keliling (ruang menonjol)
    const roomPerimeterSum = levelRooms.reduce((s, r) => s + polygonPerimeter(r.polygon), 0);
    const innerFromRooms = Math.max(levelShared, (roomPerimeterSum - perimeter) / 2);

    for (const room of levelRooms) {
      const ext = sharedEdgeLength(room.polygon, fp);
      exteriorByRoom[room.id] = round2(ext);
      if (room.wet) {
        wetArea += polygonArea(room.polygon);
        wetPerimeter += polygonPerimeter(room.polygon);
      }
    }

    outer += perimeter;
    inner += innerFromRooms;
    shared += levelShared;
    if (level.index === 0) groundInner = innerFromRooms;
    wallOuterArea += perimeter * level.height;
    wallInnerArea += innerFromRooms * level.height;
    area += polygonArea(fp);
    totalHeight += level.height;
  });

  const openingArea = model.doors * DOOR_AREA + model.windows * WINDOW_AREA;
  const overhang = model.roof.overhang;
  const roofW = box0.w + overhang * 2;
  const roofD = box0.h + overhang * 2;
  const slopeFactor = model.roof.type === "datar" ? 1 : 1 / Math.cos((model.roof.pitch * Math.PI) / 180);
  const groundArea = polygonArea(fp0);
  // Atap mengikuti luas proyeksi footprint (bukan kotak pembatas) + overhang pada keliling
  const roofProjected = groundArea + polygonPerimeter(fp0) * overhang + Math.PI * overhang * overhang;

  return {
    footprintWidth: round2(box0.w),
    footprintDepth: round2(box0.h),
    footprintArea: round2(groundArea),
    totalFloorArea: round2(area),
    floorAreas: model.levels.map(l => round2(polygonArea(l.footprint.points))),
    groundArea: round2(groundArea),
    groundPerimeter: round2(polygonPerimeter(fp0)),
    levels: model.levels.length,
    outerWallLength: round2(outer),
    interiorWallLength: round2(inner),
    groundInteriorWallLength: round2(groundInner),
    wallOuterArea: round2(wallOuterArea),
    wallInnerArea: round2(wallInnerArea),
    openingArea: round2(openingArea),
    netWallArea: round2(Math.max(0, wallOuterArea + wallInnerArea - openingArea)),
    wetArea: round2(wetArea),
    wetPerimeter: round2(wetPerimeter),
    roofProjectedArea: round2(roofProjected),
    roofArea: round2(roofProjected * slopeFactor),
    roofPerimeter: round2(2 * (roofW + roofD)),
    totalHeight: round2(totalHeight),
    roomsByLevel: model.levels.map((level) => rooms.filter((room) => room.level === level.index)),
    roomCount: rooms.length,
    doorCount: model.doors,
    windowCount: model.windows,
    exteriorByRoom,
    sharedWallLength: round2(shared),
  };
}

/** Variabel rumus untuk mapping pekerjaan. Semua nama terdokumentasi di DATA_SPEC.md. */
export function formulaVariables(model: BuildingModel): Record<string, number> {
  const g = deriveGeometry(model);
  const luasLuar = Math.max(0, Math.min(model.landArea - g.groundArea, model.carport ? 24 : 8));
  return {
    luas_lantai: g.totalFloorArea,
    luas_lantai_atas: round2(g.totalFloorArea - g.footprintArea),
    luas_dasar: g.groundArea,
    keliling_dasar: g.groundPerimeter,
    keliling_luar: g.outerWallLength,
    panjang_dinding_dalam: g.interiorWallLength,
    luas_dinding_bersih: g.netWallArea,
    luas_bukaan: g.openingArea,
    luas_basah: g.wetArea,
    keliling_basah: g.wetPerimeter,
    luas_atap: g.roofArea,
    keliling_atap: g.roofPerimeter,
    luas_tanah: model.landArea,
    luas_luar: round2(luasLuar),
    panjang_pondasi: round2(g.groundPerimeter + g.groundInteriorWallLength * 0.5),
    dalam_galian: model.floors > 1 ? 0.85 : 0.7,
    penampang_pondasi: model.foundation === "footplat" ? 0.28 : model.floors > 1 ? 0.24 : 0.2,
    jumlah_kolom: Math.max(6, Math.ceil(g.groundArea / 9)),
    tinggi_total: g.totalHeight,
    lantai: model.floors,
    jumlah_km: model.bathrooms,
    jumlah_pintu: model.doors,
    jumlah_jendela: model.windows,
    jumlah_titik_listrik: model.electricalPoints,
    jumlah_titik_air: model.waterPoints,
  };
}
