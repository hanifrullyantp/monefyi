import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import type { BalanceSheetData } from '../../types/financeV2';

interface Props {
  data: BalanceSheetData;
}

function Column({
  title,
  rows,
  total,
  accent,
}: {
  title: string;
  rows: BalanceSheetData['aktiva'];
  total: number;
  accent: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex-1 min-w-0">
      <h3 className={`text-sm font-bold ${accent} mb-3`}>{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 italic">Belum ada saldo</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(row => (
            <li key={row.accountId}>
              <button
                type="button"
                onClick={() => row.route && navigate(row.route)}
                className={`w-full flex items-center justify-between gap-2 text-left text-sm ${
                  row.route ? 'hover:text-emerald-600 cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className="truncate text-slate-700">{row.name}</span>
                <span className="font-semibold text-slate-900 shrink-0">
                  {formatFinanceRupiah(row.balance)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between font-black text-slate-900">
        <span>Total</span>
        <span>{formatFinanceRupiah(total)}</span>
      </div>
    </div>
  );
}

export default function BalanceSheetCard({ data }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Neraca (Balance Sheet)</h2>
          <p className="text-sm text-slate-500">Aktiva harus sama dengan pasiva + ekuitas.</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            data.isBalanced
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {data.isBalanced ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5" />
          )}
          {data.isBalanced ? 'Seimbang' : `Selisih ${formatFinanceRupiah(Math.abs(data.variance))}`}
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <Column title="Aktiva" rows={data.aktiva} total={data.totalAktiva} accent="text-emerald-700" />
        <div className="hidden md:block w-px bg-slate-100" />
        <Column title="Pasiva & Ekuitas" rows={data.pasiva} total={data.totalPasiva} accent="text-emerald-700" />
      </div>
    </div>
  );
}
