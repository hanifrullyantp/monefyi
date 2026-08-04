import { Plus } from 'lucide-react';
import type { RoomCardData } from '../../../types/frontdesk.types';
import { getStaggeredPlacement } from '../../../utils/roomLayout';

export interface UnplacedRoomsPanelProps {
  rooms: RoomCardData[];
  activeFloor: number;
  onPlace: (roomId: string, x: number, y: number) => void;
}

/**
 * Sidebar kamar belum ditempatkan — klik untuk taruh di denah lantai aktif.
 */
export default function UnplacedRoomsPanel({
  rooms,
  activeFloor,
  onPlace,
}: UnplacedRoomsPanelProps) {
  const unplaced = rooms.filter((r) => r.positionX == null || r.positionY == null);

  return (
    <aside
      className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white sm:w-56 sm:border-b-0 sm:border-r lg:w-64"
      data-testid="floorplan-unplaced-panel"
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Kamar Belum Diatur
        </h4>
        <p className="mt-1 text-[10px] text-slate-500">Klik untuk taruh di denah</p>
      </div>
      <div className="max-h-40 overflow-y-auto p-3 sm:max-h-none sm:flex-1">
        {unplaced.length === 0 ? (
          <p className="py-6 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Semua kamar sudah diatur
          </p>
        ) : (
          <ul className="space-y-2">
            {unplaced.map((room, index) => (
              <li key={room.id}>
                <button
                  type="button"
                  onClick={() => {
                    const placement = getStaggeredPlacement(
                      { ...room, floor: activeFloor },
                      index
                    );
                    onPlace(room.id, placement.x, placement.y);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50"
                  data-testid={`place-room-${room.number}`}
                >
                  <span className="font-black text-slate-700">{room.number}</span>
                  <Plus className="h-4 w-4 text-emerald-500" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
