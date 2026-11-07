import { FileSignature, CheckCircle2 } from 'lucide-react';
import ColorPickerField from './ColorPickerField';
import { PDF_TEMPLATE_OPTIONS, normalizePdfTemplate, type EstimationFormDraft } from '../../types/estimator';
import { getEstimationSignatures } from '../../lib/pdf/digitalSignatureStorage';

interface Props {
  draft: EstimationFormDraft;
  onChange: (patch: Partial<EstimationFormDraft>) => void;
  open: boolean;
  onToggle: () => void;
  onOpenSignatureModal?: () => void;
}

export default function PdfDesignCustomizer({ draft, onChange, open, onToggle, onOpenSignatureModal }: Props) {
  const quotation = normalizePdfTemplate(draft.pdf_template);
  const invoice = normalizePdfTemplate(draft.pdf_invoice_template || draft.pdf_template);

  const sigs = getEstimationSignatures(draft.code || 'draft') || draft.signatures;
  const hasUserSig = Boolean(sigs?.userSignature?.dataUri || draft.user_signature_url);
  const hasBuyerSig = Boolean(sigs?.buyerSignature?.dataUri || draft.buyer_signature_url);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700"
      >
        Tampilan Dokumen PDF
        <span className="text-slate-600">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
          <TemplateGrid
            label="Template penawaran"
            selected={quotation}
            onSelect={v => onChange({ pdf_template: v })}
            accent={draft.pdf_primary_color}
          />
          <TemplateGrid
            label="Template invoice"
            selected={invoice}
            onSelect={v => onChange({ pdf_invoice_template: v })}
            accent={draft.pdf_primary_color}
          />

          <div className="grid grid-cols-2 gap-4">
            <ColorPickerField
              label="Warna Primary"
              value={draft.pdf_primary_color}
              onChange={v => onChange({ pdf_primary_color: v })}
            />
            <ColorPickerField
              label="Warna Secondary"
              value={draft.pdf_secondary_color}
              onChange={v => onChange({ pdf_secondary_color: v })}
            />
          </div>

          <div className="space-y-2">
            <ToggleRow label="Tampilkan foto referensi" checked={draft.pdf_show_images} onChange={v => onChange({ pdf_show_images: v })} />
            <ToggleRow label="Tampilkan info rekening bank" checked={draft.pdf_show_bank} onChange={v => onChange({ pdf_show_bank: v })} />
            <ToggleRow label="Tampilkan logo" checked={draft.pdf_show_logo !== false} onChange={v => onChange({ pdf_show_logo: v })} />
            <ToggleRow label="Tampilkan tanda tangan" checked={draft.pdf_show_signature} onChange={v => onChange({ pdf_show_signature: v })} />
            {onOpenSignatureModal && (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Tanda Tangan Digital (HP)</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={hasUserSig ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                      User: {hasUserSig ? '✓ Ada' : 'Belum'}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className={hasBuyerSig ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                      Klien: {hasBuyerSig ? '✓ Ada' : 'Belum'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenSignatureModal}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer shadow-sm"
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  <span>Buka Pad Tanda Tangan di Layar HP</span>
                </button>
              </div>
            )}
            <ToggleRow label="Tampilkan cap" checked={draft.pdf_show_stamp !== false} onChange={v => onChange({ pdf_show_stamp: v })} />
            <ToggleRow label="Tampilkan footer" checked={draft.pdf_show_footer !== false} onChange={v => onChange({ pdf_show_footer: v })} />
          </div>
        </div>
      )}
    </section>
  );
}

function TemplateGrid({
  label,
  selected,
  onSelect,
  accent,
}: {
  label: string;
  selected: string;
  onSelect: (v: (typeof PDF_TEMPLATE_OPTIONS)[number]['value']) => void;
  accent: string;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-slate-500 block mb-2">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {PDF_TEMPLATE_OPTIONS.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => onSelect(t.value)}
            className={`p-3 rounded-xl border text-left transition-colors ${
              selected === t.value
                ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                : 'border-slate-200 hover:border-emerald-200'
            }`}
          >
            <div className="text-sm font-bold text-slate-800">{t.label}</div>
            <div className="text-[10px] text-slate-500">{t.desc}</div>
            <div
              className="h-1.5 rounded-full mt-2"
              style={{ background: selected === t.value ? accent : '#e2e8f0' }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-600">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-600' : 'bg-slate-200'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}
