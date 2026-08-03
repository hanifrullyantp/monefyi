import { cn } from '../../utils/cn';

export interface RoomCardSkeletonProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeHeights = {
  sm: 'min-h-[180px]',
  md: 'min-h-[240px]',
  lg: 'min-h-[280px]',
};

/**
 * Skeleton loading menyerupai bentuk kartu kamar asli.
 */
export default function RoomCardSkeleton({
  size = 'md',
  className,
}: RoomCardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900',
        sizeHeights[size],
        className
      )}
      aria-hidden
      data-testid="room-card-skeleton"
    >
      <div className="flex items-start justify-between">
        <div className="frontdesk-shimmer h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="frontdesk-shimmer h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>

      <div className="mt-4 space-y-2">
        <div className="frontdesk-shimmer h-12 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="frontdesk-shimmer h-4 w-16 rounded-md bg-slate-200 dark:bg-slate-700" />
        <div className="frontdesk-shimmer h-4 w-32 rounded-md bg-slate-200 dark:bg-slate-700" />
      </div>

      <div className="mt-6 space-y-2">
        <div className="frontdesk-shimmer h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="flex justify-between">
          <div className="frontdesk-shimmer h-3 w-14 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="frontdesk-shimmer h-3 w-14 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="frontdesk-shimmer h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700"
          />
        ))}
      </div>
    </div>
  );
}
