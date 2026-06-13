import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileDown, Loader2, Plus, RefreshCw, TrendingDown, TrendingUp,
  Wallet, Building2, BarChart3,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { formatRupiah } from '../../utils/projectUi';
import {
  buildBusinessFinanceReport,
  currentMonthRange,
  presetRange,
} from '../../services/financeV1/businessReportService';
import { loadOpexCategories, recordV1Opex } from '../../services/financeV1/opexService';
import OpexCategorySelect from '../ui/OpexCategorySelect';
import { downloadBusinessReportPdf } from '../../lib/financeV1/exportBusinessReportPdf';
import type { BusinessFinanceReport } from '../../types/financeV1Report';
import type { OpexCategory } from '../../types/financeV2';

type Preset = 'this_month' | 'last_month' | 'this_quarter' | 'this_year';

function ReportLine({
  label,
  amount,
  pct,
  bold,
  accent,
}: {
  label: string;
  amount: number;
  pct?: number;
  bold?: boolean;
  accent?: 'emerald' | 'rose' | 'amber';
}) {
  const color = accent === 'emerald' ? 'text-emerald-600'
    : accent === 'rose' ? 'text-rose-600'
      : accent === 'amber' ? 'text-amber-600'
        : 'text-slate-800';

  return (
    <div className={`flex items-center justify-between gap-4 py-2 ${bold ? 'font-bold' : ''}`}>
      <span className={`text-sm ${bold ? 'text-slate-900' : 'text-slate-600'}`}>
        {label}
        {pct !== undefined && pct > 0 && (
          <span className="text-xs text-slate-400 ml-1">({pct.toFixed(1)}%)</span>
        )}
      </span>
      <span className={`text-sm tabular-nums shrink-0 ${bold ? color : 'text-slate-800'}`}>
        {formatRupiah(amount)}
      </span>
    </div>
  );
}

