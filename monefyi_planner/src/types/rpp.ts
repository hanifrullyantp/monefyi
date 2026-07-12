/** RPP master data types (production multi-tenant). */

export type RppMaterial = {
  id: number;
  org_id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  last_price: number | null;
  trend: string | null;
  stock: number;
  used_in: number;
  icon: string | null;
  vendor: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RppWorker = {
  id: number;
  org_id: string;
  name: string;
  level: string;
  rate: number;
  contact: string | null;
  rating: number;
  created_at?: string;
  updated_at?: string;
};

export type JobTemplateMaterial = {
  materialId?: number;
  name: string;
  qtyPerUnit: number;
  unit: string;
  price: number;
};

export type JobTemplateWorker = {
  workerId?: number;
  name: string;
  daysPerUnit: number;
  rate: number;
};

export type JobTemplateProgress = {
  name: string;
  weight: number;
};

export type JobTemplate = {
  id: number;
  category: string;
  name: string;
  baseUnit: string;
  icon?: string;
  materials: JobTemplateMaterial[];
  workers: JobTemplateWorker[];
  progressTemplate: JobTemplateProgress[];
  estCostPerUnit?: number;
  estSellPerUnit?: number;
  margin?: number;
};

export type DatabaseMeta = {
  tools?: Array<{ id: number; name: string; type: string; condition?: string }>;
  vendors?: Array<{ id: number; name: string; category: string; phone?: string }>;
  clients?: Array<{ id: number; name: string; phone?: string }>;
};

export type MigrationFlags = {
  project_view_v2: boolean;
  database_master: boolean;
  create_project_smart: boolean;
  finance_dashboard_v2: boolean;
};

export const DEFAULT_MIGRATION_FLAGS: MigrationFlags = {
  project_view_v2: false,
  database_master: false,
  create_project_smart: false,
  finance_dashboard_v2: false,
};
