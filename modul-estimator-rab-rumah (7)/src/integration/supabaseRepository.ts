import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PersistedState, ProjectRepository } from "./repository";
import { database, type StoreRow } from "./repository";

const APP_STATE_KEY = "app-state";

function readEnv(): { url: string; anonKey: string } | null {
  const meta = import.meta as { env?: Record<string, string | undefined> };
  const env = meta.env;
  const url = env?.VITE_SUPABASE_URL;
  const anonKey = env?.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export class SupabaseProjectRepository implements ProjectRepository {
  private sb: SupabaseClient;
  private offline = false;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey);
  }

  async load(): Promise<PersistedState | null> {
    try {
      const { data, error } = await this.sb
        .from("rab_app_state")
        .select("state, updated_at")
        .eq("id", APP_STATE_KEY)
        .maybeSingle();
      if (error) throw error;
      if (data?.state) {
        const state = (data as { state: unknown }).state as PersistedState;
        await this.writeCache(state);
        this.offline = false;
        return state;
      }
      this.offline = false;
      return null;
    } catch {
      this.offline = true;
      return this.readCache();
    }
  }

  async save(state: PersistedState): Promise<void> {
    await this.writeCache(state);
    try {
      await this.sb
        .from("rab_app_state")
        .upsert({ id: APP_STATE_KEY, state, updated_at: new Date().toISOString() });
      this.offline = false;
    } catch {
      this.offline = true;
    }
  }

  async reset(): Promise<void> {
    await database.store.delete(APP_STATE_KEY);
    try {
      await this.sb.from("rab_app_state").delete().eq("id", APP_STATE_KEY);
      this.offline = false;
    } catch {
      this.offline = true;
    }
  }

  isOffline(): boolean {
    return this.offline;
  }

  private async writeCache(state: PersistedState): Promise<void> {
    await database.store.put({ key: APP_STATE_KEY, value: state, updatedAt: new Date().toISOString() } as StoreRow);
  }

  private async readCache(): Promise<PersistedState | null> {
    const row = await database.store.get(APP_STATE_KEY);
    return row ? (row.value as PersistedState) : null;
  }
}

export function createSupabaseProjectRepository(url: string, anonKey: string): ProjectRepository {
  return new SupabaseProjectRepository(url, anonKey);
}

export function createSupabaseProjectRepositoryFromEnv(): ProjectRepository | null {
  const resolved = readEnv();
  if (!resolved) return null;
  return new SupabaseProjectRepository(resolved.url, resolved.anonKey);
}
