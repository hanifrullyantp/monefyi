import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Loader2, Receipt, X } from 'lucide-react';
import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';
import { formatRupiahFull, parseNumberId } from '../../lib/estimatorFormat';
import { todayStr } from '../../lib/adapters';
import {
  defaultKwitansiDescription,
  downloadKwitansiPdf,
  generateKwitansiPdfBlob,
  kwitansiPdfFilename,
  suggestKwitansiAmount,
  type KwitansiPaymentCategory,
} from '../../lib/pdf/generateKwitansiPdf';
import { KWITANSI_CATEGORY_LABELS } from '../../lib/pdf/kwitansiPdfContext';

type Props = {
  open: boolean;
  draft: EstimationFormDraft;
  settings: PdfSettings;
  onClose: () => void;
  onToast?: (msg: string, type: 'success' | 'error') => void;
};

const CATEGORIES: KwitansiPaymentCategory[] = ['dp', 'termin', 'pelunasan', 'other'];

export default function KwitansiModal({
  open,
  draft,
  settings,
  onClose,
  onToast,
}: Props) {
  const [category, setCategory] = useState<KwitansiPaymentCategory>('dp');
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [amount, setAmount] = useState(0);
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pdfOptions = {
    showImages: false,
    showBank: draft.pdf_show_bank,
    showSignature: draft.pdf_show_signature,
  };

  const resetForm = useCallback((cat: KwitansiPaymentCategory) => {
    const suggested = suggestKwitansiAmount(draft, cat);
    setCategory(cat);
    setPaymentDate(todayStr());
    setAmount(suggested);
    setAmountInput(formatRupiahFull(suggested).replace('Rp', '').trim());
    setDescription(defaultKwitansiDescription(draft, cat));
    setPaymentMethod('');
  }, [draft]);

  useEffect(() => {
    if (!open) return;
    resetForm('dp');
  }, [open, resetForm]);

  const handleCategoryChange = (cat: KwitansiPaymentCategory) => {
    const suggested = suggestKwitansiAmount(draft, cat);
    setCategory(cat);
    setAmount(suggested);
    setAmountInput(formatRupiahFull(suggested).replace('Rp', '').trim());
    setDescription(defaultKwitansiDescription(draft, cat));
  };

  const handleAmountChange = (raw: string) => {
    setAmountInput(raw);
    setAmount(Math.max(0, parseNumberId(raw)));
  };

  const buildInput = useCallback(() => ({
    draft,
    settings,
    options: pdfOptions,
    amount,
    paymentDate,
    category,
    description,
    paymentMethod: paymentMethod.trim() || undefined,
  }), [draft, settings, pdfOptions, amount, paymentDate, category, description, paymentMethod]);

  useEffect(() => {
    if (!open || amount <= 0) {
      setBlobUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let url: string | null = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const blob = await generateKwitansiPdfBlob(buildInput());
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setBlobUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal membuat PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(load, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, buildInput, amount]);

  if (!open) return null;

  const handleDownload = async () => {
    if (amount <= 0) {
      onToast?.('Nominal harus lebih dari 0', 'error');
      return;
    }
    try {
      await downloadKwitansiPdf(buildInput());
      onToast?.('Kwitansi diunduh', 'success');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Gagal unduh PDF', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Receipt className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 truncate">Kwitansi Pembayaran</h2>
              <p className="text-xs text-slate-500 truncate">{draft.title || draft.code}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || amount <= 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Unduh
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100" aria-label="Tutup">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] flex-1 min-h-0">
          <div className="border-b lg:border-b-0 lg:border-r border-slate-100 p-4 space-y-4 overflow-y-auto">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Klien</p>
              <p className="text-sm font-bold text-slate-900">{draft.customer_name || '—'}</p>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">Jenis Pembayaran</span>
              <select
                value={category}
                onChange={e => handleCategoryChange(e.target.value as KwitansiPaymentCategory)}
                className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{KWITANSI_CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">Tanggal Pembayaran</span>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">Nominal Diterima</span>
              <input
                value={amountInput}
                onChange={e => handleAmountChange(e.target.value)}
                placeholder="0"
                className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold tabular-nums focus:border-emerald-500 outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">Keterangan</span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none focus:border-emerald-500 outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">Metode Bayar (opsional)</span>
              <input
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                placeholder="Transfer BCA, Cash, dll."
                className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none"
              />
            </label>

            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Nomor kwitansi dibuat otomatis per hari. Generate ulang di hari yang sama bisa menghasilkan nomor serupa.
            </p>
            <p className="text-[10px] text-slate-400">
              Branding & tanda tangan dari Pengaturan Estimator → PDF.
            </p>
          </div>

          <div className="relative bg-slate-100 min-h-[240px] lg:min-h-0">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            )}
            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-600">
                {error}
              </div>
            )}
            {amount <= 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-500">
                Isi nominal untuk preview kwitansi
              </div>
            )}
            {blobUrl && !error && amount > 0 && (
              <iframe
                title={kwitansiPdfFilename(draft)}
                src={blobUrl}
                className="w-full h-full min-h-[240px] lg:min-h-0 border-0"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
