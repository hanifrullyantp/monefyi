import type { AppSettings, BuildingModel, Finishing, Footprint, KomponenJenis, Pt, RoofType } from "./types";

export function rectFootprint(width: number, depth: number): Footprint {
  return {
    shape: "persegi",
    width,
    depth,
    points: [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: depth },
      { x: 0, y: depth },
    ],
  };
}

export function footprintFromPoints(points: Pt[], shape: Footprint["shape"] = "polygon"): Footprint {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { shape, width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...ys) - Math.min(...ys), points };
}

export interface RegionIndex {
  tenaga: number;
  bahan: number;
  alat: number;
}

/**
 * Konfigurasi engine. CATATAN: semua angka di sini CONTOH – belum diverifikasi.
 * baseM2 HANYA dipakai untuk cek kewajaran (peringatan), bukan sumber angka RAB.
 */
export const CONFIG = {
  version: "2.0.0",
  maxArea: 300,
  maxFloors: 2,
  reviewFloors: 3,
  monteCarloIterations: 2000,
  monteCarloSeed: 45,
  baseM2: { standar: 3_650_000, menengah: 4_650_000, premium: 6_400_000 } as Record<Finishing, number>,
  /** Batas kewajaran relatif terhadap baseM2 (CONTOH). */
  reasonableness: { min: 0.55, max: 1.7 },
  regionIndex: {
    Jakarta: { tenaga: 1.25, bahan: 1.12, alat: 1.1 },
    Bandung: { tenaga: 1.08, bahan: 1.05, alat: 1.04 },
    Surabaya: { tenaga: 1.07, bahan: 1.03, alat: 1.03 },
    Yogyakarta: { tenaga: 1.0, bahan: 1.0, alat: 1.0 },
    Semarang: { tenaga: 1.02, bahan: 1.01, alat: 1.01 },
    Denpasar: { tenaga: 1.15, bahan: 1.1, alat: 1.08 },
    Medan: { tenaga: 1.04, bahan: 1.05, alat: 1.04 },
    Makassar: { tenaga: 1.05, bahan: 1.08, alat: 1.06 },
    Balikpapan: { tenaga: 1.2, bahan: 1.15, alat: 1.12 },
    Lainnya: { tenaga: 1.0, bahan: 1.0, alat: 1.0 },
  } as Record<string, RegionIndex>,
  /** Ketidakpastian (koefisien variasi) yang dipakai Monte Carlo. CONTOH. */
  uncertainty: {
    hargaBelum: 0.12,
    hargaTerverifikasi: 0.05,
    hargaBasiTambahan: 0.05,
    koefisienBelum: 0.1,
    koefisienTerverifikasi: 0.04,
    volumeTerkonfirmasi: 0.03,
    luasBelumKonfirmasi: 0.12,
    lokasiBelumKonfirmasi: 0.06,
  },
  /** Kunci variabel penting untuk "Kelengkapan data". */
  completenessKeys: [
    { key: "area", label: "Luas bangunan" },
    { key: "floors", label: "Jumlah lantai" },
    { key: "bedrooms", label: "Kamar tidur" },
    { key: "bathrooms", label: "Kamar mandi" },
    { key: "roof", label: "Bentuk atap" },
    { key: "finishing", label: "Kelas finishing" },
    { key: "location", label: "Lokasi" },
    { key: "landArea", label: "Luas tanah" },
    { key: "foundation", label: "Pondasi/tanah" },
    { key: "openings", label: "Pintu & jendela" },
    { key: "electrical", label: "Titik listrik" },
    { key: "water", label: "Titik air" },
  ],
  calibration: { minSample: 3, shrinkN0: 5, maxAdjust: 0.25 },
};

export function regionIndexFor(location: string): RegionIndex {
  return CONFIG.regionIndex[location] ?? CONFIG.regionIndex.Lainnya;
}

export function indexForJenis(location: string, jenis: KomponenJenis): number {
  return regionIndexFor(location)[jenis];
}

export const PACKAGE_LABELS: Record<string, string> = {
  persiapan: "Persiapan",
  tanah_pondasi: "Pekerjaan tanah & pondasi",
  struktur: "Struktur beton",
  dinding: "Dinding, plester & area basah",
  lantai: "Lantai",
  kusen: "Kusen, pintu & jendela",
  atap: "Atap & lisplang",
  plafon: "Plafon",
  cat: "Pengecatan",
  sanitair: "Sanitair & plumbing",
  listrik_air: "Listrik & air bersih",
  tampak: "Elemen tampak depan",
  kitchen: "Kitchen set",
};

