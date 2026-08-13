'use client';

import { cn } from '@/lib/utils';
import { Info, AlertCircle, CheckCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface InfoBoxProps {
  children: ReactNode;
  variant?: 'info' | 'warning' | 'success';
  title?: string;
  className?: string;
}

export function InfoBox({
  children,
  variant = 'info',
  title,
  className,
}: InfoBoxProps) {
  const variants = {
    info: {
      bg: 'from-blue-950/50 to-blue-900/30 border-blue-500/20',
      icon: Info,
      iconColor: 'text-blue-400',
    },
    warning: {
      bg: 'from-amber-950/50 to-amber-900/30 border-amber-500/20',
      icon: AlertCircle,
      iconColor: 'text-amber-400',
    },
    success: {
      bg: 'from-green-950/50 to-green-900/30 border-green-500/20',
      icon: CheckCircle,
      iconColor: 'text-green-400',
    },
  };

  const { bg, icon: Icon, iconColor } = variants[variant];

  return (
    <div
      className={cn(
        'bg-gradient-to-br border rounded-2xl p-4',
        bg,
        className
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColor)} />
        <div className="flex-1">
          {title && (
            <p className="font-semibold text-white mb-1">{title}</p>
          )}
          <div className="text-sm text-green-100/80">{children}</div>
        </div>
      </div>
    </div>
  );
}
