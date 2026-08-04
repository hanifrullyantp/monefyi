import { useCallback, useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  CalendarPlus,
  CreditCard,
  LayoutGrid,
  Map,
  Search,
  User,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAppStore } from '../../store/appStore';
import { mapRoomsToCardData } from '../../utils/mapRoomsToCardData';
import { useFrontDeskStore } from '../../stores/frontDeskStore';
import { trackFrontDeskEvent } from '../../utils/frontDeskAnalytics';
import { playSound } from '../../utils/sounds';

const RECENT_KEY = 'stay-command-palette-recent';
const MAX_RECENT = 8;

interface RecentAction {
  id: string;
  label: string;
  type: 'room' | 'guest' | 'command';
}

function readRecent(): RecentAction[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentAction[]) : [];
  } catch {
    return [];
  }
}

function persistRecent(items: RecentAction[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewBooking?: () => void;
  onToggleFilter?: () => void;
  onViewChange?: (mode: 'grid' | 'floorplan' | 'timeline') => void;
}

/**
 * Command palette — Cmd/Ctrl+K untuk navigasi & aksi cepat.
 */
export default function CommandPalette({
  open,
  onOpenChange,
  onNewBooking,
  onToggleFilter,
  onViewChange,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const { rooms, bookings, guests } = useAppStore();
  const selectRoom = useFrontDeskStore((s) => s.selectRoom);
  const [recent, setRecent] = useState<RecentAction[]>(readRecent);

  const roomCards = useMemo(
    () => mapRoomsToCardData(rooms, bookings),
    [rooms, bookings]
  );

  useEffect(() => {
    if (open) {
      trackFrontDeskEvent('command_palette_open');
      playSound('click');
    }
  }, [open]);

  const addRecent = useCallback((item: RecentAction) => {
    setRecent((prev) => {
      const next = [item, ...prev.filter((r) => r.id !== item.id)].slice(0, MAX_RECENT);
      persistRecent(next);
      return next;
    });
  }, []);

  const runAndClose = useCallback(
    (fn: () => void, recentItem?: RecentAction) => {
      if (recentItem) addRecent(recentItem);
      fn();
      onOpenChange(false);
      playSound('click');
    },
    [addRecent, onOpenChange]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" data-testid="command-palette">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Tutup command palette"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute left-1/2 top-[15%] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2">
        <Command
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          label="Command palette"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 dark:border-slate-800">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <Command.Input
              placeholder="Cari kamar, tamu, atau perintah..."
              className="flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-slate-400 dark:text-white"
              autoFocus
            />
          </div>

          <Command.List className="max-h-[min(400px,50vh)] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-slate-500">
              Tidak ditemukan.
            </Command.Empty>

            {recent.length > 0 && (
              <Command.Group heading="Terbaru" className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {recent.map((item) => (
                  <Command.Item
                    key={`recent-${item.id}`}
                    value={`recent ${item.label}`}
                    onSelect={() => {
                      if (item.type === 'room') {
                        const card = roomCards.find((r) => r.id === item.id);
                        if (card) selectRoom(card);
                      }
                      onOpenChange(false);
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-emerald-50 dark:aria-selected:bg-emerald-950/40"
                  >
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Aksi Cepat" className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Command.Item
                value="booking baru"
                onSelect={() =>
                  runAndClose(() => onNewBooking?.() ?? navigate('/bookings', { state: { openNew: true } }))
                }
                className={commandItemClass}
              >
                <CalendarPlus className="h-4 w-4" /> Booking Baru
              </Command.Item>
              <Command.Item
                value="toggle filter"
                onSelect={() => runAndClose(() => onToggleFilter?.())}
                className={commandItemClass}
              >
                <Search className="h-4 w-4" /> Toggle Filter
              </Command.Item>
              <Command.Item
                value="pos kasir"
                onSelect={() => runAndClose(() => navigate('/pos'))}
                className={commandItemClass}
              >
                <CreditCard className="h-4 w-4" /> Buka POS / Kasir
              </Command.Item>
            </Command.Group>

            <Command.Group heading="View Mode" className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Command.Item
                value="grid view"
                onSelect={() => runAndClose(() => onViewChange?.('grid'))}
                className={commandItemClass}
              >
                <LayoutGrid className="h-4 w-4" /> Grid
              </Command.Item>
              <Command.Item
                value="floor plan denah"
                onSelect={() => runAndClose(() => onViewChange?.('floorplan'))}
                className={commandItemClass}
              >
                <Map className="h-4 w-4" /> Denah
              </Command.Item>
              <Command.Item
                value="timeline"
                onSelect={() => runAndClose(() => onViewChange?.('timeline'))}
                className={commandItemClass}
              >
                <LayoutGrid className="h-4 w-4" /> Timeline
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Kamar" className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {roomCards.map((room) => (
                <Command.Item
                  key={room.id}
                  value={`kamar ${room.number} ${room.roomTypeName} ${room.guestName ?? ''}`}
                  onSelect={() =>
                    runAndClose(() => selectRoom(room), {
                      id: room.id,
                      label: `Kamar ${room.number}`,
                      type: 'room',
                    })
                  }
                  className={commandItemClass}
                >
                  <BedDouble className="h-4 w-4" />
                  <span>
                    Kamar <strong>{room.number}</strong>
                    <span className="ml-2 text-xs text-slate-400">{room.status}</span>
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Tamu" className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {guests.map((guest) => (
                <Command.Item
                  key={guest.id}
                  value={`tamu ${guest.name} ${guest.phone ?? ''}`}
                  onSelect={() =>
                    runAndClose(
                      () => navigate('/guests'),
                      { id: guest.id, label: guest.name, type: 'guest' }
                    )
                  }
                  className={commandItemClass}
                >
                  <User className="h-4 w-4" /> {guest.name}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

const commandItemClass = cn(
  'flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm',
  'aria-selected:bg-emerald-50 dark:aria-selected:bg-emerald-950/40'
);
