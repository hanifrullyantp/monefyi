import { AlertCircle, Check, Loader2 } from 'lucide-react';
import type { AutoSaveStatus } from '../../hooks/useAutoSave';

type Props = {
  status: AutoSaveStatus;
  onRetry?: () => void;
};

export default function AutoSaveIndicator({ status, onRetry }: Props) {
  if (status === 'idle') return null;

  if (status === 'pending' || status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Menyimpan...
      </span>
    );
  }

  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <Check className="w-3 h-3" />
        Tersimpan
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-red-600">
      <AlertCircle className="w-3 h-3" />
      Gagal simpan
      {onRetry && (
        <button type="button" onClick={onRetry} className="underline font-semibold hover:text-red-700">
          Coba lagi
        </button>
      )}
    </span>
  );
}
