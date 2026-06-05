import type { Project } from '../store/appStore';
import type { RapItem } from './rapService';
import type { CostRealization } from './costService';
import type { WorkItem } from './workItemService';
import type { DailyLog } from './dailyLogService';
import { updateProject } from './projectService';
import { createRapItem, updateRapItem, deleteAllRapItems } from './rapService';
import { createCostRealization, loadCostRealizations, deleteAllCosts } from './costService';
import { createWorkItem, updateWorkItem, loadWorkItems } from './workItemService';
import { createDailyLog, loadDailyLogs } from './dailyLogService';
import { loadProjectIncomes, createProjectIncome } from './incomeService';
import { loadProjectTransfers } from './projectTransferService';
import type { ProjectIncome } from './incomeService';
import type { ProjectTransfer } from './projectTransferService';
import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';

export const PROJECT_JSON_VERSION = '1.0';

export type ProjectJsonMode = 'merge' | 'replace';

export interface ProjectJsonDocument {
  version: typeof PROJECT_JSON_VERSION;
  /** merge: upsert by id, keep records not listed. replace: section fully replaced from JSON. */
  mode?: ProjectJsonMode;
  project: Partial<Project> & { id?: string };
  rap?: RapJsonItem[];
  realisasi?: RealisasiJsonItem[];
  incomes?: IncomeJsonItem[];
  transfers?: TransferJsonItem[];
  work_items?: WorkItemJsonItem[];
  daily_logs?: DailyLogJsonItem[];
  meta?: {
    exported_at?: string;
    project_id?: string;
    notes?: string;
  };
}

export interface RapJsonItem {
  id?: string;
  type: string;
  name: string;
  description?: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  supplier?: string | null;
  notes?: string | null;
  is_critical?: boolean | null;
  sort_order?: number | null;
}

export interface RealisasiJsonItem {
  id?: string;
  /** UUID item RAP yang sudah ada */
  rap_item_id?: string | null;
  /** Nama item RAP (fallback jika rap_item_id kosong) */
  rap_ref?: string | null;
  date: string;
  description: string;
  quantity?: number | null;
  unit_price?: number | null;
  total_amount: number;
  payment_method?: string | null;
  supplier?: string | null;
  status?: string | null;
}

export interface IncomeJsonItem {
  id?: string;
  date: string;
  amount: number;
  category?: string;
  description: string;
  payment_method?: string | null;
  client_ref?: string | null;
  invoice_ref?: string | null;
  status?: string;
}

export interface TransferJsonItem {
  id?: string;
  source_type?: 'project' | 'external';
  from_project_id?: string | null;
  to_project_id?: string | null;
  counterparty_name?: string | null;
  from_project_ref?: string;
  to_project_ref?: string;
  amount: number;
  type: 'loan' | 'repayment';
  date: string;
  description?: string | null;
}

export interface WorkItemJsonItem {
  id?: string;
  parent_id?: string | null;
  name: string;
  description?: string | null;
  planned_start: string;
  planned_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  weight?: number | null;
  progress_pct?: number | null;
  planned_workers?: number | null;
  actual_workers?: number | null;
  status?: string | null;
  sort_order?: number | null;
}

export interface DailyLogJsonItem {
  id?: string;
  work_item_id?: string | null;
  date: string;
  description: string;
  progress_increment?: number | null;
  workers_present?: number | null;
  weather?: string | null;
}

const RAP_TYPES = ['material', 'labor', 'equipment', 'overhead', 'other'] as const;

export function getProjectJsonTemplate(project?: Project): ProjectJsonDocument {
  return {
    version: PROJECT_JSON_VERSION,
    mode: 'merge',
    project: {
      name: project?.name || 'Nama Proyek',
      description: project?.description || '',
      client_name: project?.client_name || '',
      client_contact: project?.client_contact || '',
      location: project?.location || '',
      type: project?.type || 'construction',
      status: project?.status || 'planning',
      start_date: project?.start_date || '2025-01-01',
      end_date: project?.end_date || '2025-12-31',
      total_budget_planned: project?.total_budget_planned ?? 0,
      progress_percentage: project?.progress_percentage ?? 0,
      currency: project?.currency || 'IDR',
    },
    rap: [
      {
        type: 'material',
        name: 'Semen Portland',
        description: 'Spesifikasi 50kg',
        unit: 'zak',
        quantity: 100,
        unit_price: 65000,
        sort_order: 0,
      },
      {
        type: 'labor',
        name: 'Tukang batu',
        unit: 'OH',
        quantity: 30,
        unit_price: 150000,
        sort_order: 1,
      },
    ],
    realisasi: [
      {
        rap_ref: 'Semen Portland',
        date: '2025-06-01',
        description: 'Pembelian semen batch 1',
        quantity: 50,
        unit_price: 65000,
        total_amount: 3250000,
        supplier: 'Toko Bangunan ABC',
      },
    ],
    work_items: [
      {
        name: 'Pondasi',
        planned_start: project?.start_date || '2025-01-01',
        planned_end: project?.end_date || '2025-03-31',
        progress_pct: 0,
        sort_order: 0,
      },
    ],
    daily_logs: [
      {
        date: '2025-06-01',
        description: 'Pengerjaan pondasi lantai 1',
        progress_increment: 5,
        workers_present: 8,
        weather: 'cerah',
      },
    ],
    meta: {
      notes: 'Field opsional: id (untuk update), rap_ref (link realisasi ke RAP by name). mode: merge | replace.',
    },
  };
}

