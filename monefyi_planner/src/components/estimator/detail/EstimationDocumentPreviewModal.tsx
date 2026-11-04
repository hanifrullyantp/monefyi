import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Edit3, Loader2, MessageCircle, X } from 'lucide-react';
import type { EstimationFormDraft } from '../../../types/estimator';
import { displayOptionsFromDraft, type PdfSettings } from '../../../types/pdfSettings';
import type { DocumentType } from './EstimationDocumentMenu';
import { generateQuotationPdfBlob, quotationPdfFilename } from '../../../lib/pdf/generateQuotationPdf';
import { generateInvoicePdfBlob, invoicePdfFilename } from '../../../lib/pdf/generateInvoicePdf';
import {
  buildKwitansiPdfInputFromDraft,
  generateKwitansiPdfBlob,
  kwitansiPdfFilename,
} from '../../../lib/pdf/generateKwitansiPdf';
import { downloadBlob } from '../../../lib/pdf/pdfMakeSetup';
import { isDemoEmbedActive } from '../../../lib/demo/demoMode';
import { loadEstimationProjectPayments, type ProjectIncome } from '../../../services/estimationPaymentService';
import { useEntitlement } from '../../../hooks/useEntitlement';
import { canGenerateKwitansi } from '../../../lib/entitlement';
import { pdfPlanPolicyFromEntitlement, type PdfPlanPolicy } from '../../../lib/pdf/pdfPlanPolicy';
import type { KwitansiPreviewChoice } from '../../../lib/kwitansiPreviewChoice';
import { formatRupiahFull, parseNumberId } from '../../../lib/estimatorFormat';
import PdfBlobCanvasViewer from './PdfBlobCanvasViewer';

type Props = {
  open: boolean;
  type: DocumentType;
  draft: EstimationFormDraft;
  settings: PdfSettings;
  projectName?: string | null;
  projectId?: string | null;
  kwitansiChoice?: KwitansiPreviewChoice | null;
  onClose: () => void;
  onBack: () => void;
  onEdit: (type: DocumentType) => void;
  onSendWhatsApp: (type: DocumentType) => void;
};

const TITLES: Record<DocumentType, string> = {
  penawaran: 'Preview Penawaran',
  invoice: 'Preview Invoice',
  kwitansi: 'Preview Kwitansi',
};

async function buildBlob(
  type: DocumentType,
  draft: EstimationFormDraft,
  settings: PdfSettings,
  projectPayments: ProjectIncome[] = [],
  policy?: PdfPlanPolicy,
  kwitansiChoice?: KwitansiPreviewChoice | null,
  kwitansiAmountOverride?: number,
): Promise<Blob> {
  const opts = displayOptionsFromDraft(draft);
  if (type === 'penawaran') return generateQuotationPdfBlob(draft, settings, opts, policy);
  if (type === 'invoice') return generateInvoicePdfBlob(draft, settings, opts, projectPayments, policy);
  const partial = kwitansiChoice
    ? {
        category: kwitansiChoice.category,
        amount: kwitansiAmountOverride ?? kwitansiChoice.amount,
        description: kwitansiChoice.description,
      }
    : undefined;
  return generateKwitansiPdfBlob(buildKwitansiPdfInputFromDraft(draft, settings, partial));
}

function filenameFor(
  type: DocumentType,
  draft: EstimationFormDraft,
  projectName?: string | null,
): string {
  if (type === 'penawaran') return quotationPdfFilename(draft, projectName);
  if (type === 'invoice') return invoicePdfFilename(draft);
  return kwitansiPdfFilename(draft);
}

