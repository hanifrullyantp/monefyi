import { z } from "zod";
import type { BuildingModel, Project } from "./types";
import { evaluateFormula } from "../engine/formula";
import { repairLegacyRoomCopies } from "../geometry/layout";
import { VARIABLE_NAMES } from "../geometry/variables";

export const SCHEMA_VERSION = 3;

const assumptionSchema = z.object({
  source: z.enum(["pengguna", "usulan_ai", "aturan_parametrik", "default_config"]),
  confirmed: z.boolean(),
  confidence: z.number().min(0).max(1),
  note: z.string().optional(),
});

const ptSchema = z.object({ x: z.number(), y: z.number() });

export const ROOM_FUNCTIONS = ["kamar_utama","kamar_tidur","kamar_mandi","dapur","ruang_tamu","ruang_makan","ruang_keluarga","teras","carport","cuci","gudang","tangga","koridor","kerja"] as const;

const roomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fungsi: z.enum(ROOM_FUNCTIONS),
  level: z.number().int().min(0).max(3),
  polygon: z.array(ptSchema).min(3),
  wet: z.boolean(),
  zone: z.enum(["depan", "tengah", "belakang"]).optional(),
  locked: z.boolean().optional(),
});

const footprintSchema = z.object({
  shape: z.enum(["persegi", "L", "T", "U", "trapesium", "polygon"]),
  width: z.number().positive(),
  depth: z.number().positive(),
  points: z.array(ptSchema).min(3),
});

export const buildingModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  area: z.number().min(9).max(500),
  landArea: z.number().min(9),
  floors: z.number().int().min(1).max(4),
  bedrooms: z.number().int().min(0).max(12),
  bathrooms: z.number().int().min(0).max(12),
  levels: z.array(z.object({ index: z.number().int(), height: z.number().positive(), footprint: footprintSchema })).min(1),
  rooms: z.array(roomSchema),
  roof: z.object({ type: z.enum(["pelana", "perisai", "limasan", "datar"]), pitch: z.number().min(0).max(60), overhang: z.number().min(0).max(2) }),
  finishing: z.enum(["standar", "menengah", "premium"]),
  foundation: z.enum(["batu_kali", "footplat", "cerucuk"]),
  soil: z.enum(["baik", "sedang", "buruk"]),
  location: z.string().min(1),
  regionIndex: z.number().min(0.5).max(2),
  ceilingHeight: z.number().min(2.4).max(5),
  doors: z.number().int().min(1),
  windows: z.number().int().min(1),
  electricalPoints: z.number().int().min(1),
  waterPoints: z.number().int().min(1),
  carport: z.boolean(),
  created: z.string(),
  updated: z.string(),
  assumptions: z.record(z.string(), assumptionSchema.extend({ answered: z.boolean().optional() })),
  structureConfirmed: z.boolean(),
  layoutSeed: z.number().int().optional(),
  layoutTypology: z.enum(["linear", "L", "courtyard", "split", "U"]).optional(),
  roadDirection: z.number().optional(),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(["draf", "indikatif", "detail"]),
  archived: z.boolean(),
  location: z.string(),
  model: buildingModelSchema,
  ratesLocked: z.boolean().optional(),
  lastSavedAt: z.string(),
  thumbnail: z.string().optional(),
  stage: z.number().int().min(1).max(2),
  answers: z.array(z.object({ question: z.string(), answer: z.string(), at: z.string(), slot: z.string() })),
  qualityFlag: z.string().optional(),
  spec: z.record(z.string(), z.string()).optional(),
  facade: z.record(z.string(), z.unknown()).optional(),
  scope: z.object({ carport: z.boolean(), canopy: z.boolean(), balcony: z.boolean(), secondarySkin: z.boolean() }).optional(),
  ppnEnabled: z.boolean().optional(),
});

export const importEnvelopeSchema = z.object({
  schemaVersion: z.number().int().min(0).optional(),
  projects: z.array(z.unknown()).min(1),
  prices: z.array(z.unknown()).optional(),
  exportedAt: z.string().optional(),
});