export function buildProjectJsonSnapshot(input: {
  project: Project;
  rapItems: RapItem[];
  costs: CostRealization[];
  workItems: WorkItem[];
  logs: DailyLog[];
  incomes?: ProjectIncome[];
  transfers?: ProjectTransfer[];
}): ProjectJsonDocument {
  const { project, rapItems, costs, workItems, logs, incomes = [], transfers = [] } = input;
  const rapById = Object.fromEntries(rapItems.map(r => [r.id, r.name]));

  return {
    version: PROJECT_JSON_VERSION,
    mode: 'merge',
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      client_name: project.client_name,
      client_contact: project.client_contact,
      location: project.location,
      type: project.type,
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date,
      total_budget_planned: project.total_budget_planned,
      progress_percentage: project.progress_percentage,
      currency: project.currency,
      health_status: project.health_status,
      spent_amount: project.spent_amount,
      total_received: project.total_received,
    },
    rap: rapItems.map(({ id, project_id: _p, created_at: _c, updated_at: _u, ...rest }) => ({
      id,
      ...rest,
    })),
    realisasi: costs.map(({ id, project_id: _p, recorded_by: _r, created_at: _c, updated_at: _u, rap_item_id, ...rest }) => ({
      id,
      rap_item_id,
      rap_ref: rap_item_id ? rapById[rap_item_id] || null : null,
      ...rest,
    })),
    incomes: incomes.map(({ id, project_id: _p, recorded_by: _r, created_at: _c, updated_at: _u, ...rest }) => ({
      id,
      ...rest,
    })),
    transfers: transfers.map(({ id, org_id: _o, recorded_by: _r, created_at: _c, ...rest }) => ({
      id,
      ...rest,
    })),
    work_items: workItems.map(({ id, project_id: _p, created_at: _c, updated_at: _u, ...rest }) => ({
      id,
      ...rest,
    })),
    daily_logs: logs.map(({ id, project_id: _p, recorded_by: _r, created_at: _c, ...rest }) => ({
      id,
      ...rest,
    })),
    meta: {
      exported_at: new Date().toISOString(),
      project_id: project.id,
    },
  };
}

export function parseProjectJson(raw: string): ProjectJsonDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('JSON tidak valid — periksa sintaks (koma, tanda kutip).');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Root JSON harus berupa object.');
  }
  const doc = parsed as ProjectJsonDocument;
  if (doc.version !== PROJECT_JSON_VERSION) {
    throw new Error(`Versi JSON tidak didukung: ${String(doc.version)}. Gunakan "${PROJECT_JSON_VERSION}".`);
  }
  if (!doc.project || typeof doc.project !== 'object') {
    throw new Error('Field "project" wajib ada.');
  }
  return doc;
}

function validateRapItem(item: RapJsonItem, index: number) {
  if (!item.name?.trim()) throw new Error(`rap[${index}]: name wajib diisi.`);
  if (!item.unit?.trim()) throw new Error(`rap[${index}]: unit wajib diisi.`);
  if (!RAP_TYPES.includes(item.type as typeof RAP_TYPES[number]) && item.type) {
    // allow custom types but warn via generic validation
  }
  if (Number.isNaN(Number(item.quantity))) throw new Error(`rap[${index}]: quantity harus angka.`);
  if (Number.isNaN(Number(item.unit_price))) throw new Error(`rap[${index}]: unit_price harus angka.`);
}

function validateRealisasi(item: RealisasiJsonItem, index: number) {
  if (!item.date) throw new Error(`realisasi[${index}]: date wajib (YYYY-MM-DD).`);
  if (!item.description?.trim()) throw new Error(`realisasi[${index}]: description wajib.`);
  if (Number.isNaN(Number(item.total_amount))) throw new Error(`realisasi[${index}]: total_amount harus angka.`);
}

