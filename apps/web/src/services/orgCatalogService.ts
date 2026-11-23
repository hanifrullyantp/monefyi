import { mergeOrgSettingsJson, loadOrgDetails } from './orgService';
import {
  DEFAULT_PROJECT_TYPES,
  mergeProjectTypeOptions,
  slugifyProjectType,
  type ProjectTypeOption,
} from '../lib/projectTypes';

export async function loadProjectTypeOptions(
  orgId: string,
  currentValue?: string,
): Promise<ProjectTypeOption[]> {
  const org = await loadOrgDetails(orgId);
  const custom = (org.settings?.custom_project_types as ProjectTypeOption[] | undefined) || [];
  return mergeProjectTypeOptions(custom, currentValue);
}

export async function createProjectType(
  orgId: string,
  label: string,
): Promise<ProjectTypeOption> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Nama kategori wajib diisi');

  const existing = await loadProjectTypeOptions(orgId);
  const byLabel = existing.find(o => o.label.toLowerCase() === trimmed.toLowerCase());
  if (byLabel) return byLabel;

  let value = slugifyProjectType(trimmed);
  if (DEFAULT_PROJECT_TYPES.some(t => t.value === value)) {
    value = `${value}_${Date.now().toString(36)}`;
  }
  if (existing.some(o => o.value === value)) {
    return existing.find(o => o.value === value)!;
  }

  const entry: ProjectTypeOption = { value, label: trimmed };
  const org = await loadOrgDetails(orgId);
  const custom = [...((org.settings?.custom_project_types as ProjectTypeOption[] | undefined) || []), entry];
  await mergeOrgSettingsJson(orgId, { custom_project_types: custom });
  return entry;
}
