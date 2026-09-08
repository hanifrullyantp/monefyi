import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, MessageCircle, X } from 'lucide-react';
import type { EstimationFormDraft } from '../../../types/estimator';
import type { PdfSettings } from '../../../types/pdfSettings';
import type { WhatsAppTemplateConfig } from '../../../lib/whatsappQuotationMessage';
import { openWhatsAppChat } from '../../../lib/whatsappQuotationMessage';
import { buildWhatsAppMilestoneTagihMessage, buildWhatsAppPresetMessage,
  WHATSAPP_PRESET_ATTACHMENTS,
  WHATSAPP_PRESET_LABELS,
  type WhatsAppEstimationPreset,
} from '../../../lib/whatsappEstimationPresets';
import type { BillingMilestone } from '../../../lib/estimationBillingSchedule';
import { analytics } from '../../../lib/analytics/events';
import { generateQuotationPdfBlob, quotationPdfFilename } from '../../../lib/pdf/generateQuotationPdf';
import {
  buildKwitansiPdfInputFromDraft,
  generateKwitansiPdfBlob,
  kwitansiPdfFilename,
} from '../../../lib/pdf/generateKwitansiPdf';
import { downloadBlob } from '../../../lib/pdf/pdfMakeSetup';

type Salutation = 'Pak' | 'Bu' | 'Kak' | '';

type Props = {
  open: boolean;
  onClose: () => void;
  draft: EstimationFormDraft;
  settings: PdfSettings;
  projectName?: string | null;
  estimationId?: string;
  templateConfig: WhatsAppTemplateConfig;
  initialPreset?: WhatsAppEstimationPreset;
  tagihMilestone?: BillingMilestone | null;
  onToast: (msg: string, type: 'success' | 'error') => void;
  onShared?: () => void;
};

const PRESETS: WhatsAppEstimationPreset[] = ['follow_up', 'penawaran', 'penagihan'];

export default function EstimationWhatsAppPickerModal({
  open,
  onClose,
  draft,
  settings,
  projectName,
  estimationId,
  templateConfig,
  initialPreset,
  tagihMilestone,
  onToast,
  onShared,
}: Props) {
  const [preset, setPreset] = useState<WhatsAppEstimationPreset>(initialPreset || 'follow_up');
  const [salutation, setSalutation] = useState<Salutation>(
    (templateConfig.defaultSalutation as Salutation) || 'Pak',
  );
  const [subtitle, setSubtitle] = useState(templateConfig.defaultSubtitle || '');
  const [message, setMessage] = useState('');
  const [phoneOverride, setPhoneOverride] = useState('');
  const [attachFile, setAttachFile] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const p = initialPreset || 'follow_up';
    setPreset(p);
    setSalutation((templateConfig.defaultSalutation as Salutation) || 'Pak');
    setSubtitle(templateConfig.defaultSubtitle || '');
    setPhoneOverride(draft.customer_phone || '');
    setAttachFile(WHATSAPP_PRESET_ATTACHMENTS[p] !== 'none');
    setCopied(false);
    const sal = (templateConfig.defaultSalutation as Salutation) || 'Pak';
    if (p === 'penagihan' && tagihMilestone) {
      setMessage(buildWhatsAppMilestoneTagihMessage(draft, settings, tagihMilestone, sal));
    } else {
      setMessage(buildWhatsAppPresetMessage(p, draft, settings, templateConfig, sal, templateConfig.defaultSubtitle || ''));
    }
  }, [open, draft, settings, templateConfig, initialPreset, tagihMilestone]);

  useEffect(() => {
    if (!open) return;
    if (preset === 'penagihan' && tagihMilestone) {
      setMessage(buildWhatsAppMilestoneTagihMessage(draft, settings, tagihMilestone, salutation));
    } else {
      setMessage(buildWhatsAppPresetMessage(preset, draft, settings, templateConfig, salutation, subtitle));
    }
  }, [open, preset, salutation, subtitle, draft, settings, templateConfig, tagihMilestone]);

  if (!open) return null;

  const attachment = WHATSAPP_PRESET_ATTACHMENTS[preset];
  const targetPhone = phoneOverride.trim() || draft.customer_phone || '';

  const handleShare = async () => {
    if (!message.trim()) {
      onToast('Pesan kosong', 'error');
      return;
    }
    setSending(true);
    try {
      if (attachFile && attachment === 'pdf') {
        const blob = await generateQuotationPdfBlob(draft, settings, {
          showImages: draft.pdf_show_images,
          showBank: draft.pdf_show_bank,
          showSignature: draft.pdf_show_signature,
        });
        const filename = quotationPdfFilename(draft, projectName);
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ text: message, files: [file] });
        } else {
          downloadBlob(blob, filename);
          openWhatsAppChat(
            targetPhone,
            `${message}\n\n📎 File PDF "${filename}" telah diunduh — silakan lampirkan di WhatsApp.`,
          );
        }
        analytics.estimationWaShared({ estimationId, shareType: 'pdf' });
      } else if (attachFile && attachment === 'kwitansi') {
        const blob = await generateKwitansiPdfBlob(buildKwitansiPdfInputFromDraft(draft, settings));
        const filename = kwitansiPdfFilename(draft);
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ text: message, files: [file] });
        } else {
          downloadBlob(blob, filename);
          openWhatsAppChat(
            targetPhone,
            `${message}\n\n📎 Kwitansi "${filename}" telah diunduh — silakan lampirkan di WhatsApp.`,
          );
        }
        analytics.estimationWaShared({ estimationId, shareType: 'pdf' });
      } else {
        openWhatsAppChat(targetPhone, message);
        analytics.estimationWaShared({ estimationId, shareType: 'text' });
      }
      onToast('Membuka WhatsApp', 'success');
      onShared?.();
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
            <h2 className="font-bold text-slate-900">Kirim WhatsApp</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPreset(p);
                  setAttachFile(WHATSAPP_PRESET_ATTACHMENTS[p] !== 'none');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors ${
                  preset === p
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {WHATSAPP_PRESET_LABELS[p]}
              </button>
            ))}
          </div>

          {attachment !== 'none' && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={attachFile}
                onChange={e => setAttachFile(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600"
              />
              Lampirkan {attachment === 'pdf' ? 'PDF penawaran' : 'PDF kwitansi'}
            </label>
          )}

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
            {preset === 'penawaran' && (
              <label className="block">
                <span className="text-xs text-slate-500">Subjudul produk</span>
                <input
                  value={subtitle}
                  onChange={e => setSubtitle(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </label>
            )}
          </div>

          <label className="block">
            <span className="text-xs text-slate-500">Nomor WhatsApp</span>
            <input
              type="tel"
              value={phoneOverride}
              onChange={e => setPhoneOverride(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Pesan</span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(message);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin' : 'Salin'}
              </button>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"
            />
          </label>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm border border-slate-200">
            Batal
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={sending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-60"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            Kirim
          </button>
        </div>
      </div>
    </div>
  );
}
