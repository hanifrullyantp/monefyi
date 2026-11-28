import type { AppSettings, FacadeSpec, MaterialFactorRow, SpecConstraint, SpecGroup, SpecGroupKey, SpecLevel, SpecState, StructureRule } from "./types";

export const SPEC_ORDER: SpecLevel[] = ["ekonomis", "standar", "menengah", "premium"];
export const SPEC_LABEL: Record<SpecLevel, string> = {
  ekonomis: "Ekonomis",
  standar: "Standar",
  menengah: "Menengah",
  premium: "Premium",
};

export const specIndex = (level: SpecLevel) => SPEC_ORDER.indexOf(level);
export const specAt = (i: number): SpecLevel => SPEC_ORDER[Math.max(0, Math.min(SPEC_ORDER.length - 1, i))];

/**
 * Kelompok spesifikasi. `packages` menghubungkan ke paket pekerjaan engine,
 * `visibility` = seberapa terlihat oleh penghuni (kendala lunak optimizer).
 */
export const SPEC_GROUPS: SpecGroup[] = [
  { key: "struktur", label: "Pondasi & struktur", hint: "Pondasi, sloof, kolom, balok, plat", packages: ["tanah_pondasi", "struktur"], visibility: 0.15, structural: true },
  { key: "dinding", label: "Dinding & plester", hint: "Pasangan, plester, acian, kedap air", packages: ["dinding"], visibility: 0.45 },
  { key: "atap", label: "Atap", hint: "Rangka & penutup atap", packages: ["atap"], visibility: 0.7 },
  { key: "plafon", label: "Plafon", hint: "Rangka & penutup plafon", packages: ["plafon"], visibility: 0.55 },
  { key: "lantai", label: "Lantai", hint: "Keramik umum, area basah, servis", packages: ["lantai"], visibility: 0.85 },
  { key: "kusen", label: "Kusen, pintu & jendela", hint: "Material kusen dan daun", packages: ["kusen"], visibility: 0.8 },
  { key: "cat", label: "Pengecatan", hint: "Cat dinding dalam & luar", packages: ["cat"], visibility: 0.9 },
  { key: "sanitair", label: "Sanitair", hint: "Kloset, wastafel, shower", packages: ["sanitair"], visibility: 0.75 },
  { key: "listrik", label: "Listrik", hint: "Titik, armatur, panel", packages: ["listrik_air"], visibility: 0.5 },
  { key: "air", label: "Air bersih", hint: "Pipa, tandon, pompa", packages: ["listrik_air", "sanitair"], visibility: 0.35 },
  { key: "tampak", label: "Elemen tampak", hint: "Kanopi, balkon, secondary skin", packages: ["tampak"], visibility: 0.95 },
  { key: "kitchen", label: "Kitchen set", hint: "Lemari dapur & meja", packages: ["kitchen"], visibility: 0.85 },
];

export const SPEC_GROUP_BY_KEY = Object.fromEntries(SPEC_GROUPS.map((g) => [g.key, g])) as Record<SpecGroupKey, SpecGroup>;

/**
 * Faktor pengali harga per tingkat (diterapkan pada komponen bahan kelompok tsb).
 * CONTOH — bukan kutipan regulasi.
 */
export const SPEC_PRICE_FACTOR: Record<SpecLevel, number> = {
  ekonomis: 0.84,
  standar: 1,
  menengah: 1.22,
  premium: 1.62,
};

export const DEFAULT_MATERIAL_FACTORS: Record<SpecGroupKey, MaterialFactorRow> = Object.fromEntries(
  SPEC_GROUPS.map(group => [group.key, { factors: { ...SPEC_PRICE_FACTOR }, source: 'CONTOH - belum dikalibrasi', calibrated: false }]),
) as Record<SpecGroupKey, MaterialFactorRow>;

