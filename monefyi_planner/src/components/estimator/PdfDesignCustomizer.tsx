import { PDF_TEMPLATE_OPTIONS, type EstimationFormDraft } from '../../types/estimator';

interface Props {
  draft: EstimationFormDraft;
  onChange: (patch: Partial<EstimationFormDraft>) => void;
  open: boolean;
  onToggle: () => void;
}

export default function PdfDesignCustomizer({ draft, onChange, open, onToggle }: Props) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700"
      >
        Tampilan Dokumen PDF
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-2">Template</span>
            <div className="grid grid-cols-2 gap-2">
              {PDF_TEMPLATE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onChange({ pdf_template: t.value })}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    draft.pdf_template === t.value
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                      : 'border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <div className="text-sm font-bold text-slate-800">{t.label}</div>
                  <div className="text-[10px] text-slate-500">{t.desc}</div>
                  <div
                    className="h-1.5 rounded-full mt-2"
                    style={{ background: draft.pdf_template === t.value ? draft.pdf_primary_color : '#e2e8f0' }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-500">Warna Primary</span>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={draft.pdf_primary_color}
                  onChange={e => onChange({ pdf_primary_color: e.target.value })}
                  className="w-10 h-9 rounded cursor-pointer"
                />
                <input
                  value={draft.pdf_primary_color}
                  onChange={e => onChange({ pdf_primary_color: e.target.value })}
                  className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Warna Secondary</span>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={draft.pdf_secondary_color}
                  onChange={e => onChange({ pdf_secondary_color: e.target.value })}
                  className="w-10 h-9 rounded cursor-pointer"
                />
                <input
                  value={draft.pdf_secondary_color}
                  onChange={e => onChange({ pdf_secondary_color: e.target.value })}
                  className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <ToggleRow
              label="Tampilkan foto referensi"
              checked={draft.pdf_show_images}
              onChange={v => onChange({ pdf_show_images: v })}
            />
            <ToggleRow
              label="Tampilkan info rekening bank"
              checked={draft.pdf_show_bank}
              onChange={v => onChange({ pdf_show_bank: v })}
            />
            <ToggleRow
              label="Tampilkan tanda tangan"
              checked={draft.pdf_show_signature}
              onChange={v => onChange({ pdf_show_signature: v })}
            />
          </div>

          <div
            className="rounded-xl p-3 text-white text-xs"
            style={{ background: `linear-gradient(135deg, ${draft.pdf_primary_color}, ${draft.pdf_secondary_color})` }}
          >
            <div className="font-bold text-sm">Preview warna — {draft.pdf_template}</div>
            <div className="opacity-80 mt-1">{draft.code || 'EST-XXXX'}</div>
          </div>
        </div>
      )}
    </section>
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
        className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}
