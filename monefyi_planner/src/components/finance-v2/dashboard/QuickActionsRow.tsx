import { useNavigate } from 'react-router-dom';
import { Plus, Minus, ArrowRightLeft, CheckCircle, Receipt } from 'lucide-react';

interface Props {
  onIncome?: () => void;
  onExpense?: () => void;
}

const actions = [
  { id: 'income', label: 'Pemasukan', icon: Plus, color: 'bg-emerald-600 hover:bg-emerald-700', onClickKey: 'income' as const },
  { id: 'expense', label: 'Pengeluaran', icon: Minus, color: 'bg-rose-600 hover:bg-rose-700', onClickKey: 'expense' as const },
  { id: 'transfer', label: 'Transfer Kas', icon: ArrowRightLeft, color: 'bg-blue-600 hover:bg-blue-700', route: '/app/finance-v2/kas' },
  { id: 'pay', label: 'Bayar Hutang', icon: CheckCircle, color: 'bg-orange-600 hover:bg-orange-700', route: '/app/finance-v2/hutang' },
  { id: 'bill', label: 'Tagih Piutang', icon: Receipt, color: 'bg-violet-600 hover:bg-violet-700', route: '/app/finance-v2/piutang' },
];

export default function QuickActionsRow({ onIncome, onExpense }: Props) {
  const navigate = useNavigate();

  const handle = (action: typeof actions[number]) => {
    if (action.onClickKey === 'income') onIncome?.();
    else if (action.onClickKey === 'expense') onExpense?.();
    else if (action.route) navigate(action.route);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {actions.map(action => (
        <button
          key={action.id}
          type="button"
          onClick={() => handle(action)}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold shadow-sm ${action.color}`}
        >
          <action.icon className="w-4 h-4" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
