import type { RoomFunction } from "../data/types";

export interface RoomRule {
  fungsi: RoomFunction;
  label: string;
  /** Luas minimum standar (m²) sebelum penyesuaian skala */
  minArea: number;
  /** Sisi terpendek minimum standar (m) */
  minSide: number;
  /** Luas preferensi ideal untuk kenyamanan (m²) */
  preferredArea: number;
  /**
   * Bobot fleksibilitas (0.0 = sangat kaku, 1.0 = sangat fleksibel).
   * Ruangan berbobot tinggi akan mengecil/mengembang terlebih dahulu saat reflow.
   */
  flexibility: number;
  wet: boolean;
  zone: "depan" | "tengah" | "belakang";
  needsExterior: boolean;
  /** Batas fisik mutlak agar ruangan tidak kolaps menjadi garis (m) */
  hardMinSide: number;
  /** Batas fisik mutlak luas (m²) */
  hardMinArea: number;
}

export const BASE_ROOM_RULES: Record<RoomFunction, RoomRule> = {
  kamar_utama: {
    fungsi: "kamar_utama",
    label: "Kamar utama",
    minArea: 9.0,
    minSide: 2.7,
    preferredArea: 12.0,
    flexibility: 0.35,
    wet: false,
    zone: "belakang",
    needsExterior: true,
    hardMinSide: 2.0,
    hardMinArea: 5.5,
  },
  kamar_tidur: {
    fungsi: "kamar_tidur",
    label: "Kamar tidur",
    minArea: 6.75,
    minSide: 2.4,
    preferredArea: 9.0,
    flexibility: 0.45,
    wet: false,
    zone: "belakang",
    needsExterior: true,
    hardMinSide: 1.8,
    hardMinArea: 4.5,
  },
  kamar_mandi: {
    fungsi: "kamar_mandi",
    label: "Kamar mandi",
    minArea: 2.25,
    minSide: 1.2,
    preferredArea: 3.0,
    flexibility: 0.15, // kaku
    wet: true,
    zone: "belakang",
    needsExterior: false,
    hardMinSide: 0.9,
    hardMinArea: 1.3,
  },
  dapur: {
    fungsi: "dapur",
    label: "Dapur",
    minArea: 4.5,
    minSide: 1.8,
    preferredArea: 6.0,
    flexibility: 0.4,
    wet: true,
    zone: "belakang",
    needsExterior: true,
    hardMinSide: 1.4,
    hardMinArea: 3.0,
  },
  ruang_tamu: {
    fungsi: "ruang_tamu",
    label: "Ruang tamu",
    minArea: 8.0,
    minSide: 2.6,
    preferredArea: 10.0,
    flexibility: 0.6,
    wet: false,
    zone: "depan",
    needsExterior: true,
    hardMinSide: 2.0,
    hardMinArea: 5.0,
  },
  ruang_makan: {
    fungsi: "ruang_makan",
    label: "Ruang makan",
    minArea: 5.5,
    minSide: 2.0,
    preferredArea: 7.5,
    flexibility: 0.7,
    wet: false,
    zone: "tengah",
    needsExterior: false,
    hardMinSide: 1.5,
    hardMinArea: 3.5,
  },
  ruang_keluarga: {
    fungsi: "ruang_keluarga",
    label: "Ruang keluarga",
    minArea: 8.0,
    minSide: 2.6,
    preferredArea: 12.0,
    flexibility: 0.85, // fleksibel tinggi
    wet: false,
    zone: "tengah",
    needsExterior: true,
    hardMinSide: 2.0,
    hardMinArea: 5.0,
  },
  teras: {
    fungsi: "teras",
    label: "Teras",
    minArea: 3.0,
    minSide: 1.4,
    preferredArea: 4.5,
    flexibility: 0.9, // fleksibel tinggi
    wet: false,
    zone: "depan",
    needsExterior: true,
    hardMinSide: 0.9,
    hardMinArea: 1.5,
  },
  carport: {
    fungsi: "carport",
    label: "Carport",
    minArea: 12.5,
    minSide: 2.5,
    preferredArea: 15.0,
    flexibility: 0.8, // fleksibel tinggi
    wet: false,
    zone: "depan",
    needsExterior: true,
    hardMinSide: 2.2,
    hardMinArea: 8.0,
  },
  cuci: {
    fungsi: "cuci",
    label: "Ruang cuci",
    minArea: 2.0,
    minSide: 1.2,
    preferredArea: 3.5,
    flexibility: 0.6,
    wet: true,
    zone: "belakang",
    needsExterior: true,
    hardMinSide: 0.9,
    hardMinArea: 1.2,
  },
  gudang: {
    fungsi: "gudang",
    label: "Gudang",
    minArea: 2.0,
    minSide: 1.2,
    preferredArea: 3.0,
    flexibility: 0.6,
    wet: false,
    zone: "belakang",
    needsExterior: false,
    hardMinSide: 0.9,
    hardMinArea: 1.2,
  },
  tangga: {
    fungsi: "tangga",
    label: "Tangga",
    minArea: 3.2,
    minSide: 1.0,
    preferredArea: 4.0,
    flexibility: 0.1, // sangat kaku
    wet: false,
    zone: "tengah",
    needsExterior: false,
    hardMinSide: 0.9,
    hardMinArea: 2.4,
  },
  koridor: {
    fungsi: "koridor",
    label: "Koridor",
    minArea: 2.0,
    minSide: 0.9,
    preferredArea: 3.0,
    flexibility: 0.9,
    wet: false,
    zone: "tengah",
    needsExterior: false,
    hardMinSide: 0.8,
    hardMinArea: 1.2,
  },
  kerja: {
    fungsi: "kerja",
    label: "Ruang kerja",
    minArea: 5.0,
    minSide: 2.0,
    preferredArea: 7.0,
    flexibility: 0.55,
    wet: false,
    zone: "tengah",
    needsExterior: true,
    hardMinSide: 1.5,
    hardMinArea: 3.0,
  },
};

