import { type DbWorkItem } from '../lib/adapters';
import { isDemoOrInvalidUuid } from '../lib/demo/demoMode';
import type { WorkItemAttachment, WorkItemNote, WorkItemPriority } from '../lib/gantt/types';
import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';

export type WorkItem = DbWorkItem;
export type { WorkItemAttachment, WorkItemNote, WorkItemPriority };

export interface WorkItemExtendedMeta {
  assigned_member_id?: string | null;
  priority?: WorkItemPriority | null;
  notes?: WorkItemNote[] | null;
  attachments?: WorkItemAttachment[] | null;
}

export interface UpdateWorkItemOptions {
  expectedUpdatedAt?: string | null;
}

const LOCAL_META_KEY_PREFIX = 'monefyi_work_item_meta_v1:';
const DEMO_WORK_ITEMS_KEY_PREFIX = 'monefyi_demo_work_items_v1:';
const DEMO_WORK_ITEM_INDEX_KEY = 'monefyi_demo_work_item_project_index_v1';
const EXTENDED_COLUMN_KEYS = [
  'assigned_member_id',
  'priority',
  'notes',
  'attachments',
] as const;

/** Session-scoped cache flipped to false when remote DB lacks Phase 3 columns (42703 / PGRST204). */
let extendedColumnsSupported = true;

export function isExtendedColumnsSupported(): boolean {
  return extendedColumnsSupported;
}

export function resetWorkItemColumnSupportCache(supported = true): void {
  extendedColumnsSupported = supported;
}

export class WorkItemConflictError extends Error {
  readonly code = 'WORK_ITEM_CONFLICT' as const;
  readonly workItemId: string;
  readonly expectedUpdatedAt: string | null | undefined;
  readonly serverUpdatedAt: string | null | undefined;
  readonly serverWorkItem: WorkItem | null;

  constructor(
    workItemId: string,
    expectedUpdatedAt?: string | null,
    serverWorkItem?: WorkItem | null,
    message = 'Data pekerjaan telah diubah oleh pengguna lain. Muat ulang data terbaru atau timpa perubahan.',
  ) {
    super(message);
    this.name = 'WorkItemConflictError';
    this.workItemId = workItemId;
    this.expectedUpdatedAt = expectedUpdatedAt;
    this.serverUpdatedAt = serverWorkItem?.updated_at ?? null;
    this.serverWorkItem = serverWorkItem ?? null;
  }
}

export function isWorkItemConflictError(err: unknown): err is WorkItemConflictError {
  if (err instanceof WorkItemConflictError) return true;
  if (!err || typeof err !== 'object') return false;
  const candidate = err as { name?: string; code?: string };
  return (
    candidate.name === 'WorkItemConflictError' ||
    candidate.code === 'WORK_ITEM_CONFLICT'
  );
}

export function isMissingColumnError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; details?: string; hint?: string };
  const code = String(e.code || '').toUpperCase();
  if (code === '42703' || code === 'PGRST204') return true;
  const text = `${e.message || ''} ${e.details || ''} ${e.hint || ''}`.toLowerCase();
  return (
    (text.includes('column') && text.includes('does not exist')) ||
    (text.includes('could not find') && text.includes('schema cache'))
  );
}

function getLocalMetaStorageKey(projectId: string): string {
  return `${LOCAL_META_KEY_PREFIX}${projectId}`;
}

function getDemoWorkItemsStorageKey(projectId: string): string {
  return `${DEMO_WORK_ITEMS_KEY_PREFIX}${projectId}`;
}

function readDemoProjectIndex(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DEMO_WORK_ITEM_INDEX_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeDemoProjectIndex(index: Record<string, string>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DEMO_WORK_ITEM_INDEX_KEY, JSON.stringify(index));
  } catch {
    // ignore storage quota / restricted environments
  }
}

