import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CONFIG, DEFAULT_SETTINGS, createBuildingModel, footprintFor, footprintFromPoints, rectFootprint, regionIndexFor } from "../data/config";
import { polygonArea, round2 } from "../geometry/polygon";
import { defaultFacade, defaultSpec } from "../data/spec";
import { SEED_CORRECTIONS, SEED_PROJECTS } from "../data/seed";
import { cloneCatalog } from "../data/catalog";
import { SCHEMA_VERSION } from "../data/schema";
import type {
  ActualRecord, AhspDataset, Analisis, AppSettings, BoqItem, BuildingModel, CalibrationFactors, CalibrationVersion, Correction,
  EstimatorModuleProps, FacadeSpec, Finishing, Komponen, LayoutTypology, LearnedPattern, Level, PricingScenario, PricingTargets,
  Project, RabResult, RoofType, Room, ScenarioVersion, SpecGroupKey, SpecLevel, SpecState, ToastMessage, WorkItem,
} from "../data/types";
import { resolveSpec, specOptionBlocked } from "../data/spec";
import { buildAutoRooms, repairLegacyRoomCopies, swapRooms } from "../geometry/layout";
import type { IntentResult } from "../ai/router";
import { interpretAnswer, type InterviewQuestion } from "../ai/interviewer";
import { applyApprovedDefaults, correctionFromEdit, derivePatterns, matchingPatterns } from "../ai/learner";
import { projectRepository, type PersistedState } from "../integration/repository";
import { createEngineClient, type EngineClient } from "../integration/engineClient";

export type ScreenName = "home" | "project" | "rab" | "prices" | "transfer" | "settings" | "lessons" | "backtest" | "archive" | "actuals" | "layout" | "planner";
export interface Route { name: ScreenName; projectId?: string }
type Source = "pengguna" | "usulan_ai" | "aturan_parametrik" | "default_config";