export function validateProjectJson(doc: ProjectJsonDocument): string[] {
  const errors: string[] = [];
  doc.rap?.forEach((item, i) => {
    try { validateRapItem(item, i); } catch (e) {
      errors.push(e instanceof Error ? e.message : `rap[${i}]: invalid`);
    }
  });
  doc.realisasi?.forEach((item, i) => {
    try { validateRealisasi(item, i); } catch (e) {
      errors.push(e instanceof Error ? e.message : `realisasi[${i}]: invalid`);
    }
  });
  doc.work_items?.forEach((item, i) => {
    if (!item.name?.trim()) errors.push(`work_items[${i}]: name wajib.`);
    if (!item.planned_start || !item.planned_end) errors.push(`work_items[${i}]: planned_start & planned_end wajib.`);
  });
  doc.daily_logs?.forEach((item, i) => {
    if (!item.date) errors.push(`daily_logs[${i}]: date wajib.`);
    if (!item.description?.trim()) errors.push(`daily_logs[${i}]: description wajib.`);
  });
  return errors;
}

async function deleteAllWorkItems(projectId: string) {
  const { error } = await supabase.from('planner_work_items').delete().eq('project_id', projectId);
  if (error) throw new Error(error.message);
}

async function deleteAllDailyLogs(projectId: string) {
  const { error } = await supabase.from('planner_daily_logs').delete().eq('project_id', projectId);
  if (error) throw new Error(error.message);
}

async function upsertRapItems(projectId: string, items: RapJsonItem[], mode: ProjectJsonMode) {
  if (mode === 'replace') {
    await deleteAllRapItems(projectId);
  }

  const existingRes = mode === 'merge'
    ? await supabase.from('planner_rap_items').select('id').eq('project_id', projectId)
    : null;
  if (existingRes?.error) throw new Error(existingRes.error.message);
  const existingIds = new Set((existingRes?.data || []).map(r => r.id));

  const idMap = new Map<string, string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    validateRapItem(item, i);
    const payload = {
      project_id: projectId,
      type: item.type || 'material',
      name: item.name.trim(),
      description: item.description ?? null,
      unit: item.unit,
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      supplier: item.supplier ?? null,
      notes: item.notes ?? null,
      is_critical: item.is_critical ?? false,
      sort_order: item.sort_order ?? i,
    };

    if (item.id && existingIds.has(item.id)) {
      await updateRapItem(item.id, payload);
      idMap.set(item.name.trim().toLowerCase(), item.id);
    } else {
      const created = await createRapItem(payload);
      idMap.set(item.name.trim().toLowerCase(), created.id);
      if (item.id) idMap.set(item.id, created.id);
    }
  }

  return idMap;
}

function resolveRapItemId(
  item: RealisasiJsonItem,
  rapById: Map<string, string>,
  rapByName: Map<string, string>,
): string | null {
  if (item.rap_item_id && rapById.has(item.rap_item_id)) return item.rap_item_id;
  if (item.rap_ref) {
    const key = item.rap_ref.trim().toLowerCase();
    return rapByName.get(key) || null;
  }
  return null;
}

async function upsertRealisasi(
  projectId: string,
  items: RealisasiJsonItem[],
  mode: ProjectJsonMode,
  userId: string,
  rapByName: Map<string, string>,
) {
  if (mode === 'replace') {
    await deleteAllCosts(projectId);
  }

  const { data: rapRows } = await supabase.from('planner_rap_items').select('id, name').eq('project_id', projectId);
  const rapById = new Map((rapRows || []).map(r => [r.id, r.id]));
  rapByName.clear();
  for (const r of rapRows || []) {
    rapByName.set(r.name.trim().toLowerCase(), r.id);
  }

  const existingCosts = mode === 'merge' ? await loadCostRealizations(projectId) : [];
  const existingIds = new Set(existingCosts.map(c => c.id));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    validateRealisasi(item, i);
    const rap_item_id = resolveRapItemId(item, rapById, rapByName);

    const payload = {
      project_id: projectId,
      rap_item_id,
      date: item.date,
      description: item.description.trim(),
      quantity: item.quantity ?? null,
      unit_price: item.unit_price ?? null,
      total_amount: Number(item.total_amount) || 0,
      payment_method: item.payment_method ?? null,
      supplier: item.supplier ?? null,
      status: item.status ?? 'confirmed',
      recorded_by: userId,
    };

    if (item.id && existingIds.has(item.id) && mode === 'merge') {
      const { error } = await supabase.from('planner_cost_realizations').update(payload).eq('id', item.id);
      if (error) throw new Error(error.message);
    } else {
      await createCostRealization(payload);
    }
  }

  // Recalculate total_spent
  const costs = await loadCostRealizations(projectId);
  const totalSpent = costs.reduce((s, c) => s + (Number(c.total_amount) || 0), 0);
  const { error: updErr } = await supabase.from('planner_projects').update({ total_spent: totalSpent }).eq('id', projectId);
  assertNoDbError(updErr);
}

