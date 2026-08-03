import React, { useState, useEffect, useCallback } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';

const toastMessages = [
  { icon: '🎉', text: 'Ibu Sari baru saja mendaftar', sub: 'dari Bali', color: 'emerald' },
  { icon: '💰', text: 'Villa Emerald menerima booking', sub: 'Rp 850.000 masuk', color: 'blue' },
  { icon: '⭐', text: 'Homestay Sejuk mendapat ulasan', sub: '5 bintang dari tamu', color: 'amber' },
  { icon: '🚀', text: 'Guest House Nusantara upgrade', sub: 'ke paket Profesional', color: 'purple' },
  { icon: '📈', text: 'Hotel Melati occupancy naik', sub: '45% bulan ini', color: 'emerald' },
  { icon: '🏨', text: 'Kost Harian Bintang bergabung', sub: 'dari Yogyakarta', color: 'blue' },
  { icon: '💚', text: 'Pak Budi berhasil check-in', sub: 'tamu baru di kamar 205', color: 'emerald' },
  { icon: '🎊', text: 'Vila Panorama pendapatan naik', sub: 'Rp 12Jt bulan ini', color: 'amber' },
  { icon: '✅', text: 'Griya Santoso selesai setup', sub: 'siap terima booking', color: 'teal' },
  { icon: '📱', text: 'Anita W. booking via online', sub: 'tamu baru dari Instagram', color: 'purple' },
];

interface Toast {
  id: number;
  icon: string;
  text: string;
  sub: string;
  color: string;
  exiting?: boolean;
}

let toastId = 0;

const colorMap: Record<string, string> = {
  emerald: 'border-emerald-200 bg-emerald-50',
  blue: 'border-blue-200 bg-blue-50',
  amber: 'border-amber-200 bg-amber-50',
  purple: 'border-purple-200 bg-purple-50',
  teal: 'border-teal-200 bg-teal-50',
};

const iconColorMap: Record<string, string> = {
  emerald: 'bg-emerald-100',
  blue: 'bg-blue-100',
  amber: 'bg-amber-100',
  purple: 'bg-purple-100',
  teal: 'bg-teal-100',
};

const ToastNotification: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem('stay_muted') === '1'; } catch { return false; }
  });
  const [dismissed, setDismissed] = useState(false);

  const playSound = useCallback(() => {
    if (muted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.35);
    } catch (_) {}
  }, [muted]);

  const addToast = useCallback(() => {
    if (dismissed) return;
    const msg = toastMessages[Math.floor(Math.random() * toastMessages.length)];
    const id = ++toastId;
    setToasts(prev => [...prev.slice(-2), { id, ...msg }]);
    playSound();

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 350);
    }, 5000);
  }, [dismissed, playSound]);

  useEffect(() => {
    if (dismissed) return;
    // First toast after 3s
    const first = setTimeout(addToast, 3000);
    // Subsequent toasts every 15-25s
    const interval = setInterval(() => {
      const delay = 15000 + Math.random() * 10000;
      setTimeout(addToast, delay);
    }, 25000);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [addToast, dismissed]);

  const removeToast = (id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem('stay_muted', next ? '1' : '0'); } catch {}
  };

  if (dismissed && toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
      {/* Mute/hide controls */}
      <div className="flex gap-2 mb-1">
        <button
          onClick={toggleMute}
          title={muted ? 'Aktifkan suara' : 'Matikan suara'}
          className="w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-all"
        >
          {muted ? <VolumeX className="w-3.5 h-3.5 text-gray-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-500" />}
        </button>
        <button
          onClick={() => setDismissed(true)}
          title="Sembunyikan notifikasi"
          className="w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-all"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Toast stack */}
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 bg-white border rounded-xl p-3.5 shadow-lg max-w-xs ${
            colorMap[toast.color] || colorMap.emerald
          } ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${iconColorMap[toast.color] || iconColorMap.emerald}`}>
            {toast.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 leading-tight">{toast.text}</div>
            <div className="text-xs text-gray-500 mt-0.5">{toast.sub}</div>
            <div className="text-[10px] text-gray-400 mt-1">beberapa detik lalu</div>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all ml-1"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastNotification;
