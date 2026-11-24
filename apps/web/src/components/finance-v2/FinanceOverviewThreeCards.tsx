import { Wallet, FolderKanban, TrendingUp } from 'lucide-react';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import type { FinanceOverviewThreeCardsData } from '../../lib/financeV2/overviewCards';

interface Props {
  data: FinanceOverviewThreeCardsData;
  onOpenKas?: () => void;
  onOpenLaporan?: () => void;
}

export default function FinanceOverviewThreeCards({ data, onOpenKas, onOpenLaporan }: Props) {
  const { card1CashDebt: c1, card2Projects: c2, card3BusinessMonth: c3 } = data;

  return (
    <section aria-label="Ringkasan Keuangan 3 Kartu" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Kartu 1: Uang & Hutang-Piutang */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Wallet className="w-4 h-4 text-blue-600" />
            1. Uang &amp; Hutang-Piutang
          </div>
          {onOpenKas && (
            <button type="button" onClick={onOpenKas} className="text-xs font-semibold text-blue-600 hover:underline">
              Detail
            </button>
          )}
        </div>
        <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
          <span className="text-xs text-slate-500">Total Kas &amp; Bank</span>
          <span className="text-base font-black text-slate-900 tabular-nums">
            {formatFinanceRupiah(c1.totalCash)}
          </span>
        </div>
        {c1.wallets.length > 0 && (
          <div className="space-y-1">
            {c1.wallets.slice(0, 4).map((w) => (
              <div key={w.accountId} className="flex justify-between text-xs text-slate-600">
                <span className="truncate">{w.name}</span>
                <span className="tabular-nums font-semibold">{formatFinanceRupiah(w.balance)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <div className="text-slate-500">Piutang ({formatFinanceRupiah(c1.overdueReceivable)} JT)</div>
            <div className="font-bold text-emerald-700 tabular-nums">{formatFinanceRupiah(c1.totalReceivable)}</div>
            {c1.retentionReceivable > 0 && (
              <div className="text-[11px] text-slate-500">Retensi: {formatFinanceRupiah(c1.retentionReceivable)}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-slate-500">Hutang ({formatFinanceRupiah(c1.overduePayable)} JT)</div>
            <div className="font-bold text-rose-600 tabular-nums">{formatFinanceRupiah(c1.totalPayable)}</div>
            <div className="text-[11px] text-slate-500">Bersih: {formatFinanceRupiah(c1.netPosition)}</div>
          </div>
        </div>
      </div>

      {/* Kartu 2: Untung/Rugi per Proyek */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
          <FolderKanban className="w-4 h-4 text-emerald-600" />
          2. Untung/Rugi per Proyek
        </div>
        {c2.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Belum ada transaksi proyek pada buku besar.</p>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {c2.slice(0, 5).map((p) => (
              <div key={p.projectId} className="border border-slate-100 rounded-xl p-2.5 text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span className="truncate pr-2">{p.projectName}</span>
                  <span className={p.profit >= 0 ? 'text-emerald-700 tabular-nums' : 'text-rose-600 tabular-nums'}>
                    {formatFinanceRupiah(p.profit)} ({p.marginPct}%)
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Omzet {formatFinanceRupiah(p.revenue)}</span>
                  <span>HPP {formatFinanceRupiah(p.hpp)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>RAP vs Realisasi</span>
                  <span className="tabular-nums">
                    {formatFinanceRupiah(p.rapActual)} / {formatFinanceRupiah(p.rapPlanned)} ({p.rapUsagePct}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kartu 3: Bisnis Bulan Ini */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <TrendingUp className="w-4 h-4 text-violet-600" />
            3. Bisnis Bulan Ini ({c3.monthLabel})
          </div>
          {onOpenLaporan && (
            <button type="button" onClick={onOpenLaporan} className="text-xs font-semibold text-violet-600 hover:underline">
              Laporan
            </button>
          )}
        </div>
        <div className="space-y-1.5 text-xs pt-1">
          <div className="flex justify-between">
            <span className="text-slate-600">Profit Kotor Proyek</span>
            <span className="font-bold text-slate-900 tabular-nums">{formatFinanceRupiah(c3.grossProfit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Biaya Usaha Aktual</span>
            <span className="font-semibold text-rose-600 tabular-nums">- {formatFinanceRupiah(c3.opexActual)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Plan Opex Bulanan</span>
            <span className="tabular-nums">
              {formatFinanceRupiah(c3.opexPlanned)} (sisa {formatFinanceRupiah(c3.opexVariance)})
            </span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-800">Profit Bersih</span>
            <span className={`text-base font-black tabular-nums ${c3.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatFinanceRupiah(c3.netProfit)} ({c3.netMarginPct}%)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

