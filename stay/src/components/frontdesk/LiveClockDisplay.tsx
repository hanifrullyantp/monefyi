import { cn } from '../../utils/cn';

export interface LiveClockDisplayProps {
  time: string;
  className?: string;
  compact?: boolean;
}

/**
 * Jam live Front Desk — font mono konsisten, format HH:mm:ss.
 */
export default function LiveClockDisplay({ time, className, compact = false }: LiveClockDisplayProps) {
  const [hours = '00', minutes = '00', seconds = '00'] = time.split(':');

  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex shrink-0 items-center rounded-lg border border-emerald-100 bg-emerald-50/80 px-2 py-0.5 dark:border-emerald-900 dark:bg-emerald-950/50',
          className
        )}
        data-testid="live-clock"
        aria-live="polite"
      >
        <time
          dateTime={time}
          className="font-clock text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300"
        >
          {hours}:{minutes}
          <span className="hidden xs:inline">
            :{seconds}
          </span>
        </time>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-1.5 dark:border-emerald-900 dark:bg-emerald-950/50 sm:px-4 sm:py-2',
        className
      )}
      data-testid="live-clock"
      aria-live="polite"
    >
      <time
        dateTime={time}
        className="live-clock font-clock text-2xl font-semibold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300 sm:text-3xl"
      >
        <span>{hours}</span>
        <span className="live-clock-separator mx-0.5 text-emerald-400/80" aria-hidden>
          :
        </span>
        <span>{minutes}</span>
        <span className="live-clock-separator mx-0.5 text-emerald-400/80" aria-hidden>
          :
        </span>
        <span>{seconds}</span>
      </time>
    </div>
  );
}
