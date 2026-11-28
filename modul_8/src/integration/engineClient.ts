import type {
  ActualRecord, Analisis, AppSettings, BuildingModel, CalibrationFactors, CalibrationVersion, Catalog, Correction, EfficiencyRow,
  FacadeSpec, Komponen, LayoutAlternative, LayoutBrief, OptimizerResult, Project, RabResult, Room, SpecGroupKey, SpecLevel, SpecState,
  ValidationResult, WorkItem, RapBreakdown,
} from "../data/types";
import { generateLayouts as solveLayouts } from "../geometry/solver";
import { checkRoomPlacement as checkPlacement, validateLayout as validateRooms } from "../geometry/validate";
import { applyEfficiency as applyEff, efficiencyRows, optimizeSpec, type OptimizerGoal, type OptimizerScope } from "../engine/optimizer";
import { SPEC_GROUPS, SPEC_ORDER, defaultFacade, defaultSpec, resolveSpec, specOptionBlocked } from "../data/spec";
import { facadeFromText } from "../ai/facade";
export type { OptimizerGoal };
import { resolvePricingTarget, summarizePortfolio, type TargetRequest } from "../engine/pricing";
export type { TargetRequest };
import { computeRab, rangeWidthIf, specGroupForItem } from "../engine/rab";
import { parseBacktestCsv, proposeCalibration, runBacktest, type BacktestResult, type FactorDetail } from "../engine/calibration";
import { rankQuestions, type InterviewQuestion } from "../ai/interviewer";
import { routeIntent, type IntentResult } from "../ai/router";
import { getProvider } from "../ai/provider";
import { previewFormula } from "../engine/formula";
export type { BacktestResult };

export interface CalibrationReport {
  active: CalibrationVersion | null;
  proposal: { factors: CalibrationFactors; details: FactorDetail[] };
  sampleSize: number;
}

/** Satu-satunya pintu UI ke engine. UI tidak boleh memanggil src/engine langsung. */
export interface EngineClient {
  readonly mode: "local" | "remote";
  summarizePortfolio: typeof summarizePortfolio;
  computeRab(project: Project): Promise<RabResult>;
  planTarget(project: Project, request: TargetRequest): Promise<RapBreakdown>;
  interpretText(text: string): Promise<IntentResult>;
  nextQuestion(project: Project): Promise<InterviewQuestion | null>;
  recordCorrection(c: Correction): Promise<void>;
  recordActuals(a: ActualRecord): Promise<void>;
  getCalibration(): Promise<CalibrationReport>;
  /** Back-test blind-run dari CSV (parameter + realisasi). */
  runBacktest(csv: string): Promise<{ result: BacktestResult | null; errors: string[] }>;
  /** Pratinjau rumus volume dengan parser engine (tanpa eval). */
  previewFormula(formula: string, vars: Record<string, number>): ReturnType<typeof previewFormula>;
  /** Denah alternatif dari solver (deterministik per seed). */
  generateLayouts(brief: LayoutBrief, count?: number): Promise<LayoutAlternative[]>;
  /** Validasi denah (aturan ukuran, tumpang tindih, akses, plumbing). */
  validateLayout(model: BuildingModel, rooms: Room[]): Promise<ValidationResult>;
  /** Cek cepat satu ruangan saat drag/resize. */
  checkRoomPlacement(model: BuildingModel, rooms: Room[], roomId: string, level: number): Promise<{ ok: boolean; reason?: string; suggestion?: string }>;
  /** Optimizer planner harga. */
  optimize(project: Project, goal: OptimizerGoal): Promise<OptimizerResult>;
  /** Rencana efisiensi per kelompok. */
  efficiency(project: Project, goal: OptimizerGoal): Promise<(EfficiencyRow & { specAtFloor: SpecState })[]>;
  /** Terapkan porsi efisiensi. */
  applyEfficiency(project: Project, portions: Partial<Record<SpecGroupKey, number>>, goal: OptimizerGoal): Promise<SpecState>;
  /** Selisih biaya per kelompok bila tingkat diubah (untuk slider realtime). */
  specDeltas(project: Project): Promise<Record<SpecGroupKey, { current: number; options: { level: SpecLevel; delta: number; blocked?: string }[] }>>;
  /** FacadeSpec dari teks (AI/provider); gagal validasi → error "perlu input manual". */
  facadeFromText(text: string, model: BuildingModel): Promise<{ spec: FacadeSpec; variations: FacadeSpec[]; note?: string }>;
  catalog: {
    listWorkItems(): Promise<WorkItem[]>;
    listAnalyses(): Promise<Analisis[]>;
    listPrices(): Promise<Komponen[]>;
    upsertPrice(k: Komponen): Promise<void>;
    upsertAnalysis(a: Analisis): Promise<void>;
  };
}

