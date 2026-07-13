import { ArrowDownCircle, ArrowUpCircle, ChevronRight } from 'lucide-react';
import { formatRupiah, formatDateId } from '../../utils/projectUi';

type Tx = {
  id: number;
  type: 'in' | 'out';
  name: string;
  amount: number;
  date: string;
  time?: string;
};

type Props = {
  transactions: Tx[];
  limit?: number;
  onViewAll?: () => void;
  onAdd?: () => void;
  title?: string;
};

export default function TransactionList({
  transactions, limit, onViewAll, onAdd, title = 'Riwayat Transaksi',
}: Props) {
  const list = limit ? transactions.slice(0, limit) : transactions;

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        <div className="flex gap-2">
          {onViewAll && (
            <button type="button" onClick={onViewAll} className="text-xs font-bold text-emerald-600">
              Lihat Semua
            </button>
          )}
          {onAdd && (
            <button type="button" onClick={onAdd} className="text-xs font-bold px-2 py-1 border rounded-lg text-slate-600">
              + Tambah
            </button>
          )}
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {list.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Belum ada transaksi.</p>
        ) : list.map(tx => (
          <div key={`${tx.type}-${tx.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              tx.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {tx.type === 'in' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{tx.name}</div>
              <div className="text-xs text-slate-500">
                {formatDateId(tx.date)}{tx.time ? ` • ${tx.time}` : ''}
              </div>
            </div>
            <div className={`text-sm font-bold shrink-0 ${tx.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {tx.type === 'in' ? '+' : '−'} {formatRupiah(tx.amount)}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
