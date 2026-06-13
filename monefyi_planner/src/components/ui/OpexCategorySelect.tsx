import { useEffect } from 'react';
import CreatableSelect from './CreatableSelect';
import { useOpexCategoryOptions } from '../../store/orgOptionsStore';

interface OpexCategorySelectProps {
  orgId: string;
  value: string;
  onChange: (categoryId: string, categoryName?: string) => void;
  className?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export default function OpexCategorySelect({
  orgId,
  value,
  onChange,
  className,
  disabled,
  allowEmpty,
  emptyLabel,
}: OpexCategorySelectProps) {
  const { options, ensureOpexOptions, addOpexOption } = useOpexCategoryOptions(orgId);

  useEffect(() => {
    if (!orgId) return;
    ensureOpexOptions(orgId).catch(() => {});
  }, [orgId, ensureOpexOptions]);

  const handleCreate = async (label: string) => addOpexOption(orgId, label);

  return (
    <CreatableSelect
      value={value}
      onChange={next => {
        const label = options.find(o => o.value === next)?.label;
        onChange(next, label);
      }}
      options={options}
      onCreateOption={orgId ? handleCreate : undefined}
      className={className}
      disabled={disabled || !orgId}
      allowEmpty={allowEmpty}
      emptyLabel={emptyLabel}
      createLabel="+ Tambah kategori opex..."
    />
  );
}
