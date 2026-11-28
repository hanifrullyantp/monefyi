import { SAMPLE_PROJECTS, createBuildingModel } from "./config";
import { buildAutoRooms } from "../geometry/layout";
import type { BuildingModel, Correction, Project } from "./types";

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

const assumptions = (entries: Record<string, [BuildingModel["assumptions"][string]["source"], boolean]>) => {
  const out: BuildingModel["assumptions"] = {};
  for (const [key, [source, confirmed]] of Object.entries(entries)) out[key] = { source, confirmed, confidence: confirmed ? 0.9 : 0.45 };
  return out;
};

function seedProject(sample: (typeof SAMPLE_PROJECTS)[number], index: number): Project {
  const model = createBuildingModel({
    area: sample.area, name: sample.name, floors: sample.floors, finishing: sample.finishing,
    roof: { type: sample.roof, pitch: sample.roof === "datar" ? 2 : 30, overhang: 0.6 },
    bedrooms: sample.bedrooms, bathrooms: sample.bathrooms, location: sample.location,
    landArea: Math.round(sample.area * (sample.floors > 1 ? 1.0 : 1.65)), created: daysAgo(sample.daysAgo),
  });
  const full = index === 1;
  model.assumptions = assumptions({
    area: ["pengguna", true], floors: ["pengguna", true], bedrooms: ["pengguna", true], bathrooms: ["usulan_ai", true],
    roof: ["usulan_ai", full], finishing: ["pengguna", true], location: ["pengguna", true],
    landArea: ["default_config", full], foundation: ["aturan_parametrik", full], openings: ["aturan_parametrik", full],
    electrical: ["default_config", full], water: ["default_config", full],
  });
  model.rooms = buildAutoRooms(model);
  return {
    id: full ? "proj-sampel-70" : "proj-sampel-45",
    name: sample.name,
    createdAt: model.created,
    updatedAt: daysAgo(sample.daysAgo - 1),
    status: "indikatif",
    archived: false,
    location: sample.location,
    model,
    ratesLocked: false,
    lastSavedAt: daysAgo(sample.daysAgo - 1),
    stage: full ? 2 : 1,
    answers: [],
  };
}

export const SEED_PROJECTS: Project[] = SAMPLE_PROJECTS.map(seedProject);

/** Koreksi CONTOH untuk mendemonstrasikan layar Pelajaran AI (bertanda source "seed"). */
export const SEED_CORRECTIONS: Correction[] = [
  ...[1, 2, 3, 4, 5, 6].map((i) => ({ id: `corr-roof-${i}`, context: { type: "45", area: 45, floors: 1, location: "Yogyakarta", finishing: "menengah" as const }, field: "roof", proposed: "pelana", corrected: "limasan", at: daysAgo(18 - i), approval: "pending" as const, source: "seed" as const })),
  ...[1, 2, 3, 4].map((i) => ({ id: `corr-bath-${i}`, context: { type: "70", area: 70, floors: 2, location: "Bandung", finishing: "standar" as const }, field: "bathrooms", proposed: 1, corrected: 2, at: daysAgo(10 - i), approval: "pending" as const, source: "seed" as const })),
];
