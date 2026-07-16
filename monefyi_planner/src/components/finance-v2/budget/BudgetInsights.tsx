import type { BudgetInsight } from '../../../types/budgetUsaha';
import { resolveBudgetIcon } from './budgetIcons';

type Props = {
  insights: BudgetInsight[];
  onAction?: (insight: BudgetInsight) => void;
};

const STYLES = {
  warning: 'bg-amber-50 border-amber-100 text-amber-900',
  success: 'bg-emerald-50 border-emerald-100 text-emerald-900',
  tip: 'bg-blue-50 border-blue-100 text-blue-900',
};

const BTN_STYLES = {
  warning: 'bg-amber-600 hover:bg-amber-700',
  success: 'bg-emerald-600 hover:bg-emerald-700',
  tip: 'bg-blue-600 hover:bg-blue-700',
};

export default function BudgetInsights({ insights, onAction }: Props) {
  if (!insights.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {insights.map(insight => {
        const Icon = resolveBudgetIcon(insight.icon);
        return (
          <div
            key={insight.id}
            className={`rounded-2xl border p-4 ${STYLES[insight.type]}`}
          >
            <div className="flex gap-2 mb-2">
              <Icon className="w-5 h-5 shrink-0 opacity-80" />
              <p className="text-sm leading-snug">{insight.message}</p>
            </div>
            {insight.action && (
              <button
                type="button"
                onClick={() => onAction?.(insight)}
                className={`mt-2 text-xs font-bold text-white px-3 py-1.5 rounded-lg ${BTN_STYLES[insight.type]}`}
              >
                {insight.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
