import { useState } from 'react';

import RoomCard from '../../components/frontdesk/RoomCard';
import RoomCardSkeleton from '../../components/frontdesk/RoomCardSkeleton';
import { MOCK_ROOM_CARDS } from '../../data/frontdeskMockCards';
import { RoomStatus, type RoomCardData } from '../../types/frontdesk.types';
import { getRoomStatusConfig } from '../../utils/roomStatus';
import { cn } from '../../utils/cn';

const STATUS_LABELS: Record<RoomStatus, string> = {
  [RoomStatus.AVAILABLE]: 'Tersedia',
  [RoomStatus.OCCUPIED]: 'Terisi',
  [RoomStatus.RESERVED]: 'Dipesan',
  [RoomStatus.DIRTY]: 'Perlu Dibersihkan',
  [RoomStatus.MAINTENANCE]: 'Perbaikan',
  [RoomStatus.UNPAID]: 'Belum Bayar',
};

/**
 * Demo page semua variant RoomCard (development only).
 */
export default function RoomCardDemo() {
  const [selected, setSelected] = useState<RoomCardData | null>(null);
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showSkeleton, setShowSkeleton] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Development Only
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            Room Card — Design Preview
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Preview semua variant kartu kamar Front Desk redesign.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Ukuran:
          </label>
          {(['sm', 'md', 'lg'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={cn(
                'min-h-[44px] rounded-xl px-4 py-2 text-sm font-bold uppercase',
                size === s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {s}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowSkeleton((v) => !v)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {showSkeleton ? 'Sembunyikan Skeleton' : 'Tampilkan Skeleton'}
          </button>
        </div>

        {showSkeleton && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <RoomCardSkeleton size={size} />
            <RoomCardSkeleton size={size} />
            <RoomCardSkeleton size={size} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {MOCK_ROOM_CARDS.map((room) => {
            const config = getRoomStatusConfig(room.status);
            return (
              <div key={room.id} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                    {STATUS_LABELS[room.status]}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold',
                      config.colors.bgClass,
                      config.colors.textClass
                    )}
                  >
                    {config.label}
                  </span>
                </div>
                <RoomCard
                  room={room}
                  size={size}
                  onClick={(r) => setSelected(r)}
                />
              </div>
            );
          })}
        </div>

        {selected && (
          <div
            className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:left-auto sm:right-8 sm:max-w-sm"
            role="status"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
              Klik kartu
            </p>
            <p className="mt-1 font-bold text-slate-800 dark:text-white">
              Kamar {selected.number} — {STATUS_LABELS[selected.status]}
            </p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-3 min-h-[44px] w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
