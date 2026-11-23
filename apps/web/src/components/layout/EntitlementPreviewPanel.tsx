import { Layers } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { ENTITLEMENT_PREVIEW_OPTIONS } from '../../lib/entitlement';
import type { EntitlementPreviewMode } from '../../types/entitlement';

type Props = {
  collapsed?: boolean;
};

export default function EntitlementPreviewPanel({ collapsed = false }: Props) {
  const { entitlementPreviewMode, setEntitlementPreviewMode } = useAppStore();
  const current = ENTITLEMENT_PREVIEW_OPTIONS.find(o => o.id === entitlementPreviewMode);

  if (collapsed) {
    return (
      <div
        className="p-2 border-t border-amber-100 shrink-0"
        title={`Skenario paket: ${current?.label ?? entitlementPreviewMode}`}
      >
        <Layers className="w-5 h-5 text-amber-600 mx-auto" aria-hidden />
      </div>
    );
  }

  return (
    <div className="p-3 border-t border-amber-100 bg-amber-50/40 shrink-0">
      <label
        htmlFor="entitlement-preview-select"
        className="text-[10px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1 mb-1.5"
      >
        <Layers className="w-3 h-3" aria-hidden />
        Skenario Paket
      </label>
      <select
        id="entitlement-preview-select"
        value={entitlementPreviewMode}
        onChange={e => setEntitlementPreviewMode(e.target.value as EntitlementPreviewMode)}
        className="w-full text-xs rounded-lg border border-amber-200 bg-white px-2 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        {ENTITLEMENT_PREVIEW_OPTIONS.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
      {current && (
        <p className="mt-1.5 text-[10px] text-slate-600 leading-snug">{current.hint}</p>
      )}
    </div>
  );
}
