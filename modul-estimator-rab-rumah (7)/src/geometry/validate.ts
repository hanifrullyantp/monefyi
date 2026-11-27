import type { BuildingModel, LayoutIssue, Room, ValidationResult } from "../data/types";
import { ROOM_MIN, requirementScale } from "./solver";
import {
  boundingBox,
  isSimplePolygon,
  overlapAreaConcave,
  polygonArea,
  round2,
  sharedEdgeLength,
  type Polygon,
} from "./polygon";
import { reflowLevel } from "./reflow";

export const MIN_ROOM = Object.fromEntries(
  Object.entries(ROOM_MIN).map(([k, v]) => [k, { area: (v as { area: number }).area, side: (v as { side: number }).side }])
) as Record<string, { area: number; side: number }>;

export interface ValidateOptions {
  minRoom?: Record<string, { area: number; side: number }>;
  toleranceOverlap?: number;
  autoRepairLegacy?: boolean;
}

/**
 * Validasi denah dengan sistem SEVERITAS BARU:
 * - Tidak ada error merah untuk hal yang bisa diperbaiki di editor.
 * - room-too-small, room-too-narrow, no-access, plumbing-far, no-exterior, area-mismatch, openings-exceed = saran (kuning).
 * - overlap / room-outside: dijaga tidak terjadi oleh reflow; jika ada dari impor lama, diperbaiki otomatis dan dilaporkan sebagai info (biru).
 */
