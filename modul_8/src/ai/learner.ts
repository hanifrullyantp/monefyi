import type { BuildingModel, Correction, LearnedPattern } from "../data/types";

const labelFor = (field: string, value: string | number): string => {
  const labels: Record<string, string> = {
    roof: "atap",
    finishing: "finishing",
    bathrooms: "kamar mandi",
    bedrooms: "kamar tidur",
    floors: "lantai",
    height: "tinggi plafon",
  };
  return `${labels[field] ?? field} ${value}`;
};

/**
 * Prior terbelajar deterministik: median/frekuensi koreksi per konteks mirip.
 * Bukan fine-tuning. Hanya pola disetujui yang boleh dipakai otomatis.
 */
export function derivePatterns(corrections: Correction[], statuses: Record<string, "approved" | "pending" | "rejected"> = {}): LearnedPattern[] {
  const groups = new Map<string, Correction[]>();
  for (const correction of corrections) {
    if (correction.proposed === correction.corrected) continue;
    const key = `${correction.field}::${String(correction.corrected)}`;
    const list = groups.get(key) ?? [];
    list.push(correction);
    groups.set(key, list);
  }
  const patterns: LearnedPattern[] = [];
  for (const [key, items] of groups) {
    if (items.length < 3) continue;
    const [field, rawValue] = key.split("::");
    const numeric = Number(rawValue);
    const value = Number.isFinite(numeric) && rawValue.trim() !== "" ? numeric : rawValue;
    const count = items.length;
    const contexts = Array.from(new Set(items.map((item) => `tipe ${item.context.type} · ${item.context.area} m² · ${item.context.location}`)));
    const patternId = `${field}-${rawValue}`;
    patterns.push({
      id: patternId,
      field,
      value,
      label: labelFor(field, value),
      count,
      total: items.length,
      status: statuses[patternId] ?? "pending",
      contexts,
      updatedAt: items.map((item) => item.at).sort().at(-1) ?? new Date().toISOString(),
    });
  }
  return patterns.sort((a, b) => b.count - a.count);
}

export function matchingPatterns(model: Pick<BuildingModel, "type" | "area" | "floors" | "location" | "finishing">, patterns: LearnedPattern[]): LearnedPattern[] {
  return patterns.filter((pattern) => {
    const anyContext = pattern.contexts.some((context) => {
      const area = Number(context.match(/(\d+) m²/)?.[1] ?? 0);
      return Math.abs(area - model.area) / Math.max(1, model.area) < 0.2 || context.includes(`tipe ${model.type}`);
    });
    return anyContext;
  });
}

export function applyApprovedDefaults(model: BuildingModel, patterns: LearnedPattern[]): { model: BuildingModel; applied: string[] } {
  const applied: string[] = [];
  const next: BuildingModel = { ...model, assumptions: { ...model.assumptions }, roof: { ...model.roof } };
  for (const pattern of patterns.filter((item) => item.status === "approved")) {
    if (pattern.field === "roof" && ["pelana", "perisai", "limasan", "datar"].includes(String(pattern.value))) {
      next.roof = { ...next.roof, type: pattern.value as BuildingModel["roof"]["type"] };
      next.assumptions.roof = { source: "aturan_parametrik", confirmed: false, confidence: 0.55, note: "berdasarkan koreksi sebelumnya" };
      applied.push(pattern.label);
    }
    if (pattern.field === "finishing" && ["standar", "menengah", "premium"].includes(String(pattern.value))) {
      next.finishing = pattern.value as BuildingModel["finishing"];
      next.assumptions.finishing = { source: "aturan_parametrik", confirmed: false, confidence: 0.55, note: "berdasarkan koreksi sebelumnya" };
      applied.push(pattern.label);
    }
    if (pattern.field === "bathrooms" && Number(pattern.value) > 0) {
      next.bathrooms = Number(pattern.value);
      next.assumptions.bathrooms = { source: "aturan_parametrik", confirmed: false, confidence: 0.55, note: "berdasarkan koreksi sebelumnya" };
      applied.push(pattern.label);
    }
  }
  return { model: next, applied };
}

export function correctionFromEdit(params: {
  projectId: string;
  context: Correction["context"];
  field: string;
  proposed: string | number | undefined;
  corrected: string | number;
}): Correction {
  return {
    id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    projectId: params.projectId,
    context: params.context,
    field: params.field,
    proposed: params.proposed ?? "default",
    corrected: params.corrected,
    at: new Date().toISOString(),
    approval: "pending",
    source: "pengguna",
  };
}

export function fewShotExamples(corrections: Correction[]): { input: string; output: string }[] {
  return corrections.filter((item) => item.source === "seed" || item.approval === "approved").slice(0, 5).map((item) => ({
    input: `Konteks: tipe ${item.context.type}, ${item.context.area} m², ${item.context.floors} lantai, ${item.context.location}. Isi ${item.field} dengan default.`,
    output: `Koreksi pengguna: ${String(item.field)} = ${String(item.corrected)} (bukan ${String(item.proposed)}).`,
  }));
}
