import { useCallback, useEffect, useState } from 'react';
import CreatableSelect, { type SelectOption } from '../ui/CreatableSelect';
import { createProjectType, loadProjectTypeOptions } from '../../services/orgCatalogService';

interface ProjectTypeSelectProps {
  orgId: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function ProjectTypeSelect({
  orgId,
  value,
  onChange,
  className = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm',
  disabled,
}: ProjectTypeSelectProps) {
  const [options, setOptions] = useState<SelectOption[]>([]);

  const reload = useCallback(async () => {
    if (!orgId) return;
    const types = await loadProjectTypeOptions(orgId, value);
    setOptions(types);
  }, [orgId, value]);

  useEffect(() => {
    reload().catch(() => setOptions([]));
  }, [reload]);

  const handleCreate = async (label: string) => {
    const entry = await createProjectType(orgId, label);
    setOptions(prev => (prev.some(o => o.value === entry.value) ? prev : [...prev, entry]));
    return entry;
  };

  return (
    <CreatableSelect
      value={value}
      onChange={onChange}
      options={options}
      onCreateOption={orgId ? handleCreate : undefined}
      className={className}
      disabled={disabled || !orgId}
      createLabel="+ Tambah kategori proyek..."
    />
  );
}
