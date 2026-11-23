export interface FinanceV1ReportFilters {
  dateFrom: string;
  dateTo: string;
  projectId?: string;
}

export interface ProjectAmountRow {
  projectId: string;
  projectName: string;
  amount: number;
  pctOfTotal: number;
}

export interface HppTypeRow {
  type: string;
  label: string;
  amount: number;
  pctOfTotal: number;
}

export interface OpexCategoryRow {
  categoryId: string;
  categoryName: string;
  amount: number;
  pctOfTotal: number;
}

export interface ProjectProfitRow {
  projectId: string;
  projectName: string;
  revenue: number;
  hpp: number;
  grossProfit: number;
  marginPct: number;
}

export interface BusinessFinanceReport {
  filters: FinanceV1ReportFilters;
  generatedAt: string;
  revenue: {
    total: number;
    byProject: ProjectAmountRow[];
  };
  hpp: {
    total: number;
    byType: HppTypeRow[];
  };
  grossProfit: number;
  grossMarginPct: number;
  opex: {
    total: number;
    byCategory: OpexCategoryRow[];
  };
  netProfit: number;
  netMarginPct: number;
  byProjectProfit: ProjectProfitRow[];
}

export const HPP_TYPE_LABELS: Record<string, string> = {
  material: 'Material',
  labor: 'Tenaga Kerja',
  equipment: 'Alat',
  overhead: 'Overhead Proyek',
  other: 'Lainnya',
  uncategorized: 'Tanpa Kategori RAP',
};

export const DEFAULT_OPEX_CATEGORIES = [
  'Sewa Kantor',
  'Listrik & Air',
  'Gaji Admin',
  'Bahan Habis Pakai',
  'Transport & BBM',
  'Internet & Telepon',
  'Pajak & Perizinan',
  'Lainnya',
];