export function validateBuildingModel(input: unknown): { ok: true; data: BuildingModel } | { ok: false; errors: string[] } {
  const parsed = buildingModelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".") || "model"}: ${issue.message}`) };
  }
  return { ok: true, data: parsed.data as unknown as BuildingModel };
}

export function validateProject(input: unknown): { ok: true; data: Project } | { ok: false; errors: string[] } {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".") || "proyek"}: ${issue.message}`) };
  }
  const data = parsed.data as unknown as Project;
  return { ok: true, data: { ...data, model: repairLegacyRoomCopies(data.model) } };
}

/** Konversi ruangan lama (x,y,w,h) menjadi poligon persegi. */
export function migrateLegacyRoom(raw: Record<string, unknown>, index: number): Record<string, unknown> {
  if (Array.isArray(raw.polygon)) return raw;
  const x = Number(raw.x ?? 0);
  const y = Number(raw.y ?? 0);
  const w = Math.max(0.5, Number(raw.w ?? 2));
  const h = Math.max(0.5, Number(raw.h ?? 2));
  const name = String(raw.name ?? `Ruang ${index + 1}`);
  const wet = Boolean(raw.wet);
  const guess = /mandi|wc/i.test(name) ? "kamar_mandi" : /dapur/i.test(name) ? "dapur" : /tamu/i.test(name) ? "ruang_tamu"
    : /makan/i.test(name) ? "ruang_makan" : /keluarga/i.test(name) ? "ruang_keluarga" : /teras/i.test(name) ? "teras"
    : /carport|garasi/i.test(name) ? "carport" : /cuci/i.test(name) ? "cuci" : /utama/i.test(name) ? "kamar_utama" : "kamar_tidur";
  return {
    id: String(raw.id ?? `r-mig-${index}`),
    name,
    fungsi: guess,
    level: Number(raw.level ?? 0),
    polygon: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }],
    wet: wet || guess === "kamar_mandi" || guess === "dapur" || guess === "cuci",
  };
}

export function migrateLegacyFootprint(raw: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(raw.points) && raw.points.length >= 3) return raw;
  const w = Number(raw.width ?? 6);
  const d = Number(raw.depth ?? 6);
  return { ...raw, shape: raw.shape ?? "persegi", width: w, depth: d, points: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: d }, { x: 0, y: d }] };
}

export function migratePayload(raw: unknown): { data: unknown; notes: string[] } {
  const notes: string[] = [];
  if (!raw || typeof raw !== "object") return { data: raw, notes: ["Payload kosong."] };
  const object = { ...(raw as Record<string, unknown>) };
  const version = typeof object.schemaVersion === "number" ? object.schemaVersion : 0;
  let projects = Array.isArray(object.projects) ? (object.projects as unknown[]) : [];
  if (version < 1) {
    notes.push("Migrasi v0 → v1: melengkapi ratesLocked, stage, answers.");
    projects = projects.map((p) => (p && typeof p === "object" ? { ratesLocked: false, stage: 1, answers: [], ...(p as Record<string, unknown>) } : p));
  }
  if (version < 2) {
    notes.push("Migrasi v1 → v2: menghapus tarif tetap per proyek (rates).");
    projects = projects.map((p) => {
      if (!p || typeof p !== "object") return p;
      const { rates: _rates, ...rest } = p as Record<string, unknown>;
      void _rates;
      return rest;
    });
  }
  if (version < 3) {
    notes.push("Migrasi v2 → v3: ruangan & batas lantai dikonversi ke poligon; menambahkan spec, facade, scope.");
    projects = projects.map((p) => {
      if (!p || typeof p !== "object") return p;
      const proj = p as Record<string, unknown>;
      const model = proj.model as Record<string, unknown> | undefined;
      if (!model) return proj;
      const rooms = Array.isArray(model.rooms) ? (model.rooms as Record<string, unknown>[]).map(migrateLegacyRoom) : [];
      const levels = Array.isArray(model.levels)
        ? (model.levels as Record<string, unknown>[]).map((l) => ({ ...l, footprint: migrateLegacyFootprint((l.footprint ?? {}) as Record<string, unknown>) }))
        : model.levels;
      return {
        ...proj,
        model: { ...model, rooms, levels },
        spec: proj.spec ?? undefined,
        scope: proj.scope ?? { carport: Boolean(model.carport), canopy: true, balcony: Number(model.floors ?? 1) > 1, secondarySkin: false },
        ppnEnabled: proj.ppnEnabled ?? true,
      };
    });
  }
  return { data: { ...object, projects, schemaVersion: SCHEMA_VERSION }, notes };
}