export function materialFactorsFor(settings: Pick<AppSettings, 'materialFactors'>, group: SpecGroupKey): MaterialFactorRow {
  const row = settings.materialFactors?.[group] ?? DEFAULT_MATERIAL_FACTORS[group];
  if (!row || SPEC_ORDER.some(l => !Number.isFinite(row.factors?.[l]) || row.factors[l] <= 0)) {
    throw new Error(`Faktor bahan ${group} tidak valid. Periksa pengaturan faktor.`);
  }
  if (row.calibrated && (!row.source?.trim() || /contoh/i.test(row.source))) throw new Error('Kalibrasi faktor memerlukan sumber pembanding non-contoh.');
  return row;
}

/** Aturan ketergantungan antar kelompok. */
export const SPEC_CONSTRAINTS: SpecConstraint[] = [
  { when: { group: "atap", level: "premium" }, requires: { group: "struktur", minLevel: "menengah" }, reason: "Penutup atap berat butuh struktur yang memenuhi." },
  { when: { group: "atap", level: "menengah" }, requires: { group: "struktur", minLevel: "standar" }, reason: "Rangka bentang menengah butuh struktur standar." },
  { when: { group: "lantai", level: "premium" }, requires: { group: "dinding", minLevel: "standar" }, reason: "Lantai premium perlu dinding rata (plester+aci standar)." },
  { when: { group: "sanitair", level: "premium" }, requires: { group: "air", minLevel: "menengah" }, reason: "Sanitair premium butuh instalasi air menengah (air panas)." },
  { when: { group: "tampak", level: "premium" }, requires: { group: "cat", minLevel: "menengah" }, reason: "Elemen tampak premium perlu cat eksterior menengah." },
];

/** Aturan struktur minimum (data config, dapat diimpor; bukan karangan AI). */
export const STRUCTURE_RULES: StructureRule[] = [
  { key: "struktur.floors2", label: "Rumah 2 lantai: struktur minimal Menengah", minSpecLevel: "menengah", appliesWhen: { floors: 2 }, note: "Kolom & balok memikul plat lantai." },
  { key: "struktur.floors3", label: "Rumah 3 lantai: struktur Premium + review engineer", minSpecLevel: "premium", appliesWhen: { floors: 3 }, note: "Wajib perhitungan struktur." },
  { key: "struktur.soilBuruk", label: "Tanah buruk: struktur minimal Menengah", minSpecLevel: "menengah", appliesWhen: { soil: "buruk" }, note: "Pondasi perlu penyesuaian daya dukung." },
  { key: "struktur.roofHeavy", label: "Atap berat (premium): struktur minimal Menengah", minSpecLevel: "menengah", appliesWhen: { roofHeavy: true }, note: "Beban atap diteruskan ke ring balk." },
  { key: "struktur.default", label: "Struktur minimal Standar", minSpecLevel: "standar", note: "Batas bawah aman modul." },
];

export function minimumStructureLevel(model: { floors: number; soil: string }, spec: SpecState): { level: SpecLevel; rule: StructureRule } {
  const roofHeavy = spec.atap === "premium";
  let best: { level: SpecLevel; rule: StructureRule } = { level: "standar", rule: STRUCTURE_RULES[STRUCTURE_RULES.length - 1] };
  for (const rule of STRUCTURE_RULES) {
    const a = rule.appliesWhen;
    if (a) {
      if (a.floors !== undefined && model.floors < a.floors) continue;
      if (a.soil !== undefined && model.soil !== a.soil) continue;
      if (a.roofHeavy !== undefined && roofHeavy !== a.roofHeavy) continue;
    }
    if (specIndex(rule.minSpecLevel) > specIndex(best.level)) best = { level: rule.minSpecLevel, rule };
  }
  return best;
}

