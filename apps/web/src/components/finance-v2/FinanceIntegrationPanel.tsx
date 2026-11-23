import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Link2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { showToast } from '../../store/uiStore';
import {
  getFinanceIntegrationStatus,
  runFinanceJournalBackfill,
  type FinanceIntegrationStatus,
} from '../../services/financeV2/financeIntegrationService';

type Props = {
  orgId: string;
  userId?: string;
  compact?: boolean;
};

export default function FinanceIntegrationPanel({ orgId, userId, compact }: Props) {
  const [status, setStatus] = useState<FinanceIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      setStatus(await getFinanceIntegrationStatus(orgId));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat status integrasi', 'error');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  const handleBackfill = async () => {
    if (!orgId) return;
    if (!window.confirm('Sinkronkan transaksi proyek lama ke jurnal bisnis?')) return;
    setBackfilling(true);
    try {
      const result = await runFinanceJournalBackfill(orgId, userId);
      setStatus(result.status);
      showToast(
        `Backfill selesai: ${result.incomesPosted} pemasukan, ${result.costsPosted} biaya`,
        'success',
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal backfill', 'error');
    } finally {
      setBackfilling(false);
    }
  };

  if (loading && !status) {
    return (
      <div className={`flex justify-center ${compact ? 'py-4' : 'py-8'}`}>
        <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!status) return null;

  const ok = !status.needsBackfill;

  return (
    <div className={`rounded-2xl border ${ok ? 'border-emerald-100 bg-emerald-50/50' : 'border-amber-100 bg-amber-50/50'} ${compact ? 'p-4' : 'p-5'} space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800">
              <Link2 className="w-4 h-4" />
              Integrasi Jurnal
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {ok
                ? 'Semua transaksi proyek sudah terhubung ke jurnal bisnis.'
                : `${status.totalUnsynced} transaksi belum tersinkron ke jurnal.`}
            </p>
          </div>
        </div>
        <button type="button" onClick={load} className="p-2 rounded-lg hover:bg-white/60">
          <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!ok && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white/70 rounded-xl py-2 px-1">
            <div className="font-black text-slate-800">{status.unsyncedIncomes}</div>
            <div className="text-slate-500">Pemasukan</div>
          </div>
          <div className="bg-white/70 rounded-xl py-2 px-1">
            <div className="font-black text-slate-800">{status.unsyncedCosts}</div>
            <div className="text-slate-500">Biaya</div>
          </div>
          <div className="bg-white/70 rounded-xl py-2 px-1">
            <div className="font-black text-slate-800">{status.unsyncedPayroll}</div>
            <div className="text-slate-500">Gaji paid</div>
          </div>
        </div>
      )}

      {status.unsyncedIncomes + status.unsyncedCosts > 0 && (
        <button
          type="button"
          onClick={handleBackfill}
          disabled={backfilling}
          className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Sinkronkan Jurnal Proyek
        </button>
      )}
    </div>
  );
}
