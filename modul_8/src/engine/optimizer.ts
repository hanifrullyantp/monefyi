import { SPEC_GROUPS, SPEC_ORDER, minimumStructureLevel, resolveSpec, specAt, specIndex } from "../data/spec";
import type { OptimizerResult, OptimizerStep, ScopeReduction, SpecGroupKey, SpecLevel, SpecState } from "../data/types";

export interface OptimizerContext {
  model: { floors: number; soil: string };
  /** Biaya per kelompok pada tingkat saat ini (rupiah, dari engine). */
  costByGroup: (spec: SpecState) => Record<SpecGroupKey, number>;
  /** RAP total untuk spec tertentu (dari engine pricing). */
  rapFor: (spec: SpecState, scope: OptimizerScope) => number;
  scope: OptimizerScope;
}

export interface OptimizerScope {
  carport: boolean;
  canopy: boolean;
  balcony: boolean;
  secondarySkin: boolean;
}

export interface OptimizerGoal {
  /** RAP maksimum yang diinginkan (target modal). Null = tidak dibatasi. */
  targetRap: number | null;
  /** Tingkat kualitas minimal yang harus dipertahankan per kelompok (kendala user). */
  floorPerGroup?: Partial<Record<SpecGroupKey, SpecLevel>>;
  /** Bobot tambahan: kelompok yang tidak boleh disentuh. */
  frozen?: SpecGroupKey[];
}

const IMPACT: Record<number, OptimizerStep["impact"]> = { 0: "rendah", 1: "sedang", 2: "tinggi" };

function impactOf(group: SpecGroupKey, steps: number): OptimizerStep["impact"] {
  const g = SPEC_GROUPS.find((x) => x.key === group)!;
  // Kelompok yang terlihat user → dampak terasa lebih besar
  const weighted = steps * (0.6 + g.visibility);
  return IMPACT[Math.min(2, Math.floor(weighted))] ?? "tinggi";
}

function reasonFor(group: SpecGroupKey, from: SpecLevel, to: SpecLevel): string {
  const g = SPEC_GROUPS.find((x) => x.key === group)!;
  const hidden = g.visibility < 0.5;
  if (hidden) return `${g.label} tidak terlihat langsung; mutu ${from} → ${to} masih memenuhi aturan minimum.`;
  return `${g.label} terlihat penghuni; ${from} → ${to} menurunkan tampilan/ketahanan finishing.`;
}

/**
 * Optimizer deterministik (greedy berbobot, tanpa AI):
 * 1. Bangun daftar langkah penurunan 1 tingkat yang SAH (lolos kendala keras).
 * 2. Urutkan menurut "hemat per unit dampak kualitas" — yang tak terlihat & aman didahulukan.
 * 3. Terapkan berurutan sampai target tercapai atau tidak ada langkah sah tersisa.
 * Hasil selalu divalidasi ulang lewat resolveSpec + minimumStructureLevel.
 */
