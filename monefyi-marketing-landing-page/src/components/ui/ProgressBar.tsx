import React from 'react';
import { cn } from '../../lib/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'green' | 'blue' | 'purple' | 'amber' | 'red' | 'gradient';
  height?: number;
  className?: string;
  animated?: boolean;
}

export function ProgressBar({ value, max = 100, color = 'green', height = 6, className, animated = true }: ProgressBarProps): React.ReactElement {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    green: 'bg-gradient-to-r from-green-600 to-green-400',
    blue: 'bg-gradient-to-r from-blue-600 to-blue-400',
    purple: 'bg-gradient-to-r from-purple-600 to-purple-400',
    amber: 'bg-gradient-to-r from-amber-600 to-amber-400',
    red: 'bg-gradient-to-r from-red-600 to-red-400',
    gradient: 'bg-gradient-to-r from-red-500 via-amber-500 to-green-500',
  };

  return (
    <div className={cn('w-full bg-slate-800 rounded-full overflow-hidden', className)} style={{ height }}>
      <div
        className={cn('h-full rounded-full', colors[color], animated && 'transition-all duration-1000 ease-out')}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