function findDemoProjectIdForWorkItem(workItemId: string): string | null {
  if (!workItemId || typeof localStorage === 'undefined') return null;
  const index = readDemoProjectIndex();
  if (index[workItemId]) return index[workItemId];

  if (typeof localStorage.length === 'number' && typeof localStorage.key === 'function') {
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(DEMO_WORK_ITEMS_KEY_PREFIX)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.some(w => w && w.id === workItemId)) {
          return key.slice(DEMO_WORK_ITEMS_KEY_PREFIX.length);
        }
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Load demo mode work items persisted in `localStorage` for a project (F-13/F-14 demo persistence).
 */
export function loadDemoWorkItems(projectId: string): WorkItem[] {
  if (!projectId || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getDemoWorkItemsStorageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const localMetaMap = readLocalMetaMap(projectId);
    return (parsed as WorkItem[]).map(row =>
      localMetaMap[row.id] ? mergeWorkItemMeta(row, undefined, localMetaMap[row.id]) : row,
    );
  } catch {
    return [];
  }
}

/**
 * Save demo mode work items to `localStorage` under `monefyi_demo_work_items_v1:<projectId>`.
 */
export function saveDemoWorkItems(projectId: string, items: WorkItem[]): void {
  if (!projectId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(getDemoWorkItemsStorageKey(projectId), JSON.stringify(items));
    const index = readDemoProjectIndex();
    for (const key of Object.keys(index)) {
      if (index[key] === projectId) delete index[key];
    }
    for (const item of items) {
      if (item?.id) index[item.id] = projectId;
    }
    writeDemoProjectIndex(index);
  } catch {
    // ignore storage quota / restricted environments
  }
}

function readLocalMetaMap(projectId: string): Record<string, WorkItemExtendedMeta> {
  if (!projectId || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getLocalMetaStorageKey(projectId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, WorkItemExtendedMeta>)
      : {};
  } catch {
    return {};
  }
}

function writeLocalMetaMap(
  projectId: string,
  map: Record<string, WorkItemExtendedMeta>,
): void {
  if (!projectId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(getLocalMetaStorageKey(projectId), JSON.stringify(map));
  } catch {
    // ignore storage quota / restricted environments
  }
}

function saveLocalWorkItemMeta(
  projectId: string,
  workItemId: string,
  patch: WorkItemExtendedMeta,
): WorkItemExtendedMeta {
  const map = readLocalMetaMap(projectId);
  const merged: WorkItemExtendedMeta = {
    ...(map[workItemId] || {}),
    ...patch,
  };
  map[workItemId] = merged;
  writeLocalMetaMap(projectId, map);
  return merged;
}

function extractExtendedMeta(item: Partial<WorkItem>): WorkItemExtendedMeta {
  const meta: WorkItemExtendedMeta = {};
  if (item.assigned_member_id !== undefined) meta.assigned_member_id = item.assigned_member_id;
  if (item.priority !== undefined) meta.priority = item.priority;
  if (item.notes !== undefined) meta.notes = item.notes;
  if (item.attachments !== undefined) meta.attachments = item.attachments;
  return meta;
}

function hasAnyExtendedMeta(meta: WorkItemExtendedMeta): boolean {
  return EXTENDED_COLUMN_KEYS.some(key => meta[key] !== undefined);
}

function stripExtendedColumns<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const copy: Record<string, unknown> = { ...payload };
  for (const key of EXTENDED_COLUMN_KEYS) {
    delete copy[key];
  }
  return copy as Partial<T>;
}

function extractSettingsMetaMap(
  settings: unknown,
): Record<string, WorkItemExtendedMeta> {
  if (!settings || typeof settings !== 'object') return {};
  const raw = (settings as Record<string, unknown>).work_item_meta;
  if (!raw || typeof raw !== 'object') return {};
  return raw as Record<string, WorkItemExtendedMeta>;
}

async function readProjectSettingsMetaMap(
  projectId: string,
): Promise<Record<string, WorkItemExtendedMeta>> {
  if (isDemoOrInvalidUuid(projectId)) return {};
  try {
    const { data, error } = await supabase
      .from('planner_projects')
      .select('settings')
      .eq('id', projectId)
      .maybeSingle();
    if (error || !data) return {};
    return extractSettingsMetaMap(data.settings);
  } catch {
    return {};
  }
}