/** Default awal: spesifikasi terdekat & termurah yang tetap valid. */
export function defaultSpec(model: { floors: number; soil: string }): SpecState {
  const base: SpecState = {
    struktur: "standar", dinding: "standar", atap: "standar", plafon: "ekonomis", lantai: "standar",
    kusen: "standar", cat: "standar", sanitair: "standar", listrik: "standar", air: "standar",
    tampak: "ekonomis", kitchen: "ekonomis",
  };
  const min = minimumStructureLevel(model, base);
  base.struktur = min.level;
  return resolveSpec(model, base).spec;
}

export interface SpecResolution {
  spec: SpecState;
  adjustments: { group: SpecGroupKey; from: SpecLevel; to: SpecLevel; reason: string }[];
}

/** Terapkan aturan: naikkan kelompok yang bergantung bila syarat belum terpenuhi. */
export function resolveSpec(model: { floors: number; soil: string }, spec: SpecState): SpecResolution {
  const next: SpecState = { ...spec };
  const adjustments: SpecResolution["adjustments"] = [];
  const min = minimumStructureLevel(model, next);
  if (specIndex(next.struktur) < specIndex(min.level)) {
    adjustments.push({ group: "struktur", from: next.struktur, to: min.level, reason: min.rule.label });
    next.struktur = min.level;
  }
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const c of SPEC_CONSTRAINTS) {
      if (specIndex(next[c.when.group]) < specIndex(c.when.level)) continue;
      if (specIndex(next[c.requires.group]) >= specIndex(c.requires.minLevel)) continue;
      adjustments.push({ group: c.requires.group, from: next[c.requires.group], to: c.requires.minLevel, reason: c.reason });
      next[c.requires.group] = c.requires.minLevel;
      changed = true;
    }
    if (!changed) break;
  }
  return { spec: next, adjustments };
}

/** Apakah `level` boleh dipilih untuk `group` pada kondisi sekarang? */
export function specOptionBlocked(model: { floors: number; soil: string }, spec: SpecState, group: SpecGroupKey, level: SpecLevel): string | null {
  if (group === "struktur") {
    const min = minimumStructureLevel(model, spec);
    if (specIndex(level) < specIndex(min.level)) return min.rule.label;
  }
  for (const c of SPEC_CONSTRAINTS) {
    if (c.requires.group !== group) continue;
    if (specIndex(level) >= specIndex(c.requires.minLevel)) continue;
    if (specIndex(spec[c.when.group]) >= specIndex(c.when.level)) {
      return `${c.reason} Turunkan ${SPEC_GROUP_BY_KEY[c.when.group].label} dulu.`;
    }
  }
  return null;
}

/* ---------- Material tampak (daftar tertutup) ---------- */

export interface FacadeMaterial {
  id: string;
  label: string;
  wall: string;
  accent: string;
  roof: string;
  trim: string;
  style: FacadeSpec["style"][];
}

export const FACADE_PALETTES: FacadeMaterial[] = [
  { id: "putih-kayu", label: "Putih & kayu hangat", wall: "#F5F1E8", accent: "#A9754F", roof: "#4A4E4B", trim: "#2F3733", style: ["minimalis", "skandinavia", "tropis"] },
  { id: "abu-beton", label: "Abu beton & hitam", wall: "#DDD9D2", accent: "#5B6360", roof: "#33383A", trim: "#22262A", style: ["industrial", "minimalis"] },
  { id: "krem-terakota", label: "Krem & terakota", wall: "#F1E4CE", accent: "#B4533C", roof: "#8C4A34", trim: "#5A382C", style: ["tropis", "klasik_modern"] },
  { id: "hijau-tropis", label: "Hijau tropis & batu", wall: "#E9EDE4", accent: "#3F6B52", roof: "#38493F", trim: "#25332B", style: ["tropis", "skandinavia"] },
  { id: "putih-klasik", label: "Putih klasik & emas", wall: "#FBF7EF", accent: "#C9A227", roof: "#5A4632", trim: "#3B3126", style: ["klasik_modern"] },
  { id: "gelap-modern", label: "Gelap modern & tembaga", wall: "#3B4145", accent: "#C1794A", roof: "#23282B", trim: "#14181A", style: ["industrial", "minimalis"] },
];