/** Jadwal rencana (minggu relatif 0..1 dari durasi total) untuk kurva S. CONTOH. */
export const PACKAGE_SCHEDULE: Record<string, { start: number; end: number }> = {
  persiapan: { start: 0, end: 0.1 },
  tanah_pondasi: { start: 0.05, end: 0.22 },
  struktur: { start: 0.15, end: 0.5 },
  dinding: { start: 0.35, end: 0.65 },
  atap: { start: 0.45, end: 0.68 },
  kusen: { start: 0.55, end: 0.8 },
  listrik_air: { start: 0.5, end: 0.9 },
  sanitair: { start: 0.6, end: 0.9 },
  plafon: { start: 0.65, end: 0.85 },
  lantai: { start: 0.7, end: 0.92 },
  cat: { start: 0.82, end: 1 },
  tampak: { start: 0.7, end: 0.98 },
  kitchen: { start: 0.85, end: 1 },
};

export const FINISHING_LABEL: Record<Finishing, string> = { standar: "Standar", menengah: "Menengah", premium: "Premium" };
export const ROOF_LABEL: Record<RoofType, string> = { pelana: "Pelana", perisai: "Perisai", limasan: "Limasan", datar: "Datar" };

export const DEFAULT_SETTINGS: AppSettings = {
  overheadPercent: 8,
  profitPercent: 7,
  ppnPercent: 11,
  overheadMode: "rekap",
  priceStaleMonths: 6,
  aiProvider: "mock",
  aiKey: "",
  aiModel: "mock-deterministik",
  sampleMode: true,
  engineMode: "local",
  remoteUrl: "",
};

const iso = () => new Date().toISOString();

export function footprintFor(area: number, floors: number) {
  const levelArea = area / floors;
  const width = Math.max(4, Math.round(Math.sqrt(levelArea * 1.28) * 2) / 2);
  const depth = Math.round((levelArea / width) * 10) / 10;
  return { width, depth, total: Math.round(width * depth * floors * 10) / 10 };
}

export function createBuildingModel(input: Partial<BuildingModel> & { area: number }): BuildingModel {
  const floors = Math.max(1, Math.min(CONFIG.reviewFloors, Math.round(input.floors ?? 1)));
  const area = Math.max(18, Math.min(CONFIG.maxArea, input.area));
  const fp = footprintFor(area, floors);
  const location = input.location ?? "Yogyakarta";
  return {
    id: input.id ?? `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name ?? `Rumah tipe ${Math.round(fp.total)}`,
    type: input.type ?? `${Math.round(fp.total)}`,
    area: fp.total,
    landArea: input.landArea ?? Math.round(fp.total * 1.7),
    floors,
    bedrooms: input.bedrooms ?? (fp.total >= 65 ? 3 : fp.total >= 40 ? 2 : 1),
    bathrooms: input.bathrooms ?? (fp.total >= 65 ? 2 : 1),
    levels: Array.from({ length: floors }, (_, index) => ({ index, height: 3.2, footprint: rectFootprint(fp.width, fp.depth) })),
    rooms: input.rooms ?? [],
    roof: input.roof ?? { type: "pelana", pitch: 30, overhang: 0.6 },
    finishing: input.finishing ?? "menengah",
    foundation: input.foundation ?? (input.soil === "buruk" ? "footplat" : "batu_kali"),
    soil: input.soil ?? "sedang",
    location,
    regionIndex: regionIndexFor(location).bahan,
    ceilingHeight: input.ceilingHeight ?? 3.0,
    doors: input.doors ?? Math.max(3, (input.bedrooms ?? 2) + (input.bathrooms ?? 1) + 2),
    windows: input.windows ?? Math.max(4, (input.bedrooms ?? 2) * 2 + 2),
    electricalPoints: input.electricalPoints ?? Math.max(6, Math.ceil(fp.total / 7)),
    waterPoints: input.waterPoints ?? Math.max(2, (input.bathrooms ?? 1) * 2 + 1),
    carport: input.carport ?? fp.total >= 45,
    created: input.created ?? iso(),
    updated: iso(),
    assumptions: input.assumptions ?? {},
    structureConfirmed: input.structureConfirmed ?? false,
  };
}

export const SAMPLE_PROJECTS: { name: string; location: string; area: number; floors: number; finishing: Finishing; roof: RoofType; bedrooms: number; bathrooms: number; daysAgo: number }[] = [
  { name: "Rumah Bapak Andi", location: "Yogyakarta", area: 45, floors: 1, finishing: "menengah", roof: "limasan", bedrooms: 2, bathrooms: 1, daysAgo: 2 },
  { name: "Rumah Keluarga Sari", location: "Bandung", area: 70, floors: 2, finishing: "standar", roof: "perisai", bedrooms: 3, bathrooms: 2, daysAgo: 9 },
];
