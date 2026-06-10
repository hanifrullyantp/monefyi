import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, FileDown, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../../store/appStore';
import { showToast } from '../../../store/uiStore';
import { getFinanceV2Snapshot } from '../../../services/financeV2/balanceSheetService';
import { loadJournalEntries } from '../../../services/financeV2/journalService';
import { loadPayables } from '../../../services/financeV2/payableService';
import { buildFinanceReportBundle } from '../../../lib/financeV2/reports';
import { downloadFinanceReportPdf } from '../../../lib/financeV2/reports/exportPdf';
import ManualJournalModal from '../ManualJournalModal';
import type { FinanceAccount, FinanceKpis, JournalEntry } from '../../../types/financeV2';
import NeracaTable from './neraca/NeracaTable';
import BalanceProofBar from './BalanceProofBar';
import KPIRow from './KPIRow';
import QuickActionsRow from './QuickActionsRow';
import FinanceChartsRow from './FinanceChartsRow';
import RecentTransactions from './RecentTransactions';
import {
  computeNeracaTotals,
  kasBebasFromAccounts,
  mapAccountsToNeracaData,
} from './mapSnapshotToNeraca';
import type { NeracaData } from './types';

const CACHE_KEY = 'finance_v2_dashboard_cache';

interface CachePayload {
  accounts: FinanceAccount[];
  kpis: FinanceKpis;
  entries: JournalEntry[];
  totalHutangOpen: number;
  savedAt: string;
}

function loadCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) as CachePayload : null;
  } catch {
    return null;
  }
}

function saveCache(payload: CachePayload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function FinanceV2DashboardView() {
  const { tenant, user } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [kpis, setKpis] = useState<FinanceKpis | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [totalHutangOpen, setTotalHutangOpen] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [staleBanner, setStaleBanner] = useState(false);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setError(null);
    setStaleBanner(false);
    try {
      const [snap, journalRows, payables] = await Promise.all([
        getFinanceV2Snapshot(tenant.id),
        loadJournalEntries(tenant.id, 30),
        loadPayables(tenant.id),
      ]);
      const hutangOpen = payables.reduce((s, p) => s + (p.amount - p.paid_amount), 0);
      setAccounts(snap.accounts);
      setKpis(snap.kpis);
      setEntries(journalRows);
      setTotalHutangOpen(Math.round(hutangOpen * 100) / 100);
      setLastUpdated(new Date());
      saveCache({
        accounts: snap.accounts,
        kpis: snap.kpis,
        entries: journalRows,
        totalHutangOpen: hutangOpen,
        savedAt: new Date().toISOString(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal memuat data keuangan';
      setError(msg);
      const cache = loadCache();
      if (cache) {
        setAccounts(cache.accounts);
        setKpis(cache.kpis);
        setEntries(cache.entries);
        setTotalHutangOpen(cache.totalHutangOpen);
        setLastUpdated(new Date(cache.savedAt));
        setStaleBanner(true);
      }
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => { load(); }, [load]);

  const neraca: NeracaData = useMemo(() => mapAccountsToNeracaData(accounts, {
    isLoading: loading && !kpis,
    error: error && !kpis ? error : undefined,
    lastUpdated: lastUpdated ?? undefined,
  }), [accounts, loading, kpis, error, lastUpdated]);

  const totals = useMemo(() => computeNeracaTotals(neraca), [neraca]);
  const kasBebas = useMemo(() => kasBebasFromAccounts(accounts), [accounts]);

  const syncLabel = useMemo(() => {
    if (!lastUpdated) return 'Memuat...';
    const mins = Math.max(1, Math.floor((Date.now() - lastUpdated.getTime()) / 60000));
    return `Tersinkron ${mins} mnt lalu`;
  }, [lastUpdated]);

  const arusKasNet = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const key = cutoff.toISOString().slice(0, 10);
    return entries
      .filter(e => e.entry_date >= key && e.reference_type !== 'transfer')
      .reduce((s, e) => {
        if (e.reference_type === 'project_income') return s + e.total_amount;
        return s - e.total_amount;
      }, 0);
  }, [entries]);

  const handleExport = async () => {
    if (!tenant?.id) return;
    setExporting(true);
    try {
      const bundle = await buildFinanceReportBundle({
        orgId: tenant.id,
        dateFrom: monthStart(),
        dateTo: today(),
      });
      await downloadFinanceReportPdf(bundle, 'neraca', tenant.name);
      showToast('PDF neraca diunduh', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal export PDF', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (!tenant?.id) {
    return (
      <div className="text-center py-16 text-slate-500">
        Pilih organisasi untuk melihat Finance V2.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            Neraca Keuangan Bisnis
          </h1>
          <p className="text-sm text-slate-500 italic mt-1">
            Gambaran lengkap aset dan sumber modal bisnis Anda
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {syncLabel}
          </span>
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
            onClick={handleExport}
            disabled={exporting}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {staleBanner && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>⚠️ Gagal memuat data terbaru. Menampilkan data terakhir.</span>
          <button type="button" onClick={load} className="font-bold text-emerald-600">Coba Lagi</button>
        </div>
      )}

      <KPIRow
        kasBebas={kasBebas}
        labaBersih={kpis?.labaPeriode ?? 0}
        totalHutang={totalHutangOpen}
        arusKasNet={arusKasNet}
        loading={loading && !kpis}
      />

      <NeracaTable
        data={neraca}
        onQuickActionKas={() => setJournalOpen(true)}
      />

      <BalanceProofBar
        totalAktiva={totals.totalAktiva}
        totalPasiva={totals.totalPasiva}
        totalKewajiban={totals.totalKewajiban}
        totalModal={totals.totalModal}
        isBalanced={totals.isBalanced}
      />

      <QuickActionsRow
        onIncome={() => setJournalOpen(true)}
        onExpense={() => setJournalOpen(true)}
      />

      <FinanceChartsRow neraca={neraca} entries={entries} loading={loading && !kpis} />

      <RecentTransactions entries={entries} loading={loading && entries.length === 0} />

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
