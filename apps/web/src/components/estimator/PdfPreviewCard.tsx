import type { PdfSettings } from '../../types/pdfSettings';
import { PDF_TEMPLATE_OPTIONS } from '../../types/estimator';

type Props = {
  settings: PdfSettings;
};

export default function PdfPreviewCard({ settings }: Props) {
  const templateLabel =
    PDF_TEMPLATE_OPTIONS.find(t => t.value === settings.default_pdf_template)?.label
    || settings.default_pdf_template;

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden sticky top-20"
      style={{ borderTopColor: settings.primary_color, borderTopWidth: 4 }}
    >
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Preview Penawaran</p>
        <p className="text-[10px] text-slate-400">Template: {templateLabel}</p>
      </div>
      <div className="p-5 space-y-4 text-sm">
        <div className="flex gap-3 items-start">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="" className="w-14 h-14 object-contain rounded-lg border border-slate-100" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
              Logo
            </div>
          )}
          <div className="min-w-0">
            <div className="font-black text-slate-900 truncate">{settings.company_name || 'Nama Perusahaan'}</div>
            {settings.company_tagline && (
              <div className="text-xs text-slate-500 truncate">{settings.company_tagline}</div>
            )}
          </div>
        </div>
        {(settings.address || settings.phone) && (
          <div className="text-xs text-slate-600 space-y-0.5">
            {settings.address && <p>{settings.address}</p>}
            {settings.phone && <p>{settings.phone}</p>}
            {settings.website && <p className="text-emerald-600">{settings.website}</p>}
          </div>
        )}
        <div className="border-t border-dashed border-slate-200 pt-3">
          <div className="h-16 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
            Area isi penawaran / item
          </div>
        </div>
        {(settings.bank_name || settings.bank_account) && (
          <div className="text-xs text-slate-600 border-t border-slate-100 pt-3">
            <span className="font-semibold">Rekening: </span>
            {settings.bank_name} {settings.bank_account}
            {settings.bank_account_name ? ` a.n. ${settings.bank_account_name}` : ''}
          </div>
        )}
        {(settings.signature_url || settings.signature_name) && (
          <div className="text-center pt-2">
            {settings.signature_url && (
              <img src={settings.signature_url} alt="" className="h-12 mx-auto object-contain mb-1" />
            )}
            {settings.signature_name && (
              <p className="text-xs font-semibold text-slate-700">{settings.signature_name}</p>
            )}
            {settings.signature_title && (
              <p className="text-[10px] text-slate-500">{settings.signature_title}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
