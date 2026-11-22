import { useRef, useState } from 'react';
import {
  FileDown, Sparkles, Eye, Share2, Copy, X, Check, ExternalLink,
} from 'lucide-react';
import type { Project } from '../../../store/appStore';
import type { RapItem } from '../../../services/rapService';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import { loadCostRealizations, aggregateCostByRapItem } from '../../../services/costService';
import { exportRapWorkbook } from '../../../services/rapExcelService';
import { showToast } from '../../../store/uiStore';
import { formatDateId, formatRupiah } from '../../../utils/projectUi';
import { buildWhatsappShareUrl } from '../../../lib/dashboard/dashboardHelpers';

async function copyTextWithFallback(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fallback ke execCommand di bawah */
    }
  }
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
  return false;
}

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
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const shareTextareaRef = useRef<HTMLTextAreaElement | null>(null);
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
    const copied = await copyTextWithFallback(text);
    setShareText(text);
    setShareCopied(copied);
    setShareModalOpen(true);
    if (copied) {
      showToast('Ringkasan laporan disalin — siap kirim ke WhatsApp', 'success');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
    try {
      await navigator.share({ title: `${reportType} - ${p.name}`, text: shareText });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        showToast('Share perangkat gagal dibuka — gunakan Salin Teks atau Kirim via WhatsApp', 'info');
      }
    }
  };

  const handleCopyPreviewText = async () => {
    const text = buildShareText();
    const copied = await copyTextWithFallback(text);
    if (copied) {
      showToast('Ringkasan laporan disalin ke clipboard', 'success');
      return;
    }
    setShareText(text);
    setShareCopied(false);
    setShareModalOpen(true);
    showToast('Clipboard diblokir — silakan salin manual dari pratinjau', 'info');
  };

  const handleManualModalCopy = async () => {
    if (shareTextareaRef.current) {
      shareTextareaRef.current.focus();
      shareTextareaRef.current.select();
    }
    const copied = await copyTextWithFallback(shareText);
    setShareCopied(copied);
    if (copied) {
      showToast('Teks laporan disalin ke clipboard', 'success');
    } else {
      showToast('Teks sudah dipilih — tekan Ctrl+C / Cmd+C untuk menyalin', 'info');
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
            onClick={handleCopyPreviewText}
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
                  <PreviewStat
                    label="Est. Laba"
                    value={formatRupiah(p.rap.estLaba)}
                    color={p.rap.estLaba < 0 ? 'text-rose-600' : 'text-emerald-600'}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {shareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={e => {
            if (e.target === e.currentTarget) setShareModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-preview-title"
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600" />
                <h3 id="share-preview-title" className="font-bold text-slate-900 text-base">
                  Bagikan {reportType}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                aria-label="Tutup modal bagikan laporan"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="share-report-preview-text" className="text-xs font-bold text-slate-500 uppercase">
                Pratinjau Teks Laporan
              </label>
              <textarea
                id="share-report-preview-text"
                ref={shareTextareaRef}
                value={shareText}
                onChange={e => {
                  setShareText(e.target.value);
                  setShareCopied(false);
                }}
                rows={10}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleManualModalCopy}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm flex items-center justify-center gap-2"
              >
                {shareCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Salin Teks
                  </>
                )}
              </button>
              <a
                href={buildWhatsappShareUrl(shareText)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Kirim via WhatsApp
              </a>
            </div>

            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Bagikan lewat aplikasi perangkat lain
              </button>
            )}
          </div>
        </div>
      )}
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