export function validateLayout(
  model: BuildingModel,
  rooms: Room[],
  options: ValidateOptions = {}
): ValidationResult & { repairedRooms?: Room[] } {
  const scale = options.minRoom
    ? 1
    : requirementScale({
        area: model.area,
        floors: model.floors,
        bedrooms: model.bedrooms,
        bathrooms: model.bathrooms,
      });

  const mins =
    options.minRoom ??
    Object.fromEntries(
      Object.entries(ROOM_MIN).map(([k, v]) => [
        k,
        {
          area: Math.round((v as { area: number }).area * scale * 100) / 100,
          side: Math.round((v as { side: number }).side * Math.max(0.8, Math.sqrt(scale)) * 100) / 100,
        },
      ])
    );

  const tol = options.toleranceOverlap ?? 0.06;
  const issues: LayoutIssue[] = [];
  let workingRooms = rooms;
  let didRepair = false;

  for (const level of model.levels) {
    const fp: Polygon = level.footprint.points ?? [];
    let levelRooms = workingRooms.filter((r) => r.level === level.index);

    // Deteksi apakah ada overlap / keluar footprint dari data impor lama
    if (options.autoRepairLegacy) {
      const reflowed = reflowLevel(levelRooms, fp);
      levelRooms = reflowed.rooms;
      workingRooms = [...workingRooms.filter((r) => r.level !== level.index), ...levelRooms];
      didRepair = true;
      issues.push({
        code: "legacy-repaired",
        severity: "info",
        message: `Denah lantai ${level.index + 1} dirapikan otomatis ke tiling kedap air tanpa celah/tumpang tindih.`,
        roomIds: [],
        suggestion: "Denah sudah selaras dengan batas bangunan.",
      });
    } else {
      // Periksa overlap
      for (let i = 0; i < levelRooms.length; i++) {
        for (let j = i + 1; j < levelRooms.length; j++) {
          const overlap = overlapAreaConcave(levelRooms[i].polygon, levelRooms[j].polygon);
          if (overlap > tol) {
            issues.push({
              code: "overlap",
              severity: "error",
              message: `${levelRooms[i].name} dan ${levelRooms[j].name} tumpang tindih ${overlap.toFixed(2)} m².`,
              roomIds: [levelRooms[i].id, levelRooms[j].id],
              suggestion: "Geser salah satu ruangan.",
            });
          }
        }
      }
    }

    for (const room of levelRooms) {
      if (!isSimplePolygon(room.polygon)) {
        issues.push({
          code: "room-invalid",
          severity: "info",
          message: `${room.name}: sudut ruangan disederhanakan.`,
          roomIds: [room.id],
        });
        continue;
      }

      const area = polygonArea(room.polygon);
      const min = mins[room.fungsi] ?? { area: 2.0, side: 1.0 };
      const box = boundingBox(room.polygon);
      const shortSide = Math.min(box.w, box.h);

      if (area + 0.05 < min.area) {
        issues.push({
          code: "room-too-small",
          severity: "saran",
          message: `${room.name} (${area.toFixed(1)} m²) di bawah rekomendasi minimum (${min.area} m²).`,
          roomIds: [room.id],
          suggestion: `Perbesar ${room.name} dengan mengecilkan ruang sekitar atau perluas bangunan 0,5 m.`,
          actionLabel: "Perbesar ruangan",
          actionType: "expand-room",
        });
      } else if (shortSide + 0.05 < min.side) {
        issues.push({
          code: "room-too-narrow",
          severity: "saran",
          message: `${room.name} sisi terpendek (${shortSide.toFixed(1)} m) di bawah rekomendasi (${min.side} m).`,
          roomIds: [room.id],
          suggestion: `Ubah proporsi ${room.name} agar lebih leluasa.`,
          actionLabel: "Sesuaikan rasio",
          actionType: "expand-room",
        });
      }

      // Cek apakah ruangan keluar dari batas footprint
      if (fp.length >= 3) {
        const insideArea = overlapAreaConcave(room.polygon, fp);
        if (insideArea < area - Math.max(tol, area * 0.01)) {
          issues.push({
            code: "room-outside",
            severity: "error",
            message: `${room.name} keluar dari batas bangunan.`,
            roomIds: [room.id],
            suggestion: "Geser masuk ke dalam batas bangunan.",
          });
        }
      }

      // Akses bukaan luar untuk kamar tidur/dapur/tamu
      const reqExt = (ROOM_MIN as Record<string, { exterior: boolean }>)[room.fungsi]?.exterior;
      if (reqExt && fp.length >= 3) {
        const ext = sharedEdgeLength(room.polygon, fp);
        if (ext < 1.0) {
          issues.push({
            code: "no-exterior",
            severity: "saran",
            message: `${room.name} minim dinding luar untuk jendela (${ext.toFixed(1)} m).`,
            roomIds: [room.id],
            suggestion: `Geser ${room.name} ke sisi luar untuk pencahayaan alami.`,
            actionLabel: "Pindahkan ke luar",
            actionType: "shift-exterior",
          });
        }
      }
    }

    // Akses sirkulasi
    const publics = levelRooms.filter((r) =>
      ["ruang_tamu", "ruang_keluarga", "ruang_makan", "koridor", "teras", "tangga"].includes(r.fungsi)
    );
    for (const room of levelRooms) {
      if (publics.includes(room)) continue;
      const ok =
        publics.some((p) => sharedEdgeLength(room.polygon, p.polygon) > 0.6) ||
        (fp.length >= 3 && sharedEdgeLength(room.polygon, fp) > 0.6);
      if (!ok) {
        issues.push({
          code: "no-access",
          severity: "saran",
          message: `${room.name} belum memiliki akses langsung ke ruang bersama.`,
          roomIds: [room.id],
          suggestion: `Buka dinding atau hubungkan ${room.name} dengan ruang keluarga/koridor.`,
          actionLabel: "Hubungkan ruang",
          actionType: "shift-exterior",
        });
      }
    }

    // Plumbing efisiensi (area basah)
    const wet = levelRooms.filter((r) => r.wet);
    if (wet.length > 1) {
      for (const w of wet) {
        const near = wet.some((o) => o.id !== w.id && sharedEdgeLength(w.polygon, o.polygon) > 0.4);
        if (!near) {
          issues.push({
            code: "plumbing-far",
            severity: "saran",
            message: `${w.name} berjarak cukup jauh dari instalasi basah lain.`,
            roomIds: [w.id],
            suggestion: `Kelompokkan ${w.name} dekat dapur/KM untuk menghemat jalur pipa air.`,
            actionLabel: "Dekatkan titik basah",
            actionType: "group-plumbing",
          });
        }
      }
    }
  }

  const totalRoomArea = workingRooms.reduce((s, r) => s + polygonArea(r.polygon), 0);
  const targetArea = model.area;
  const areaDelta = round2(totalRoomArea - targetArea);
  if (Math.abs(areaDelta) > Math.max(3, targetArea * 0.1)) {
    issues.push({
      code: "area-mismatch",
      severity: "saran",
      message: `Total ruangan (${totalRoomArea.toFixed(1)} m²) selisih ${Math.abs(areaDelta).toFixed(1)} m² dari luas bangunan (${targetArea} m²).`,
      roomIds: [],
      suggestion: "Gunakan tombol 'Perluas bangunan' atau sesuaikan ukuran ruangan.",
      actionLabel: "Perluas bangunan",
      actionType: "expand-footprint",
    });
  }

  const outerLength = model.levels.reduce(
    (s, l) => s + (l.footprint.points ? perimeterOf(l.footprint.points) : 0),
    0
  );
  const openingLength = model.doors * 0.9 + model.windows * 1.2;
  if (outerLength > 0 && openingLength > outerLength * 0.55) {
    issues.push({
      code: "openings-exceed",
      severity: "saran",
      message: `Lebar total bukaan (${openingLength.toFixed(1)} m) melebihi 55% keliling dinding luar (${outerLength.toFixed(1)} m).`,
      roomIds: [],
      suggestion: "Kurangi jumlah bukaan atau perluas dinding luar.",
      actionLabel: "Sesuaikan bukaan",
      actionType: "ignore",
    });
  }

  return {
    valid: !issues.some((i) => i.severity === "error"),
    issues,
    areaDelta,
    repairedRooms: didRepair ? workingRooms : undefined,
  };
}