interface Store {
  state: PersistedState;
  route: Route;
  hydrated: boolean;
  error: string | null;
  toasts: ToastMessage[];
  projects: Project[];
  activeProject: Project | null;
  patterns: LearnedPattern[];
  engine: EngineClient;
  activeCalibration: CalibrationVersion | null;
  navigate: (route: Route) => void;
  goHome: () => void;
  toast: (title: string, detail?: string, tone?: ToastMessage["tone"]) => void;
  dismissToast: (id: string) => void;
  createProject: (intent: IntentResult) => Project | null;
  createBlankProject: () => void;
  duplicateProject: (id: string) => void;
  archiveProject: (id: string, archive?: boolean) => void;
  updateModel: (projectId: string, patch: Partial<BuildingModel>) => void;
  editAssumption: (projectId: string, key: string, value: string | number) => void;
  answerQuestion: (projectId: string, question: InterviewQuestion, raw: string, useDefault?: boolean) => { ok: boolean; summary: string[] };
  startAccuracyPhase: (projectId: string) => void;
  saveProject: (id: string) => void;
  swapProjectRooms: (projectId: string, a: string, b: string) => void;
  setThumbnail: (projectId: string, key: string, dataUrl: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  addCorrection: (correction: Correction) => void;
  setPatternStatus: (patternId: string, status: "approved" | "pending" | "rejected") => void;
  deletePatternCorrections: (patternId: string) => void;
  saveVersion: (project: Project, rab: RabResult, label: string) => void;
  toggleLockRates: (projectId: string) => void;
  setBoqOverride: (projectId: string, itemId: string, patch: { volume?: number; unitPrice?: number; removed?: boolean; formula?: string }) => void;
  addExtraItem: (projectId: string, item: BoqItem) => void;
  removeExtraItem: (projectId: string, itemId: string) => void;
  resetBoq: (projectId: string) => void;
  upsertKomponen: (k: Komponen, originalKode?: string) => void;
  deleteKomponen: (kode: string) => void;
  bulkUpdateKomponen: (percent: number) => void;
  upsertAnalisis: (a: Analisis) => void;
  applyImport: (payload: { projects?: Project[]; komponen?: Komponen[] }, mode: "gabung" | "ganti") => void;
  rollbackImport: (id: string) => void;
  resetSamples: () => void;
  recordActuals: (record: ActualRecord) => void;
  deleteActual: (id: string) => void;
  applyCalibration: (factors: CalibrationFactors, basis: string) => void;
  revertCalibration: (id: string) => void;
  /** Terapkan denah hasil editor/generator (draf -> proyek). */
  applyLayout: (projectId: string, rooms: Room[], levels: Level[], meta?: { seed?: number; typology?: LayoutTypology }) => void;
  /** Ubah tingkat spesifikasi satu kelompok (realtime). */
  setSpecLevel: (projectId: string, group: SpecGroupKey, level: SpecLevel) => { ok: boolean; reason?: string };
  setSpec: (projectId: string, spec: SpecState) => void;
  setFacade: (projectId: string, facade: FacadeSpec) => void;
  setScope: (projectId: string, scope: NonNullable<Project["scope"]>) => void;
  setPpnEnabled: (projectId: string, enabled: boolean) => void;
  setTargets: (projectId: string, targets: PricingTargets | undefined) => void;
  /** Planner harga: skenario tersimpan. */
  scenarios: PricingScenario[];
  saveScenario: (scenario: PricingScenario) => void;
  deleteScenario: (id: string) => void;
  /** Terapkan skenario ke proyek + versi (bisa dibatalkan). */
  applyScenario: (projectId: string, scenario: PricingScenario) => void;
  undoLastVersion: (projectId: string) => void;
  /** Dataset AHSP aktif. */
  dataset: AhspDataset | null;
  setDataset: (d: AhspDataset | null) => void;
  importAhsp: (payload: { komponen?: Komponen[]; analisis?: Analisis[]; workItems?: WorkItem[]; minRoom?: Record<string, { area: number; side: number }> }, mode: "gabung" | "ganti", dataset: AhspDataset) => void;
}

const StoreContext = createContext<Store | null>(null);

const freshState = (): PersistedState => ({
  schemaVersion: SCHEMA_VERSION,
  projects: JSON.parse(JSON.stringify(SEED_PROJECTS)) as Project[],
  catalog: cloneCatalog(),
  corrections: SEED_CORRECTIONS.map((c) => ({ ...c })),
  lessonStatuses: {},
  versions: [],
  settings: { ...DEFAULT_SETTINGS },
  importHistory: [],
  actuals: [],
  calibrations: [],
  scenarios: [],
  dataset: null,
});

const assumption = (source: Source, confirmed: boolean, note?: string, answered?: boolean) => ({ source, confirmed, confidence: confirmed ? 0.92 : 0.4, note, answered });

function reshape(model: BuildingModel, area: number, floors: number): BuildingModel {
  const safeFloors = Math.max(1, Math.min(CONFIG.reviewFloors, Math.round(floors)));
  const fp = footprintFor(Math.max(18, Math.min(CONFIG.maxArea, area)), safeFloors);
  // Pertahankan bentuk footprint (L/U/split) bila ada; skalakan ke luas baru
  const shape = model.levels[0]?.footprint;
  const scale = shape?.points?.length ? Math.sqrt(fp.total / Math.max(1, safeFloors) / Math.max(1, polygonArea(shape.points))) : 1;
  return {
    ...model,
    area: fp.total,
    type: String(Math.round(fp.total)),
    floors: safeFloors,
    levels: Array.from({ length: safeFloors }, (_, index) => {
      if (shape?.points?.length) {
        const pts = shape.points.map((pt) => ({ x: round2(pt.x * scale), y: round2(pt.y * scale) }));
        return { index, height: 3.2, footprint: footprintFromPoints(pts, shape.shape) };
      }
      return { index, height: 3.2, footprint: rectFootprint(fp.width, fp.depth) };
    }),
  };
}

/** Terapkan patch ke model; susun ulang denah bila dimensi/ruangan berubah. */
function applyPatch(model: BuildingModel, patch: Partial<BuildingModel>): BuildingModel {
  let next: BuildingModel = { ...model, ...patch, roof: patch.roof ?? model.roof, assumptions: { ...model.assumptions, ...(patch.assumptions ?? {}) }, updated: new Date().toISOString() };
  if (patch.location) next.regionIndex = regionIndexFor(patch.location).bahan;
  if (patch.area !== undefined || patch.floors !== undefined) next = reshape(next, patch.area ?? next.area, patch.floors ?? next.floors);
  const relayout = ["area", "floors", "bedrooms", "bathrooms", "carport"].some((k) => k in patch);
  if (relayout) next.rooms = buildAutoRooms({ ...next, rooms: [] });
  return next;
}

function sanitize(saved: PersistedState): PersistedState {
  const base = freshState();
  const catalogOk = saved.catalog && Array.isArray(saved.catalog.komponen) && Array.isArray(saved.catalog.analisis);
  return {
    ...base,
    ...saved,
    schemaVersion: SCHEMA_VERSION,
    catalog: catalogOk ? { ...saved.catalog, workItems: saved.catalog.workItems.map(w =>
      w.id === 'struktur.plat' && w.analisisId === 'A.STR.PLAT' && w.rumus === 'luas_dasar * (lantai - 1)'
        ? { ...w, rumus: 'luas_lantai_atas' } : w) } : base.catalog,
    settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },
    projects: Array.isArray(saved.projects) ? saved.projects.map((p) => { const { rates: _r, ...rest } = p as Project & { rates?: unknown }; void _r; return { ...rest, model: repairLegacyRoomCopies(rest.model) }; }) : base.projects,
    actuals: Array.isArray(saved.actuals) ? saved.actuals : [],
    calibrations: Array.isArray(saved.calibrations) ? saved.calibrations : [],
    importHistory: Array.isArray(saved.importHistory) ? saved.importHistory : [],
  };
}