/** Sumber data yang disediakan host/UI untuk adaptor lokal (state React, IndexedDB, dsb.). */
export interface LocalEngineStore {
  getCatalog(): Catalog;
  getSettings(): AppSettings;
  getActiveCalibration(): CalibrationVersion | null;
  getActuals(): ActualRecord[];
  onCorrection(c: Correction): void;
  onActuals(a: ActualRecord): void;
  onUpsertPrice(k: Komponen): void;
  onUpsertAnalysis(a: Analisis): void;
}

export class LocalEngineAdapter implements EngineClient {
  summarizePortfolio = summarizePortfolio;
  readonly mode = "local" as const;
  constructor(private store: LocalEngineStore) {}

  private input(project: Project, iterations?: number) {
    const cal = this.store.getActiveCalibration();
    const actual = this.store.getActuals().filter((a) => a.projectId === project.id).at(-1);
    const catalog = this.store.getCatalog();
    return {
      model: project.model,
      settings: this.store.getSettings(),
      catalog: project.ratesLocked && project.priceSnapshot ? { ...catalog, komponen: project.priceSnapshot } : catalog,
      calibration: cal?.factors ?? null,
      calibrationId: cal?.id,
      overrides: project.boqOverrides,
      extraItems: project.extraItems,
      actualProgress: actual?.progress,
      iterations,
      spec: project.spec ?? defaultSpec(project.model),
      facade: project.facade,
      scope: project.scope,
      ppnEnabled: project.ppnEnabled ?? true,
    };
  }

  async computeRab(project: Project) {
    return computeRab(this.input(project));
  }

  async planTarget(project: Project, request: TargetRequest) {
    const settings = this.store.getSettings();
    return resolvePricingTarget(request, { settings, ppnEnabled: project.ppnEnabled ?? true, rap: settings.rapConfig });
  }

  async interpretText(text: string): Promise<IntentResult> {
    const settings = this.store.getSettings();
    if (settings.aiProvider !== "mock" && settings.aiKey) {
      try {
        return await getProvider(settings).interpret(text);
      } catch (error) {
        const fallback = routeIntent(text);
        return { ...fallback, note: `Penyedia AI gagal (${error instanceof Error ? error.message : "tidak diketahui"}); memakai aturan bahasa lokal.` };
      }
    }
    return routeIntent(text);
  }

  async nextQuestion(project: Project) {
    const input = this.input(project, 600);
    const ranked = rankQuestions(project.model, project.stage, (slots) => rangeWidthIf(input, slots, 600));
    return ranked[0] ?? null;
  }

  async recordCorrection(c: Correction) { this.store.onCorrection(c); }
  async recordActuals(a: ActualRecord) { this.store.onActuals(a); }
  async getCalibration(): Promise<CalibrationReport> {
    const actuals = this.store.getActuals();
    return { active: this.store.getActiveCalibration(), proposal: proposeCalibration(actuals), sampleSize: actuals.length };
  }

  previewFormula(formula: string, vars: Record<string, number>) { return previewFormula(formula, vars); }

  async runBacktest(csv: string) {
    const parsed = parseBacktestCsv(csv);
    if (!parsed.rows.length) return { result: null, errors: parsed.errors };
    return { result: runBacktest(parsed.rows, { settings: this.store.getSettings(), catalog: this.store.getCatalog() }), errors: parsed.errors };
  }