async function upsertWorkItems(projectId: string, items: WorkItemJsonItem[], mode: ProjectJsonMode) {
  if (mode === 'replace') {
    await deleteAllWorkItems(projectId);
  }

  const existing = mode === 'merge' ? await loadWorkItems(projectId) : [];
  const existingIds = new Set(existing.map(w => w.id));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const payload = {
      project_id: projectId,
      parent_id: item.parent_id ?? null,
      name: item.name.trim(),
      description: item.description ?? null,
      planned_start: item.planned_start,
      planned_end: item.planned_end,
      actual_start: item.actual_start ?? null,
      actual_end: item.actual_end ?? null,
      weight: item.weight ?? null,
      progress_pct: item.progress_pct ?? 0,
      planned_workers: item.planned_workers ?? null,
      actual_workers: item.actual_workers ?? null,
      status: item.status ?? 'pending',
      sort_order: item.sort_order ?? i,
    };

    if (item.id && existingIds.has(item.id)) {
      await updateWorkItem(item.id, payload);
    } else {
      await createWorkItem(payload);
    }
  }
}

async function upsertDailyLogs(projectId: string, items: DailyLogJsonItem[], mode: ProjectJsonMode, userId: string) {
  if (mode === 'replace') {
    await deleteAllDailyLogs(projectId);
  }

  const existing = mode === 'merge' ? await loadDailyLogs(projectId) : [];
  const existingIds = new Set(existing.map(l => l.id));

  for (const item of items) {
    const payload = {
      project_id: projectId,
      work_item_id: item.work_item_id ?? null,
      date: item.date,
      description: item.description.trim(),
      progress_increment: item.progress_increment ?? null,
      workers_present: item.workers_present ?? null,
      weather: item.weather ?? null,
      recorded_by: userId,
    };

    if (item.id && existingIds.has(item.id)) {
      const { error } = await supabase.from('planner_daily_logs').update(payload).eq('id', item.id);
      if (error) throw new Error(error.message);
    } else {
      await createDailyLog(payload);
    }
  }
}

export interface ApplyProjectJsonResult {
  project: Project;
  counts: {
    rap: number;
    realisasi: number;
    work_items: number;
    daily_logs: number;
    incomes?: number;
  };
}

export async function applyProjectJson(
  projectId: string,
  doc: ProjectJsonDocument,
  userId: string,
  currency = 'IDR',
): Promise<ApplyProjectJsonResult> {
  const validationErrors = validateProjectJson(doc);
  if (validationErrors.length) {
    throw new Error(validationErrors.join('\n'));
  }

  const mode = doc.mode || 'merge';
  const { id: _id, health_status: _h, spent_amount: _s, code: _c, tenant_id: _t, created_at: _ca, updated_at: _ua, planned_progress: _pp, ...projectPatch } = doc.project;

  const updatedProject = await updateProject(projectId, projectPatch, currency);

  const rapByName = new Map<string, string>();
  let rapCount = 0;
  let realisasiCount = 0;
  let workItemsCount = 0;
  let logsCount = 0;

  if (doc.rap?.length) {
    await upsertRapItems(projectId, doc.rap, mode);
    rapCount = doc.rap.length;
  } else if (mode === 'replace') {
    await deleteAllRapItems(projectId);
  }

  if (doc.realisasi?.length) {
    await upsertRealisasi(projectId, doc.realisasi, mode, userId, rapByName);
    realisasiCount = doc.realisasi.length;
  } else if (mode === 'replace') {
    await deleteAllCosts(projectId);
  }

  if (doc.work_items?.length) {
    await upsertWorkItems(projectId, doc.work_items, mode);
    workItemsCount = doc.work_items.length;
  } else if (mode === 'replace') {
    await deleteAllWorkItems(projectId);
  }

  if (doc.daily_logs?.length) {
    await upsertDailyLogs(projectId, doc.daily_logs, mode, userId);
    logsCount = doc.daily_logs.length;
  } else if (mode === 'replace') {
    await deleteAllDailyLogs(projectId);
  }

  if (doc.incomes?.length) {
    for (const item of doc.incomes) {
      await createProjectIncome({
        project_id: projectId,
        date: item.date,
        amount: Number(item.amount) || 0,
        category: (item.category as ProjectIncome['category']) || 'other',
        description: item.description.trim(),
        payment_method: item.payment_method ?? null,
        client_ref: item.client_ref ?? null,
        invoice_ref: item.invoice_ref ?? null,
        status: (item.status as ProjectIncome['status']) || 'received',
        recorded_by: userId,
      });
    }
  }

  return {
    project: updatedProject,
    counts: {
      rap: rapCount,
      realisasi: realisasiCount,
      work_items: workItemsCount,
      daily_logs: logsCount,
      incomes: doc.incomes?.length || 0,
    },
  };
}

export function downloadProjectJson(doc: ProjectJsonDocument, filename: string) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
