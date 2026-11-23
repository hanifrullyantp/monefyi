export interface ProjectTypeOption {
  value: string;
  label: string;
}

export const DEFAULT_PROJECT_TYPES: ProjectTypeOption[] = [
  { value: 'construction', label: 'Konstruksi' },
  { value: 'service', label: 'Jasa / Renovasi' },
  { value: 'it', label: 'IT' },
  { value: 'event', label: 'Event' },
  { value: 'manufacturing', label: 'Manufaktur' },
  { value: 'other', label: 'Lainnya' },
];

const BUILTIN_LABELS = Object.fromEntries(
  DEFAULT_PROJECT_TYPES.map(t => [t.value, t.label]),
) as Record<string, string>;

export function slugifyProjectType(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
  return slug || `custom_${Date.now()}`;
}

export function formatProjectTypeLabel(value: string): string {
  return BUILTIN_LABELS[value] || value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function mergeProjectTypeOptions(
  custom: ProjectTypeOption[] | undefined,
  currentValue?: string,
): ProjectTypeOption[] {
  const seen = new Set(DEFAULT_PROJECT_TYPES.map(t => t.value));
  const merged = [...DEFAULT_PROJECT_TYPES];
  for (const entry of custom || []) {
    if (!entry?.value || seen.has(entry.value)) continue;
    seen.add(entry.value);
    merged.push({ value: entry.value, label: entry.label || formatProjectTypeLabel(entry.value) });
  }
  if (currentValue && !seen.has(currentValue)) {
    merged.push({ value: currentValue, label: formatProjectTypeLabel(currentValue) });
  }
  return merged;
}