export const buildingModelJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "BuildingModel",
  type: "object",
  required: ["id", "name", "area", "floors", "levels", "rooms", "roof", "finishing", "location"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    type: { type: "string" },
    area: { type: "number", minimum: 9, maximum: 500 },
    floors: { type: "integer", minimum: 1, maximum: 4 },
    levels: {
      type: "array",
      items: { type: "object", properties: { index: { type: "integer" }, height: { type: "number" }, footprint: { type: "object" } } },
    },
    rooms: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, level: { type: "integer" }, x: { type: "number" }, y: { type: "number" }, w: { type: "number" }, h: { type: "number" }, wet: { type: "boolean" } } } },
    roof: { type: "object", properties: { type: { enum: ["pelana", "perisai", "limasan", "datar"] }, pitch: { type: "number" }, overhang: { type: "number" } } },
    finishing: { enum: ["standar", "menengah", "premium"] },
    location: { type: "string" },
  },
} as const;

/* ---------- Katalog (komponen, analisis, mapping) ---------- */
export const komponenSchema = z.object({
  kode: z.string().min(1), uraian: z.string().min(1), jenis: z.enum(["tenaga", "bahan", "alat"]), satuan: z.string().min(1),
  harga: z.number().int().nonnegative(), wilayah: z.string().min(1), tanggalBerlaku: z.string().regex(/^\d{4}-\d{2}-\d{2}/), sumber: z.string().min(1),
});
export const analisisSchema = z.object({
  id: z.string().min(1), pekerjaanId: z.string().min(1), uraian: z.string().min(1), satuan: z.string().min(1),
  komponen: z.array(z.object({ komponenId: z.string().min(1), koefisien: z.number().positive(), waste: z.number().min(0).max(1).optional() })).min(1),
  sumber: z.object({ regulasi: z.string().min(1), tahun: z.number().int().nullable(), halaman: z.string().nullable() }),
  keyakinan: z.enum(["terverifikasi", "belum"]),
});
export const workItemSchema = z.object({
  id: z.string().min(1), paket: z.string().min(1), uraian: z.string().min(1), satuan: z.string().min(1), rumus: z.string().min(1),
  syaratAktif: z.string().optional(), analisisId: z.string().min(1), kelasSumber: z.enum(["terukur", "turunan", "estimasi_struktur", "persentase"]),
  slots: z.array(z.string()), cvVolume: z.number().min(0).max(1), relasi: z.string().optional(), finishingSensitive: z.boolean().optional(),
});

export function validateCatalog(input: unknown): { errors: string[] } {
  const errors: string[] = [];
  const parsed = z.object({ komponen: z.array(komponenSchema), analisis: z.array(analisisSchema), workItems: z.array(workItemSchema) }).safeParse(input);
  if (!parsed.success) return { errors: parsed.error.issues.slice(0, 10).map((i) => `${i.path.join(".")}: ${i.message}`) };
  const { komponen, analisis, workItems } = parsed.data;
  const kodes = new Set(komponen.map((k) => k.kode));
  const ids = new Set(analisis.map((a) => a.id));
  for (const a of analisis) for (const row of a.komponen) if (!kodes.has(row.komponenId)) errors.push(`Analisis ${a.id}: komponen ${row.komponenId} tidak ada.`);
  const vars = Object.fromEntries(VARIABLE_NAMES.map((n) => [n, 1]));
  for (const w of workItems) {
    const targets = w.analisisId.includes("{finishing}") ? ["standar", "menengah", "premium"].map((f) => w.analisisId.replace("{finishing}", f)) : [w.analisisId];
    for (const t of targets) if (!ids.has(t)) errors.push(`Pekerjaan ${w.id}: analisis ${t} tidak ada.`);
    for (const f of [w.rumus, w.syaratAktif].filter(Boolean) as string[]) {
      try { evaluateFormula(f, vars); } catch (e) { errors.push(`Pekerjaan ${w.id}: rumus "${f}" tidak valid — ${(e as Error).message}`); }
    }
  }
  return { errors };
}
