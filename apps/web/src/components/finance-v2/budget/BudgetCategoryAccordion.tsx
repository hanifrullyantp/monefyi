import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { BudgetCategory, BudgetExternalData } from '../../../types/budgetUsaha';
import { categorySubtotal } from '../../../lib/financeV2/budget/budgetCalculator';
import { formatRupiah } from '../../../utils/projectUi';
import { newBudgetId } from '../../../types/budgetUsaha';
import { resolveBudgetIcon } from './budgetIcons';
import BudgetItemRow from './BudgetItemRow';

type Props = {
  category: BudgetCategory;
  external: BudgetExternalData | null;
  defaultExpanded?: boolean;
  onChange: (category: BudgetCategory) => void;
  onDelete: () => void;
};

export default function BudgetCategoryAccordion({
  category,
  external,
  defaultExpanded = false,
  onChange,
  onDelete,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = resolveBudgetIcon(category.icon);
  const subtotal = categorySubtotal(category);

  const updateItem = (itemId: string, patch: Partial<BudgetCategory['items'][0]>) => {
    onChange({
      ...category,
      items: category.items.map(it => (it.id === itemId ? { ...it, ...patch } : it)),
    });
  };

  const addItem = () => {
    onChange({
      ...category,
      items: [
        ...category.items,
        {
          id: newBudgetId(),
          name: 'Pos baru',
          icon: 'circle',
          amount: 0,
          frequency: 'monthly',
          isAutoLinked: false,
        },
      ],
    });
    setExpanded(true);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 transition-colors text-left"
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${category.color}20`, color: category.color }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-800">{category.name}</div>
          <div className="text-xs text-slate-400">{category.items.length} pos</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-slate-900">{formatRupiah(subtotal)}</div>
          <div className="text-[11px] text-slate-400">/bln</div>
        </div>
        <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50/50 text-left"
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${category.color}20`, color: category.color }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 font-bold text-sm text-slate-800 uppercase tracking-wide">
          {category.name}
        </div>
        <div className="font-bold text-slate-900">{formatRupiah(subtotal)}</div>
        <ChevronUp className="w-5 h-5 text-slate-400" />
      </button>
      <div className="px-4 pb-2">
        {category.items.map(item => (
          <BudgetItemRow
            key={item.id}
            item={item}
            external={external}
            onChange={patch => updateItem(item.id, patch)}
            onDelete={() =>
              onChange({ ...category, items: category.items.filter(it => it.id !== item.id) })
            }
          />
        ))}
        <button
          type="button"
          onClick={addItem}
          className="w-full mt-2 py-2.5 border border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" /> Tambah pos anggaran
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-rose-500 hover:underline mt-2 mb-2"
        >
          Hapus kategori
        </button>
      </div>
    </div>
  );
}
