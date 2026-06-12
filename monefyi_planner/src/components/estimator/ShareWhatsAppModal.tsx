import { useEffect, useState } from 'react';
import { Loader2, MessageCircle, X } from 'lucide-react';
import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';
import type { WhatsAppTemplateConfig } from '../../lib/whatsappQuotationMessage';
import {
  buildWhatsAppQuotationMessage,
  openWhatsAppChat,
} from '../../lib/whatsappQuotationMessage';
import { generateQuotationPdfBlob, quotationPdfFilename } from '../../lib/pdf/generateQuotationPdf';
import { downloadBlob } from '../../lib/pdf/pdfMakeSetup';

type ShareMode = 'text' | 'pdf';
type Salutation = 'Pak' | 'Bu' | 'Kak' | '';

interface Props {
  open: boolean;
  onClose: () => void;
  draft: EstimationFormDraft;
  settings: PdfSettings;
  templateConfig: WhatsAppTemplateConfig;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export default function ShareWhatsAppModal({
  open,
  onClose,
  draft,
  settings,
  templateConfig,
  onToast,
}: Props) {
  const [mode, setMode] = useState<ShareMode>('text');
  const [salutation, setSalutation] = useState<Salutation>(
    (templateConfig.defaultSalutation as Salutation) || 'Pak',
  );
  const [subtitle, setSubtitle] = useState(templateConfig.defaultSubtitle || '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const buildMessage = () =>
    buildWhatsAppQuotationMessage(draft, settings, templateConfig, salutation, subtitle);

  useEffect(() => {
    if (!open) return;
    const sal = (['Pak', 'Bu', 'Kak', ''].includes(templateConfig.defaultSalutation)
      ? templateConfig.defaultSalutation
      : 'Pak') as Salutation;
    setSalutation(sal);
    setSubtitle(templateConfig.defaultSubtitle || '');
    setMessage(buildWhatsAppQuotationMessage(draft, settings, templateConfig, sal, templateConfig.defaultSubtitle));
  }, [open, draft, settings, templateConfig]);

  useEffect(() => {
    if (!open) return;
    setMessage(buildMessage());
  }, [open, salutation, subtitle]);

  if (!open) return null;

  const handleReset = () => setMessage(buildMessage());

  const handleShare = async () => {
    if (!message.trim()) {
      onToast('Pesan kosong', 'error');
      return;
    }
    setSending(true);
    try {
      if (mode === 'pdf') {
        const blob = await generateQuotationPdfBlob(draft, settings, {
          showImages: draft.pdf_show_images,
          showBank: draft.pdf_show_bank,
          showSignature: draft.pdf_show_signature,
        });
        const filename = quotationPdfFilename(draft);
        const file = new File([blob], filename, { type: 'application/pdf' });

        if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            text: message,
            files: [file],
          });
          onToast('Dibagikan ke WhatsApp', 'success');
          onClose();
          return;
        }

        downloadBlob(blob, filename);
        openWhatsAppChat(
          draft.customer_phone,
          `${message}\n\n📎 File PDF "${filename}" telah diunduh — silakan lampirkan di WhatsApp.`,
        );
        onToast('PDF diunduh — buka WhatsApp dan lampirkan file', 'success');
      } else {
        openWhatsAppChat(draft.customer_phone, message);
        onToast('Membuka WhatsApp', 'success');
      }
      onClose();
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Gagal membagikan', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-900">Bagikan ke WhatsApp</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${
                mode === 'text'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              Teks saja
            </button>
            <button
              type="button"
              onClick={() => setMode('pdf')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${
                mode === 'pdf'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              PDF + teks
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-500">Sapaan</span>
              <select
                value={salutation}
                onChange={e => setSalutation(e.target.value as Salutation)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <option value="Pak">Pak</option>
                <option value="Bu">Bu</option>
                <option value="Kak">Kak</option>
                <option value="">(tanpa sapaan)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Subjudul produk</span>
              <input
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="Waterproof Kitchen Set"
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </label>
          </div>

          {draft.customer_phone ? (
            <p className="text-xs text-slate-500">
              Ke: <span className="font-semibold text-slate-700">{draft.customer_phone}</span>
            </p>
          ) : (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Telepon customer kosong — WhatsApp akan terbuka tanpa nomor tujuan.
            </p>
          )}

          <label className="block">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Pesan (bisa diedit)</span>
              <button type="button" onClick={handleReset} className="text-xs text-emerald-600 font-semibold">
                Reset template
              </button>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none font-sans leading-relaxed"
            />
          </label>

          {mode === 'pdf' && (
            <p className="text-xs text-slate-500">
              Di perangkat mobile, PDF bisa langsung dibagikan. Di desktop, PDF diunduh lalu dibuka WhatsApp.
            </p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 border border-slate-200">
            Batal
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={sending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-60"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            Kirim WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
