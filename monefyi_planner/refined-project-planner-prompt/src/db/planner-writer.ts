import { getSupabaseAdmin } from "./supabase-admin";
import {
  upsertMaterialFromRapLine,
  upsertWorkerFromRapLine,
} from "./rpp-master-writer";

function getPlannerOrgId(): string {
  return process.env.PLANNER_ORG_ID || "072144fe-05e4-45c4-9138-61a62cdb18f8";
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

type RapItem = {
  plannerId?: string;
  qtyPlan?: number;
  unitPrice?: number;
};

type ProjectPayload = {
  id?: number | string;
  contractValue?: number;
  saldo?: number;
  progress?: { actual?: number; plan?: number };
  budget?: {
    bahan?: { actual?: number };
    tukang?: { actual?: number };
  };
  rap?: {
    materials?: RapItem[];
    workers?: RapItem[];
  };
  payments?: { amount: number }[];
};

/**
 * Persist project edits to Supabase planner_* tables.
 */
export async function savePlannerProject(data: ProjectPayload): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase not configured");

  const projectId = String(data.id ?? "");
  if (!projectId) throw new Error("Project id required");

  const bahanActual = num(data.budget?.bahan?.actual);
  const tukangActual = num(data.budget?.tukang?.actual);
  const totalSpent = bahanActual + tukangActual;
  const totalReceived = (data.payments || []).reduce((s, p) => s + num(p.amount), 0);

  const { error: projectError } = await client
    .from("planner_projects")
    .update({
      total_budget: num(data.contractValue),
      total_spent: totalSpent,
      total_received: totalReceived,
      progress_pct: num(data.progress?.actual),
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (projectError) throw projectError;

  const rapItems = [
    ...(data.rap?.materials || []),
    ...(data.rap?.workers || []),
  ];

  for (const item of rapItems) {
    if (!item.plannerId) continue;
    const { error } = await client
      .from("planner_rap_items")
      .update({
        quantity: num(item.qtyPlan),
        unit_price: num(item.unitPrice),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.plannerId);
    if (error) throw error;
  }
}

/**
 * Record income or cost realization on a planner project.
 */
export async function addPlannerTransaction(data: {
  projectId: number | string;
  type: string;
  category?: string;
  name: string;
  amount: number;
  date?: string;
  note?: string;
}): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase not configured");

  const projectId = String(data.projectId);
  const amount = num(data.amount);
  const date = data.date || new Date().toISOString().slice(0, 10);

  if (data.type === "in") {
    const { error } = await client.from("planner_project_incomes").insert({
      project_id: projectId,
      date,
      amount,
      category: data.category || "Pembayaran",
      description: data.name,
      status: "received",
    });
    if (error) throw error;

    const { data: proj, error: readErr } = await client
      .from("planner_projects")
      .select("total_received")
      .eq("id", projectId)
      .single();
    if (readErr) throw readErr;

    const { error: updateErr } = await client
      .from("planner_projects")
      .update({
        total_received: num(proj?.total_received) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);
    if (updateErr) throw updateErr;
    return;
  }

  const { error } = await client.from("planner_cost_realizations").insert({
    project_id: projectId,
    date,
    description: data.name,
    total_amount: amount,
    supplier: data.category || null,
  });
  if (error) throw error;

  const { data: proj, error: readErr } = await client
    .from("planner_projects")
    .select("total_spent")
    .eq("id", projectId)
    .single();
  if (readErr) throw readErr;

  const { error: updateErr } = await client
    .from("planner_projects")
    .update({
      total_spent: num(proj?.total_spent) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
  if (updateErr) throw updateErr;
}

export type CreateProjectInput = {
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  contractValue: number;
  notes?: string;
  type?: string;
  templateNames?: string[];
  materials: Array<{
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    supplier?: string;
  }>;
  workers: Array<{
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
  }>;
  timeline: Array<{ name: string; weight: number }>;
  totalBudget?: number;
};

/**
 * Create a new planner project with RAP lines and work items.
 */
export async function createPlannerProject(
  data: CreateProjectInput
): Promise<{ projectId: string }> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase not configured");

  const orgId = getPlannerOrgId();
  const totalBudget =
    data.totalBudget ??
    [...data.materials, ...data.workers].reduce(
      (s, i) => s + num(i.quantity) * num(i.unitPrice),
      0
    );

  const { data: project, error: projectError } = await client
    .from("planner_projects")
    .insert({
      org_id: orgId,
      name: data.name,
      client_name: data.client,
      planned_start: data.startDate,
      planned_end: data.endDate,
      status: "active",
      progress_pct: 0,
      total_budget: data.contractValue || totalBudget,
      total_spent: 0,
      total_received: 0,
      settings: {
        type: data.type || "Interior",
        template: data.templateNames?.join(", ") || "",
        notes: data.notes || "",
      },
    })
    .select("id")
    .single();

  if (projectError) throw projectError;
  const projectId = project.id as string;

  const rapRows = [
    ...data.materials.map((m, idx) => ({
      project_id: projectId,
      type: "material",
      name: m.name,
      unit: m.unit,
      quantity: m.quantity,
      unit_price: m.unitPrice,
      supplier: m.supplier || null,
      sort_order: idx,
    })),
    ...data.workers.map((w, idx) => ({
      project_id: projectId,
      type: "labor",
      name: w.name,
      unit: w.unit || "Hari",
      quantity: w.quantity,
      unit_price: w.unitPrice,
      sort_order: data.materials.length + idx,
    })),
  ];

  if (rapRows.length > 0) {
    const { error: rapError } = await client.from("planner_rap_items").insert(rapRows);
    if (rapError) throw rapError;
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const steps = data.timeline.length || 1;

  const workRows = data.timeline.map((step, idx) => {
    const stepStart = new Date(start);
    stepStart.setDate(stepStart.getDate() + Math.floor((totalDays / steps) * idx));
    const stepEnd = new Date(start);
    stepEnd.setDate(stepEnd.getDate() + Math.floor((totalDays / steps) * (idx + 1)));
    return {
      project_id: projectId,
      name: step.name,
      planned_start: stepStart.toISOString().slice(0, 10),
      planned_end: stepEnd.toISOString().slice(0, 10),
      weight: step.weight,
      progress_pct: 0,
      status: "pending",
      sort_order: idx,
    };
  });

  if (workRows.length > 0) {
    const { error: workError } = await client.from("planner_work_items").insert(workRows);
    if (workError) throw workError;
  }

  for (const m of data.materials) {
    try {
      await upsertMaterialFromRapLine({
        name: m.name,
        unit: m.unit,
        unitPrice: m.unitPrice,
        vendor: m.supplier,
      });
    } catch {
      /* rpp master optional */
    }
  }

  for (const w of data.workers) {
    try {
      await upsertWorkerFromRapLine({ name: w.name, rate: w.unitPrice });
    } catch {
      /* rpp master optional */
    }
  }

  return { projectId };
}
