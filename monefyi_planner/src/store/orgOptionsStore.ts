import { create } from 'zustand';
import type { SelectOption } from '../components/ui/CreatableSelect';
import { createOpexCategory, loadOpexCategories } from '../services/financeV2/opexService';
import { createProjectType, loadProjectTypeOptions } from '../services/orgCatalogService';

function mergeOption(list: SelectOption[], opt: SelectOption): SelectOption[] {
  if (list.some(o => o.value === opt.value)) return list;
  return [...list, opt];
}

interface OrgOptionsState {
  opexOptions: Record<string, SelectOption[]>;
  opexLoaded: Record<string, boolean>;
  projectTypeOptions: Record<string, SelectOption[]>;
  projectTypeLoaded: Record<string, boolean>;

  ensureOpexOptions: (orgId: string) => Promise<SelectOption[]>;
  addOpexOption: (orgId: string, label: string) => Promise<SelectOption>;
  ensureProjectTypeOptions: (orgId: string, currentValue?: string) => Promise<SelectOption[]>;
  addProjectTypeOption: (orgId: string, label: string) => Promise<SelectOption>;
}

export const useOrgOptionsStore = create<OrgOptionsState>((set, get) => ({
  opexOptions: {},
  opexLoaded: {},
  projectTypeOptions: {},
  projectTypeLoaded: {},

  ensureOpexOptions: async (orgId: string) => {
    if (!orgId) return [];
    const { opexOptions, opexLoaded } = get();
    if (opexLoaded[orgId]) {
      return opexOptions[orgId] || [];
    }

    const cats = await loadOpexCategories(orgId);
    const options = cats.map(c => ({ value: c.id, label: c.name }));
    set(state => ({
      opexOptions: { ...state.opexOptions, [orgId]: options },
      opexLoaded: { ...state.opexLoaded, [orgId]: true },
    }));
    return options;
  },

  addOpexOption: async (orgId: string, label: string) => {
    const cat = await createOpexCategory(orgId, label);
    const opt = { value: cat.id, label: cat.name };
    set(state => ({
      opexOptions: {
        ...state.opexOptions,
        [orgId]: mergeOption(state.opexOptions[orgId] || [], opt),
      },
      opexLoaded: { ...state.opexLoaded, [orgId]: true },
    }));
    return opt;
  },

  ensureProjectTypeOptions: async (orgId: string, currentValue?: string) => {
    if (!orgId) return [];
    const { projectTypeOptions, projectTypeLoaded } = get();
    const cached = projectTypeOptions[orgId];
    if (projectTypeLoaded[orgId]) {
      if (!currentValue || cached?.some(o => o.value === currentValue)) {
        return cached || [];
      }
    }

    const options = await loadProjectTypeOptions(orgId, currentValue);
    set(state => ({
      projectTypeOptions: { ...state.projectTypeOptions, [orgId]: options },
      projectTypeLoaded: { ...state.projectTypeLoaded, [orgId]: true },
    }));
    return options;
  },

  addProjectTypeOption: async (orgId: string, label: string) => {
    const entry = await createProjectType(orgId, label);
    set(state => ({
      projectTypeOptions: {
        ...state.projectTypeOptions,
        [orgId]: mergeOption(state.projectTypeOptions[orgId] || [], entry),
      },
      projectTypeLoaded: { ...state.projectTypeLoaded, [orgId]: true },
    }));
    return entry;
  },
}));

export function useOpexCategoryOptions(orgId: string) {
  const options = useOrgOptionsStore(s => s.opexOptions[orgId] || []);
  const ensureOpexOptions = useOrgOptionsStore(s => s.ensureOpexOptions);
  const addOpexOption = useOrgOptionsStore(s => s.addOpexOption);
  return { options, ensureOpexOptions, addOpexOption };
}

export function useProjectTypeOptions(orgId: string, currentValue?: string) {
  const options = useOrgOptionsStore(s => s.projectTypeOptions[orgId] || []);
  const ensureProjectTypeOptions = useOrgOptionsStore(s => s.ensureProjectTypeOptions);
  const addProjectTypeOption = useOrgOptionsStore(s => s.addProjectTypeOption);
  return { options, ensureProjectTypeOptions, addProjectTypeOption, currentValue };
}
