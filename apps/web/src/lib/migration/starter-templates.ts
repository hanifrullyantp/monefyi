import type { DraftMaterial, DraftTimeline, DraftWorker, ProjectDraft } from './suggestion-engine';

export type NonConstructionCategory = 'it' | 'service' | 'event' | 'other';

export interface StarterWorkItemSpec {
  name: string;
  weight: number;
}

export interface StarterBudgetItemSpec {
  name: string;
  category: 'jasa_tim' | 'lisensi_alat' | 'operasional' | 'vendor';
  kind: 'material' | 'worker';
  unit: string;
  qtyPlan: number;
  unitPrice: number;
}

export interface ProjectStarterTemplate {
  id: string;
  category: NonConstructionCategory;
  categoryLabel: string;
  name: string;
  description: string;
  defaultMarginPct: number;
  workItems: StarterWorkItemSpec[];
  budgetItems: StarterBudgetItemSpec[];
}

export const NON_CONSTRUCTION_STARTER_TEMPLATES: ProjectStarterTemplate[] = [
  {
    id: 'starter-it-software',
    category: 'it',
    categoryLabel: 'IT / Software',
    name: 'Pengembangan Aplikasi Web & Sistem',
    description: 'Template standar proyek perangkat lunak: discovery, desain UI/UX, engineering, QA, dan rilis.',
    defaultMarginPct: 35,
    workItems: [
      { name: 'Discovery & Analisis Kebutuhan', weight: 15 },
      { name: 'Desain UI/UX & Prototype', weight: 20 },
      { name: 'Pengembangan Backend & API', weight: 25 },
      { name: 'Pengembangan Frontend & Integrasi', weight: 25 },
      { name: 'QA Testing & UAT Klien', weight: 10 },
      { name: 'Deployment & Serah Terima', weight: 5 },
    ],
    budgetItems: [
      {
        name: 'Software Engineer Fullstack',
        category: 'jasa_tim',
        kind: 'worker',
        unit: 'Hari',
        qtyPlan: 20,
        unitPrice: 650_000,
      },
      {
        name: 'UI/UX Product Designer',
        category: 'jasa_tim',
        kind: 'worker',
        unit: 'Hari',
        qtyPlan: 8,
        unitPrice: 550_000,
      },
      {
        name: 'QA & Technical Lead',
        category: 'jasa_tim',
        kind: 'worker',
        unit: 'Hari',
        qtyPlan: 6,
        unitPrice: 500_000,
      },
      {
        name: 'Cloud Hosting & Database Staging/Prod',
        category: 'lisensi_alat',
        kind: 'material',
        unit: 'Paket',
        qtyPlan: 1,
        unitPrice: 2_500_000,
      },
      {
        name: 'Lisensi API, Domain & SSL',
        category: 'lisensi_alat',
        kind: 'material',
        unit: 'Paket',
        qtyPlan: 1,
        unitPrice: 1_500_000,
      },
    ],
  },
  {
    id: 'starter-service-agency',
    category: 'service',
    categoryLabel: 'Jasa / Agensi',
    name: 'Proyek Jasa Konsultansi & Kampanye Kreatif',
    description: 'Template proyek agensi/konsultan: riset klien, konsep, produksi deliverables, revisi, dan presentasi.',
    defaultMarginPct: 35,
    workItems: [
      { name: 'Kick-off & Riset Kebutuhan Klien', weight: 15 },
      { name: 'Penyusunan Strategi & Konsep', weight: 25 },
      { name: 'Produksi Materi & Deliverables', weight: 30 },
      { name: 'Review Kualitas & Revisi Klien', weight: 15 },
      { name: 'Presentasi Final & Serah Terima', weight: 15 },
    ],
    budgetItems: [
      {
        name: 'Account Lead & Strategist',
        category: 'jasa_tim',
        kind: 'worker',
        unit: 'Hari',
        qtyPlan: 10,
        unitPrice: 600_000,
      },
      {
        name: 'Tim Kreatif & Produksi Konten',
        category: 'jasa_tim',
        kind: 'worker',
        unit: 'Hari',
        qtyPlan: 12,
        unitPrice: 450_000,
      },
      {
        name: 'Tools Riset & Software Analitik',
        category: 'lisensi_alat',
        kind: 'material',
        unit: 'Paket',
        qtyPlan: 1,
        unitPrice: 1_800_000,
      },
      {
        name: 'Produksi Aset Digital & Lisensi Media',
        category: 'vendor',
        kind: 'material',
        unit: 'Paket',
        qtyPlan: 1,
        unitPrice: 2_200_000,
      },
    ],
  },
  {
    id: 'starter-event-production',
    category: 'event',
    categoryLabel: 'Event',
    name: 'Penyelenggaraan Acara & Aktivasi Brand',
    description: 'Template produksi acara: konsep & rundown, vendor & venue, promosi, gladi bersih, hari-H, dan evaluasi.',
    defaultMarginPct: 30,
    workItems: [
      { name: 'Konsep Acara & Penyusunan Rundown', weight: 15 },
      { name: 'Koordinasi Venue & Vendor Pendukung', weight: 25 },
      { name: 'Promosi & Manajemen Registrasi', weight: 20 },
      { name: 'Gladi Bersih & Persiapan Teknis', weight: 15 },
      { name: 'Pelaksanaan Hari-H', weight: 15 },
      { name: 'Evaluasi & Laporan Pasca Acara', weight: 10 },
    ],
    budgetItems: [
      {
        name: 'Event Producer & Show Director',
        category: 'jasa_tim',
        kind: 'worker',
        unit: 'Hari',
        qtyPlan: 8,
        unitPrice: 550_000,
      },
      {
        name: 'Kru Teknis Audio Visual & Registrasi',
        category: 'jasa_tim',
        kind: 'worker',
        unit: 'Hari',
        qtyPlan: 6,
        unitPrice: 400_000,
      },
      {
        name: 'Sewa Venue, Sound System & Lighting',
        category: 'vendor',
        kind: 'material',
        unit: 'Paket',
        qtyPlan: 1,
        unitPrice: 12_000_000,
      },
      {
        name: 'Perlengkapan Acara, Signage & Dokumentasi',
        category: 'operasional',
        kind: 'material',
        unit: 'Paket',
        qtyPlan: 1,
        unitPrice: 4_500_000,
      },
    ],
  },
  {
    id: 'starter-general-ops',
    category: 'other',
    categoryLabel: 'Umum',
    name: 'Proyek Operasional & Inisiatif Umum',
    description: 'Template fleksibel lintas bidang untuk proyek operasional, pengadaan jasa, atau inisiatif bisnis.',
    defaultMarginPct: 25,
    workItems: [
      { name: 'Inisiasi & Penetapan Ruang Lingkup', weight: 15 },
      { name: 'Perencanaan Jadwal & Anggaran', weight: 20 },
      { name: 'Eksekusi Pekerjaan Utama', weight: 40 },
      { name: 'Review Kualitas & Penyesuaian', weight: 15 },
      { name: 'Serah Terima & Penutupan Proyek', weight: 10 },
    ],
    budgetItems: [
      {
        name: 'Koordinator Pelaksana Proyek',
        category: 'jasa_tim',
        kind: 'worker',
        unit: 'Hari',
        qtyPlan: 10,
        unitPrice: 450_000,
      },
      {
        name: 'Staf Operasional Proyek',
        category: 'jasa_tim',
        kind: 'worker',
        unit: 'Hari',
        qtyPlan: 8,
        unitPrice: 300_000,
      },
      {
        name: 'Kebutuhan Operasional & Administrasi',
        category: 'operasional',
        kind: 'material',
        unit: 'Paket',
        qtyPlan: 1,
        unitPrice: 2_000_000,
      },
      {
        name: 'Sewa Perangkat & Transportasi Tim',
        category: 'operasional',
        kind: 'material',
        unit: 'Paket',
        qtyPlan: 1,
        unitPrice: 1_500_000,
      },
    ],
  },
];

