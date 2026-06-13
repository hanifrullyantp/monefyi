import type { Project } from '../store/appStore';

export function formatRupiah(n: number) {
  if (!Number.isFinite(n)) return 'Rp 0';
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export const HEALTH_CONFIG: Record<
  Project['health_status'],
  { label: string; color: string; bg: string; dot: string }
> = {
  on_track: { label: 'On Track', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  at_risk: { label: 'At Risk', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  behind: { label: 'Behind', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
  ahead: { label: 'Ahead', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
};

export const STATUS_LABEL: Record<Project['status'], string> = {
  draft: 'Draft',
  planning: 'Planning',
  active: 'Aktif',
  on_hold: 'Ditunda',
  completed: 'Selesai',
  archived: 'Arsip',
};

export const PROJECT_STATUSES: { id: Project['status']; label: string }[] = [
  { id: 'draft', label: STATUS_LABEL.draft },
  { id: 'planning', label: STATUS_LABEL.planning },
  { id: 'active', label: STATUS_LABEL.active },
  { id: 'on_hold', label: STATUS_LABEL.on_hold },
  { id: 'completed', label: STATUS_LABEL.completed },
  { id: 'archived', label: STATUS_LABEL.archived },
];

export function daysUntil(endDate: string) {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

export function formatDateId(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export type ProjectSort = 'recent' | 'name' | 'progress' | 'budget' | 'end_date';

export function sortProjects(list: Project[], sort: ProjectSort): Project[] {
  const copy = [...list];
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'progress':
      return copy.sort((a, b) => b.progress_percentage - a.progress_percentage);
    case 'budget':
      return copy.sort((a, b) => b.total_budget_planned - a.total_budget_planned);
    case 'end_date':
      return copy.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
    default:
      return copy.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }
}

/** Urutan tampilan list: Aktif → Planning → Selesai */
export const PROJECT_STATUS_SECTIONS = [
  { id: 'active', label: 'Aktif', statuses: ['active', 'on_hold'] as Project['status'][] },
  { id: 'planning', label: 'Planning', statuses: ['planning', 'draft'] as Project['status'][] },
  { id: 'completed', label: 'Selesai', statuses: ['completed', 'archived'] as Project['status'][] },
] as const;

export function groupProjectsByStatusSection(projects: Project[]) {
  return PROJECT_STATUS_SECTIONS
    .map(section => ({
      section,
      projects: projects.filter(p => section.statuses.includes(p.status)),
    }))
    .filter(g => g.projects.length > 0);
}
