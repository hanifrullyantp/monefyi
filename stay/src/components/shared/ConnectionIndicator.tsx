import { useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useOfflineStore } from '../../store/offlineStore';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function ConnectionIndicator() {
  const { isOnline, isSyncing, queueCount, failedCount, failedActions, retryFailed, dismissFailed } =
    useOfflineStore();
  const [showFailed, setShowFailed] = useState(false);

  const handleRetry = async () => {
    await retryFailed();
    setShowFailed(false);
  };

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full border border-amber-200 animate-pulse">
        <WifiOff className="h-3.5 w-3.5" />
        <span className="text-[10px] font-black uppercase tracking-widest">Offline Mode</span>
        {queueCount > 0 && (
          <span className="text-[10px] opacity-70">({queueCount} antrian)</span>
        )}
      </div>
    );
  }

  if (failedCount > 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowFailed(true)}
          className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-200 hover:bg-red-100 transition-colors"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Sync Gagal ({failedCount})
          </span>
        </button>

        <Modal isOpen={showFailed} onClose={() => setShowFailed(false)} title="Sinkronisasi Gagal" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {failedCount} aksi belum tersinkron ke server. Periksa koneksi lalu coba lagi.
            </p>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {failedActions.map((action) => (
                <li key={action.id} className="text-xs bg-slate-50 rounded-lg px-3 py-2 text-slate-600">
                  <span className="font-semibold">{action.type}</span>
                  {action.errorMessage && (
                    <span className="block text-red-500 mt-0.5">{action.errorMessage}</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => void dismissFailed().then(() => setShowFailed(false))}>
                Abaikan
              </Button>
              <Button className="flex-1" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void handleRetry()}>
                Coba Lagi
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-widest">
          Syncing {queueCount > 0 ? `(${queueCount})` : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-[10px] font-black uppercase tracking-widest">Online</span>
    </div>
  );
}
