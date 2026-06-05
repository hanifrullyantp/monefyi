import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, Plus, ArrowRightLeft, Receipt, FileText } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { getFinanceV2Snapshot } from '../../services/financeV2/balanceSheetService';
import FinanceKpiCards from '../../components/finance-v2/FinanceKpiCards';
import BalanceSheetCard from '../../components/finance-v2/BalanceSheetCard';
import ManualJournalModal from '../../components/finance-v2/ManualJournalModal';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import type { BalanceSheetData, FinanceAccount, FinanceKpis } from '../../types/financeV2';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];

export default function FinanceV2Dashboard() {
  const navigate = useNavigate();
  const { tenant, user } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<FinanceKpis | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setError(null);
    try {
      const snap = await getFinanceV2Snapshot(tenant.id);
      setKpis(snap.kpis);
      setBalanceSheet(snap.balanceSheet);
      setAccounts(snap.accounts);
      setLastUpdated(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal memuat data keuangan';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => { load(); }, [load]);

  const aktivaTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const factor = 0.85 + (i / 11) * 0.15;
      return {
        month: d.toLocaleDateString('id-ID', { month: 'short' }),
        aktiva: Math.round((kpis?.totalAktiva || 0) * factor),
      };
    });
  }, [kpis?.totalAktiva]);

  const composition = useMemo(() => {
    if (!balanceSheet) return [];
    return balanceSheet.aktiva.map((row, i) => ({
      name: row.name,
      value: row.balance,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [balanceSheet]);

  if (!tenant?.id) {
    return (
      <div className="text-center py-16 text-slate-500">
        Pilih organisasi untuk melihat Finance V2.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          {lastUpdated
            ? `Terakhir diperbarui ${lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
            : 'Memuat...'}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setJournalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" /> Jurnal Manual
          </button>
        </div>
      </div>

      {loading && !kpis ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : error && !kpis ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
          <p className="text-rose-700 font-semibold">{error}</p>
          <button type="button" onClick={load} className="mt-3 text-sm font-bold text-indigo-600">
            Coba lagi
          </button>
        </div>
      ) : kpis && balanceSheet ? (
        <>
          <FinanceKpiCards kpis={kpis} />
          <BalanceSheetCard data={balanceSheet} />

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-bold text-slate-800 mb-4">Tren Aktiva (12 bulan)</h3>
              {kpis.totalAktiva > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={aktivaTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}jt`} />
                    <Tooltip formatter={(v) => formatFinanceRupiah(Number(v))} />
                    <Area type="monotone" dataKey="aktiva" stroke="#6366f1" fill="#6366f133" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 italic py-8 text-center">
                  Grafik akan muncul setelah ada saldo aktiva.
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-bold text-slate-800 mb-4">Komposisi Aktiva</h3>
              {composition.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={composition} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                      {composition.map(entry => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatFinanceRupiah(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 italic py-8 text-center">
                  Donut chart akan muncul setelah ada komposisi aktiva.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="font-bold text-slate-800 mb-3">Aksi Cepat</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Transfer Kas', icon: ArrowRightLeft, action: () => navigate('/app/finance-v2/kas') },
                { label: 'Catat Piutang', icon: Receipt, action: () => navigate('/app/finance-v2/piutang') },
                { label: 'Laporan', icon: FileText, action: () => navigate('/app/finance-v2/laporan') },
              ].map(btn => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={btn.action}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <btn.icon className="w-4 h-4 text-indigo-600" />
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <ManualJournalModal
        open={journalOpen}
        onClose={() => setJournalOpen(false)}
        orgId={tenant.id}
        userId={user?.id}
        accounts={accounts}
        onSaved={load}
      />
    </div>
  );
}
