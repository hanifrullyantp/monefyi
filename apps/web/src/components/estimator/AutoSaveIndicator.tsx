import { AlertCircle, Check, Loader2 } from 'lucide-react';
import type { AutoSaveStatus } from '../../hooks/useAutoSave';

type Props = {
  status: AutoSaveStatus;
  onRetry?: () => void;
  variant?: 'default' | 'light';
};

export default function AutoSaveIndicator({ status, onRetry, variant = 'default' }: Props) {
  if (status === 'idle') return null;

  const light = variant === 'light';

  if (status === 'pending' || status === 'saving') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${light ? 'text-emerald-100' : 'text-slate-500'}`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Menyimpan...
      </span>
    );
  }

  if (status === 'saved') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${light ? 'text-white' : 'text-emerald-600'}`}>
        <Check className="w-3 h-3" />
        Tersimpan
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${light ? 'text-red-200' : 'text-red-600'}`}>
      <AlertCircle className="w-3 h-3" />
      Gagal simpan
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`underline font-semibold ${light ? 'text-white hover:text-red-100' : 'hover:text-red-700'}`}
        >
          Coba lagi
        </button>
      )}
    </span>
  );
}
