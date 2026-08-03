import { useMemo } from 'react';
import { cn } from '../../utils/cn';
import { getStayProgress } from '../../utils/roomStatus';

export interface RoomCardProgressProps {
  checkIn: string;
  checkOut: string;
  currentTime?: Date;
  className?: string;
  showLabel?: boolean;
}

/** Warna bar berdasarkan progress & urgency checkout */
function getProgressColor(percent: number): string {
  if (percent >= 85) {
    return 'bg-gradient-to-r from-amber-400 to-coral-500';
  }
  if (percent >= 60) {
    return 'bg-gradient-to-r from-emerald-400 to-amber-400';
  }
  return 'bg-gradient-to-r from-sage-400 to-emerald-500';
}

/**
 * Progress bar durasi menginap dengan warna urgency.
 */
export default function RoomCardProgress({
  checkIn,
  checkOut,
  currentTime = new Date(),
  className,
  showLabel = true,
}: RoomCardProgressProps) {
  const percent = useMemo(
    () => getStayProgress(checkIn, checkOut, currentTime),
    [checkIn, checkOut, currentTime]
  );

  const label =
    percent >= 85
      ? 'Checkout mendekati'
      : percent >= 60
        ? 'Menginap hampir selesai'
        : 'Menginap';

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress menginap"
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', getProgressColor(percent))}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
