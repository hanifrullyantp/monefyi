import type { BudgetScenarioKey, BudgetScenarios } from '../../../types/budgetUsaha';
import { formatRupiah } from '../../../utils/projectUi';

const OPTIONS: { key: BudgetScenarioKey; label: string; hint: string }[] = [
  { key: 'conservative', label: 'Konservatif', hint: 'Revenue −20%' },
  { key: 'realistic', label: 'Realistis', hint: 'Revenue normal' },
  { key: 'aggressive', label: 'Agresif', hint: 'Revenue +30%' },
];

type Props = {
  scenarios: BudgetScenarios;
  onSelect: (key: BudgetScenarioKey) => void;
};

export default function BudgetScenarioSelector({ scenarios, onSelect }: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5">
      <div className="text-sm font-bold text-slate-700 mb-3">Coba Skenario:</div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map(opt => {
          const active = scenarios.active === opt.key;
          const data = scenarios[opt.key];
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onSelect(opt.key)}
              className={`flex-1 min-w-[100px] p-3 rounded-xl border text-left transition-colors ${
                active
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-bold text-slate-800">{opt.label}</div>
              <div className="text-[10px] text-slate-400">{opt.hint}</div>
              <div className="text-sm font-black text-slate-900 mt-1">
                {formatRupiah(data.netProfitMonthly)}/bln
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
