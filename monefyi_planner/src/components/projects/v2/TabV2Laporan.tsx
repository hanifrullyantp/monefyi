import { useState } from 'react';
import {
  FileDown, Sparkles, Eye, Share2, Copy,
} from 'lucide-react';
import type { Project } from '../../../store/appStore';
import type { RapItem } from '../../../services/rapService';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import { loadCostRealizations, aggregateCostByRapItem } from '../../../services/costService';
import { exportRapWorkbook } from '../../../services/rapExcelService';
import { showToast } from '../../../store/uiStore';
import { formatDateId, formatRupiah } from '../../../utils/projectUi';

type Props = {
  project: Project;
  normalized: NormalizedProjectView;
  rapItems: RapItem[];
};

type ReportKind =
  | 'Laporan Mingguan'
  | 'Laporan Keuangan'
  | 'Laporan Progress'
  | 'Laporan Klien (Ringkasan)';

export default function TabV2Laporan({ project, normalized, rapItems }: Props) {
  const [exporting, setExporting] = useState(false);
  const [reportType, setReportType] = useState<ReportKind>('Laporan Mingguan');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const p = normalized.project;

  const handleExport = async () => {
    setExporting(true);
    try {
      const costs = await loadCostRealizations(project.id);
      const actuals = await aggregateCostByRapItem(project.id);
      exportRapWorkbook(project, rapItems, costs, actuals);
      showToast(`${reportType} (Excel) diunduh`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal export', 'error');
    } finally {
      setExporting(false);
    }
  };

  const buildShareText = (): string => {
    const lines: string[] = [
      `*${reportType.toUpperCase()} — ${p.name}*`,
      `Klien: ${p.client || '-'}`,
      `Tanggal: ${formatDateId(reportDate)}`,
      '',
    ];

    if (reportType !== 'Laporan Keuangan') {
      lines.push(
        `*PROGRESS FISIK*`,
        `• Rencana Jadwal: ${p.progress.plan}%`,
        `• Realisasi Aktual: ${p.progress.actual}%`,
        `• Deviasi: ${p.progress.deviation >= 0 ? '+' : ''}${p.progress.deviation}%`,
        '',
      );
    }

    if (reportType === 'Laporan Klien (Ringkasan)') {
      lines.push(
        `*STATUS PEMBAYARAN KONTRAK*`,
        `• Nilai Kontrak: ${formatRupiah(p.contractValue)}`,
        `• Pembayaran Diterima: ${formatRupiah(normalized.totalPemasukan)}`,
        `• Sisa Tagihan / Kontrak: ${formatRupiah(p.budget.piutang)}`,
      );
    } else if (reportType !== 'Laporan Progress') {
      lines.push(
        `*RINGKASAN KEUANGAN INTERNAL*`,
        `• Nilai Kontrak: ${formatRupiah(p.contractValue)}`,
        `• Anggaran RAP: ${formatRupiah(p.rap.totalRAP)}`,
        `• Realisasi Biaya: ${formatRupiah(p.rap.realisasi)}`,
        `• Dana Masuk: ${formatRupiah(normalized.totalPemasukan)}`,
        `• Saldo Kas Proyek: ${formatRupiah(p.saldo)}`,
        `• Estimasi Laba: ${formatRupiah(p.rap.estLaba)}`,
      );
    }

    return lines.join('\n');
  };

  const handleShare = async () => {
    const text = buildShareText();
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: `${reportType} - ${p.name}`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      showToast('Ringkasan laporan disalin (siap tempel ke WhatsApp)', 'success');
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        showToast('Ringkasan laporan disalin ke clipboard', 'success');
      } catch {
        showToast('Gagal menyalin ringkasan', 'error');
      }
    }
  };

  const showProgressSection = reportType !== 'Laporan Keuangan';
  const showFinanceSection = reportType !== 'Laporan Progress';
  const isClientReport = reportType === 'Laporan Klien (Ringkasan)';

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 font-bold text-slate-800 px-5 py-4 border-b">
          <Sparkles className="w-5 h-5 text-emerald-600" /> Generate & Bagikan Laporan
        </div>
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Jenis Laporan</label>
              <select
                value={reportType}
                onChange={e => setReportType(e.target.value as ReportKind)}
                className="mt-1 w-full px-3 py-2 rounded-xl border text-sm bg-white"
              >
                <option value="Laporan Mingguan">Laporan Mingguan (Internal Lengkap)</option>
                <option value="Laporan Keuangan">Laporan Keuangan & RAP</option>
                <option value="Laporan Progress">Laporan Progress Fisik</option>
                <option value="Laporan Klien (Ringkasan)">Laporan Klien (Tanpa RAP/Margin Internal)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Tanggal Laporan</label>
              <input
                type="date"
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-emerald-700"
            >
              <FileDown className="w-4 h-4" />
              {exporting ? 'Mengunduh...' : 'Download Workbook Excel'}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="w-full py-3 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-100"
            >
              <Share2 className="w-4 h-4" />
              Salin / Bagikan ke WhatsApp
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Eye className="w-5 h-5 text-slate-500" /> Preview {reportType}
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="text-xs font-bold text-emerald-700 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100"
          >
            <Copy className="w-3.5 h-3.5" /> Salin Teks
          </button>
        </div>
        <div className="p-5 bg-slate-50 m-4 rounded-xl text-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">
              {reportType.toUpperCase()} — {p.name}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Per {formatDateId(reportDate)}
            </div>
          </div>

          {showProgressSection && (
            <div>
              <div className="text-xs font-bold text-slate-600 mb-2">PROGRESS FISIK</div>
              <div className="grid grid-cols-3 gap-2">
                <PreviewStat label="Rencana" value={`${p.progress.plan}%`} color="text-blue-600" />
                <PreviewStat label="Realisasi" value={`${p.progress.actual}%`} color="text-emerald-600" />
                <PreviewStat
                  label="Deviasi"
                  value={`${p.progress.deviation >= 0 ? '+' : ''}${p.progress.deviation}%`}
                  color={p.progress.deviation >= 0 ? 'text-emerald-600' : 'text-amber-600'}
                />
              </div>
            </div>
          )}

          {showFinanceSection && (
            <div>
              <div className="text-xs font-bold text-slate-600 mb-2">
                {isClientReport ? 'STATUS PEMBAYARAN KONTRAK' : 'KEUANGAN & ANGGARAN'}
              </div>
              {isClientReport ? (
                <div className="grid grid-cols-3 gap-2">
                  <PreviewStat label="Nilai Kontrak" value={formatRupiah(p.contractValue)} />
                  <PreviewStat label="Sudah Dibayar" value={formatRupiah(normalized.totalPemasukan)} color="text-emerald-600" />
                  <PreviewStat label="Sisa Tagihan" value={formatRupiah(p.budget.piutang)} color="text-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <PreviewStat label="Kontrak" value={formatRupiah(p.contractValue)} />
                  <PreviewStat label="Total RAP" value={formatRupiah(p.rap.totalRAP)} color="text-slate-700" />
                  <PreviewStat label="Realisasi Biaya" value={formatRupiah(p.rap.realisasi)} color="text-rose-600" />
                  <PreviewStat label="Dana Masuk" value={formatRupiah(normalized.totalPemasukan)} color="text-emerald-600" />
                  <PreviewStat
                    label="Saldo Kas Proyek"
                    value={formatRupiah(p.saldo)}
                    color={p.saldo < 0 ? 'text-rose-600' : 'text-slate-900'}
                  />
                  <PreviewStat label="Est. Laba" value={formatRupiah(p.rap.estLaba)} color="text-emerald-600" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value, color = 'text-slate-900' }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center p-2 bg-white rounded-lg">
      <div className={`text-base font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}
