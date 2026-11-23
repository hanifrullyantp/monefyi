/** Budget Usaha — document model (JSONB schemaVersion 1). */

export type BudgetFrequency = 'monthly' | 'yearly' | 'one-time';
export type BudgetViewMode = 'monthly' | 'yearly';
export type BudgetScenarioKey = 'conservative' | 'realistic' | 'aggressive';
export type BudgetLinkSource = 'hr' | 'rap' | 'projects' | 'manual';
export type BudgetConfidence = 'high' | 'medium' | 'low';
export type BudgetInsightType = 'warning' | 'success' | 'tip';

export interface BudgetLinkedTo {
  source: 'hr' | 'rap' | 'projects';
  filter?: Record<string, unknown>;
  detailKey?: string;
}

export interface BudgetItem {
  id: string;
  name: string;
  icon: string;
  amount: number;
  frequency: BudgetFrequency;
  note?: string;
  isAutoLinked: boolean;
  linkedTo?: BudgetLinkedTo;
  autoAmount?: number | null;
  manualOverride?: number | null;
}

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  isAutoLinked?: boolean;
  linkSource?: BudgetLinkSource | null;
  items: BudgetItem[];
  subtotal?: number;
}

export interface BudgetPeriod {
  year: number;
  startMonth: number;
  endMonth: number;
  viewMode: BudgetViewMode;
}

export interface BudgetScenario {
  revenueMultiplier: number;
  netProfit: number;
  netProfitMonthly: number;
}

export interface BudgetScenarios {
  active: BudgetScenarioKey;
  conservative: BudgetScenario;
  realistic: BudgetScenario;
  aggressive: BudgetScenario;
}

export interface BudgetMetadata {
  createdAt: string;
  updatedAt: string;
  lastCalculatedAt?: string;
  isDraft: boolean;
  autoSaveEnabled: boolean;
  schemaVersion: 1;
}

export interface BudgetUsahaDocument {
  id: string;
  orgId: string;
  name: string;
  period: BudgetPeriod;
  templateId: string | null;
  categories: BudgetCategory[];
  scenarios: BudgetScenarios;
  metadata: BudgetMetadata;
}

export interface BudgetTemplateCategory {
  name: string;
  icon: string;
  color: string;
  order: number;
  items: Array<{
    name: string;
    icon: string;
    suggestedAmount?: number;
    frequency?: BudgetFrequency;
    autoLink?: string | null;
  }>;
}

export interface BudgetTemplate {
  id: string;
  orgId: string | null;
  name: string;
  description: string;
  icon: string;
  isSystem: boolean;
  categories: BudgetTemplateCategory[];
  usedCount: number;
}

export interface BudgetRevenueProjection {
  fromActiveProjects: number;
  fromPipeline: number;
  projected: number;
  monthlyAverage: number;
  confidence: BudgetConfidence;
}

export interface BudgetBreakdownSegment {
  key: string;
  label: string;
  amount: number;
  percent: number;
  color: string;
}

export interface BudgetAnalysis {
  revenue: BudgetRevenueProjection;
  totalCostMonthly: number;
  totalCostYearly: number;
  grossProfit: number;
  netProfit: number;
  netProfitMonthly: number;
  margin: number;
  breakEvenPoint: number;
  roiProjected: number;
  cashRunwayMonths: number;
  cashFlowPositive: boolean;
  positiveFromMonth: number;
  kasBalance: number;
  breakdown: BudgetBreakdownSegment[];
  categoryTotals: Record<string, number>;
}

export interface BudgetInsightAction {
  label: string;
  kind: 'apply_suggestion' | 'simulate' | 'navigate';
  payload?: Record<string, unknown>;
}

export interface BudgetInsight {
  id: string;
  type: BudgetInsightType;
  icon: string;
  message: string;
  action?: BudgetInsightAction;
}

export interface BudgetExternalData {
  revenue: BudgetRevenueProjection;
  hrPayroll: {
    totalMonthly: number;
    members: Array<{
      memberId: string;
      name: string;
      position?: string;
      department?: string;
      monthlySalary: number;
    }>;
  };
  rapCosts: {
    materialMonthly: number;
    laborMonthly: number;
    byProject: Array<{
      projectId: string;
      projectName: string;
      material: number;
      laborPlanned: number;
      laborActual: number;
    }>;
  };
  kasBalance: number;
}

export const BUDGET_CATEGORY_COLORS: Record<string, string> = {
  OPERASIONAL: '#2563EB',
  MARKETING: '#EC4899',
  PROYEK: '#F97316',
  PENGEMBANGAN: '#8B5CF6',
  CADANGAN: '#EAB308',
  PAJAK: '#64748B',
};

