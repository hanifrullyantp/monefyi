import { useEffect } from 'react';
import CreatableSelect from '../ui/CreatableSelect';
import { useProjectTypeOptions } from '../../store/orgOptionsStore';

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
  const { options, ensureProjectTypeOptions, addProjectTypeOption } = useProjectTypeOptions(orgId, value);

  useEffect(() => {
    if (!orgId) return;
    ensureProjectTypeOptions(orgId, value).catch(() => {});
  }, [orgId, value, ensureProjectTypeOptions]);

  const handleCreate = async (label: string) => addProjectTypeOption(orgId, label);

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