export default function EstimationDocumentPreviewModal({
  open,
  type,
  draft,
  settings,
  projectName,
  projectId,
  kwitansiChoice,
  onClose,
  onBack,
  onEdit,
  onSendWhatsApp,
}: Props) {
  const entitlement = useEntitlement();
  const policy = useMemo(
    () => pdfPlanPolicyFromEntitlement(entitlement),
    [entitlement.isFree, entitlement.isEstimatorPro, entitlement.isPro, entitlement.isEnterprise],
  );
  const kwitansiLocked = type === 'kwitansi' && !canGenerateKwitansi(entitlement);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectPayments, setProjectPayments] = useState<ProjectIncome[]>([]);
  const [customAmountInput, setCustomAmountInput] = useState('');
  const [customAmount, setCustomAmount] = useState(0);

  const showCustomAmount = type === 'kwitansi' && Boolean(kwitansiChoice?.customAmount);

  useEffect(() => {
    if (!open || !showCustomAmount || !kwitansiChoice) return;
    setCustomAmount(kwitansiChoice.amount);
    setCustomAmountInput(formatRupiahFull(kwitansiChoice.amount).replace('Rp', '').trim());
  }, [open, showCustomAmount, kwitansiChoice]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadPays = async () => {
      if (!projectId) {
        setProjectPayments([]);
        return;
      }
      try {
        const rows = await loadEstimationProjectPayments(projectId);
        if (!cancelled) setProjectPayments(rows);
      } catch {
        if (!cancelled) setProjectPayments([]);
      }
    };
    void loadPays();
    return () => { cancelled = true; };
  }, [open, projectId]);

  const effectiveKwitansiAmount = showCustomAmount ? customAmount : kwitansiChoice?.amount;

  useEffect(() => {
    if (!open || kwitansiLocked) return;
    if (showCustomAmount && customAmount <= 0) {
      setPdfBlob(null);
      setLoading(false);
      setError('');
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const blob = await buildBlob(
          type,
          draft,
          settings,
          projectPayments,
          policy,
          kwitansiChoice,
          effectiveKwitansiAmount,
        );
        if (cancelled) return;
        setPdfBlob(blob);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal membuat PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    type,
    draft,
    settings,
    projectPayments,
    policy,
    kwitansiLocked,
    kwitansiChoice,
    effectiveKwitansiAmount,
    showCustomAmount,
    customAmount,
  ]);

  if (!open) return null;

  const title = TITLES[type];
  const demoView = isDemoEmbedActive();

  const handleDownload = async () => {
    try {
      if (kwitansiLocked) return;
      const blob = await buildBlob(
        type,
        draft,
        settings,
        projectPayments,
        policy,
        kwitansiChoice,
        effectiveKwitansiAmount,
      );
      downloadBlob(blob, filenameFor(type, draft, projectName));
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 text-sm font-semibold text-emerald-700 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h2 className="font-bold text-slate-900 truncate">{title}</h2>
            <p className="text-xs text-slate-500 truncate">
              {draft.code}
              {kwitansiChoice && !kwitansiChoice.customAmount ? ` · ${kwitansiChoice.label}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="p-2 rounded-lg hover:bg-slate-100 shrink-0">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {showCustomAmount && (
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 shrink-0">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nominal kustom</label>
            <input
              type="text"
              inputMode="numeric"
              value={customAmountInput}
              onChange={e => {
                setCustomAmountInput(e.target.value);
                setCustomAmount(Math.max(0, parseNumberId(e.target.value)));
              }}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
              placeholder="Rp …"
            />
          </div>
        )}

        <div className="flex-1 min-h-0 bg-slate-100 relative">
          {kwitansiLocked ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-600">
              Generator kwitansi tersedia di Estimator Pro, Planner Pro, dan Enterprise.
            </div>
          ) : loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-sm text-red-600">
              {error}
            </div>
          )}
          {pdfBlob && !loading && !error && (
            <PdfBlobCanvasViewer blob={pdfBlob} title={title} />
          )}
          {showCustomAmount && customAmount <= 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-sm text-slate-500">
              Masukkan nominal lebih dari 0 untuk preview.
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end shrink-0">
          {demoView ? (
            <p className="text-xs text-slate-500 mr-auto self-center">
              Contoh PDF — watermark demo, tidak untuk diunduh.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onEdit(type)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => onSendWhatsApp(type)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <MessageCircle className="w-4 h-4" />
                Kirim WhatsApp
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </>
          )}
          {demoView && (
            <button
              type="button"
              onClick={() => onSendWhatsApp(type)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <MessageCircle className="w-4 h-4" />
              Kirim WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