export default function BusinessReportPanel() {
  const { tenant, projects, user } = useAppStore();
  const initial = currentMonthRange();

  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);
  const [projectId, setProjectId] = useState('');
  const [report, setReport] = useState<BusinessFinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [categories, setCategories] = useState<OpexCategory[]>([]);
  const [opexCatId, setOpexCatId] = useState('');
  const [opexAmount, setOpexAmount] = useState('');
  const [opexDate, setOpexDate] = useState(new Date().toISOString().slice(0, 10));
  const [opexNotes, setOpexNotes] = useState('');
  const [savingOpex, setSavingOpex] = useState(false);

  const canEdit = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'admin';

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [r, cats] = await Promise.all([
        buildBusinessFinanceReport(tenant.id, {
          dateFrom,
          dateTo,
          projectId: projectId || undefined,
        }),
        loadOpexCategories(tenant.id),
      ]);
      setReport(r);
      setCategories(cats);
      if (!opexCatId && cats.length) setOpexCatId(cats[0].id);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat laporan', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, dateFrom, dateTo, projectId]);

  useEffect(() => { load(); }, [load]);

  const applyPreset = (preset: Preset) => {
    const range = presetRange(preset);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
  };

  const handleExportPdf = async () => {
    if (!report || !tenant) return;
    setExporting(true);
    try {
      await downloadBusinessReportPdf(report, tenant.name);
      showToast('PDF laporan diunduh', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal export PDF', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveOpex = async () => {
    if (!tenant?.id || !opexCatId || !opexAmount) return;
    const amount = parseFloat(opexAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Nominal tidak valid', 'error');
      return;
    }
    setSavingOpex(true);
    try {
      await recordV1Opex({
        orgId: tenant.id,
        categoryId: opexCatId,
        amount,
        paidDate: opexDate,
        notes: opexNotes.trim() || undefined,
        createdBy: user?.id,
      });
      showToast('Biaya operasional dicatat', 'success');
      setOpexAmount('');
      setOpexNotes('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSavingOpex(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Laporan Keuangan Bisnis
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Omzet proyek, HPP realisasi, biaya operasional, dan laba bersih — realtime sesuai filter.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Proyek ditampilkan berdasarkan Bulan Laporan Keuangan (atur di edit proyek).
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={handleExportPdf}
            disabled={!report || exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Unduh PDF
          </button>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {([
            ['this_month', 'Bulan ini'],
            ['last_month', 'Bulan lalu'],
            ['this_quarter', 'Kuartal ini'],
            ['this_year', 'Tahun ini'],
          ] as [Preset, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500">Dari</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500">Sampai</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500">Proyek</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border text-sm bg-white"
            >
              <option value="">Semua proyek</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {loading && !report ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : report && (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: 'Omzet', value: report.revenue.total, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Laba Kotor', value: report.grossProfit, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: `${report.grossMarginPct.toFixed(1)}% margin` },
              { label: 'Laba Bersih', value: report.netProfit, icon: TrendingDown, color: report.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600', bg: report.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50', sub: `${report.netMarginPct.toFixed(1)}% margin` },
            ].map((k, i) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 border border-slate-100"
              >
                <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-2`}>
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                </div>
                <div className={`text-lg font-black ${k.color}`}>{formatRupiah(k.value)}</div>
                <div className="text-xs text-slate-500">{k.label}</div>
                {k.sub && <div className="text-[10px] text-slate-400 mt-0.5">{k.sub}</div>}
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 border-b bg-emerald-50/50">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Omzet (Pemasukan Proyek)
                </h3>
              </div>
              <div className="p-4">
                <ReportLine label="Total Omzet" amount={report.revenue.total} bold accent="emerald" />
                <div className="border-t border-slate-100 mt-2 pt-2 space-y-0.5">
                  {report.revenue.byProject.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">Belum ada pemasukan pada periode ini</p>
                  ) : (
                    report.revenue.byProject.map((p, i) => (
                      <ReportLine
                        key={p.projectId}
                        label={`${i + 1}. ${p.projectName}`}
                        amount={p.amount}
                        pct={p.pctOfTotal}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 border-b bg-rose-50/50">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  HPP (Realisasi Belanja)
                </h3>
              </div>
              <div className="p-4">
                <ReportLine label="Total HPP" amount={report.hpp.total} bold accent="rose" />
                <div className="border-t border-slate-100 mt-2 pt-2 space-y-0.5">
                  {report.hpp.byType.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">Belum ada realisasi biaya pada periode ini</p>
                  ) : (
                    report.hpp.byType.map((h, i) => (
                      <ReportLine
                        key={h.type}
                        label={`${i + 1}. ${h.label}`}
                        amount={h.amount}
                        pct={h.pctOfTotal}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b bg-amber-50/50 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600" />
                Biaya Operasional Bulanan
              </h3>
              <span className="text-xs text-slate-500">Sewa, listrik, gaji admin, habis pakai, dll.</span>
            </div>
            <div className="p-4">
              <ReportLine label="Total Operasional" amount={report.opex.total} bold accent="amber" />
              <div className="border-t border-slate-100 mt-2 pt-2 space-y-0.5">
                {report.opex.byCategory.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">Belum ada biaya operasional — catat di bawah</p>
                ) : (
                  report.opex.byCategory.map((o, i) => (
                    <ReportLine
                      key={o.categoryId}
                      label={`${i + 1}. ${o.categoryName}`}
                      amount={o.amount}
                      pct={o.pctOfTotal}
                    />
                  ))
                )}
              </div>

              {canEdit && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-bold text-slate-500">Catat Biaya Operasional</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {tenant?.id && (
                      <OpexCategorySelect
                        orgId={tenant.id}
                        value={opexCatId}
                        onChange={id => setOpexCatId(id)}
                        className="px-3 py-2 rounded-xl border text-sm bg-white"
                      />
                    )}
                    <input
                      type="number"
                      min="0"
                      placeholder="Nominal (Rp)"
                      value={opexAmount}
                      onChange={e => setOpexAmount(e.target.value)}
                      className="px-3 py-2 rounded-xl border text-sm"
                    />
                    <input
                      type="date"
                      value={opexDate}
                      onChange={e => setOpexDate(e.target.value)}
                      className="px-3 py-2 rounded-xl border text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleSaveOpex}
                      disabled={savingOpex}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 text-white text-sm font-bold disabled:opacity-50"
                    >
                      {savingOpex ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Simpan
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Keterangan (opsional)"
                    value={opexNotes}
                    onChange={e => setOpexNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-emerald-200 text-xs font-semibold uppercase tracking-wide">Ringkasan</div>
                <div className="text-2xl font-black mt-1">{formatRupiah(report.netProfit)}</div>
                <div className="text-sm text-emerald-100">Laba Bersih · margin {report.netMarginPct.toFixed(1)}%</div>
              </div>
              <div className="text-right text-sm text-emerald-100 space-y-1">
                <div>Omzet {formatRupiah(report.revenue.total)}</div>
                <div>− HPP {formatRupiah(report.hpp.total)}</div>
                <div>= Laba kotor {formatRupiah(report.grossProfit)}</div>
                <div>− Opex {formatRupiah(report.opex.total)}</div>
              </div>
            </div>
          </section>

          {report.byProjectProfit.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 border-b font-bold text-slate-800 text-sm">
                Laba Kotor per Proyek
              </div>
              <div className="divide-y divide-slate-50">
                {report.byProjectProfit.map(p => (
                  <div key={p.projectId} className="p-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div>
                      <div className="font-semibold text-slate-800">{p.projectName}</div>
                      <div className="text-xs text-slate-400">
                        Omzet {formatRupiah(p.revenue)} · HPP {formatRupiah(p.hpp)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${p.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatRupiah(p.grossProfit)}
                      </div>
                      <div className="text-xs text-slate-400">margin {p.marginPct.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