export const SCENARIO_MULTIPLIERS: Record<BudgetScenarioKey, number> = {
  conservative: 0.8,
  realistic: 1.0,
  aggressive: 1.3,
};

function tplItem(
  name: string,
  icon: string,
  suggestedAmount?: number,
  autoLink?: string | null,
  frequency: BudgetFrequency = 'monthly',
) {
  return { name, icon, suggestedAmount, autoLink: autoLink ?? null, frequency };
}

function tplCat(
  name: string,
  icon: string,
  color: string,
  order: number,
  items: ReturnType<typeof tplItem>[],
): BudgetTemplateCategory {
  return { name, icon, color, order, items };
}

/** Built-in templates — also seeded to DB on first load. */
export const SYSTEM_BUDGET_TEMPLATES: Omit<BudgetTemplate, 'id' | 'usedCount'>[] = [
  {
    orgId: null,
    name: 'Konstruksi Basic',
    description: 'Template standar untuk kontraktor kecil — operasional & proyek inti',
    icon: 'hard-hat',
    isSystem: true,
    categories: [
      tplCat('OPERASIONAL', 'truck', BUDGET_CATEGORY_COLORS.OPERASIONAL, 1, [
        tplItem('Gaji Karyawan Tetap', 'users', 15_000_000, 'hr.total_gaji_tetap'),
        tplItem('Sewa Kantor / Gudang', 'building', 5_000_000),
        tplItem('Utilitas', 'zap', 2_000_000),
      ]),
      tplCat('PROYEK', 'hammer', BUDGET_CATEGORY_COLORS.PROYEK, 2, [
        tplItem('Biaya Material Proyek', 'package', undefined, 'rap.material'),
        tplItem('Biaya Tenaga Kerja Proyek', 'users-round', undefined, 'rap.labor'),
      ]),
      tplCat('CADANGAN', 'shield', BUDGET_CATEGORY_COLORS.CADANGAN, 3, [
        tplItem('Dana Cadangan', 'piggy-bank', 5_000_000),
      ]),
    ],
  },
  {
    orgId: null,
    name: 'Konstruksi Advanced',
    description: 'Template lengkap untuk perusahaan konstruksi menengah',
    icon: 'building-2',
    isSystem: true,
    categories: [
      tplCat('OPERASIONAL', 'truck', BUDGET_CATEGORY_COLORS.OPERASIONAL, 1, [
        tplItem('Gaji Karyawan Tetap', 'users', 25_000_000, 'hr.total_gaji_tetap'),
        tplItem('Tunjangan Karyawan', 'gift', 3_000_000, 'hr.tunjangan'),
        tplItem('Sewa Kantor', 'building', 8_000_000),
        tplItem('Utilitas', 'zap', 3_000_000),
        tplItem('Transport & BBM', 'car', 4_000_000),
      ]),
      tplCat('MARKETING', 'megaphone', BUDGET_CATEGORY_COLORS.MARKETING, 2, [
        tplItem('Digital Marketing', 'globe', 5_000_000),
        tplItem('Iklan & Promosi', 'badge-percent', 3_000_000),
      ]),
      tplCat('PROYEK', 'hammer', BUDGET_CATEGORY_COLORS.PROYEK, 3, [
        tplItem('Biaya Material Proyek', 'package', undefined, 'rap.material'),
        tplItem('Biaya Tenaga Kerja Proyek', 'users-round', undefined, 'rap.labor'),
        tplItem('Alat & Peralatan', 'wrench', 5_000_000),
      ]),
      tplCat('PENGEMBANGAN', 'lightbulb', BUDGET_CATEGORY_COLORS.PENGEMBANGAN, 4, [
        tplItem('Pelatihan & Sertifikasi', 'graduation-cap', 2_000_000),
        tplItem('Software & Tools', 'laptop', 1_500_000),
      ]),
      tplCat('CADANGAN', 'shield', BUDGET_CATEGORY_COLORS.CADANGAN, 5, [
        tplItem('Dana Cadangan', 'piggy-bank', 10_000_000),
        tplItem('Bonus & THR', 'sparkles', undefined, 'hr.thr', 'yearly'),
      ]),
    ],
  },
  {
    orgId: null,
    name: 'Renovasi Standard',
    description: 'Untuk bisnis renovasi rumah & komersial',
    icon: 'home',
    isSystem: true,
    categories: [
      tplCat('OPERASIONAL', 'truck', BUDGET_CATEGORY_COLORS.OPERASIONAL, 1, [
        tplItem('Gaji Karyawan Tetap', 'users', 12_000_000, 'hr.total_gaji_tetap'),
        tplItem('Sewa Workshop', 'warehouse', 4_000_000),
      ]),
      tplCat('MARKETING', 'megaphone', BUDGET_CATEGORY_COLORS.MARKETING, 2, [
        tplItem('Marketing Lokal', 'map-pin', 2_000_000),
      ]),
      tplCat('PROYEK', 'hammer', BUDGET_CATEGORY_COLORS.PROYEK, 3, [
        tplItem('Biaya Material Proyek', 'package', undefined, 'rap.material'),
        tplItem('Biaya Tenaga Kerja Proyek', 'users-round', undefined, 'rap.labor'),
      ]),
    ],
  },
  {
    orgId: null,
    name: 'Interior Custom',
    description: 'Untuk studio interior & finishing custom',
    icon: 'palette',
    isSystem: true,
    categories: [
      tplCat('OPERASIONAL', 'truck', BUDGET_CATEGORY_COLORS.OPERASIONAL, 1, [
        tplItem('Gaji Desainer & Admin', 'users', 18_000_000, 'hr.total_gaji_tetap'),
        tplItem('Sewa Showroom', 'store', 6_000_000),
      ]),
      tplCat('MARKETING', 'megaphone', BUDGET_CATEGORY_COLORS.MARKETING, 2, [
        tplItem('Portfolio & Sosmed', 'camera', 4_000_000),
        tplItem('Pameran & Event', 'calendar', 3_000_000, null, 'one-time'),
      ]),
      tplCat('PROYEK', 'hammer', BUDGET_CATEGORY_COLORS.PROYEK, 3, [
        tplItem('Material Interior', 'package', undefined, 'rap.material'),
        tplItem('Tenaga Instalasi', 'users-round', undefined, 'rap.labor'),
      ]),
      tplCat('PENGEMBANGAN', 'lightbulb', BUDGET_CATEGORY_COLORS.PENGEMBANGAN, 4, [
        tplItem('R&D Material Baru', 'flask-conical', 2_000_000),
      ]),
    ],
  },
  {
    orgId: null,
    name: 'Kosong',
    description: 'Mulai dari nol — tambah kategori sendiri',
    icon: 'file-plus',
    isSystem: true,
    categories: [],
  },
];

