import type { Notification, Project, Tenant, User, UserRole } from '../store/appStore';
import { computeFinanceReportMonth } from './financeReportMonth';
import { parseWorkHours } from '../utils/workHours';

export interface DbOrganization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings?: Record<string, unknown> | null;
  plan_type?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbProject {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  client_name?: string | null;
  client_contact?: Record<string, unknown> | null;
  location?: string | null;
  planned_start: string;
  planned_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  finance_report_month?: string | null;
  finance_report_month_manual?: boolean | null;
  status?: string | null;
  progress_pct?: number | null;
  total_budget?: number | null;
  total_spent?: number | null;
  total_received?: number | null;
  tags?: string[] | null;
  settings?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  org_id?: string | null;
  project_id?: string | null;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  is_read?: boolean | null;
  created_at?: string;
}

export interface DbRapItem {
  id: string;
  project_id: string;
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
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbWorkItem {
  id: string;
  project_id: string;
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
  created_at?: string;
  updated_at?: string;
}

export interface DbCostRealization {
  id: string;
  project_id: string;
  rap_item_id?: string | null;
  date: string;
  description: string;
  quantity?: number | null;
  unit_price?: number | null;
  total_amount: number;
  payment_method?: string | null;
  supplier?: string | null;
  status?: string | null;
  recorded_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbDailyLog {
  id: string;
  project_id: string;
  work_item_id?: string | null;
  date: string;
  description: string;
  progress_increment?: number | null;
  workers_present?: number | null;
  weather?: string | null;
  recorded_by: string;
  created_at?: string;
}

export interface DbCommandLog {
  id: string;
  user_id: string;
  org_id?: string | null;
  input_type: string;
  raw_input: string;
  parsed_intent?: string | null;
  parsed_params?: Record<string, unknown> | null;
  confidence?: number | null;
  execution_status?: string | null;
  execution_result?: Record<string, unknown> | null;
  error_message?: string | null;
  created_at?: string;
}

const DB_TO_UI_STATUS: Record<string, Project['status']> = {
  planning: 'planning',
  active: 'active',
  paused: 'on_hold',
  completed: 'completed',
  cancelled: 'archived',
};

const UI_TO_DB_STATUS: Record<Project['status'], string> = {
  draft: 'planning',
  planning: 'planning',
  active: 'active',
  on_hold: 'paused',
  completed: 'completed',
  archived: 'cancelled',
};

export function mapDbRoleToUi(role: string): UserRole {
  if (role === 'worker' || role === 'viewer') return 'worker';
  if (role === 'member') return 'manager';
  if (role === 'admin') return 'owner';
  if (role === 'owner' || role === 'manager') return role;
  return 'worker';
}

export function projectCodeFromId(id: string): string {
  return `PRJ-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export function computeHealthStatus(
  progress: number,
  plannedProgress: number,
  spent: number,
  budget: number,
): Project['health_status'] {
  if (budget > 0 && spent / budget > progress / 100 + 0.15) return 'at_risk';
  if (progress >= plannedProgress + 5) return 'ahead';
  if (progress < plannedProgress - 5) return 'behind';
  return 'on_track';
}

export function toTenant(org: DbOrganization): Tenant {
  const settings = (org.settings || {}) as Record<string, unknown>;
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: settings.logo as string | undefined,
    business_type: (settings.business_type as string) || 'construction',
    plan: (org.plan_type as Tenant['plan']) || 'free',
    currency: (settings.currency as string) || 'IDR',
    timezone: (settings.timezone as string) || 'Asia/Jakarta',
    workHours: parseWorkHours(settings),
  };
}

export function toProject(row: DbProject, currency = 'IDR'): Project {
  const settings = (row.settings || {}) as Record<string, string>;
  const progress = Number(row.progress_pct) || 0;
  const spent = Number(row.total_spent) || 0;
  const budget = Number(row.total_budget) || 0;
  const plannedProgress = progress;

  return {
    id: row.id,
    tenant_id: row.org_id,
    name: row.name,
    code: projectCodeFromId(row.id),
    client_name: row.client_name || '',
    client_contact:
      typeof row.client_contact === 'object' && row.client_contact
        ? String((row.client_contact as Record<string, string>).phone || '')
        : undefined,
    location: row.location || undefined,
    type: (settings.type as Project['type']) || 'construction',
    status: DB_TO_UI_STATUS[row.status || 'planning'] || 'planning',
    start_date: row.planned_start,
    end_date: row.planned_end,
    total_budget_planned: budget,
    currency,
    manager_id: settings.manager_id,
    progress_percentage: progress,
    health_status: computeHealthStatus(progress, plannedProgress, spent, budget),
    planned_progress: plannedProgress,
    spent_amount: spent,
    total_received: Number(row.total_received) || 0,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    description: row.description || undefined,
    finance_report_month: row.finance_report_month || undefined,
    finance_report_month_manual: row.finance_report_month_manual ?? false,
  };
}

export function fromProjectInsert(
  input: {
    name: string;
    description?: string;
    client_name?: string;
    location?: string;
    start_date: string;
    end_date: string;
    status?: Project['status'];
    type?: Project['type'];
    org_id: string;
    created_by: string;
    total_budget?: number;
  },
): Partial<DbProject> {
  const now = new Date().toISOString();
  return {
    org_id: input.org_id,
    name: input.name,
    description: input.description || null,
    client_name: input.client_name || null,
    location: input.location || null,
    planned_start: input.start_date,
    planned_end: input.end_date,
    status: UI_TO_DB_STATUS[input.status || 'planning'],
    created_by: input.created_by,
    total_budget: input.total_budget ?? 0,
    settings: { type: input.type || 'construction' },
    finance_report_month: computeFinanceReportMonth(now, input.end_date),
    finance_report_month_manual: false,
  };
}

export function fromProjectUpdate(data: Partial<Project>): Partial<DbProject> {
  const update: Partial<DbProject> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.client_name !== undefined) update.client_name = data.client_name;
  if (data.location !== undefined) update.location = data.location;
  if (data.start_date !== undefined) update.planned_start = data.start_date;
  if (data.end_date !== undefined) update.planned_end = data.end_date;
  if (data.status !== undefined) update.status = UI_TO_DB_STATUS[data.status];
  if (data.progress_percentage !== undefined) update.progress_pct = data.progress_percentage;
  if (data.total_budget_planned !== undefined) update.total_budget = data.total_budget_planned;
  if (data.type !== undefined) update.settings = { type: data.type };
  if (data.finance_report_month !== undefined) {
    update.finance_report_month = data.finance_report_month
      ? monthPickerToReportDate(data.finance_report_month)
      : null;
  }
  if (data.finance_report_month_manual !== undefined) {
    update.finance_report_month_manual = data.finance_report_month_manual;
  }
  return update;
}

export function toNotification(row: DbNotification): Notification {
  const data = (row.data || {}) as Record<string, string>;
  return {
    id: row.id,
    type: (row.type as Notification['type']) || 'system',
    title: row.title,
    message: row.message,
    read: Boolean(row.is_read),
    created_at: row.created_at || new Date().toISOString(),
    action_url: data.action_url,
    priority: (data.priority as Notification['priority']) || 'medium',
  };
}

export function toCommandLog(row: DbCommandLog): {
  id: string;
  input: string;
  intent?: string;
  success: boolean;
  timestamp: string;
} {
  return {
    id: row.id,
    input: row.raw_input,
    intent: row.parsed_intent || undefined,
    success: row.execution_status === 'executed',
    timestamp: row.created_at || new Date().toISOString(),
  };
}

export function buildUser(
  authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  profileName: string,
  orgId: string,
  role: string,
): User {
  return {
    id: authUser.id,
    email: authUser.email || '',
    name: profileName,
    role: mapDbRoleToUi(role),
    tenant_id: orgId,
  };
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseNumberFromText(str: string | undefined): number {
  if (!str) return 0;
  return parseFloat(str.replace(/[.,]/g, '')) || 0;
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatCurrencyShort(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return formatCurrency(n);
}