export function isConstructionProjectType(projectType?: string | null): boolean {
  return !projectType || projectType === 'construction';
}

/**
 * Returns non-construction starter templates matching a project category.
 * Returns empty list for `construction` (which uses RPP Master templates).
 */
export function getStarterTemplatesForProjectType(projectType: string): ProjectStarterTemplate[] {
  if (isConstructionProjectType(projectType)) return [];
  const exact = NON_CONSTRUCTION_STARTER_TEMPLATES.filter(t => t.category === projectType);
  if (exact.length > 0) return exact;
  // Fallback for `manufacturing` or custom non-construction categories
  const general = NON_CONSTRUCTION_STARTER_TEMPLATES.filter(t => t.category === 'other');
  return general.length > 0 ? general : NON_CONSTRUCTION_STARTER_TEMPLATES;
}

export function getStarterTemplateById(id?: string | null): ProjectStarterTemplate | undefined {
  if (!id) return undefined;
  return NON_CONSTRUCTION_STARTER_TEMPLATES.find(t => t.id === id);
}

export function recalculateDraftTotals(
  draft: Pick<ProjectDraft, 'materials' | 'workers' | 'timeline'>,
  marginPct = 30,
): ProjectDraft {
  const matCost = draft.materials
    .filter(m => m.enabled)
    .reduce((sum, m) => sum + m.qtyPlan * m.unitPrice, 0);
  const workerCost = draft.workers
    .filter(w => w.enabled)
    .reduce((sum, w) => sum + w.qtyPlan * w.unitPrice, 0);
  const totalCost = Math.round(matCost + workerCost);
  const totalSell = Math.round(totalCost * (1 + Math.max(0, marginPct) / 100));
  return {
    materials: draft.materials,
    workers: draft.workers,
    timeline: draft.timeline,
    totalCost,
    totalSell,
  };
}

export function starterTemplateToProjectDraft(
  template: ProjectStarterTemplate,
  scale = 1,
): ProjectDraft {
  const factor = Number.isFinite(scale) && scale > 0 ? scale : 1;

  const materials: DraftMaterial[] = [];
  const workers: DraftWorker[] = [];

  template.budgetItems.forEach((item, idx) => {
    const qtyPlan = Math.max(1, Math.ceil(item.qtyPlan * factor));
    if (item.kind === 'worker') {
      workers.push({
        key: `starter-w-${template.id}-${idx}`,
        enabled: true,
        name: item.name,
        unit: item.unit,
        qtyPlan,
        unitPrice: item.unitPrice,
        source: 'template',
      });
    } else {
      materials.push({
        key: `starter-m-${template.id}-${idx}`,
        enabled: true,
        name: item.name,
        unit: item.unit,
        qtyPlan,
        unitPrice: item.unitPrice,
        source: 'template',
      });
    }
  });

  const timeline: DraftTimeline[] = template.workItems.map(step => ({
    name: step.name,
    weight: step.weight,
    enabled: true,
  }));

  return recalculateDraftTotals({ materials, workers, timeline }, template.defaultMarginPct);
}
