import ColorPickerField from '../ColorPickerField';
import type { PdfSettings } from '../../../types/pdfSettings';

export type PreviewDisplayToggles = {
  showLogo: boolean;
  showSignature: boolean;
  showStamp: boolean;
  showFooter: boolean;
};

type Props = {
  settings: PdfSettings;
  onChange: (patch: Partial<PdfSettings>) => void;
  display: PreviewDisplayToggles;
  onDisplayChange: (patch: Partial<PreviewDisplayToggles>) => void;
};

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-slate-600">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-emerald-600' : 'bg-slate-200'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  );
}

export default function TemplateCustomizer({ settings, onChange, display, onDisplayChange }: Props) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
      <h3 className="text-xs font-bold text-slate-500 uppercase">Kustomisasi template</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ColorPickerField label="Warna utama" value={settings.primary_color} onChange={v => onChange({ primary_color: v })} />
        <ColorPickerField label="Secondary" value={settings.secondary_color} onChange={v => onChange({ secondary_color: v })} />
        <ColorPickerField label="Aksen" value={settings.accent_color} onChange={v => onChange({ accent_color: v })} />
      </div>
      <label className="block">
        <span className="text-xs text-slate-500">Watermark (opsional)</span>
        <input
          value={settings.watermark_text || ''}
          onChange={e => onChange({ watermark_text: e.target.value || null })}
          placeholder="DRAFT / CONFIDENTIAL"
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs text-slate-500">Footer</span>
        <input
          value={settings.footer_text}
          onChange={e => onChange({ footer_text: e.target.value })}
          placeholder="Terima kasih atas kepercayaan Anda"
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
        />
      </label>
      <div className="border-t border-slate-100 pt-3 space-y-1">
        <p className="text-[10px] text-slate-400 mb-1">Tampilan di preview (per estimasi diatur di form)</p>
        <SwitchRow label="Tampilkan logo" checked={display.showLogo} onChange={v => onDisplayChange({ showLogo: v })} />
        <SwitchRow label="Tampilkan tanda tangan" checked={display.showSignature} onChange={v => onDisplayChange({ showSignature: v })} />
        <SwitchRow label="Tampilkan cap" checked={display.showStamp} onChange={v => onDisplayChange({ showStamp: v })} />
        <SwitchRow label="Tampilkan footer" checked={display.showFooter} onChange={v => onDisplayChange({ showFooter: v })} />
      </div>
    </section>
  );
}
