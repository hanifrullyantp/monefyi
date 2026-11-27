/**
 * froyek — Offline-first sync layer for Capacitor mobile app.
 *
 * - Memantau status online/offline via `navigator.onLine` dan event `online`/`offline`.
 * - Menyimpan data mutation secara lokal (IndexedDB via Dexie) saat offline.
 * - Saat kembali online, secara otomatis mengirim antrian pending ke Supabase.
 * - Meng-update Zustand store (`syncStatus`, `isOnline`, `pendingSyncCount`, `lastSynced`).
 */

import Dexie, { Table } from 'dexie';
import { supabase } from './supabase';
import { useAppStore } from '../store/appStore';

/* ---------------------------------------------------------------- */
/*  Dexie database (IndexedDB) — simpan data lokal saat offline     */
/* ---------------------------------------------------------------- */

class FroyekDb extends Dexie {
  projects!: Table<any>;
  transactions!: Table<any>;
  todos!: Table<any>;
  notifications!: Table<any>;
  pendingMutations!: Table<any>;

  constructor() {
    super('FroyekDb');
    this.version(1).stores({
      projects: '++id, tenant_id, updated_at',
      transactions: '++id, project_id, updated_at',
      todos: '++id, project_id, updated_at',
      notifications: '++id, updated_at',
      pendingMutations: '++id, created_at, synced',
    });
  }
}

export const db = new FroyekDb();

/* ---------------------------------------------------------------- */
/*  Pending mutation queue                                          */
/* ---------------------------------------------------------------- */

export type PendingMutation = {
  id?: number;
  table: string;
  op: 'insert' | 'update' | 'delete';
  payload: any;
  filter?: Record<string, any>;
  created_at: string;
  synced: boolean;
};

/** Tambahkan mutation ke antrian lokal. */
export async function enqueueMutation(mutation: Omit<PendingMutation, 'id' | 'created_at' | 'synced'>) {
  await db.pendingMutations.add({
    ...mutation,
    created_at: new Date().toISOString(),
    synced: false,
  });
  const count = await db.pendingMutations.where('synced').equals(false).count();
  useAppStore.getState().setPendingSyncCount(count);
}

/** Ambil semua mutation yang belum sinkron. */
export async function getPendingMutations(): Promise<PendingMutation[]> {
  return db.pendingMutations.where('synced').equals(false).toArray();
}

/** Tandai mutation sebagai sudah sinkron. */
export async function markSynced(id: number) {
  await db.pendingMutations.update(id, { synced: true });
  const count = await db.pendingMutations.where('synced').equals(false).count();
  useAppStore.getState().setPendingSyncCount(count);
}

/* ---------------------------------------------------------------- */
/*  Network status                                                  */
/* ---------------------------------------------------------------- */

let isListening = false;

export function startNetworkMonitor() {
  if (isListening) return;
  isListening = true;

  // Set initial status
  useAppStore.getState().setOnline(navigator.onLine);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

function handleOffline() {
  useAppStore.getState().setOnline(false);
  useAppStore.getState().setSyncStatus('offline');
  console.log('[offline-sync] device offline — changes will be queued locally');
}

async function handleOnline() {
  useAppStore.getState().setOnline(true);
  await syncPendingMutations();
}

/* ---------------------------------------------------------------- */
/*  Auto-sync when online                                           */
/* ---------------------------------------------------------------- */

export async function syncPendingMutations() {
  const store = useAppStore.getState();
  const { user, tenant } = store;

  if (!user || !tenant) return;
  if (!navigator.onLine) return;

  store.setSyncStatus('syncing');

  const pending = await getPendingMutations();
  if (pending.length === 0) {
    store.setSyncStatus('synced');
    store.setLastSynced(new Date());
    return;
  }

  let success = 0;
  let failed = 0;

  for (const mutation of pending) {
    try {
      switch (mutation.table) {
        case 'projects':
          if (mutation.op === 'insert') {
            await supabase.from('planner_projects').insert(mutation.payload);
          } else if (mutation.op === 'update' && mutation.filter) {
            await supabase.from('planner_projects').update(mutation.payload).eq('id', mutation.filter.id);
          } else if (mutation.op === 'delete' && mutation.filter) {
            await supabase.from('planner_projects').delete().eq('id', mutation.filter.id);
          }
          break;
        case 'transactions':
          if (mutation.op === 'insert') {
            await supabase.from('planner_transactions').insert(mutation.payload);
          } else if (mutation.op === 'update' && mutation.filter) {
            await supabase.from('planner_transactions').update(mutation.payload).eq('id', mutation.filter.id);
          } else if (mutation.op === 'delete' && mutation.filter) {
            await supabase.from('planner_transactions').delete().eq('id', mutation.filter.id);
          }
          break;
        case 'todos':
          if (mutation.op === 'insert') {
            await supabase.from('planner_todos').insert(mutation.payload);
          } else if (mutation.op === 'update' && mutation.filter) {
            await supabase.from('planner_todos').update(mutation.payload).eq('id', mutation.filter.id);
          } else if (mutation.op === 'delete' && mutation.filter) {
            await supabase.from('planner_todos').delete().eq('id', mutation.filter.id);
          }
          break;
        default:
          console.warn(`[offline-sync] unknown table: ${mutation.table}`);
      }
      await markSynced(mutation.id!);
      success++;
    } catch (e) {
      console.error(`[offline-sync] failed mutation ${mutation.id}:`, e);
      failed++;
    }
  }

  // Refresh data from server after sync
  try {
    await store.refreshData();
  } catch (e) {
    console.error('[offline-sync] refreshData failed:', e);
  }

  store.setSyncStatus(failed > 0 ? 'error' : 'synced');
  store.setLastSynced(new Date());
  console.log(`[offline-sync] synced ${success} mutations, ${failed} failed`);
}

/* ---------------------------------------------------------------- */
/*  Convenience wrappers for common tables                          */
/* ---------------------------------------------------------------- */

export async function queueProjectInsert(payload: any) {
  await enqueueMutation({ table: 'projects', op: 'insert', payload });
}

export async function queueProjectUpdate(id: string, payload: any) {
  await enqueueMutation({ table: 'projects', op: 'update', payload, filter: { id } });
}

export async function queueProjectDelete(id: string) {
  await enqueueMutation({ table: 'projects', op: 'delete', filter: { id } });
}

export async function queueTransactionInsert(payload: any) {
  await enqueueMutation({ table: 'transactions', op: 'insert', payload });
}

export async function queueTransactionUpdate(id: string, payload: any) {
  await enqueueMutation({ table: 'transactions', op: 'update', payload, filter: { id } });
}

export async function queueTransactionDelete(id: string) {
  await enqueueMutation({ table: 'transactions', op: 'delete', filter: { id } });
}

export async function queueTodoInsert(payload: any) {
  await enqueueMutation({ table: 'todos', op: 'insert', payload });
}

export async function queueTodoUpdate(id: string, payload: any) {
  await enqueueMutation({ table: 'todos', op: 'update', payload, filter: { id } });
}

export async function queueTodoDelete(id: string) {
  await enqueueMutation({ table: 'todos', op: 'delete', filter: { id } });
}

/* ---------------------------------------------------------------- */
/*  Init                                                            */
/* ---------------------------------------------------------------- */

export function initOfflineSync() {
  startNetworkMonitor();

  // Sync immediately if already online
  if (navigator.onLine) {
    void syncPendingMutations();
  }
}