export interface EffectiveRoomRule {
  minArea: number;
  minSide: number;
  hardMinArea: number;
  hardMinSide: number;
  preferredArea: number;
  flexibility: number;
  label: string;
}

/**
 * Menghitung skala densitas bangunan.
 * Bila luas per lantai kecil sedangkan kebutuhan ruang banyak,
 * aturan minimum diturunkan secara proporsional namun tidak pernah di bawah hardMin.
 */
export function calculateBuildingDensityScale(brief: {
  area: number;
  floors: number;
  bedrooms: number;
  bathrooms: number;
}): number {
  const levelArea = brief.area / Math.max(1, brief.floors);
  // Perkiraan kebutuhan area dasar
  let requiredSum = 8.0 + 4.5 + 3.0; // tamu + dapur + teras
  requiredSum += brief.bedrooms > 0 ? 9.0 + Math.max(0, brief.bedrooms - 1) * 6.75 : 0;
  requiredSum += Math.max(1, brief.bathrooms) * 2.25;
  if (levelArea >= 45) requiredSum += 12.5; // carport
  if (levelArea >= 45) requiredSum += 5.5; // makan
  if (levelArea >= 60) requiredSum += 8.0; // keluarga
  if (brief.floors > 1) requiredSum += 3.2; // tangga

  const targetLevelSum = requiredSum / Math.max(1, brief.floors);
  if (targetLevelSum <= levelArea * 0.98) return 1.0;
  return Math.max(0.65, (levelArea * 0.98) / targetLevelSum);
}

/**
 * Satu sumber kebenaran aturan efektif per ruangan.
 * Digunakan seragam oleh solver, validator, dan editor popover (U8).
 */
export function getEffectiveRule(
  fungsi: RoomFunction | string,
  scale = 1.0
): EffectiveRoomRule {
  const base = (BASE_ROOM_RULES as Record<string, RoomRule>)[fungsi] ?? BASE_ROOM_RULES.kamar_tidur;
  const s = Math.max(0.65, Math.min(1.2, scale));
  const sideScale = Math.max(0.8, Math.sqrt(s));

  return {
    label: base.label,
    minArea: Math.max(base.hardMinArea, Math.round(base.minArea * s * 100) / 100),
    minSide: Math.max(base.hardMinSide, Math.round(base.minSide * sideScale * 100) / 100),
    hardMinArea: base.hardMinArea,
    hardMinSide: base.hardMinSide,
    preferredArea: Math.round(base.preferredArea * s * 100) / 100,
    flexibility: base.flexibility,
  };
}

export function getAllEffectiveRules(scale = 1.0): Record<RoomFunction, EffectiveRoomRule> {
  const out = {} as Record<RoomFunction, EffectiveRoomRule>;
  for (const key of Object.keys(BASE_ROOM_RULES) as RoomFunction[]) {
    out[key] = getEffectiveRule(key, scale);
  }
  return out;
}
