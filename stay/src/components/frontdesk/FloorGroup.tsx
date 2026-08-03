import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

import type { RoomCardData } from '../../types/frontdesk.types';
import type { FloorSummary } from '../../hooks/useRoomsGrouped';
import { cn } from '../../utils/cn';
import { isSearchMatch } from '../../hooks/useRoomFilters';
import type { RoomCardSizeValue } from './RoomCardSize';
import MemoRoomCard from './MemoRoomCard';

export interface FloorGroupProps {
  floorName: string;
  rooms: RoomCardData[];
  summary: FloorSummary;
  onRoomClick: (room: RoomCardData) => void;
  defaultExpanded?: boolean;
  cardSize?: RoomCardSizeValue;
  searchQuery?: string;
  staggerIndex?: number;
}

const HEALTH_LABELS: Record<FloorSummary['health'], string> = {
  normal: 'Normal',
  full: 'Penuh',
  issue: 'Ada Masalah',
};

const HEALTH_STYLES: Record<FloorSummary['health'], string> = {
  normal: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  full: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  issue: 'bg-coral-100 text-coral-900 dark:bg-coral-950 dark:text-coral-200',
};

function FloorGroupComponent({
  floorName,
  rooms,
  summary,
  onRoomClick,
  defaultExpanded = true,
  cardSize = 'md',
  searchQuery = '',
  staggerIndex = 0,
}: FloorGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const summaryLine = `${summary.total} kamar · ${summary.occupied} terisi · ${summary.available} tersedia`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: staggerIndex * 0.08, duration: 0.35 }}
      className="rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/80"
      data-testid={`floor-group-${floorName.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full min-h-[44px] items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-slate-800 dark:text-white">{floorName}</h3>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                HEALTH_STYLES[summary.health]
              )}
            >
              {HEALTH_LABELS[summary.health]}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {summary.occupancyRate}% okupansi
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{summaryLine}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 sm:px-5">
              {rooms.map((room, index) => {
                const highlighted = isSearchMatch(room, searchQuery);
                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02, duration: 0.2 }}
                    className={cn(
                      highlighted &&
                        'rounded-2xl ring-2 ring-emerald-400 ring-offset-2 dark:ring-emerald-500 dark:ring-offset-slate-900'
                    )}
                  >
                    <MemoRoomCard
                      room={room}
                      size={cardSize}
                      onClick={onRoomClick}
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

const FloorGroup = memo(FloorGroupComponent);
export default FloorGroup;
