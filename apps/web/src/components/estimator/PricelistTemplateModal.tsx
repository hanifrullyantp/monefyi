import { X } from 'lucide-react';
import PricelistTemplateSelector from './PricelistTemplateSelector';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => Promise<void>;
  importing?: boolean;
};

export default function PricelistTemplateModal({
  open,
  onClose,
  onSelectTemplate,
  importing = false,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-slate-900">Muat Template Pricelist</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Tutup">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <PricelistTemplateSelector
            onSelectTemplate={onSelectTemplate}
            onStartEmpty={onClose}
            loading={importing}
            showEmptyOption
            compact
          />
        </div>
      </div>
    </div>
  );
}
