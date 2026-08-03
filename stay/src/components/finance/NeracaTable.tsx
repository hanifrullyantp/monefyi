import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { BalanceSheetData, BalanceSheetRow } from '../../types/finance';
import { CheckCircle2, XCircle, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  data: BalanceSheetData;
  onAccountClick?: (accountId: string, accountName: string) => void;
  compareMode?: boolean;
}

function AccountRow({
  row,
  onClick,
  indent = false,
}: {
  row: BalanceSheetRow;
  onClick?: (id: string, name: string) => void;
  indent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(row.accountId, row.name)}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/50 transition-colors text-left',
        indent && 'pl-6'
      )}
    >
      <span className="flex items-center gap-1 text-slate-700">
        {row.code && <span className="text-xs text-slate-400 font-mono">{row.code}</span>}
        <span className={indent ? 'font-normal' : 'font-semibold'}>{row.name}</span>
        {onClick && <ChevronRight className="h-3 w-3 text-slate-400" />}
      </span>
      <span className="flex items-center gap-2">
        {row.changePercent !== undefined && row.changePercent !== 0 && (
          <span className={cn('text-xs flex items-center gap-0.5', row.changePercent > 0 ? 'text-emerald-600' : 'text-rose-600')}>
            {row.changePercent > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(row.changePercent)}%
          </span>
        )}
        <span className="font-bold tabular-nums">{formatCurrency(row.balance)}</span>
      </span>
    </button>
  );
}

function Column({
  title,
  subtitle,
  rows,
  total,
  totalLabel,
  bgClass,
  headerClass,
  onAccountClick,
}: {
  title: string;
  subtitle: string;
  rows: BalanceSheetRow[];
  total: number;
  totalLabel: string;
  bgClass: string;
  headerClass: string;
  onAccountClick?: (id: string, name: string) => void;
}) {
  return (
    <div className={cn('rounded-2xl overflow-hidden border border-slate-200', bgClass)}>
      <div className={cn('px-4 py-3 text-center', headerClass)}>
        <h3 className="font-black text-sm uppercase tracking-wider">{title}</h3>
        <p className="text-xs opacity-80 italic">{subtitle}</p>
      </div>
      <div className="divide-y divide-black/5">
        {rows.map((group) => (
          <div key={group.accountId}>
            <AccountRow row={group} onClick={onAccountClick} />
            {group.children?.map((child) => (
              <AccountRow key={child.accountId} row={child} onClick={onAccountClick} indent />
            ))}
          </div>
        ))}
      </div>
      <div className={cn('px-4 py-3 flex justify-between font-black text-sm', headerClass)}>
        <span>{totalLabel}</span>
        <span className="tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

export default function NeracaTable({ data, onAccountClick }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        {data.isBalanced ? (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold">
            <CheckCircle2 className="h-4 w-4" /> SEIMBANG ✓
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 text-rose-800 text-sm font-bold">
            <XCircle className="h-4 w-4" /> TIDAK SEIMBANG ✗ — Selisih {formatCurrency(Math.abs(data.variance))}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Column
          title="AKTIVA (ASET)"
          subtitle="Semua yang dimiliki"
          rows={data.aktiva}
          total={data.totalAktiva}
          totalLabel="TOTAL AKTIVA"
          bgClass="bg-amber-50/80"
          headerClass="bg-amber-200 text-amber-950"
          onAccountClick={onAccountClick}
        />
        <Column
          title="PASIVA (KEWAJIBAN & MODAL)"
          subtitle="Sumber dana"
          rows={data.pasiva}
          total={data.totalPasiva}
          totalLabel="TOTAL PASIVA"
          bgClass="bg-red-50/80"
          headerClass="bg-red-300 text-red-950"
          onAccountClick={onAccountClick}
        />
      </div>
    </div>
  );
}