  async generateLayouts(brief: LayoutBrief, count = 3) { return solveLayouts(brief, count); }
  async validateLayout(model: BuildingModel, rooms: Room[]) { return validateRooms(model, rooms); }
  async checkRoomPlacement(model: BuildingModel, rooms: Room[], roomId: string, level: number) { return checkPlacement(model, rooms, roomId, level); }

  private ctx(project: Project) {
    const source = this.input(project, 10);
    const scope: OptimizerScope = {
      carport: project.scope?.carport ?? project.model.carport,
      canopy: project.scope?.canopy ?? true,
      balcony: project.scope?.balcony ?? project.model.floors > 1,
      secondarySkin: project.scope?.secondarySkin ?? false,
    };
    const rabFor = (spec: SpecState, sc: OptimizerScope) =>
      computeRab({ ...source, spec, scope: sc });
    return {
      model: { floors: project.model.floors, soil: project.model.soil },
      scope,
      costByGroup: (spec: SpecState) => {
        const rab = rabFor(spec, scope);
        const out = {} as Record<SpecGroupKey, number>;
        for (const g of SPEC_GROUPS) out[g.key] = rab.items.filter((i) => specGroupForItem(i.packageKey, i.workItemId) === g.key).reduce((s, i) => s + i.amount, 0);
        return out;
      },
      rapFor: (spec: SpecState, sc: OptimizerScope) => rabFor(spec, sc).rap.rap,
    };
  }

  async optimize(project: Project, goal: OptimizerGoal) {
    const spec = project.spec ?? defaultSpec({ floors: project.model.floors, soil: project.model.soil });
    const ctx = this.ctx(project);
    const result = optimizeSpec(spec, goal, ctx);
    const finalRab = computeRab({ ...this.input(project, 10), spec: result.spec, scope: ctx.scope });
    return { ...result, sellingPrice: finalRab.rap.sellingPrice, margin: finalRab.rap.margin };
  }

  async efficiency(project: Project, goal: OptimizerGoal) {
    const spec = project.spec ?? defaultSpec({ floors: project.model.floors, soil: project.model.soil });
    return efficiencyRows(spec, goal, this.ctx(project)) as (EfficiencyRow & { specAtFloor: SpecState })[];
  }

  async applyEfficiency(project: Project, portions: Partial<Record<SpecGroupKey, number>>, goal: OptimizerGoal) {
    const spec = project.spec ?? defaultSpec({ floors: project.model.floors, soil: project.model.soil });
    return applyEff(spec, portions, this.ctx(project), goal);
  }

  async specDeltas(project: Project) {
    const source = this.input(project, 10);
    const spec = project.spec ?? defaultSpec({ floors: project.model.floors, soil: project.model.soil });
    const scope = project.scope ?? { carport: project.model.carport, canopy: true, balcony: project.model.floors > 1, secondarySkin: false };
    const base = computeRab({ ...source, spec, scope });
    const out = {} as Record<SpecGroupKey, { current: number; options: { level: SpecLevel; delta: number; blocked?: string }[] }>;
    for (const g of SPEC_GROUPS) {
      const current = base.items.filter((i) => specGroupForItem(i.packageKey, i.workItemId) === g.key).reduce((s, i) => s + i.amount, 0);
      const options = SPEC_ORDER.map((level) => {
        const blocked = specOptionBlocked({ floors: project.model.floors, soil: project.model.soil }, spec, g.key, level) ?? undefined;
        if (blocked) return { level, delta: 0, blocked };
        const resolved = resolveSpec({ floors: project.model.floors, soil: project.model.soil }, { ...spec, [g.key]: level }).spec;
        const alt = computeRab({ ...source, spec: resolved, scope });
        const altCost = alt.items.filter((i) => specGroupForItem(i.packageKey, i.workItemId) === g.key).reduce((s, i) => s + i.amount, 0);
        return { level, delta: altCost - current };
      });
      out[g.key] = { current, options };
    }
    return out;
  }

  async facadeFromText(text: string, model: BuildingModel) {
    return facadeFromText(text, defaultFacade("minimalis", model.floors));
  }