export function newBudgetId(): string {
  return crypto.randomUUID();
}

export function createEmptyDocument(orgId: string, year: number): BudgetUsahaDocument {
  const now = new Date().toISOString();
  return {
    id: newBudgetId(),
    orgId,
    name: `Budget Usaha ${year}`,
    period: { year, startMonth: 1, endMonth: 12, viewMode: 'monthly' },
    templateId: null,
    categories: [],
    scenarios: {
      active: 'realistic',
      conservative: { revenueMultiplier: 0.8, netProfit: 0, netProfitMonthly: 0 },
      realistic: { revenueMultiplier: 1.0, netProfit: 0, netProfitMonthly: 0 },
      aggressive: { revenueMultiplier: 1.3, netProfit: 0, netProfitMonthly: 0 },
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      isDraft: true,
      autoSaveEnabled: true,
      schemaVersion: 1,
    },
  };
}

export function documentFromTemplate(
  orgId: string,
  year: number,
  template: BudgetTemplate,
): BudgetUsahaDocument {
  const doc = createEmptyDocument(orgId, year);
  doc.name = `Budget Usaha ${year}`;
  doc.templateId = template.id;
  doc.categories = template.categories.map((cat, ci) => ({
    id: newBudgetId(),
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    order: cat.order ?? ci + 1,
    linkSource: cat.items.some(i => i.autoLink?.startsWith('hr.'))
      ? 'hr'
      : cat.items.some(i => i.autoLink?.startsWith('rap.'))
        ? 'rap'
        : 'manual',
    isAutoLinked: cat.items.some(i => !!i.autoLink),
    items: cat.items.map(item => ({
      id: newBudgetId(),
      name: item.name,
      icon: item.icon,
      amount: item.suggestedAmount ?? 0,
      frequency: item.frequency ?? 'monthly',
      isAutoLinked: !!item.autoLink,
      linkedTo: item.autoLink
        ? {
            source: item.autoLink.startsWith('hr.')
              ? 'hr'
              : item.autoLink.startsWith('rap.')
                ? 'rap'
                : 'projects',
            detailKey: item.autoLink,
          }
        : undefined,
      autoAmount: null,
      manualOverride: null,
    })),
  }));
  return doc;
}
