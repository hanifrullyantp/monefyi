import { WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineStore } from '../../store/offlineStore';

export default function ConnectionIndicator() {
  const { isOnline, isSyncing, queueCount } = useOfflineStore();

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full border border-amber-200 animate-pulse">
        <WifiOff className="h-3.5 w-3.5" />
        <span className="text-[10px] font-black uppercase tracking-widest">Offline Mode</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-widest">Syncing {queueCount > 0 ? `(${queueCount})` : ''}</span>
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