  catalog = {
    listWorkItems: async () => this.store.getCatalog().workItems,
    listAnalyses: async () => this.store.getCatalog().analisis,
    listPrices: async () => this.store.getCatalog().komponen,
    upsertPrice: async (k: Komponen) => this.store.onUpsertPrice(k),
    upsertAnalysis: async (a: Analisis) => this.store.onUpsertAnalysis(a),
  };
}

/**
 * Adaptor server (BELUM AKTIF). Kontrak endpoint terdokumentasi di INTEGRATION.md.
 * AI berjalan di server sehingga tidak ada API key di browser.
 */
export class RemoteEngineAdapter implements EngineClient {
  summarizePortfolio = summarizePortfolio;
  readonly mode = "remote" as const;
  constructor(private baseUrl: string, private fetcher: typeof fetch = (...args) => fetch(...args)) {}

  private async call<T>(path: string, body?: unknown, method = body ? "POST" : "GET"): Promise<T> {
    if (!this.baseUrl) throw new Error("Mode remote belum dikonfigurasi (remoteUrl kosong).");
    const res = await this.fetcher(`${this.baseUrl.replace(/\/$/, "")}/v1${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Engine server menolak ${path} (${res.status}).`);
    return (await res.json()) as T;
  }

  planTarget(project: Project, request: TargetRequest) { return this.call<RapBreakdown>("/pricing/target", { project, request }); }
  computeRab(project: Project) { return this.call<RabResult>("/rab", { project }); }
  interpretText(text: string) { return this.call<IntentResult>("/interpret", { text }); }
  nextQuestion(project: Project) { return this.call<InterviewQuestion | null>("/questions/next", { project }); }
  async recordCorrection(c: Correction) { await this.call("/corrections", c); }
  async recordActuals(a: ActualRecord) { await this.call("/actuals", a); }
  getCalibration() { return this.call<CalibrationReport>("/calibration"); }
  previewFormula(formula: string, vars: Record<string, number>) { return previewFormula(formula, vars); }

  generateLayouts(brief: LayoutBrief, count = 3) { return this.call<LayoutAlternative[]>("/layout/generate", { brief, count }); }
  validateLayout(model: BuildingModel, rooms: Room[]) { return this.call<ValidationResult>("/layout/validate", { model, rooms }); }
  checkRoomPlacement(model: BuildingModel, rooms: Room[], roomId: string, level: number) { return this.call<{ ok: boolean; reason?: string; suggestion?: string }>("/layout/check", { model, rooms, roomId, level }); }
  optimize(project: Project, goal: OptimizerGoal) { return this.call<OptimizerResult>("/optimize", { project, goal }); }
  efficiency(project: Project, goal: OptimizerGoal) { return this.call<(EfficiencyRow & { specAtFloor: SpecState })[]>("/optimize/efficiency", { project, goal }); }
  applyEfficiency(project: Project, portions: Partial<Record<SpecGroupKey, number>>, goal: OptimizerGoal) { return this.call<SpecState>("/optimize/apply-efficiency", { project, portions, goal }); }
  specDeltas(project: Project) { return this.call<Record<SpecGroupKey, { current: number; options: { level: SpecLevel; delta: number; blocked?: string }[] }>>("/spec/deltas", { project }); }
  facadeFromText(text: string, model: BuildingModel) { return this.call<{ spec: FacadeSpec; variations: FacadeSpec[]; note?: string }>("/facade/interpret", { text, model }); }
  runBacktest(csv: string) { return this.call<{ result: BacktestResult | null; errors: string[] }>("/backtest", { csv }); }
  catalog = {
    listWorkItems: () => this.call<WorkItem[]>("/catalog/work-items"),
    listAnalyses: () => this.call<Analisis[]>("/catalog/analyses"),
    listPrices: () => this.call<Komponen[]>("/catalog/prices"),
    upsertPrice: async (k: Komponen) => { await this.call("/catalog/prices", k, "PUT"); },
    upsertAnalysis: async (a: Analisis) => { await this.call("/catalog/analyses", a, "PUT"); },
  };
}

export function createEngineClient(settings: AppSettings, store: LocalEngineStore): EngineClient {
  return settings.engineMode === "remote" ? new RemoteEngineAdapter(settings.remoteUrl) : new LocalEngineAdapter(store);
}
