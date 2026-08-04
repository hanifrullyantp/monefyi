import { create } from 'zustand';
import Dexie, { type Table } from 'dexie';
import { syncActionToApi } from '../services/api/stayApi';

export interface OfflineAction {
  id?: number;
  type: string;
  payload: unknown;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  errorMessage?: string;
}

class OfflineDB extends Dexie {
  actions!: Table<OfflineAction>;

  constructor() {
    super('StayOfflineDB');
    this.version(1).stores({
      actions: '++id, type, status, timestamp',
    });
  }
}

export const db = new OfflineDB();

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  queueCount: number;
  failedCount: number;
  failedActions: OfflineAction[];
  setOnline: (online: boolean) => void;
  addToQueue: (type: string, payload: unknown) => Promise<void>;
  sync: () => Promise<void>;
  retryFailed: () => Promise<void>;
  dismissFailed: () => Promise<void>;
  refreshCounts: () => Promise<void>;
}

async function countPending() {
  return db.actions.where('status').equals('pending').count();
}

async function loadFailed() {
  return db.actions.where('status').equals('failed').toArray();
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: navigator.onLine,
  isSyncing: false,
  queueCount: 0,
  failedCount: 0,
  failedActions: [],

  refreshCounts: async () => {
    const [pending, failed] = await Promise.all([countPending(), loadFailed()]);
    set({ queueCount: pending, failedCount: failed.length, failedActions: failed });
  },

  setOnline: (online) => {
    set({ isOnline: online });
    if (online) void get().sync();
  },

  addToQueue: async (type, payload) => {
    await db.actions.add({
      type,
      payload,
      timestamp: Date.now(),
      status: 'pending',
    });
    await get().refreshCounts();
    if (get().isOnline) void get().sync();
  },

  sync: async () => {
    const { isSyncing, isOnline } = get();
    if (isSyncing || !isOnline) return;

    set({ isSyncing: true });

    try {
      const pending = await db.actions.where('status').equals('pending').toArray();

      for (const action of pending) {
        await db.actions.update(action.id!, { status: 'syncing', errorMessage: undefined });
        const ok = await syncActionToApi(action);
        if (!ok) {
          await db.actions.update(action.id!, {
            status: 'failed',
            errorMessage: `Gagal sinkron: ${action.type}`,
          });
          continue;
        }
        await db.actions.delete(action.id!);
      }
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      set({ isSyncing: false });
      await get().refreshCounts();
    }
  },

  retryFailed: async () => {
    const failed = await loadFailed();
    for (const action of failed) {
      await db.actions.update(action.id!, { status: 'pending', errorMessage: undefined });
    }
    await get().refreshCounts();
    await get().sync();
  },

  dismissFailed: async () => {
    const failed = await loadFailed();
    for (const action of failed) {
      await db.actions.delete(action.id!);
    }
    await get().refreshCounts();
  },
}));

window.addEventListener('online', () => useOfflineStore.getState().setOnline(true));
window.addEventListener('offline', () => useOfflineStore.getState().setOnline(false));

void useOfflineStore.getState().refreshCounts();
