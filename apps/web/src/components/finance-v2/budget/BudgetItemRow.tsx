import { Trash2 } from 'lucide-react';
import type { BudgetExternalData, BudgetFrequency, BudgetItem } from '../../../types/budgetUsaha';
import { effectiveItemAmount } from '../../../lib/financeV2/budget/budgetCalculator';
import { formatRupiah, parseMoneyInput } from '../../../utils/projectUi';
import { resolveBudgetIcon } from './budgetIcons';
import AutoLinkBadge from './AutoLinkBadge';

const FREQUENCIES: { value: BudgetFrequency; label: string }[] = [
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
  { value: 'one-time', label: 'Sekali' },
];

type Props = {
  item: BudgetItem;
  external: BudgetExternalData | null;
  readonlyAmount?: boolean;
  onChange: (patch: Partial<BudgetItem>) => void;
  onDelete: () => void;
};

export default function BudgetItemRow({
  item,
  external,
  readonlyAmount,
  onChange,
  onDelete,
}: Props) {
  const Icon = resolveBudgetIcon(item.icon);
  const displayAmount = effectiveItemAmount(item);
  const locked = item.isAutoLinked && item.manualOverride == null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-50 last:border-0">
      <div
        className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"
        style={{ color: '#64748B' }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <input
        value={item.name}
        onChange={e => onChange({ name: e.target.value })}
        className="flex-1 min-w-[120px] text-sm font-medium bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none py-1"
      />
      <input
        type="text"
        inputMode="numeric"
        value={
          locked
            ? formatRupiah(displayAmount)
            : String(item.manualOverride ?? item.amount ?? '')
        }
        readOnly={locked || readonlyAmount}
        onChange={e => {
          const n = parseMoneyInput(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(
            item.manualOverride != null || locked
              ? { manualOverride: n, amount: n }
              : { amount: n },
          );
        }}
        className={`w-28 text-sm text-right font-semibold rounded-lg px-2 py-1.5 border ${
          locked ? 'bg-slate-50 text-slate-600 border-slate-100' : 'border-slate-200 focus:border-blue-500'
        }`}
      />
      <select
        value={item.frequency}
        onChange={e => onChange({ frequency: e.target.value as BudgetFrequency })}
        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
      >
        {FREQUENCIES.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <AutoLinkBadge
          item={item}
          external={external}
          onOverride={amount =>
            onChange({
              manualOverride: amount,
              amount: amount ?? item.amount,
            })
          }
        />
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 ml-auto"
        aria-label="Hapus pos"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
