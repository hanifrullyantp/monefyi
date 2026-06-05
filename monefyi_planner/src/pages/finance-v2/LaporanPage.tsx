import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, FileDown, FileSpreadsheet } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import { formatDateId } from '../../lib/estimatorFormat';
import { loadAccounts } from '../../services/financeV2/accountService';
import { loadOpexCategories } from '../../services/financeV2/opexService';
import {
  buildFinanceReportBundle,
  type FinanceReportBundle,
  type ReportKind,
} from '../../lib/financeV2/reports';
import { downloadFinanceReportPdf } from '../../lib/financeV2/reports/exportPdf';
import { downloadFinanceReportXlsx } from '../../lib/financeV2/reports/exportXlsx';
import type { FinanceAccount } from '../../types/financeV2';

const REPORT_TABS: { id: ReportKind; label: string }[] = [
  { id: 'pl', label: 'Laba Rugi' },
  { id: 'neraca', label: 'Neraca' },
  { id: 'cashflow', label: 'Arus Kas' },
  { id: 'project', label: 'Per Proyek' },
  { id: 'investor', label: 'Investor' },
];

function monthStartISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LaporanPage() {
  const { tenant, projects } = useAppStore();
  const [tab, setTab] = useState<ReportKind>('pl');
  const [dateFrom, setDateFrom] = useState(monthStartISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [projectId, setProjectId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [bundle, setBundle] = useState<FinanceReportBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!tenant?.id) return;
    loadAccounts(tenant.id).then(setAccounts).catch(() => {});
    loadOpexCategories(tenant.id).then(setCategories).catch(() => {});
  }, [tenant?.id]);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const data = await buildFinanceReportBundle({
        orgId: tenant.id,
        dateFrom,
        dateTo,
        projectId: projectId || undefined,
        accountId: accountId || undefined,
        categoryId: categoryId || undefined,
      });
      setBundle(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat laporan', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, dateFrom, dateTo, projectId, accountId, categoryId]);

  useEffect(() => { load(); }, [load]);

  const handleExportPdf = async () => {
    if (!bundle || !tenant) return;
    setExporting(true);
    try {
      await downloadFinanceReportPdf(bundle, tab, tenant.name);
      showToast('PDF diunduh', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal export PDF', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportXlsx = () => {
    if (!bundle) return;
    try {
      downloadFinanceReportXlsx(bundle, tab);
      showToast('Excel diunduh', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal export Excel', 'error');
    }
  };

  const periodLabel = useMemo(
    () => `${formatDateId(dateFrom)} – ${formatDateId(dateTo)}`,
    [dateFrom, dateTo],
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Dari</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Sampai</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Proyek</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm">
              <option value="">Semua</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Akun</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm">
              <option value="">Semua</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Kategori Opex</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm">
              <option value="">Semua</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={handleExportPdf} disabled={!bundle || exporting} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold disabled:opacity-50">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} PDF
          </button>
          <button type="button" onClick={handleExportXlsx} disabled={!bundle} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {REPORT_TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === t.id ? 'bg-indigo-100 text-indigo-700' : 'bg-white border text-slate-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400">{periodLabel}</p>

      {loading && !bundle ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : bundle ? (
        <ReportContent tab={tab} bundle={bundle} />
      ) : null}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-2 border-b border-slate-50 ${bold ? 'font-black text-slate-900' : 'text-slate-700'}`}>
      <span>{label}</span>
      <span>{formatFinanceRupiah(value)}</span>
    </div>
  );
}

function ReportContent({ tab, bundle }: { tab: ReportKind; bundle: FinanceReportBundle }) {
  const pl = bundle.profitLoss;
  const bs = bundle.balanceSheet;
  const cf = bundle.cashFlow;

  if (tab === 'pl') {
    return (
      <div className="bg-white rounded-2xl border p-5 space-y-1">
        <h3 className="font-black text-lg mb-3">Laba Rugi</h3>
        <Row label="Pendapatan" value={pl.revenue} bold />
        {pl.revenueByProject.map(r => <Row key={r.projectId || 'umum'} label={`  Omzet: ${r.projectName}`} value={r.amount} />)}
        <Row label="HPP" value={pl.hpp} />
        {pl.hppBreakdown.map(r => <Row key={r.label} label={`  ${r.label}`} value={r.amount} />)}
        <Row label="Laba Kotor" value={pl.grossProfit} bold />
        <Row label="Beban Operasional" value={pl.opex} />
        {pl.opexBreakdown.map(r => <Row key={r.categoryId} label={`  ${r.categoryName}`} value={r.amount} />)}
        <Row label="Beban Lainnya" value={pl.otherExpense} />
        <Row label="Laba Bersih" value={pl.netProfit} bold />
      </div>
    );
  }

  if (tab === 'neraca') {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-bold text-indigo-700 mb-3">Aktiva</h3>
          {bs.aktiva.map(r => <Row key={r.name} label={r.name} value={r.balance} />)}
          <Row label="Total Aktiva" value={bs.totalAktiva} bold />
        </div>
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-bold text-violet-700 mb-3">Pasiva & Ekuitas</h3>
          {bs.pasiva.map(r => <Row key={r.name} label={r.name} value={r.balance} />)}
          <Row label="Total Pasiva" value={bs.totalPasiva} bold />
          <span className={`inline-block mt-2 text-xs font-bold px-2 py-1 rounded-full ${bs.isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {bs.isBalanced ? 'Seimbang' : 'Tidak seimbang'}
          </span>
        </div>
      </div>
    );
  }

  if (tab === 'cashflow') {
    return (
      <div className="bg-white rounded-2xl border p-5 space-y-1">
        <h3 className="font-black text-lg mb-3">Arus Kas</h3>
        <Row label="Saldo Awal" value={cf.openingBalance} />
        <Row label="Penerimaan" value={cf.inflows} />
        <Row label="Pengeluaran" value={cf.outflows} />
        <Row label="Perubahan Bersih" value={cf.netChange} bold />
        <Row label="Saldo Akhir" value={cf.closingBalance} bold />
        {cf.byAccount.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <h4 className="text-sm font-bold text-slate-600 mb-2">Per Akun Kas</h4>
            {cf.byAccount.map(a => <Row key={a.name} label={a.name} value={a.net} />)}
          </div>
        )}
      </div>
    );
  }

  if (tab === 'project') {
    return (
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">Proyek</th>
              <th className="text-right p-3">Pendapatan</th>
              <th className="text-right p-3">Biaya</th>
              <th className="text-right p-3">Net</th>
            </tr>
          </thead>
          <tbody>
            {bundle.projects.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">Tidak ada data proyek pada periode ini.</td></tr>
            ) : bundle.projects.map(r => (
              <tr key={r.projectId} className="border-t border-slate-50">
                <td className="p-3 font-semibold">{r.projectName}</td>
                <td className="p-3 text-right text-emerald-700">{formatFinanceRupiah(r.revenue)}</td>
                <td className="p-3 text-right text-rose-600">{formatFinanceRupiah(r.expense)}</td>
                <td className="p-3 text-right font-bold">{formatFinanceRupiah(r.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="text-left p-3">Investor</th>
            <th className="text-right p-3">Investasi</th>
            <th className="text-right p-3">Tarik</th>
            <th className="text-right p-3">Dividen</th>
            <th className="text-right p-3 hidden sm:table-cell">Saran</th>
          </tr>
        </thead>
        <tbody>
          {bundle.investors.length === 0 ? (
            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Tidak ada data investor.</td></tr>
          ) : bundle.investors.map(r => (
            <tr key={r.investorId} className="border-t border-slate-50">
              <td className="p-3">
                <div className="font-semibold">{r.investorName}</div>
                {r.sharePct != null && <div className="text-xs text-slate-400">{r.sharePct}%</div>}
              </td>
              <td className="p-3 text-right">{formatFinanceRupiah(r.invested)}</td>
              <td className="p-3 text-right">{formatFinanceRupiah(r.withdrawn)}</td>
              <td className="p-3 text-right">{formatFinanceRupiah(r.dividends)}</td>
              <td className="p-3 text-right hidden sm:table-cell font-bold text-emerald-700">{formatFinanceRupiah(r.suggestedDividend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
