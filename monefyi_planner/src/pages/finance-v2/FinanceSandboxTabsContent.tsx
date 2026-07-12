import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { loadPayables } from '../../services/financeV2/payableService';
import { loadReceivables } from '../../services/financeV2/receivableService';
import { loadJournalEntries } from '../../services/financeV2/journalService';
import { getFinanceV2Snapshot } from '../../services/financeV2/balanceSheetService';
import { formatRupiah } from '../../utils/projectUi';
import type { FinanceAccount, FinanceKpis, JournalEntry } from '../../types/financeV2';

type Props = {
  mode: 'combined';
};

export default function FinanceHutangPiutangTab(_props: Props) {
  const { tenant } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [payables, setPayables] = useState<Awaited<ReturnType<typeof loadPayables>>>([]);
  const [receivables, setReceivables] = useState<Awaited<ReturnType<typeof loadReceivables>>>([]);

  const reload = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        loadPayables(tenant.id),
        loadReceivables(tenant.id),
      ]);
      setPayables(p);
      setReceivables(r);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => { void reload(); }, [reload]);

  const totalHutang = payables.reduce((s, p) => s + (p.amount - p.paid_amount), 0);
  const totalPiutang = receivables.reduce((s, r) => s + (r.amount - r.paid_amount), 0);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section>
        <h3 className="text-sm font-bold text-rose-600 mb-3">Hutang — {formatRupiah(totalHutang)}</h3>
        <div className="space-y-2">
          {payables.filter(p => p.amount > p.paid_amount).map(p => (
            <div key={p.id} className="flex items-center gap-3 bg-white border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 font-bold text-xs">H</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{p.vendor_name || p.description || 'Vendor'}</div>
                <div className="text-xs text-slate-500">Jatuh tempo: {p.due_date || '—'}</div>
              </div>
              <div className="font-bold text-rose-600 text-sm">{formatRupiah(p.amount - p.paid_amount)}</div>
            </div>
          ))}
          {!payables.length && <p className="text-sm text-slate-500">Tidak ada hutang terbuka.</p>}
        </div>
      </section>
      <section>
        <h3 className="text-sm font-bold text-emerald-600 mb-3">Piutang — {formatRupiah(totalPiutang)}</h3>
        <div className="space-y-2">
          {receivables.filter(r => r.amount > r.paid_amount).map(r => (
            <div key={r.id} className="flex items-center gap-3 bg-white border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs">P</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{r.client_name || r.description || 'Klien'}</div>
                <div className="text-xs text-slate-500">Jatuh tempo: {r.due_date || '—'}</div>
              </div>
              <div className="font-bold text-emerald-600 text-sm">{formatRupiah(r.amount - r.paid_amount)}</div>
            </div>
          ))}
          {!receivables.length && <p className="text-sm text-slate-500">Tidak ada piutang terbuka.</p>}
        </div>
      </section>
    </div>
  );
}

export function FinanceLabaRugiTab() {
  const { tenant, projects } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [kpis, setKpis] = useState<FinanceKpis | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    if (!tenant?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [snap, journalRows] = await Promise.all([
          getFinanceV2Snapshot(tenant.id),
          loadJournalEntries(tenant.id, 90),
        ]);
        if (!cancelled) {
          setAccounts(snap.accounts);
          setKpis(snap.kpis);
          setEntries(journalRows);
        }
      } catch (e) {
        if (!cancelled) showToast(e instanceof Error ? e.message : 'Gagal memuat laba rugi', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant?.id]);

  const totals = useMemo(() => {
    const totalRevenue = projects.reduce((s, p) => s + p.total_budget_planned, 0);
    const totalCost = projects.reduce((s, p) => s + p.spent_amount, 0);
    const opex = kpis?.monthly_opex ?? entries
      .filter(e => e.type === 'expense' && !e.project_id)
      .reduce((s, e) => s + Math.abs(e.amount), 0);
    const gross = totalRevenue - totalCost;
    const net = gross - opex;
    return { totalRevenue, totalCost, opex, gross, net };
  }, [projects, kpis, entries]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden max-w-xl">
      <div className="px-5 py-4 border-b font-bold flex items-center justify-between">
        <span>Laba Rugi Konsolidasi</span>
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">Bulan berjalan</span>
      </div>
      <div className="p-5 space-y-0 text-sm">
        <Row label="Pendapatan (nilai kontrak proyek)" value={formatRupiah(totals.totalRevenue)} valueClass="text-emerald-600" />
        <Row label="HPP (Biaya Proyek)" value={`− ${formatRupiah(totals.totalCost)}`} valueClass="text-rose-600" />
        <Row label="Laba Kotor" value={formatRupiah(totals.gross)} bold border />
        <Row label="Beban Operasional" value={`− ${formatRupiah(totals.opex)}`} valueClass="text-rose-600" />
        <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-slate-800 bg-emerald-50 -mx-5 px-5 py-4 rounded-b-2xl">
          <span className="font-black text-base">LABA BERSIH</span>
          <span className="font-black text-base text-emerald-700">{formatRupiah(totals.net)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({
  label, value, valueClass = '', bold, border,
}: {
  label: string;
  value: string;
  valueClass?: string;
  bold?: boolean;
  border?: boolean;
}) {
  return (
    <div className={`flex justify-between py-3 ${border ? 'border-b-2 border-slate-200 font-bold' : 'border-b border-slate-50'}`}>
      <span className={bold ? 'font-bold text-slate-800' : 'text-slate-600'}>{label}</span>
      <span className={`font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}
