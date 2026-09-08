import BottomSheet from '../../ui/BottomSheet';
import { FileText, Receipt } from 'lucide-react';

export type DocumentType = 'penawaran' | 'kwitansi';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: DocumentType) => void;
};

export default function EstimationDocumentMenu({ open, onClose, onSelect }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Dokumen" height="40vh">
      <div className="p-4 space-y-2 pb-6">
        <button
          type="button"
          onClick={() => {
            onSelect('penawaran');
            onClose();
          }}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50 text-left transition-colors active:scale-[0.99]"
        >
          <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold text-slate-900 text-sm">Penawaran</div>
            <div className="text-xs text-slate-500">Preview PDF penawaran</div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            onSelect('kwitansi');
            onClose();
          }}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50 text-left transition-colors active:scale-[0.99]"
        >
          <Receipt className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <div className="font-bold text-slate-900 text-sm">Kwitansi</div>
            <div className="text-xs text-slate-500">Preview PDF kwitansi</div>
          </div>
        </button>
      </div>
    </BottomSheet>
  );
}
