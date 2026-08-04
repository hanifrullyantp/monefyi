import { useCallback, useMemo, useState } from 'react';
import {
  LayoutTemplate,
  Loader2,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useAppStore } from '../../../store/appStore';
import { generateDefaultLayout } from '../../../utils/roomLayout';
import { formatFloorName } from '../../../utils/mapRoomsToCardData';
import type { RoomCardData } from '../../../types/frontdesk.types';
import { cn } from '../../../utils/cn';
import { getAllStatusDefinitions } from '../../../constants/roomStatus';
import FloorCanvas from './FloorCanvas';
import {
  DEFAULT_FLOOR_PLAN_TEMPLATE_ID,
  FLOOR_PLAN_TEMPLATES,
} from '../../../data/floorPlanTemplates';

export interface FloorPlanViewProps {
  rooms: RoomCardData[];
  loading?: boolean;
  selectedRoomId?: string | null;
  onRoomClick?: (room: RoomCardData) => void;
}

/**
 * Container denah lantai — tab lantai, zoom, legend.
 */
export default function FloorPlanView({
  rooms,
  loading = false,
  selectedRoomId,
  onRoomClick,
}: FloorPlanViewProps) {
  const { rooms: storeRooms, updateRoomPosition } = useAppStore();
  const [activeFloor, setActiveFloor] = useState<number>(() => {
    const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
    return floors[0] ?? 1;
  });

  const floors = useMemo(
    () => [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b),
    [rooms]
  );

  const hasPositions = useMemo(
    () => rooms.some((r) => r.positionX != null && r.positionY != null),
    [rooms]
  );

  const handleAutoLayout = useCallback(() => {
    const positions = generateDefaultLayout(storeRooms);
    for (const pos of positions) {
      updateRoomPosition(pos.id, pos.x, pos.y);
    }
  }, [storeRooms, updateRoomPosition]);

  const template = FLOOR_PLAN_TEMPLATES[DEFAULT_FLOOR_PLAN_TEMPLATE_ID];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center"
        data-testid="floorplan-empty"
      >
        <LayoutTemplate className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <h3 className="text-lg font-bold text-gray-900">Belum Ada Kamar</h3>
        <p className="mt-1 text-sm text-gray-500">
          Tambahkan kamar untuk menampilkan denah lantai.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      data-testid="floor-plan-view"
    >
      {/* Floor tabs + controls hint */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {floors.map((floor) => (
            <button
              key={floor}
              type="button"
              onClick={() => setActiveFloor(floor)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-bold transition-colors',
                activeFloor === floor
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
              data-testid={`floor-tab-${floor}`}
            >
              {formatFloorName(floor)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ZoomOut className="h-3.5 w-3.5" />
          <span>Scroll/pinch zoom · drag pan · double-click reset</span>
          <ZoomIn className="h-3.5 w-3.5" />
        </div>
      </div>

      {!hasPositions && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            Denah belum diatur — kamar akan ditata otomatis atau gunakan Auto Layout.
          </p>
          <button
            type="button"
            onClick={handleAutoLayout}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            data-testid="floorplan-auto-layout"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Auto Layout
          </button>
        </div>
      )}

      <div className="relative min-h-[420px]">
        <FloorCanvas
          rooms={rooms}
          floor={activeFloor}
          template={template}
          selectedRoomId={selectedRoomId}
          onRoomClick={onRoomClick}
        />

        {/* Legend */}
        <div className="absolute bottom-3 right-3 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-md">
          <p className="mb-2 text-[10px] font-bold uppercase text-gray-400">Legenda</p>
          <div className="flex flex-wrap gap-2">
            {getAllStatusDefinitions().slice(0, 6).map((def) => (
              <div key={def.key} className="flex items-center gap-1.5">
                <span
                  className={cn('h-3 w-3 rounded border', def.colors.bgClass, def.colors.borderClass)}
                />
                <span className="text-[10px] font-medium text-gray-600">{def.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute left-3 top-3 rounded-lg border border-gray-200 bg-white/90 px-2 py-1 text-[10px] font-bold text-gray-500">
          <Maximize2 className="mr-1 inline h-3 w-3" />
          {formatFloorName(activeFloor)}
        </div>
      </div>
    </div>
  );
}