export function optimizeSpec(spec: SpecState, goal: OptimizerGoal, ctx: OptimizerContext): OptimizerResult {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const notes: string[] = [];
  let current = resolveSpec(ctx.model, { ...spec }).spec;
  const steps: OptimizerStep[] = [];
  const frozen = new Set(goal.frozen ?? []);
  const startRap = ctx.rapFor(current, ctx.scope);
  let rap = startRap;

  const floorOf = (group: SpecGroupKey): SpecLevel => {
    const userFloor = goal.floorPerGroup?.[group];
    if (group === "struktur") {
      const min = minimumStructureLevel(ctx.model, current);
      return userFloor && specIndex(userFloor) > specIndex(min.level) ? userFloor : min.level;
    }
    return userFloor ?? "ekonomis";
  };

  const target = goal.targetRap;
  let guard = 0;
  while (target !== null && rap > target && guard++ < 200) {
    const costs = ctx.costByGroup(current);
    type Candidate = { group: SpecGroupKey; to: SpecLevel; saving: number; score: number; steps: number };
    const candidates: Candidate[] = [];
    for (const g of SPEC_GROUPS) {
      if (frozen.has(g.key)) continue;
      const from = current[g.key];
      const to = specAt(specIndex(from) - 1);
      if (specIndex(to) >= specIndex(from)) continue;
      if (specIndex(to) < specIndex(floorOf(g.key))) continue;
      const trial: SpecState = { ...current, [g.key]: to };
      const resolved = resolveSpec(ctx.model, trial);
      // Kendala keras: resolusi tidak boleh menaikkan kembali kelompok lain (artinya melanggar dependensi)
      if (resolved.adjustments.some((a) => a.group !== g.key)) continue;
      if (resolved.spec[g.key] !== to) continue;
      const nextRap = ctx.rapFor(resolved.spec, ctx.scope);
      const saving = rap - nextRap;
      if (saving <= 0) continue;
      const qualityCost = 0.35 + g.visibility * 1.65;
      candidates.push({ group: g.key, to, saving, score: saving / qualityCost, steps: 1 });
      void costs;
    }
    if (!candidates.length) break;
    candidates.sort((a, b) => b.score - a.score || a.group.localeCompare(b.group));
    const pick = candidates[0];
    const from = current[pick.group];
    current = resolveSpec(ctx.model, { ...current, [pick.group]: pick.to }).spec;
    rap = ctx.rapFor(current, ctx.scope);
    steps.push({
      group: pick.group,
      label: SPEC_GROUPS.find((g) => g.key === pick.group)!.label,
      from,
      to: pick.to,
      saving: pick.saving,
      impact: impactOf(pick.group, 1),
      reason: reasonFor(pick.group, from, pick.to),
    });
  }

  // Batas terendah yang aman (semua kelompok di floor, struktur di minimum aturan)
  const floorSpec: SpecState = { ...current };
  for (const g of SPEC_GROUPS) floorSpec[g.key] = floorOf(g.key);
  const safeSpec = resolveSpec(ctx.model, floorSpec).spec;
  const safeFloorRap = ctx.rapFor(safeSpec, ctx.scope);

  const scopeOptions: ScopeReduction[] = [];
  const scopeTrials: [keyof OptimizerScope, string][] = [
    ["carport", "Hilangkan carport"],
    ["canopy", "Hilangkan kanopi"],
    ["balcony", "Hilangkan balkon"],
    ["secondarySkin", "Hilangkan secondary skin"],
  ];
  for (const [key, label] of scopeTrials) {
    if (!ctx.scope[key]) continue;
    const trialScope = { ...ctx.scope, [key]: false };
    const saving = rap - ctx.rapFor(current, trialScope);
    if (saving > 0) scopeOptions.push({ key: key as ScopeReduction["key"], label, saving, note: "Lingkup berkurang; RAB & 3D menyesuaikan." });
  }

  const feasible = target === null || safeFloorRap <= target;
  const reachedTarget = target !== null && rap <= target;
  if (target !== null && !reachedTarget) {
    notes.push(
      feasible
        ? "Target belum tercapai dengan penurunan mutu yang aman pada kelompok yang boleh disentuh."
        : `Target tidak dapat dicapai tanpa melanggar aturan minimum. RAP terendah yang aman ${safeFloorRap.toLocaleString("id-ID")}.`,
    );
  }
  if (steps.some((s) => s.impact === "tinggi")) notes.push("Ada langkah berdampak tinggi pada kualitas yang terlihat.");
  if (!steps.length && target !== null && reachedTarget) notes.push("Target sudah terpenuhi tanpa perubahan spesifikasi.");

  return {
    feasible,
    reachedTarget,
    steps,
    spec: current,
    rap,
    sellingPrice: 0,
    margin: 0,
    shortfall: target !== null && rap > target ? rap - target : 0,
    safeFloorRap,
    scopeOptions: scopeOptions.sort((a, b) => b.saving - a.saving),
    notes,
    elapsedMs: Math.round(((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0) * 100) / 100,
  };
}

/** Rencana efisiensi: potensi hemat maksimum per kelompok tanpa melanggar kendala keras. */
export function efficiencyRows(spec: SpecState, goal: OptimizerGoal, ctx: OptimizerContext) {
  const current = resolveSpec(ctx.model, { ...spec }).spec;
  const baseRap = ctx.rapFor(current, ctx.scope);
  return SPEC_GROUPS.map((g) => {
    const floorLevel = goal.floorPerGroup?.[g.key] ?? (g.key === "struktur" ? minimumStructureLevel(ctx.model, current).level : "ekonomis");
    let best = current;
    let probe = current[g.key];
    for (;;) {
      const next = specAt(specIndex(probe) - 1);
      if (specIndex(next) >= specIndex(probe) || specIndex(next) < specIndex(floorLevel)) break;
      const trial = resolveSpec(ctx.model, { ...best, [g.key]: next });
      if (trial.adjustments.some((a) => a.group !== g.key) || trial.spec[g.key] !== next) break;
      best = trial.spec;
      probe = next;
    }
    const maxSaving = baseRap - ctx.rapFor(best, ctx.scope);
    const blocked = maxSaving <= 0;
    return {
      group: g.key,
      label: g.label,
      currentCost: ctx.costByGroup(current)[g.key] ?? 0,
      maxSaving: Math.max(0, maxSaving),
      impact: impactOf(g.key, Math.max(1, specIndex(current[g.key]) - specIndex(probe))),
      portion: 0,
      blockedReason: blocked ? (g.key === "struktur" ? "Sudah pada batas aturan struktur." : "Tidak ada penurunan yang sah.") : undefined,
      specAtFloor: best,
    };
  });
}

/** Terapkan porsi efisiensi (0..100) per kelompok → spec baru. */
export function applyEfficiency(spec: SpecState, portions: Partial<Record<SpecGroupKey, number>>, ctx: OptimizerContext, goal: OptimizerGoal): SpecState {
  let out = resolveSpec(ctx.model, { ...spec }).spec;
  const rows = efficiencyRows(out, goal, ctx);
  for (const row of rows) {
    const portion = Math.max(0, Math.min(100, portions[row.group] ?? 0));
    if (!portion) continue;
    const stepsDown = Math.round(((specIndex(out[row.group]) - specIndex(row.specAtFloor[row.group])) * portion) / 100);
    if (stepsDown <= 0) continue;
    const target = specAt(specIndex(out[row.group]) - stepsDown);
    const trial = resolveSpec(ctx.model, { ...out, [row.group]: target });
    if (trial.adjustments.some((a) => a.group !== row.group)) continue;
    out = trial.spec;
  }
  return out;
}

export { SPEC_ORDER };