export const FACADE_STYLES: { id: FacadeSpec["style"]; label: string; note: string }[] = [
  { id: "minimalis", label: "Minimalis", note: "Bidang bersih, bukaan besar" },
  { id: "tropis", label: "Tropis", note: "Overhang lebar, roster, tanaman" },
  { id: "skandinavia", label: "Skandinavia", note: "Atap pelana, kayu terang" },
  { id: "klasik_modern", label: "Klasik modern", note: "Kolom, profil, simetri" },
  { id: "industrial", label: "Industrial", note: "Ekspos, gelap, roster baja" },
];

export function defaultFacade(style: FacadeSpec["style"] = "minimalis", floors = 1): FacadeSpec {
  const base: FacadeSpec = {
    style,
    cantilever: 0,
    splitLevel: false,
    roofType: "pelana",
    roofPitch: 30,
    overhang: 0.6,
    canopy: true,
    windows: "standar",
    louvre: false,
    columns: style === "klasik_modern" ? 2 : 0,
    secondarySkin: false,
    balcony: false,
    carport: "terbuka",
    fence: true,
    accentWall: style === "industrial" || style === "tropis",
    planter: style === "tropis",
    frontStairs: true,
    palette: FACADE_PALETTES.find((p) => p.style.includes(style))?.id ?? "putih-kayu",
  };
  if (floors > 1) {
    base.balcony = true;
    base.cantilever = style === "minimalis" || style === "industrial" ? 0.8 : 0;
  }
  if (style === "tropis") { base.overhang = 1.1; base.roofPitch = 35; base.louvre = true; }
  if (style === "skandinavia") { base.roofPitch = 38; base.roofType = "pelana"; }
  if (style === "industrial") { base.roofType = "datar"; base.roofPitch = 3; base.secondarySkin = true; }
  if (style === "klasik_modern") { base.roofType = "limasan"; base.roofPitch = 30; }
  return base;
}

export function paletteFor(id: string): FacadeMaterial {
  return FACADE_PALETTES.find((p) => p.id === id) ?? FACADE_PALETTES[0];
}

/** Elemen tampak yang menambah biaya → jadi item pekerjaan. */
export function facadeCostElements(f: FacadeSpec): { key: string; label: string; qty: number; satuan: string }[] {
  const out: { key: string; label: string; qty: number; satuan: string }[] = [];
  if (f.canopy) out.push({ key: "tampak.kanopi", label: "Kanopi depan", qty: 4.5, satuan: "m²" });
  if (f.balcony) out.push({ key: "tampak.balkon", label: "Balkon + railing", qty: 5.2, satuan: "m²" });
  if (f.secondarySkin) out.push({ key: "tampak.skin", label: "Secondary skin", qty: 12, satuan: "m²" });
  if (f.columns > 0) out.push({ key: "tampak.kolom", label: "Kolom dekoratif", qty: f.columns, satuan: "unit" });
  if (f.fence) out.push({ key: "tampak.pagar", label: "Pagar depan", qty: 9, satuan: "m" });
  if (f.accentWall) out.push({ key: "tampak.aksen", label: "Dinding aksen", qty: 7, satuan: "m²" });
  if (f.planter) out.push({ key: "tampak.planter", label: "Planter box", qty: 3, satuan: "unit" });
  if (f.carport !== "tidak") out.push({ key: "tampak.carport", label: `Carport ${f.carport}`, qty: f.carport === "tertutup" ? 18 : 12, satuan: "m²" });
  if (f.frontStairs) out.push({ key: "tampak.tangga", label: "Tangga & bordes depan", qty: 2.4, satuan: "m²" });
  if (f.louvre) out.push({ key: "tampak.louvre", label: "Roster / louvre", qty: 4, satuan: "m²" });
  return out;
}