function perimeterOf(poly: Polygon) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return s;
}

/**
 * Cek cepat untuk satu ruangan saat drag/resize.
 * Selalu mengizinkan perubahan diterapkan (ok: true) dengan alasan/saran jika di bawah rekomendasi.
 * TIDAK PERNAH menghasilkan ok: false atau membatalkan drag (A1, U6).
 */
export function checkRoomPlacement(
  model: BuildingModel,
  rooms: Room[],
  roomId: string,
  level: number
): { ok: boolean; reason?: string; suggestion?: string } {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return { ok: true };

  // Overlap is a hard geometric violation
  for (const other of rooms) {
    if (other.id === roomId || other.level !== level) continue;
    if (overlapAreaConcave(room.polygon, other.polygon) > 0.06) {
      return {
        ok: false,
        reason: `Tumpang tindih dengan ${other.name}.`,
        suggestion: `Kecilkan ${other.name} atau geser ke posisi lain.`,
      };
    }
  }

  const scale = requirementScale({
    area: model.area,
    floors: model.floors,
    bedrooms: model.bedrooms,
    bathrooms: model.bathrooms,
  });
  const base = (ROOM_MIN as Record<string, { area: number; side: number }>)[room.fungsi] ?? { area: 2, side: 1 };
  const min = {
    area: Math.round(base.area * scale * 100) / 100,
    side: Math.round(base.side * Math.max(0.8, Math.sqrt(scale)) * 100) / 100,
  };
  const area = polygonArea(room.polygon);
  const box = boundingBox(room.polygon);

  if (area + 0.05 < min.area) {
    return {
      ok: true,
      reason: `${room.name} (${area.toFixed(1)} m²) di bawah rekomendasi (${min.area} m²).`,
      suggestion: "Perbesar ruangan dengan menggeser dinding ke ruang fleksibel.",
    };
  }
  if (Math.min(box.w, box.h) + 0.05 < min.side) {
    return {
      ok: true,
      reason: `Sisi terpendek ${room.name} (${Math.min(box.w, box.h).toFixed(1)} m) di bawah rekomendasi (${min.side} m).`,
      suggestion: "Lebarkan sisi ruangan.",
    };
  }

  return { ok: true };
}