export function EstimatorProvider({ children, host }: { children: ReactNode; host: EstimatorModuleProps }) {
  const [state, setState] = useState<PersistedState>(() => {
    const s = freshState();
    if (host.engineMode) s.settings.engineMode = host.engineMode;
    if (host.remoteUrl) s.settings.remoteUrl = host.remoteUrl;
    return s;
  });
  const [route, setRoute] = useState<Route>({ name: host.initialProjectId ? "project" : "home", projectId: host.initialProjectId });
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const emit = useCallback((type: string, payload?: unknown) => host.onEvent?.({ type, payload }), [host]);

  useEffect(() => {
    let alive = true;
    projectRepository.load()
      .then((saved) => { if (alive && saved) setState(sanitize(saved)); })
      .catch(() => alive && setError("Penyimpanan lokal tidak tersedia. Perubahan hanya bertahan selama sesi ini."))
      .finally(() => alive && setHydrated(true));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => projectRepository.save(state).catch(() => setError("Gagal menyimpan ke IndexedDB. Ekspor cadangan JSON.")), 400);
    return () => clearTimeout(t);
  }, [state, hydrated]);

  const activeCalibration = useMemo(() => state.calibrations.find((c) => c.status === "aktif") ?? null, [state.calibrations]);

  const engine = useMemo(() => createEngineClient(state.settings, {
    getCatalog: () => stateRef.current.catalog,
    getSettings: () => stateRef.current.settings,
    getActiveCalibration: () => stateRef.current.calibrations.find((c) => c.status === "aktif") ?? null,
    getActuals: () => stateRef.current.actuals,
    onCorrection: (c) => setState((prev) => ({ ...prev, corrections: [c, ...prev.corrections] })),
    onActuals: (a) => setState((prev) => ({ ...prev, actuals: [...prev.actuals.filter((x) => x.id !== a.id), a] })),
    onUpsertPrice: (k) => setState((prev) => ({ ...prev, catalog: { ...prev.catalog, komponen: prev.catalog.komponen.some((x) => x.kode === k.kode) ? prev.catalog.komponen.map((x) => (x.kode === k.kode ? k : x)) : [k, ...prev.catalog.komponen] } })),
    onUpsertAnalysis: (a) => setState((prev) => ({ ...prev, catalog: { ...prev.catalog, analisis: prev.catalog.analisis.map((x) => (x.id === a.id ? a : x)) } })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state.settings.engineMode, state.settings.remoteUrl]);

  const toast = useCallback((title: string, detail?: string, tone: ToastMessage["tone"] = "success") => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setToasts((prev) => [...prev.slice(-2), { id, title, detail, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  const navigate = useCallback((next: Route) => {
    setRoute(next);
    window.scrollTo({ top: 0, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);
  const goHome = useCallback(() => navigate({ name: "home" }), [navigate]);

  const projects = state.projects;
  const activeProject = route.projectId ? projects.find((p) => p.id === route.projectId) ?? null : null;
  const patterns = useMemo(() => derivePatterns(state.corrections, state.lessonStatuses), [state.corrections, state.lessonStatuses]);

  const updateProject = useCallback((id: string, fn: (p: Project) => Project, touch = true) => {
    setState((prev) => ({ ...prev, projects: prev.projects.map((p) => (p.id === id ? { ...fn(p), ...(touch ? { updatedAt: new Date().toISOString(), lastSavedAt: new Date().toISOString() } : {}) } : p)) }));
  }, []);

  const createProject = useCallback((intent: IntentResult): Project | null => {
    const s = intent.slots;
    if ((s.lantai ?? 1) >= 4 || (s.luas ?? 0) > CONFIG.maxArea) {
      toast("Di luar batas modul", `Modul ini untuk rumah ≤${CONFIG.maxArea} m² dan ≤3 lantai. Sarankan estimator manusia.`, "danger");
      return null;
    }
    const specified = new Set<string>();
    const map: [keyof typeof s, string][] = [["luas", "area"], ["lantai", "floors"], ["kamar_tidur", "bedrooms"], ["kamar_mandi", "bathrooms"], ["atap", "roof"], ["finishing", "finishing"], ["lokasi", "location"], ["luas_tanah", "landArea"]];
    for (const [slot, key] of map) if (s[slot] !== undefined) specified.add(key);
    let model = createBuildingModel({
      area: s.luas ?? 45, floors: s.lantai ?? 1, bedrooms: s.kamar_tidur, bathrooms: s.kamar_mandi,
      finishing: s.finishing ?? "menengah", location: s.lokasi ?? "Yogyakarta", landArea: s.luas_tanah, carport: s.carport,
      roof: { type: (s.atap ?? "pelana") as RoofType, pitch: s.atap === "datar" ? 2 : 30, overhang: 0.6 },
    });
    const learned = applyApprovedDefaults(model, matchingPatterns(model, patterns));
    model = learned.model;
    if (s.atap) model.roof = { ...model.roof, type: s.atap };
    if (s.finishing) model.finishing = s.finishing;
    if (s.kamar_mandi !== undefined) model.bathrooms = s.kamar_mandi;
    const fields = ["area", "floors", "bedrooms", "bathrooms", "roof", "finishing", "location", "landArea", "foundation", "openings", "electrical", "water"];
    const assumptions: BuildingModel["assumptions"] = { ...model.assumptions };
    for (const f of fields) {
      if (specified.has(f)) assumptions[f] = assumption("pengguna", true, "dari kalimat pertama");
      else if (!assumptions[f]) assumptions[f] = assumption(f === "roof" ? "usulan_ai" : f === "foundation" ? "aturan_parametrik" : "default_config", false);
    }
    model.assumptions = assumptions;
    model.rooms = buildAutoRooms(model);
    const now = new Date().toISOString();
    const project: Project = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: s.nama ? `Rumah ${s.nama}` : `Rumah ${model.area} m² · ${model.location}`,
      createdAt: now, updatedAt: now, status: "indikatif", archived: false, location: model.location, model,
      lastSavedAt: now, stage: 1, answers: [],
      spec: defaultSpec({ floors: model.floors, soil: model.soil }),
      facade: defaultFacade("minimalis", model.floors),
      scope: { carport: model.carport, canopy: true, balcony: model.floors > 1, secondarySkin: false },
      ppnEnabled: true,
      qualityFlag: learned.applied.length ? `Default dari pola koreksi yang kamu setujui: ${learned.applied.join(", ")}` : undefined,
    };
    setState((prev) => ({ ...prev, projects: [project, ...prev.projects] }));
    navigate({ name: "project", projectId: project.id });
    host.onProjectCreated?.(project);
    emit("project_created", { id: project.id });
    return project;
  }, [emit, host, navigate, patterns, toast]);

  const createBlankProject = useCallback(() => {
    createProject({ intent: "buat_baru", slots: {}, basis: "aturan_bahasa" });
  }, [createProject]);

  const duplicateProject = useCallback((id: string) => {
    const src = stateRef.current.projects.find((p) => p.id === id);
    if (!src) return;
    const copy: Project = { ...JSON.parse(JSON.stringify(src)), id: `proj-${Date.now()}`, name: `${src.name} (salinan)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), thumbnail: undefined, thumbnailKey: undefined };
    setState((prev) => ({ ...prev, projects: [copy, ...prev.projects] }));
    toast("Proyek diduplikasi");
  }, [toast]);

  const archiveProject = useCallback((id: string, archive = true) => {
    updateProject(id, (p) => ({ ...p, archived: archive }));
    toast(archive ? "Proyek diarsipkan" : "Proyek dipulihkan", "Arsip tidak menghapus data.");
    emit(archive ? "project_archived" : "project_restored", { id });
    if (archive) goHome();
  }, [emit, goHome, toast, updateProject]);

  const updateModel = useCallback((projectId: string, patch: Partial<BuildingModel>) => {
    updateProject(projectId, (p) => { const model = applyPatch(p.model, patch); return { ...p, model, location: model.location }; });
  }, [updateProject]);

  const editAssumption = useCallback((projectId: string, key: string, value: string | number) => {
    const project = stateRef.current.projects.find((p) => p.id === projectId);
    if (!project) return;
    const m = project.model;
    const patch: Partial<BuildingModel> = {};
    let proposed: string | number = "";
    const num = Number(value);
    switch (key) {
      case "area": if (!(num >= 18 && num <= CONFIG.maxArea)) { toast("Luas tidak valid", `Gunakan 18–${CONFIG.maxArea} m².`, "danger"); return; } proposed = m.area; patch.area = num; break;
      case "floors": proposed = m.floors; patch.floors = Math.max(1, Math.min(CONFIG.reviewFloors, num)); break;
      case "bedrooms": proposed = m.bedrooms; patch.bedrooms = Math.max(1, Math.min(8, num)); break;
      case "bathrooms": proposed = m.bathrooms; patch.bathrooms = Math.max(1, Math.min(6, num)); break;
      case "roof": proposed = m.roof.type; patch.roof = { ...m.roof, type: value as RoofType, pitch: value === "datar" ? 2 : 30 }; break;
      case "finishing": proposed = m.finishing; patch.finishing = value as Finishing; break;
      case "foundation": proposed = m.foundation; patch.foundation = value as BuildingModel["foundation"]; patch.soil = value === "cerucuk" ? "buruk" : m.soil; break;
      case "landArea": proposed = m.landArea; patch.landArea = Math.max(18, num); break;
      case "location": proposed = m.location; patch.location = String(value); break;
      case "electrical": proposed = m.electricalPoints; patch.electricalPoints = Math.max(1, num); break;
      case "water": proposed = m.waterPoints; patch.waterPoints = Math.max(1, num); break;
      case "openings": { proposed = `${m.doors}/${m.windows}`; const [d, w] = String(value).split("/").map(Number); if (d > 0) patch.doors = d; if (w > 0) patch.windows = w; break; }
      default: return;
    }
    patch.assumptions = { [key]: assumption("pengguna", true, "diubah dari chip asumsi") };
    const current = m.assumptions[key];
    if (current && current.source !== "pengguna" && String(proposed) !== String(value)) {
      const c = correctionFromEdit({ projectId, context: { type: m.type, area: m.area, floors: m.floors, location: m.location, finishing: m.finishing }, field: key, proposed, corrected: value });
      void engine.recordCorrection(c);
    }
    updateModel(projectId, patch);
  }, [engine, toast, updateModel]);

  const answerQuestion = useCallback((projectId: string, question: InterviewQuestion, raw: string, useDefault = false) => {
    const project = stateRef.current.projects.find((p) => p.id === projectId);
    if (!project) return { ok: false, summary: [] };
    if (useDefault) {
      const marks = Object.fromEntries(question.slots.map((s) => [s, { ...(project.model.assumptions[s] ?? assumption("default_config", false)), confirmed: false, answered: true, note: "belum tahu — memakai default" }]));
      updateProject(projectId, (p) => ({ ...p, model: { ...p.model, assumptions: { ...p.model.assumptions, ...marks } }, answers: [...p.answers, { question: question.question, answer: "Belum tahu", at: new Date().toISOString(), slot: question.slots.join(",") }] }));
      return { ok: true, summary: ["belum tahu — default dipakai dan ditandai"] };
    }
    const result = interpretAnswer(question, raw);
    if (!result.understood) {
      toast("Jawaban belum terbaca", "Pilih chip atau tulis angka dengan satuan, mis. “3 kamar tidur”.", "warning");
      return { ok: false, summary: result.summary };
    }
    const confirms = Object.fromEntries(result.confirmedSlots.map((s) => [s, assumption("pengguna", true, "dari jawaban percakapan")]));
    updateProject(projectId, (p) => {
      const model = applyPatch(p.model, { ...result.patch, assumptions: confirms });
      return { ...p, model, location: model.location, answers: [...p.answers, { question: question.question, answer: raw, at: new Date().toISOString(), slot: question.slots.join(",") }] };
    });
    return { ok: true, summary: result.summary };
  }, [toast, updateProject]);

  const startAccuracyPhase = useCallback((id: string) => updateProject(id, (p) => ({ ...p, stage: 2 })), [updateProject]);
  const saveProject = useCallback((id: string) => { updateProject(id, (p) => p); toast("Tersimpan", "Draf disimpan otomatis di perangkat ini."); }, [toast, updateProject]);
  const swapProjectRooms = useCallback((projectId: string, a: string, b: string) => {
    updateProject(projectId, (p) => {
      const rooms = p.model.rooms.length ? p.model.rooms : buildAutoRooms(p.model);
      return { ...p, model: { ...p.model, rooms: swapRooms(rooms, a, b) } };
    });
    toast("Posisi ruangan ditukar", "Dinding dalam & area basah dihitung ulang dari denah.");
  }, [toast, updateProject]);
  const setThumbnail = useCallback((projectId: string, key: string, dataUrl: string) => updateProject(projectId, (p) => (p.thumbnailKey === key ? p : { ...p, thumbnail: dataUrl, thumbnailKey: key }), false), [updateProject]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } })), []);
  const addCorrection = useCallback((c: Correction) => { void engine.recordCorrection(c); toast("Koreksi tercatat", "Hanya dipakai setelah pola disetujui."); }, [engine, toast]);
  const setPatternStatus = useCallback((id: string, status: "approved" | "pending" | "rejected") => {
    setState((prev) => ({ ...prev, lessonStatuses: { ...prev.lessonStatuses, [id]: status } }));
    toast(status === "approved" ? "Pola disetujui" : status === "rejected" ? "Pola ditolak" : "Pola dikembalikan");
  }, [toast]);
  const deletePatternCorrections = useCallback((id: string) => {
    setState((prev) => ({ ...prev, corrections: prev.corrections.filter((c) => `${c.field}-${String(c.corrected)}` !== id), lessonStatuses: Object.fromEntries(Object.entries(prev.lessonStatuses).filter(([k]) => k !== id)) }));
    toast("Pola dihapus");
  }, [toast]);

  const saveVersion = useCallback((project: Project, rab: RabResult, label: string) => {
    const v: ScenarioVersion = { id: `ver-${Date.now()}`, projectId: project.id, label: label || "Versi", createdAt: new Date().toISOString(), total: rab.total, p10: rab.p10, p90: rab.p90, completeness: rab.completeness, pricesLocked: Boolean(project.ratesLocked), pricingSnapshot: { ...rab.rap }, modelSnapshot: JSON.parse(JSON.stringify(project.model)) as BuildingModel };
    setState((prev) => ({ ...prev, versions: [v, ...prev.versions] }));
    toast("Versi tersimpan", v.label);
  }, [toast]);
  const toggleLockRates = useCallback((id: string) => {
    updateProject(id, (p) => (p.ratesLocked ? { ...p, ratesLocked: false, priceSnapshot: undefined } : { ...p, ratesLocked: true, priceSnapshot: JSON.parse(JSON.stringify(stateRef.current.catalog.komponen)) as Komponen[] }));
    toast("Kunci harga diperbarui", "Saat terkunci, proyek memakai snapshot harga komponen.");
  }, [toast, updateProject]);
  const setBoqOverride = useCallback((projectId: string, itemId: string, patch: { volume?: number; unitPrice?: number; removed?: boolean; formula?: string }) => {
    updateProject(projectId, (p) => ({ ...p, boqOverrides: { ...(p.boqOverrides ?? {}), [itemId]: { ...(p.boqOverrides?.[itemId] ?? {}), ...patch } } }));
    toast("Override disimpan", "Ditandai di jejak audit.");
  }, [toast, updateProject]);
  const addExtraItem = useCallback((projectId: string, item: BoqItem) => updateProject(projectId, (p) => ({ ...p, extraItems: [...(p.extraItems ?? []), item] })), [updateProject]);
  const removeExtraItem = useCallback((projectId: string, itemId: string) => updateProject(projectId, (p) => ({ ...p, extraItems: (p.extraItems ?? []).filter((i) => i.id !== itemId) })), [updateProject]);
  const resetBoq = useCallback((projectId: string) => updateProject(projectId, (p) => ({ ...p, boqOverrides: {}, extraItems: [] })), [updateProject]);

  const upsertKomponen = useCallback((k: Komponen, originalKode?: string) => {
    if (originalKode && originalKode !== k.kode) setState((prev) => ({ ...prev, catalog: { ...prev.catalog, komponen: prev.catalog.komponen.filter((x) => x.kode !== originalKode) } }));
    void engine.catalog.upsertPrice(k);
    toast("Harga komponen disimpan", "RAB semua proyek yang tidak terkunci dihitung ulang.");
  }, [engine, toast]);
  const deleteKomponen = useCallback((kode: string) => {
    setState((prev) => ({ ...prev, catalog: { ...prev.catalog, komponen: prev.catalog.komponen.filter((k) => k.kode !== kode) } }));
    toast("Komponen dihapus", "Analisis yang memakainya akan menampilkan peringatan komponen hilang.", "warning");
  }, [toast]);
  const bulkUpdateKomponen = useCallback((percent: number) => {
    const today = new Date().toISOString().slice(0, 10);
    setState((prev) => ({ ...prev, catalog: { ...prev.catalog, komponen: prev.catalog.komponen.map((k) => ({ ...k, harga: Math.round(k.harga * (1 + percent / 100)), tanggalBerlaku: today })) } }));
    toast("Perubahan massal diterapkan", `${percent > 0 ? "+" : ""}${percent}%`);
  }, [toast]);
  const upsertAnalisis = useCallback((a: Analisis) => { void engine.catalog.upsertAnalysis(a); toast("Analisis disimpan", "Koefisien baru langsung dipakai engine."); }, [engine, toast]);

  const applyImport = useCallback((payload: { projects?: Project[]; komponen?: Komponen[] }, mode: "gabung" | "ganti") => {
    setState((prev) => {
      const { importHistory: _h, ...previous } = prev; void _h;
      const ip = payload.projects ?? []; const ik = payload.komponen ?? [];
      const projects = mode === "gabung" ? [...ip, ...prev.projects.filter((p) => !ip.some((x) => x.id === p.id))] : ip.length ? ip : prev.projects;
      const komponen = mode === "gabung" ? [...ik, ...prev.catalog.komponen.filter((k) => !ik.some((x) => x.kode === k.kode))] : ik.length ? ik : prev.catalog.komponen;
      return { ...prev, projects, catalog: { ...prev.catalog, komponen }, importHistory: [{ id: `imp-${Date.now()}`, at: new Date().toISOString(), mode, projects: ip.length, prices: ik.length, previous: JSON.parse(JSON.stringify(previous)) }, ...prev.importHistory].slice(0, 10) };
    });
    toast("Impor selesai", "Riwayat tersimpan untuk rollback.");
  }, [toast]);
  const rollbackImport = useCallback((id: string) => {
    setState((prev) => { const item = prev.importHistory.find((h) => h.id === id); return item ? { ...prev, ...item.previous, importHistory: prev.importHistory.filter((h) => h.id !== id) } : prev; });
    toast("Impor di-rollback");
  }, [toast]);
  const resetSamples = useCallback(() => { setState(freshState()); goHome(); toast("Data contoh diatur ulang"); }, [goHome, toast]);

  const recordActuals = useCallback((record: ActualRecord) => { void engine.recordActuals(record); toast("Realisasi tersimpan", "Dipakai untuk usulan kalibrasi setelah sampel cukup."); emit("actuals_recorded", { projectId: record.projectId }); }, [emit, engine, toast]);
  const deleteActual = useCallback((id: string) => setState((prev) => ({ ...prev, actuals: prev.actuals.filter((a) => a.id !== id) })), []);
  const applyCalibration = useCallback((factors: CalibrationFactors, basis: string) => {
    const v: CalibrationVersion = { id: `kal-${Date.now()}`, createdAt: new Date().toISOString(), label: `Kalibrasi ${new Date().toLocaleDateString("id-ID")}`, factors, status: "aktif", basis };
    setState((prev) => ({ ...prev, calibrations: [v, ...prev.calibrations.map((c) => ({ ...c, status: "dibatalkan" as const }))] }));
    toast("Kalibrasi diterapkan", "Tersimpan sebagai versi dan bisa dibatalkan.");
    emit("calibration_applied", { id: v.id });
  }, [emit, toast]);
  const revertCalibration = useCallback((id: string) => {
    setState((prev) => ({ ...prev, calibrations: prev.calibrations.map((c) => (c.id === id ? { ...c, status: "dibatalkan" as const } : c)) }));
    toast("Kalibrasi dibatalkan", "Engine kembali memakai faktor 1.", "info");
  }, [toast]);


  const applyLayout = useCallback((projectId: string, rooms: Room[], levels: Level[], meta?: { seed?: number; typology?: LayoutTypology }) => {
    updateProject(projectId, (p) => ({
      ...p,
      model: {
        ...p.model,
        rooms,
        levels: levels.length ? levels : p.model.levels,
        layoutSeed: meta?.seed ?? p.model.layoutSeed,
        layoutTypology: meta?.typology ?? p.model.layoutTypology,
        updated: new Date().toISOString(),
      },
    }));
    emit("layout_applied", { projectId, rooms: rooms.length });
  }, [emit, updateProject]);

  const setSpecLevel = useCallback((projectId: string, group: SpecGroupKey, level: SpecLevel) => {
    const project = stateRef.current.projects.find((p) => p.id === projectId);
    if (!project) return { ok: false, reason: "Proyek tidak ditemukan." };
    const current = project.spec ?? defaultSpec({ floors: project.model.floors, soil: project.model.soil });
    const blocked = specOptionBlocked({ floors: project.model.floors, soil: project.model.soil }, current, group, level);
    if (blocked) return { ok: false, reason: blocked };
    const resolved = resolveSpec({ floors: project.model.floors, soil: project.model.soil }, { ...current, [group]: level });
    updateProject(projectId, (p) => ({ ...p, spec: resolved.spec }));
    if (resolved.adjustments.length) {
      return { ok: true, reason: `Ikut menyesuaikan: ${resolved.adjustments.map((a) => `${a.group} → ${a.to}`).join(", ")}. ${resolved.adjustments[0].reason}` };
    }
    return { ok: true };
  }, [updateProject]);

  const setSpec = useCallback((projectId: string, spec: SpecState) => {
    updateProject(projectId, (p) => ({ ...p, spec: resolveSpec({ floors: p.model.floors, soil: p.model.soil }, spec).spec }));
  }, [updateProject]);

  const setFacade = useCallback((projectId: string, facade: FacadeSpec) => {
    updateProject(projectId, (p) => ({ ...p, facade }));
  }, [updateProject]);

  const setScope = useCallback((projectId: string, scope: NonNullable<Project["scope"]>) => {
    updateProject(projectId, (p) => ({ ...p, scope, model: { ...p.model, carport: scope.carport } }));
  }, [updateProject]);

  const setPpnEnabled = useCallback((projectId: string, enabled: boolean) => {
    updateProject(projectId, (p) => ({ ...p, ppnEnabled: enabled }));
  }, [updateProject]);

  const setTargets = useCallback((projectId: string, targets: PricingTargets | undefined) => {
    updateProject(projectId, (p) => ({ ...p, targets }));
  }, [updateProject]);

  const saveScenario = useCallback((scenario: PricingScenario) => {
    setState((prev) => ({ ...prev, scenarios: [scenario, ...prev.scenarios.filter((sc) => sc.id !== scenario.id)].slice(0, 24) }));
    toast("Skenario disimpan", scenario.name);
  }, [toast]);

  const deleteScenario = useCallback((id: string) => {
    setState((prev) => ({ ...prev, scenarios: prev.scenarios.filter((sc) => sc.id !== id) }));
  }, []);

  const applyScenario = useCallback((projectId: string, scenario: PricingScenario) => {
    const project = stateRef.current.projects.find((p) => p.id === projectId);
    if (!project) return;
    void engine.computeRab(project).then((rab) => {
      const version: ScenarioVersion = {
        id: `ver-${Date.now()}`,
        projectId,
        label: `Sebelum "${scenario.name}"`,
        createdAt: new Date().toISOString(),
        total: rab.total,
        p10: rab.p10,
        p90: rab.p90,
        completeness: rab.completeness,
        pricesLocked: Boolean(project.ratesLocked),
        modelSnapshot: JSON.parse(JSON.stringify(project.model)) as BuildingModel,
        pricingSnapshot: { ...rab.rap },
        specSnapshot: project.spec,
        facadeSnapshot: project.facade,
        scopeSnapshot: project.scope,
        rap: rab.rap.rap,
        margin: rab.rap.margin,
      };
      setState((prev) => ({ ...prev, versions: [version, ...prev.versions] }));
      updateProject(projectId, (p) => ({ ...p, spec: scenario.spec, scope: scenario.scope }));
      toast("Skenario diterapkan", `${scenario.name} · versi sebelumnya disimpan untuk undo.`);
      emit("scenario_applied", { projectId, scenario: scenario.id });
    });
  }, [emit, engine, toast, updateProject]);

  const undoLastVersion = useCallback((projectId: string) => {
    const version = stateRef.current.versions.find((v) => v.projectId === projectId);
    if (!version) { toast("Tidak ada versi untuk dikembalikan", undefined, "warning"); return; }
    updateProject(projectId, (p) => ({
      ...p,
      model: JSON.parse(JSON.stringify(version.modelSnapshot)) as BuildingModel,
      spec: version.specSnapshot ?? p.spec,
      facade: version.facadeSnapshot ?? p.facade,
      scope: version.scopeSnapshot ?? p.scope,
    }));
    setState((prev) => ({ ...prev, versions: prev.versions.filter((v) => v.id !== version.id) }));
    toast("Versi sebelumnya dikembalikan", version.label);
  }, [toast, updateProject]);

  const setDataset = useCallback((d: AhspDataset | null) => setState((prev) => ({ ...prev, dataset: d })), []);

  const importAhsp = useCallback((payload: { komponen?: Komponen[]; analisis?: Analisis[]; workItems?: WorkItem[]; minRoom?: Record<string, { area: number; side: number }> }, mode: "gabung" | "ganti", dataset: AhspDataset) => {
    setState((prev) => {
      const { importHistory: _h, ...previous } = prev; void _h;
      const cat = prev.catalog;
      const merge = <T,>(oldArr: T[], newArr: T[] | undefined, keyOf: (x: T) => string): T[] => {
        if (!newArr?.length) return oldArr;
        if (mode === "ganti") return newArr;
        const map = new Map(oldArr.map((x) => [keyOf(x), x]));
        for (const item of newArr) map.set(keyOf(item), item);
        return [...map.values()];
      };
      return {
        ...prev,
        catalog: {
          komponen: merge(cat.komponen, payload.komponen, (x) => x.kode),
          analisis: merge(cat.analisis, payload.analisis, (x) => x.id),
          workItems: merge(cat.workItems, payload.workItems, (x) => x.id),
        },
        minRoom: payload.minRoom ? { ...(prev.minRoom ?? {}), ...payload.minRoom } : prev.minRoom,
        dataset,
        importHistory: [{ id: `imp-${Date.now()}`, at: new Date().toISOString(), mode, projects: 0, prices: payload.komponen?.length ?? 0, previous: JSON.parse(JSON.stringify(previous)) }, ...prev.importHistory].slice(0, 10),
      };
    });
    toast("Dataset diterapkan", `${dataset.name} · ${dataset.analysisCount} analisis.`);
    emit("ahsp_imported", { dataset: dataset.name });
  }, [emit, toast]);

  const value = useMemo<Store>(() => ({
    state, route, hydrated, error, toasts, projects, activeProject, patterns, engine, activeCalibration,
    navigate, goHome, toast, dismissToast, createProject, createBlankProject, duplicateProject, archiveProject, updateModel, editAssumption,
    answerQuestion, startAccuracyPhase, saveProject, swapProjectRooms, setThumbnail, updateSettings, addCorrection, setPatternStatus,
    deletePatternCorrections, saveVersion, toggleLockRates, setBoqOverride, addExtraItem, removeExtraItem, resetBoq, upsertKomponen,
    deleteKomponen, bulkUpdateKomponen, upsertAnalisis, applyImport, rollbackImport, resetSamples, recordActuals, deleteActual,
    applyCalibration, revertCalibration, applyLayout, setSpecLevel, setSpec, setFacade, setScope, setPpnEnabled, setTargets,
    scenarios: state.scenarios, saveScenario, deleteScenario, applyScenario, undoLastVersion,
    dataset: state.dataset, setDataset, importAhsp,
  }), [state, route, hydrated, error, toasts, projects, activeProject, patterns, engine, activeCalibration, navigate, goHome, toast, dismissToast, createProject, createBlankProject, duplicateProject, archiveProject, updateModel, editAssumption, answerQuestion, startAccuracyPhase, saveProject, swapProjectRooms, setThumbnail, updateSettings, addCorrection, setPatternStatus, deletePatternCorrections, saveVersion, toggleLockRates, setBoqOverride, addExtraItem, removeExtraItem, resetBoq, upsertKomponen, deleteKomponen, bulkUpdateKomponen, upsertAnalisis, applyImport, rollbackImport, resetSamples, recordActuals, deleteActual, applyCalibration, revertCalibration, applyLayout, setSpecLevel, setSpec, setFacade, setScope, setPpnEnabled, setTargets, saveScenario, deleteScenario, applyScenario, undoLastVersion, setDataset, importAhsp]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useEstimator(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useEstimator harus di dalam EstimatorProvider");
  return ctx;
}

/** Hasil RAB dari EngineClient (bukan engine langsung). Hasil lama dipertahankan selama hitung ulang. */
export function useRab(project: Project | null | undefined) {
  const { engine, state } = useEstimator();
  const [result, setResult] = useState<{ rab: RabResult | null; error: string | null }>({ rab: null, error: null });
  useEffect(() => {
    if (!project) return;
    let alive = true;
    engine.computeRab(project)
      .then((rab) => alive && setResult({ rab, error: null }))
      .catch((e: unknown) => alive && setResult({ rab: null, error: e instanceof Error ? e.message : "Engine gagal menghitung." }));
    return () => { alive = false; };
  }, [engine, project, state.catalog, state.settings, state.calibrations, state.actuals]);
  return result;
}

export function useNextQuestion(project: Project | null | undefined) {
  const { engine, state } = useEstimator();
  const [q, setQ] = useState<{ question: InterviewQuestion | null; loading: boolean }>({ question: null, loading: true });
  useEffect(() => {
    if (!project) return;
    let alive = true;
    setQ((prev) => ({ ...prev, loading: true }));
    engine.nextQuestion(project).then((question) => alive && setQ({ question, loading: false })).catch(() => alive && setQ({ question: null, loading: false }));
    return () => { alive = false; };
  }, [engine, project, state.catalog, state.settings]);
  return q;
}
