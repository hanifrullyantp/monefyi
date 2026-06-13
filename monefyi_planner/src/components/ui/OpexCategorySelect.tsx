import { useCallback, useEffect, useState } from 'react';
import CreatableSelect, { type SelectOption } from './CreatableSelect';
import { createOpexCategory, loadOpexCategories } from '../../services/financeV2/opexService';

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
  const [options, setOptions] = useState<SelectOption[]>([]);

  const reload = useCallback(async () => {
    if (!orgId) return;
    const cats = await loadOpexCategories(orgId);
    setOptions(cats.map(c => ({ value: c.id, label: c.name })));
  }, [orgId]);

  useEffect(() => {
    reload().catch(() => setOptions([]));
  }, [reload]);

  const handleCreate = async (label: string) => {
    const cat = await createOpexCategory(orgId, label);
    const opt = { value: cat.id, label: cat.name };
    setOptions(prev => (prev.some(o => o.value === opt.value) ? prev : [...prev, opt]));
    return opt;
  };

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