async function persistProjectSettingsMeta(
  projectId: string,
  workItemId: string,
  meta: WorkItemExtendedMeta,
): Promise<void> {
  if (isDemoOrInvalidUuid(projectId) || !hasAnyExtendedMeta(meta)) return;
  try {
    const { data, error: fetchErr } = await supabase
      .from('planner_projects')
      .select('settings')
      .eq('id', projectId)
      .maybeSingle();
    if (fetchErr) return;

    const prevSettings =
      data?.settings && typeof data.settings === 'object'
        ? (data.settings as Record<string, unknown>)
        : {};
    const prevMetaMap = extractSettingsMetaMap(prevSettings);
    const nextItemMeta: WorkItemExtendedMeta = {
      ...(prevMetaMap[workItemId] || {}),
      ...meta,
    };

    const nextSettings = {
      ...prevSettings,
      work_item_meta: {
        ...prevMetaMap,
        [workItemId]: nextItemMeta,
      },
    };

    // Best-effort for Owner/Manager; Worker RLS failures are intentionally ignored.
    await supabase
      .from('planner_projects')
      .update({
        settings: nextSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
  } catch {
    // ignore RLS / network failures on best-effort settings sync
  }
}

function pickMetaField<K extends keyof WorkItemExtendedMeta>(
  key: K,
  row: WorkItem,
  settingsMeta?: WorkItemExtendedMeta,
  localMeta?: WorkItemExtendedMeta,
): WorkItemExtendedMeta[K] | undefined {
  if (row[key] !== undefined) return row[key];
  if (settingsMeta && settingsMeta[key] !== undefined) return settingsMeta[key];
  if (localMeta && localMeta[key] !== undefined) return localMeta[key];
  return undefined;
}

/**
 * Precedence: DB column > planner_projects.settings.work_item_meta > localStorage.
 */
function mergeWorkItemMeta(
  row: WorkItem,
  settingsMeta?: WorkItemExtendedMeta,
  localMeta?: WorkItemExtendedMeta,
): WorkItem {
  const merged: WorkItem = { ...row };
  const assignedMemberId = pickMetaField('assigned_member_id', row, settingsMeta, localMeta);
  if (assignedMemberId !== undefined) merged.assigned_member_id = assignedMemberId;
  const priority = pickMetaField('priority', row, settingsMeta, localMeta);
  if (priority !== undefined) merged.priority = priority;
  const notes = pickMetaField('notes', row, settingsMeta, localMeta);
  if (notes !== undefined) merged.notes = notes;
  const attachments = pickMetaField('attachments', row, settingsMeta, localMeta);
  if (attachments !== undefined) merged.attachments = attachments;
  return merged;
}

function rowNeedsMetaHydration(row: WorkItem): boolean {
  return EXTENDED_COLUMN_KEYS.some(key => row[key] === undefined);
}

export async function loadWorkItems(projectId: string): Promise<WorkItem[]> {
  if (isDemoOrInvalidUuid(projectId)) return loadDemoWorkItems(projectId);

  const { data, error } = await supabase
    .from('planner_work_items')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  const rows = (data || []) as WorkItem[];
  if (!rows.length) return [];

  if (!rows.some(rowNeedsMetaHydration)) {
    return rows;
  }

  const [settingsMetaMap, localMetaMap] = await Promise.all([
    readProjectSettingsMetaMap(projectId),
    Promise.resolve(readLocalMetaMap(projectId)),
  ]);

  return rows.map(row =>
    mergeWorkItemMeta(row, settingsMetaMap[row.id], localMetaMap[row.id]),
  );
}

export async function createWorkItem(
  item: Omit<WorkItem, 'id' | 'created_at' | 'updated_at'>,
): Promise<WorkItem> {
  const extMeta = extractExtendedMeta(item);

  if (isDemoOrInvalidUuid(item.project_id)) {
    const now = new Date().toISOString();
    const demoId = `demo-wi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (item.project_id && hasAnyExtendedMeta(extMeta)) {
      saveLocalWorkItemMeta(item.project_id, demoId, extMeta);
    }
    const created = {
      ...item,
      id: demoId,
      created_at: now,
      updated_at: now,
    } as WorkItem;
    if (item.project_id) {
      const existing = loadDemoWorkItems(item.project_id);
      saveDemoWorkItems(item.project_id, [...existing, created]);
    }
    return created;
  }

  const runInsert = async (payload: Record<string, unknown>) =>
    supabase.from('planner_work_items').insert(payload).select().single();

  const initialPayload = extendedColumnsSupported
    ? (item as Record<string, unknown>)
    : stripExtendedColumns(item as Record<string, unknown>);

  let { data, error } = await runInsert(initialPayload);

  if (error && isMissingColumnError(error)) {
    extendedColumnsSupported = false;
    ({ data, error } = await runInsert(
      stripExtendedColumns(item as Record<string, unknown>),
    ));
  }

  if (error) throw new Error(error.message);

  let saved = data as WorkItem;
  if (!extendedColumnsSupported && hasAnyExtendedMeta(extMeta)) {
    saveLocalWorkItemMeta(saved.project_id, saved.id, extMeta);
    await persistProjectSettingsMeta(saved.project_id, saved.id, extMeta).catch(() => {});
    saved = mergeWorkItemMeta(saved, extMeta, extMeta);
  } else if (rowNeedsMetaHydration(saved)) {
    const localMap = readLocalMetaMap(saved.project_id);
    saved = mergeWorkItemMeta(saved, undefined, localMap[saved.id]);
  }

  return saved;
}

export async function updateWorkItem(
  id: string,
  item: Partial<WorkItem>,
  options?: UpdateWorkItemOptions,
): Promise<WorkItem> {
  const nowIso = new Date().toISOString();
  const extMeta = extractExtendedMeta(item);

  if (isDemoOrInvalidUuid(id)) {
    const targetProjectId = item.project_id || findDemoProjectIdForWorkItem(id);
    if (targetProjectId && hasAnyExtendedMeta(extMeta)) {
      saveLocalWorkItemMeta(targetProjectId, id, extMeta);
    }
    if (targetProjectId) {
      const existing = loadDemoWorkItems(targetProjectId);
      const idx = existing.findIndex(w => w.id === id);
      if (idx >= 0) {
        const updatedItem = {
          ...existing[idx],
          ...item,
          id,
          updated_at: nowIso,
        } as WorkItem;
        saveDemoWorkItems(
          targetProjectId,
          existing.map((w, i) => (i === idx ? updatedItem : w)),
        );
        return updatedItem;
      }
    }
    return {
      ...item,
      id,
      updated_at: nowIso,
    } as WorkItem;
  }

  const fullPayload: Record<string, unknown> = {
    ...item,
    updated_at: nowIso,
  };
  const expectedUpdatedAt = options?.expectedUpdatedAt;

  const runUpdate = async (payload: Record<string, unknown>) => {
    let query = supabase
      .from('planner_work_items')
      .update(payload)
      .eq('id', id);

    if (expectedUpdatedAt) {
      query = query.eq('updated_at', expectedUpdatedAt);
      return query.select().maybeSingle();
    }

    return query.select().single();
  };

  const initialPayload = extendedColumnsSupported
    ? fullPayload
    : stripExtendedColumns(fullPayload);

  let { data, error } = await runUpdate(initialPayload);

  if (error && isMissingColumnError(error)) {
    extendedColumnsSupported = false;
    ({ data, error } = await runUpdate(stripExtendedColumns(fullPayload)));
  }

  if (expectedUpdatedAt && ((!error && !data) || error?.code === 'PGRST116')) {
    const { data: currentRow, error: checkErr } = await supabase
      .from('planner_work_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (checkErr) throw new Error(checkErr.message);
    if (currentRow) {
      const existing = currentRow as WorkItem;
      const hydrated = rowNeedsMetaHydration(existing)
        ? mergeWorkItemMeta(
            existing,
            await readProjectSettingsMetaMap(existing.project_id).then(m => m[existing.id]),
            readLocalMetaMap(existing.project_id)[existing.id],
          )
        : existing;
      throw new WorkItemConflictError(id, expectedUpdatedAt, hydrated);
    }
    throw new Error('Pekerjaan tidak ditemukan atau sudah dihapus');
  }

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Pekerjaan tidak ditemukan');

  let saved = data as WorkItem;
  if (!extendedColumnsSupported && hasAnyExtendedMeta(extMeta)) {
    saveLocalWorkItemMeta(saved.project_id, saved.id, extMeta);
    await persistProjectSettingsMeta(saved.project_id, saved.id, extMeta).catch(() => {});
    saved = mergeWorkItemMeta(saved, extMeta, extMeta);
  } else if (rowNeedsMetaHydration(saved)) {
    const localMap = readLocalMetaMap(saved.project_id);
    saved = mergeWorkItemMeta(saved, undefined, localMap[saved.id]);
  }

  return saved;
}

export async function deleteWorkItem(id: string): Promise<void> {
  if (isDemoOrInvalidUuid(id)) {
    const targetProjectId = findDemoProjectIdForWorkItem(id);
    if (targetProjectId) {
      const existing = loadDemoWorkItems(targetProjectId);
      const next = existing
        .filter(w => w.id !== id && w.parent_id !== id)
        .map(w =>
          w.dependencies?.includes(id)
            ? { ...w, dependencies: w.dependencies.filter(depId => depId !== id) }
            : w,
        );
      saveDemoWorkItems(targetProjectId, next);
    }
    return;
  }
  const { error } = await supabase.from('planner_work_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function loadWorkItemsForOrg(orgId: string): Promise<WorkItem[]> {
  if (isDemoOrInvalidUuid(orgId)) return [];

  const { data: projects, error: projErr } = await supabase
    .from('planner_projects')
    .select('id, settings')
    .eq('org_id', orgId);
  if (projErr) throw new Error(projErr.message);

  const projectRows = (projects || []) as Array<{ id: string; settings?: unknown }>;
  const ids = projectRows.map(p => p.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('planner_work_items')
    .select('*')
    .in('project_id', ids)
    .order('planned_end', { ascending: true });

  if (error) throw new Error(error.message);
  const rows = (data || []) as WorkItem[];
  if (!rows.length) return [];

  if (!rows.some(rowNeedsMetaHydration)) {
    return rows;
  }

  const settingsByProject = new Map<string, Record<string, WorkItemExtendedMeta>>();
  for (const p of projectRows) {
    settingsByProject.set(p.id, extractSettingsMetaMap(p.settings));
  }

  const localByProject = new Map<string, Record<string, WorkItemExtendedMeta>>();
  const getLocal = (projectId: string) => {
    let map = localByProject.get(projectId);
    if (!map) {
      map = readLocalMetaMap(projectId);
      localByProject.set(projectId, map);
    }
    return map;
  };

  return rows.map(row =>
    mergeWorkItemMeta(
      row,
      settingsByProject.get(row.project_id)?.[row.id],
      getLocal(row.project_id)[row.id],
    ),
  );
}

/**
 * Duplicate a work item (F-13). Accepts either a full `WorkItem` object (works in demo & real)
 * or a work item UUID string (fetches from DB first).
 */
export async function duplicateWorkItem(
  sourceOrId: string | WorkItem,
  overrides: Partial<Omit<WorkItem, 'id' | 'created_at' | 'updated_at'>> = {},
): Promise<WorkItem> {
  let source: WorkItem;

  if (typeof sourceOrId === 'string') {
    if (isDemoOrInvalidUuid(sourceOrId)) {
      const demoProjectId = findDemoProjectIdForWorkItem(sourceOrId);
      const demoMatch = demoProjectId
        ? loadDemoWorkItems(demoProjectId).find(w => w.id === sourceOrId)
        : undefined;
      if (!demoMatch) {
        throw new Error('Item pekerjaan demo harus dikirim sebagai objek untuk diduplikasi');
      }
      source = demoMatch;
    } else {
      const { data, error } = await supabase
        .from('planner_work_items')
        .select('*')
        .eq('id', sourceOrId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Pekerjaan sumber duplikasi tidak ditemukan');

      const row = data as WorkItem;
      if (rowNeedsMetaHydration(row)) {
        const [settingsMap, localMap] = await Promise.all([
          readProjectSettingsMetaMap(row.project_id),
          Promise.resolve(readLocalMetaMap(row.project_id)),
        ]);
        source = mergeWorkItemMeta(row, settingsMap[row.id], localMap[row.id]);
      } else {
        source = row;
      }
    }
  } else {
    source = sourceOrId;
  }

  const payload: Omit<WorkItem, 'id' | 'created_at' | 'updated_at'> = {
    project_id: overrides.project_id ?? source.project_id,
    parent_id: overrides.parent_id !== undefined ? overrides.parent_id : (source.parent_id ?? null),
    name: overrides.name ?? `${source.name} (Salinan)`,
    description: overrides.description !== undefined ? overrides.description : (source.description ?? null),
    planned_start: overrides.planned_start ?? source.planned_start,
    planned_end: overrides.planned_end ?? source.planned_end,
    actual_start: overrides.actual_start !== undefined ? overrides.actual_start : null,
    actual_end: overrides.actual_end !== undefined ? overrides.actual_end : null,
    weight: overrides.weight ?? source.weight ?? 0,
    progress_pct: overrides.progress_pct ?? 0,
    planned_workers: overrides.planned_workers ?? source.planned_workers ?? 1,
    actual_workers: overrides.actual_workers !== undefined ? overrides.actual_workers : null,
    status: overrides.status ?? 'pending',
    sort_order: overrides.sort_order ?? (source.sort_order ?? 0) + 1,
    dependencies: overrides.dependencies ?? [...(source.dependencies || [])],
    dependency_type: overrides.dependency_type ?? source.dependency_type ?? 'FS',
    assigned_member_id:
      overrides.assigned_member_id !== undefined
        ? overrides.assigned_member_id
        : (source.assigned_member_id ?? null),
    priority: overrides.priority ?? source.priority ?? 'medium',
    notes: overrides.notes ?? [],
    attachments: overrides.attachments ?? [],
  };

  return createWorkItem(payload);
}

type DbUpdateUpdatedAtResult = {
  data?: { updated_at?: string } | Array<{ updated_at?: string }> | null;
  error?: { code?: string; message?: string; details?: string; hint?: string } | null;
};

async function executeWorkItemUpdateReturningUpdatedAt(
  workItemId: string,
  payload: Record<string, unknown>,
): Promise<{
  updatedAt?: string;
  error: { code?: string; message?: string; details?: string; hint?: string } | null;
}> {
  const eqBuilder = supabase
    .from('planner_work_items')
    .update(payload)
    .eq('id', workItemId) as unknown as {
      select?: (cols: string) => {
        maybeSingle?: () => Promise<DbUpdateUpdatedAtResult>;
      } & PromiseLike<DbUpdateUpdatedAtResult>;
    } & PromiseLike<DbUpdateUpdatedAtResult>;

  let res: DbUpdateUpdatedAtResult | undefined;
  if (typeof eqBuilder?.select === 'function') {
    const selectBuilder = eqBuilder.select('updated_at');
    if (typeof selectBuilder?.maybeSingle === 'function') {
      res = await selectBuilder.maybeSingle();
    } else {
      res = await selectBuilder;
    }
  } else {
    res = await eqBuilder;
  }

  const rowData = Array.isArray(res?.data) ? res.data[0] : res?.data;
  return {
    updatedAt: rowData?.updated_at ?? undefined,
    error: res?.error ?? null,
  };
}

/**
 * Update extended metadata (`notes`, `attachments`, `assigned_member_id`, `priority`)
 * directly without clobbering dates/progress, with safe fallback to
 * `planner_projects.settings.work_item_meta` + `localStorage`.
 */
export async function updateWorkItemExtendedMeta(
  projectId: string,
  workItemId: string,
  patch: WorkItemExtendedMeta,
): Promise<WorkItemExtendedMeta & { updated_at?: string }> {
  const cleanPatch = extractExtendedMeta(patch);
  if (!hasAnyExtendedMeta(cleanPatch)) {
    return readLocalMetaMap(projectId)[workItemId] || {};
  }

  const mergedLocal = saveLocalWorkItemMeta(projectId, workItemId, cleanPatch);

  if (isDemoOrInvalidUuid(projectId) || isDemoOrInvalidUuid(workItemId)) {
    const demoUpdatedAt = new Date().toISOString();
    const targetProjectId = projectId || findDemoProjectIdForWorkItem(workItemId);
    if (targetProjectId) {
      const existing = loadDemoWorkItems(targetProjectId);
      const idx = existing.findIndex(w => w.id === workItemId);
      if (idx >= 0) {
        saveDemoWorkItems(
          targetProjectId,
          existing.map((w, i) =>
            i === idx ? ({ ...w, ...cleanPatch, updated_at: demoUpdatedAt } as WorkItem) : w,
          ),
        );
      }
    }
    return { ...mergedLocal, updated_at: demoUpdatedAt };
  }

  if (extendedColumnsSupported) {
    const { updatedAt, error } = await executeWorkItemUpdateReturningUpdatedAt(workItemId, {
      ...cleanPatch,
      updated_at: new Date().toISOString(),
    });

    if (!error) {
      return {
        ...mergedLocal,
        ...(updatedAt ? { updated_at: updatedAt } : {}),
      };
    }

    if (!isMissingColumnError(error)) {
      throw new Error(error.message || 'Gagal memperbarui metadata pekerjaan');
    }

    extendedColumnsSupported = false;
  }

  await persistProjectSettingsMeta(projectId, workItemId, mergedLocal).catch(() => {});

  let serverUpdatedAt: string | undefined;
  try {
    const { updatedAt } = await executeWorkItemUpdateReturningUpdatedAt(workItemId, {
      updated_at: new Date().toISOString(),
    });
    serverUpdatedAt = updatedAt;
  } catch {
    // best-effort updated_at touch for realtime notification
  }

  return {
    ...mergedLocal,
    ...(serverUpdatedAt ? { updated_at: serverUpdatedAt } : {}),
  };
}

/** Membaca progress_pct yang dihitung trigger dari item pekerjaan. */
export async function updateProjectProgressFromWorkItems(projectId: string) {
  if (isDemoOrInvalidUuid(projectId)) return 0;
  const { data, error } = await supabase
    .from('planner_projects')
    .select('progress_pct')
    .eq('id', projectId)
    .single();
  assertNoDbError(error);
  return Number(data?.progress_pct) || 0;
}
