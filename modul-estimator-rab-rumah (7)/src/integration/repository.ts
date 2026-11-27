import Dexie, { type Table } from "dexie";
import type { ActualRecord, AhspDataset, AppSettings, CalibrationVersion, Catalog, Correction, Komponen, PricingScenario, Project, ScenarioVersion } from "../data/types";

export interface ImportHistory {
  id: string;
  at: string;
  mode: "gabung" | "ganti";
  projects: number;
  prices: number;
  previous: Omit<PersistedState, "importHistory">;
}

export interface PersistedState {
  schemaVersion: number;
  projects: Project[];
  catalog: Catalog;
  corrections: Correction[];
  actuals: ActualRecord[];
  calibrations: CalibrationVersion[];
  scenarios: PricingScenario[];
  dataset: AhspDataset | null;
  minRoom?: Record<string, { area: number; side: number }>;
  lessonStatuses: Record<string, "approved" | "pending" | "rejected">;
  versions: ScenarioVersion[];
  settings: AppSettings;
  importHistory: ImportHistory[];
}

interface StoreRow {
  key: string;
  value: unknown;
  updatedAt: string;
}

export type { StoreRow };

class EstimatorDatabase extends Dexie {
  store!: Table<StoreRow, string>;
  constructor() {
    super("rab-rumah-estimator");
    this.version(1).stores({ store: "key, updatedAt" });
  }
}

export const database = new EstimatorDatabase();

export type { Komponen };

export interface ProjectRepository {
  load(): Promise<PersistedState | null>;
  save(state: PersistedState): Promise<void>;
  reset(): Promise<void>;
}

/** Adaptor utama. Gagal IndexedDB -> konteks tetap memakai memori + memberi notifikasi. */
export class DexieProjectRepository implements ProjectRepository {
  async load(): Promise<PersistedState | null> {
    const row = await database.store.get("app-state");
    return row ? (row.value as PersistedState) : null;
  }
  async save(state: PersistedState): Promise<void> {
    await database.store.put({ key: "app-state", value: state, updatedAt: new Date().toISOString() });
  }
  async reset(): Promise<void> {
    await database.store.clear();
  }
}

export class MemoryProjectRepository implements ProjectRepository {
  private state: PersistedState | null = null;
  async load() {
    return this.state;
  }
  async save(state: PersistedState) {
    this.state = state;
  }
  async reset() {
    this.state = null;
  }
}

export const projectRepository: ProjectRepository = typeof indexedDB !== "undefined" ? new DexieProjectRepository() : new MemoryProjectRepository();
