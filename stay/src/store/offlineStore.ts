import { create } from 'zustand';
import Dexie, { type Table } from 'dexie';

// --- DB SCHEMA ---
export interface OfflineAction {
  id?: number;
  type: string;
  payload: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
}

class OfflineDB extends Dexie {
  actions!: Table<OfflineAction>;

  constructor() {
    super('StayOfflineDB');
    this.version(1).stores({
      actions: '++id, type, status, timestamp'
    });
  }
}

export const db = new OfflineDB();

// --- STORE ---
interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  queueCount: number;
  setOnline: (online: boolean) => void;
  addToQueue: (type: string, payload: any) => Promise<void>;
  sync: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: navigator.onLine,
  isSyncing: false,
  queueCount: 0,

  setOnline: (online) => {
    set({ isOnline: online });
    if (online) get().sync();
  },

  addToQueue: async (type, payload) => {
    await db.actions.add({
      type,
      payload,
      timestamp: Date.now(),
      status: 'pending'
    });
    const count = await db.actions.where('status').equals('pending').count();
    set({ queueCount: count });
  },

  sync: async () => {
    const { isSyncing, isOnline } = get();
    if (isSyncing || !isOnline) return;

    set({ isSyncing: true });
    
    try {
      const pending = await db.actions.where('status').equals('pending').toArray();
      
      for (const action of pending) {
        // Simulate API call
        await new Promise(r => setTimeout(r, 800));
        await db.actions.update(action.id!, { status: 'syncing' });
        
        // Finalize sync
        await db.actions.delete(action.id!);
      }
      
      set({ queueCount: 0 });
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      set({ isSyncing: false });
    }
  }
}));

// Listen for network changes
window.addEventListener('online', () => useOfflineStore.getState().setOnline(true));
window.addEventListener('offline', () => useOfflineStore.getState().setOnline(false));
