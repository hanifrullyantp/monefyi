// =====================================================
// RAP draft generator — template × volume + historical merge
// =====================================================

import type { APP_DATA } from "./mock-data";

type Template = (typeof APP_DATA.database.templates)[number];
type Material = (typeof APP_DATA.database.materials)[number];
type Project = (typeof APP_DATA.projects)[number];

export type DraftMaterial = {
  key: string;
  enabled: boolean;
  name: string;
  unit: string;
  qtyPlan: number;
  unitPrice: number;
  materialId?: number;
  source: "template" | "historical" | "manual";
};

export type DraftWorker = {
  key: string;
  enabled: boolean;
  name: string;
  unit: string;
  qtyPlan: number;
  unitPrice: number;
  workerId?: number;
  source: "template" | "historical" | "manual";
};

export type DraftTimeline = {
  name: string;
  weight: number;
  enabled: boolean;
};

export type ProjectDraft = {
  materials: DraftMaterial[];
  workers: DraftWorker[];
  timeline: DraftTimeline[];
  totalCost: number;
  totalSell: number;
};

function roundQty(n: number): number {
  return Math.ceil(n * 100) / 100;
}

function resolveMaterialPrice(
  name: string,
  fallback: number,
  materials: Material[]
): number {
  const found = materials.find(
    (m) => m.name.toLowerCase() === name.toLowerCase()
  );
  return found?.price ?? fallback;
}

/**
 * Compute average qty-per-unit from past projects with similar template name in settings.
 */
export function getHistoricalQtyPerUnit(
  templateName: string,
  itemName: string,
  projects: Project[],
  kind: "material" | "worker"
): { avg: number; count: number } | null {
  const samples: number[] = [];

  for (const p of projects) {
    const settings = (p as Project & { settings?: Record<string, string> }).settings;
    const pType = p.type || settings?.template || "";
    if (
      pType &&
      !pType.toLowerCase().includes(templateName.toLowerCase().split(" ")[0]) &&
      !p.name.toLowerCase().includes(templateName.toLowerCase().split(" ")[0])
    ) {
      continue;
    }

    const items =
      kind === "material" ? p.rap?.materials || [] : p.rap?.workers || [];
    const match = items.find(
      (i) => String(i.name).toLowerCase() === itemName.toLowerCase()
    );
    if (match && match.qtyPlan > 0) {
      samples.push(match.qtyPlan);
    }
  }

  if (samples.length < 2) return null;
  const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
  return { avg, count: samples.length };
}

export function generateRapDraft(input: {
  selections: Array<{ templateId: number; volume: number }>;
  templates: Template[];
  materials: Material[];
  projects?: Project[];
}): ProjectDraft {
  const materials: DraftMaterial[] = [];
  const workers: DraftWorker[] = [];
  const timeline: DraftTimeline[] = [];
  let totalCost = 0;
  let totalSell = 0;

  for (const sel of input.selections) {
    const template = input.templates.find((t) => t.id === sel.templateId);
    if (!template || sel.volume <= 0) continue;

    for (const m of template.materials) {
      const hist = input.projects
        ? getHistoricalQtyPerUnit(template.name, m.name, input.projects, "material")
        : null;
      const qtyFromTemplate = roundQty(m.qtyPerUnit * sel.volume);
      const qtyPlan =
        hist && hist.count >= 3
          ? roundQty(hist.avg * sel.volume)
          : qtyFromTemplate;
      const unitPrice = resolveMaterialPrice(m.name, m.price, input.materials);
      const cost = qtyPlan * unitPrice;
      totalCost += cost;

      materials.push({
        key: `m-${template.id}-${m.materialId || m.name}`,
        enabled: true,
        name: m.name,
        unit: m.unit,
        qtyPlan,
        unitPrice,
        materialId: m.materialId,
        source: hist && hist.count >= 3 ? "historical" : "template",
      });
    }

    for (const w of template.workers) {
      const hist = input.projects
        ? getHistoricalQtyPerUnit(template.name, w.name, input.projects, "worker")
        : null;
      const daysFromTemplate = roundQty(w.daysPerUnit * sel.volume);
      const qtyPlan =
        hist && hist.count >= 3 ? roundQty(hist.avg * sel.volume) : daysFromTemplate;
      const cost = qtyPlan * w.rate;
      totalCost += cost;

      workers.push({
        key: `w-${template.id}-${w.workerId || w.name}`,
        enabled: true,
        name: w.name,
        unit: "Hari",
        qtyPlan,
        unitPrice: w.rate,
        workerId: w.workerId,
        source: hist && hist.count >= 3 ? "historical" : "template",
      });
    }

    for (const step of template.progressTemplate) {
      const existing = timeline.find((t) => t.name === step.name);
      if (existing) {
        existing.weight = Math.max(existing.weight, step.weight);
      } else {
        timeline.push({ name: step.name, weight: step.weight, enabled: true });
      }
    }

    totalSell += template.estSellPerUnit * sel.volume;
  }

  return { materials, workers, timeline, totalCost, totalSell };
}

export function draftToCreatePayload(
  draft: ProjectDraft,
  meta: {
    name: string;
    client: string;
    startDate: string;
    endDate: string;
    contractValue: number;
    notes?: string;
    type?: string;
    templateNames?: string[];
  }
) {
  const enabledMaterials = draft.materials.filter((m) => m.enabled);
  const enabledWorkers = draft.workers.filter((w) => w.enabled);
  const enabledTimeline = draft.timeline.filter((t) => t.enabled);

  return {
    ...meta,
    contractValue: meta.contractValue || Math.round(draft.totalSell),
    materials: enabledMaterials.map((m) => ({
      name: m.name,
      unit: m.unit,
      quantity: m.qtyPlan,
      unitPrice: m.unitPrice,
      type: "material" as const,
    })),
    workers: enabledWorkers.map((w) => ({
      name: w.name,
      unit: w.unit,
      quantity: w.qtyPlan,
      unitPrice: w.unitPrice,
      type: "labor" as const,
    })),
    timeline: enabledTimeline,
    totalBudget: enabledMaterials.reduce((s, m) => s + m.qtyPlan * m.unitPrice, 0) +
      enabledWorkers.reduce((s, w) => s + w.qtyPlan * w.unitPrice, 0),
  };
}
